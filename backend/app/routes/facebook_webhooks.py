import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Response

from app.services.database import get_connection

router = APIRouter(prefix="/api/webhooks/facebook", tags=["Facebook Webhooks"])

WEBHOOK_LOG_DIR = Path("storage")
WEBHOOK_LOG_FILE = WEBHOOK_LOG_DIR / "facebook_webhook_events.jsonl"


def get_verify_token():
    return (
        os.getenv("FACEBOOK_WEBHOOK_VERIFY_TOKEN")
        or os.getenv("FACEBOOK_VERIFY_TOKEN")
        or "orchid-flow-webhook"
    )


def log_webhook_payload(payload: dict):
    WEBHOOK_LOG_DIR.mkdir(parents=True, exist_ok=True)

    safe_payload = {
        "received_at": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }

    with WEBHOOK_LOG_FILE.open("a", encoding="utf-8") as file:
        file.write(json.dumps(safe_payload, ensure_ascii=False) + "\n")


def column_exists(cur, table_name: str, column_name: str):
    cur.execute(
        """
        select exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = %s
              and column_name = %s
        )
        """,
        (table_name, column_name),
    )

    return bool(cur.fetchone()[0])


def resolve_facebook_session_id(cur, value: dict):
    candidates = [
        value.get("live_video_id"),
        value.get("video_id"),
        value.get("post_id"),
        value.get("parent_id"),
    ]

    for candidate in candidates:
        if not candidate:
            continue

        cur.execute(
            """
            select id
            from live_sessions
            where platform = 'facebook'
              and external_live_id = %s
            order by started_at desc nulls last
            limit 1
            """,
            (str(candidate),),
        )

        row = cur.fetchone()

        if row:
            return row[0]

    # Nếu webhook không gửi live_video_id/post_id khớp,
    # gán vào phiên Facebook đang connected/active gần nhất.
    cur.execute(
        """
        select id
        from live_sessions
        where platform = 'facebook'
          and (
            coalesce(connection_status, '') = 'connected'
            or coalesce(status, '') = 'active'
          )
        order by started_at desc nulls last
        limit 1
        """
    )

    row = cur.fetchone()

    if row:
        return row[0]

    return None


def update_or_insert_comment_from_webhook(cur, value: dict):
    item = value.get("item")
    verb = value.get("verb")

    # Page feed có nhiều loại event. Mình chỉ xử lý comment mới/sửa comment.
    if item and item != "comment":
        return {"saved": False, "reason": f"Skip item={item}"}

    if verb and verb not in {"add", "edited"}:
        return {"saved": False, "reason": f"Skip verb={verb}"}

    comment_id = (
        value.get("comment_id")
        or value.get("commentId")
        or value.get("id")
    )

    message = (
        value.get("message")
        or value.get("comment_message")
        or value.get("text")
        or ""
    )

    from_obj = value.get("from") or value.get("sender") or {}
    customer_platform_id = (
        from_obj.get("id")
        or value.get("sender_id")
        or value.get("from_id")
        or ""
    )
    customer_name = (
        from_obj.get("name")
        or value.get("sender_name")
        or value.get("from_name")
        or ""
    )

    if not comment_id and not message:
        return {"saved": False, "reason": "No comment_id/message"}

    session_id = resolve_facebook_session_id(cur, value)

    if not session_id:
        return {"saved": False, "reason": "No active facebook session"}

    if not column_exists(cur, "live_comments", "session_id"):
        return {"saved": False, "reason": "live_comments table not ready"}

    external_comment_id = str(comment_id or f"webhook-{datetime.now(timezone.utc).timestamp()}")

    cur.execute(
        """
        select id
        from live_comments
        where session_id = %s
          and external_comment_id = %s
        limit 1
        """,
        (session_id, external_comment_id),
    )

    existing = cur.fetchone()

    if existing:
        update_parts = []
        values = []

        def add_update(column, value_to_set, only_when_not_empty=False):
            if not column_exists(cur, "live_comments", column):
                return

            if only_when_not_empty and not str(value_to_set or "").strip():
                return

            update_parts.append(f"{column} = %s")
            values.append(value_to_set)

        add_update("message", message)
        add_update("customer_name", customer_name, only_when_not_empty=True)
        add_update("customer_platform_id", customer_platform_id, only_when_not_empty=True)

        if column_exists(cur, "live_comments", "updated_at"):
            update_parts.append("updated_at = now()")

        if update_parts:
            values.append(existing[0])

            cur.execute(
                f"""
                update live_comments
                set {", ".join(update_parts)}
                where id = %s
                """,
                values,
            )

        return {
            "saved": True,
            "mode": "updated",
            "comment_id": external_comment_id,
            "customer_name": customer_name or None,
        }

    columns = []
    placeholders = []
    values = []

    def add_insert(column, value_to_insert):
        if not column_exists(cur, "live_comments", column):
            return

        columns.append(column)
        placeholders.append("%s")
        values.append(value_to_insert)

    add_insert("session_id", session_id)
    add_insert("platform", "facebook")
    add_insert("external_comment_id", external_comment_id)
    add_insert("message", message)
    add_insert("customer_name", customer_name)
    add_insert("customer_platform_id", customer_platform_id)

    if column_exists(cur, "live_comments", "created_at"):
        columns.append("created_at")
        placeholders.append("now()")

    if not columns:
        return {"saved": False, "reason": "No insertable columns"}

    cur.execute(
        f"""
        insert into live_comments ({", ".join(columns)})
        values ({", ".join(placeholders)})
        returning id
        """,
        values,
    )

    inserted_id = cur.fetchone()[0]

    return {
        "saved": True,
        "mode": "inserted",
        "id": str(inserted_id),
        "comment_id": external_comment_id,
        "customer_name": customer_name or None,
    }


def process_page_feed_payload(payload: dict):
    results = []

    entries = payload.get("entry") or []

    with get_connection() as conn:
        with conn.cursor() as cur:
            for entry in entries:
                changes = entry.get("changes") or []

                for change in changes:
                    field = change.get("field")
                    value = change.get("value") or {}

                    if field != "feed":
                        results.append({
                            "saved": False,
                            "reason": f"Skip field={field}",
                        })
                        continue

                    result = update_or_insert_comment_from_webhook(cur, value)
                    result["field"] = field
                    result["raw_value_keys"] = sorted(list(value.keys()))
                    results.append(result)

            conn.commit()

    return results


@router.get("")
async def verify_facebook_webhook(request: Request):
    params = request.query_params

    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == get_verify_token():
        return Response(content=challenge or "", media_type="text/plain")

    raise HTTPException(status_code=403, detail="Facebook webhook verify token không hợp lệ.")


@router.post("")
async def receive_facebook_webhook(request: Request):
    payload = await request.json()

    log_webhook_payload(payload)

    try:
        results = process_page_feed_payload(payload)
    except Exception as error:
        # Vẫn log payload, nhưng trả lỗi rõ để backend console thấy.
        raise HTTPException(
            status_code=500,
            detail=f"Không xử lý được Facebook webhook: {error}",
        )

    return {
        "ok": True,
        "results": results,
    }
