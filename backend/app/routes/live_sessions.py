FACEBOOK_TOKEN_EXPIRED_MESSAGE = "Token Facebook ?? h?t h?n. H?y c?p nh?t l?i FACEBOOK_PAGE_ACCESS_TOKEN trong file .env r?i restart backend."

import asyncio
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.database import get_connection
from app.services.facebook_live_connector import (
    find_current_facebook_live,
    run_facebook_comment_poller,
    seed_facebook_comments_once,
)

try:
    from app.services.tiktok_live_connector import run_tiktok_comment_listener
except ModuleNotFoundError:
    run_tiktok_comment_listener = None


router = APIRouter(prefix="/api/live-sessions", tags=["Live Sessions"])

ACTIVE_TASKS: dict[str, Any] = {}

NO_FACEBOOK_LIVE_MESSAGE = "Không tìm thấy Facebook Live đang phát. Hãy live trên Facebook trước rồi bấm kết nối."
NO_LIVE_SESSION_MESSAGE = "Không tìm thấy phiên live."


class ConnectFacebookPayload(BaseModel):
    title: str | None = None
    live_video_id: str | None = None


class ConnectTikTokPayload(BaseModel):
    title: str | None = None
    username: str | None = None



def row_to_session(row):
    data = {
        "id": str(row[0]),
        "title": row[1],
        "platform": row[2],
        "status": row[3],
        "external_live_id": row[4],
        "connection_status": row[5],
        "started_at": row[6].isoformat() if row[6] else None,
    }

    if len(row) > 7:
        data["live_event_id"] = str(row[7]) if row[7] else None

    return data



def get_or_create_active_live_event(cur, title: str | None = None):
    cur.execute(
        """
        select id
        from live_events
        where event_date = (now() at time zone 'Asia/Ho_Chi_Minh')::date
          and status = 'active'
        order by started_at desc
        limit 1
        """
    )

    row = cur.fetchone()

    if row:
        return row[0]

    cur.execute(
        """
        insert into live_events (
            title,
            status,
            note,
            event_date,
            started_at
        )
        values (
            %s,
            'active',
            %s,
            (now() at time zone 'Asia/Ho_Chi_Minh')::date,
            now()
        )
        returning id
        """,
        (
            title or "Buổi live hôm nay",
            "Tự tạo khi kết nối nền tảng live trong ngày hiện tại",
        ),
    )

    return cur.fetchone()[0]


    row = cur.fetchone()

    if row:
        return row[0]

    cur.execute(
        """
        insert into live_events (title, status, note)
        values (%s, 'active', %s)
        returning id
        """,
        (
            title or "Buổi live tổng hợp",
            "Tự tạo khi kết nối nền tảng live",
        ),
    )

    return cur.fetchone()[0]

def find_active_session_by_external_live(platform: str, external_live_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select
                    id,
                    title,
                    platform,
                    status,
                    external_live_id,
                    connection_status,
                    started_at
                from live_sessions
                where platform = %s
                  and external_live_id = %s
                  and status = 'active'
                order by started_at desc
                limit 1
                """,
                (
                    platform,
                    external_live_id,
                ),
            )

            row = cur.fetchone()

            if not row:
                return None

            return row_to_session(row)



def create_live_session(
    platform: str,
    title: str,
    external_live_id: str | None = None,
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            live_event_id = get_or_create_active_live_event(cur, title)

            cur.execute(
                """
                insert into live_sessions (
                    title,
                    platform,
                    status,
                    external_live_id,
                    connection_status,
                    started_at,
                    live_event_id
                )
                values (%s, %s, 'active', %s, 'connecting', now(), %s)
                returning
                    id,
                    title,
                    platform,
                    status,
                    external_live_id,
                    connection_status,
                    started_at,
                    live_event_id
                """,
                (
                    title,
                    platform,
                    external_live_id,
                    live_event_id,
                ),
            )

            row = cur.fetchone()
            conn.commit()

            return row_to_session(row)

def cancel_existing_task(session_id: str):
    task = ACTIVE_TASKS.get(session_id)

    if task and not task.done():
        return task

    return None


def ensure_facebook_task(session_id: str, live_video_id: str):
    current_task = cancel_existing_task(session_id)

    if current_task:
        return current_task

    task = asyncio.create_task(
        run_facebook_comment_poller(
            session_id=session_id,
            live_video_id=live_video_id,
        )
    )

    ACTIVE_TASKS[session_id] = task

    return task


def get_live_session_connection_state(session_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select connection_status, last_error
                from live_sessions
                where id = %s
                """,
                (session_id,),
            )

            row = cur.fetchone()

            if not row:
                return None, None

            return row[0], row[1]


def mark_live_session_connect_failed(session_id: str, message: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update live_sessions
                set status = 'ended',
                    connection_status = 'error',
                    last_error = %s,
                    ended_at = now()
                where id = %s
                """,
                (message, session_id),
            )

            conn.commit()


async def wait_tiktok_connect_result(session_id: str, seconds: float = 5):
    attempts = max(1, int(seconds / 0.5))

    for _ in range(attempts):
        await asyncio.sleep(0.5)

        connection_status, last_error = get_live_session_connection_state(session_id)

        if connection_status == "connected":
            return "connected", None

        if connection_status == "error":
            return "error", last_error

        if connection_status == "ended":
            return "ended", last_error

    return "connecting", None


@router.get("")
def get_live_sessions():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                with base as (
                    select
                        ls.id,
                        ls.title,
                        ls.platform,
                        ls.status,
                        ls.external_live_id,
                        ls.connection_status,
                        ls.connected_at,
                        ls.last_error,
                        ls.started_at,
                        count(lc.id) as comment_count
                    from live_sessions ls
                    left join live_comments lc on lc.session_id = ls.id
                    group by
                        ls.id,
                        ls.title,
                        ls.platform,
                        ls.status,
                        ls.external_live_id,
                        ls.connection_status,
                        ls.connected_at,
                        ls.last_error,
                        ls.started_at
                ),
                ranked as (
                    select
                        *,
                        coalesce(nullif(external_live_id, ''), id::text) as live_key,
                        row_number() over (
                            partition by platform, coalesce(nullif(external_live_id, ''), id::text)
                            order by
                                case when status = 'active' then 0 else 1 end,
                                started_at desc nulls last,
                                id desc
                        ) as rn,
                        sum(comment_count) over (
                            partition by platform, coalesce(nullif(external_live_id, ''), id::text)
                        ) as total_comment_count,
                        count(*) over (
                            partition by platform, coalesce(nullif(external_live_id, ''), id::text)
                        ) as duplicate_count,
                        array_agg(id::text) over (
                            partition by platform, coalesce(nullif(external_live_id, ''), id::text)
                        ) as merged_session_ids
                    from base
                )
                select
                    id,
                    title,
                    platform,
                    status,
                    external_live_id,
                    connection_status,
                    connected_at,
                    last_error,
                    started_at,
                    total_comment_count,
                    duplicate_count,
                    merged_session_ids
                from ranked
                where rn = 1
                order by started_at desc nulls last
                limit 100
                """
            )

            rows = cur.fetchall()

            return [
                {
                    "id": str(row[0]),
                    "title": row[1],
                    "platform": row[2],
                    "status": row[3],
                    "external_live_id": row[4],
                    "connection_status": row[5],
                    "connected_at": row[6].isoformat() if row[6] else None,
                    "last_error": row[7],
                    "started_at": row[8].isoformat() if row[8] else None,
                    "comment_count": int(row[9] or 0),
                    "duplicate_count": int(row[10] or 1),
                    "merged_session_ids": row[11] or [],
                    "merged": int(row[10] or 1) > 1,
                }
                for row in rows
            ]


@router.post("/connect/facebook")
async def connect_facebook_live(payload: ConnectFacebookPayload):
    clean_live_video_id = (payload.live_video_id or "").strip()

    if clean_live_video_id:
        live_video_id = clean_live_video_id
        title = payload.title or f"Facebook Video {live_video_id}"
    else:
        try:
            current_live = await find_current_facebook_live()
        except RuntimeError as exc:
            error_text = str(exc)
            lowered_error = error_text.lower()

            if (
                "session has expired" in lowered_error
                or "error validating access token" in lowered_error
                or "\"code\":190" in error_text
                or '"code":190' in error_text
                or "oauth" in lowered_error
            ):
                raise HTTPException(
                    status_code=401,
                    detail="Token Facebook đã hết hạn. Hãy cập nhật lại Page Access Token trong file .env rồi kết nối lại.",
                )

            raise HTTPException(
                status_code=400,
                detail="Không thể kiểm tra Facebook Live. Hãy kiểm tra Page ID, Page Access Token và quyền Facebook rồi thử lại.",
            )

        if not current_live:
            raise HTTPException(status_code=404, detail=NO_FACEBOOK_LIVE_MESSAGE)

        live_video_id = current_live.get("id")
        title = (
            payload.title
            or current_live.get("title")
            or f"Facebook Live {live_video_id}"
        )

    existing_session = find_active_session_by_external_live(
        platform="facebook",
        external_live_id=live_video_id,
    )

    if existing_session:
        session = existing_session
        session["reused"] = True
    else:
        session = create_live_session(
            platform="facebook",
            title=title,
            external_live_id=live_video_id,
        )
        session["reused"] = False

    ensure_facebook_task(
        session_id=session["id"],
        live_video_id=live_video_id,
    )

    try:
        initial_count = await asyncio.wait_for(
            seed_facebook_comments_once(
                session_id=session["id"],
                live_video_id=live_video_id,
                limit=15,
            ),
            timeout=3,
        )
        session["initial_comment_count"] = initial_count
    except Exception as error:
        print("[Facebook Connect] Seed skipped/timeout:", error)
        session["initial_comment_count"] = 0
        session["seed_warning"] = "Seed is running in background."

    return session


@router.post("/connect/tiktok")
async def connect_tiktok_live(payload: ConnectTikTokPayload):
    if run_tiktok_comment_listener is None:
        raise HTTPException(
            status_code=400,
            detail="TikTokLive package chưa được cài trong backend venv.",
        )

    username = (payload.username or "").replace("@", "").strip()

    if not username:
        raise HTTPException(status_code=400, detail="Vui lòng nhập username TikTok.")

    existing_session = find_active_session_by_external_live(
        platform="tiktok",
        external_live_id=username,
    )

    if existing_session:
        existing_session["reused"] = True
        return existing_session

    session = create_live_session(
        platform="tiktok",
        title=payload.title or f"TikTok Live @{username}",
        external_live_id=username,
    )

    task = asyncio.create_task(
        run_tiktok_comment_listener(
            session_id=session["id"],
            username=username,
        )
    )

    ACTIVE_TASKS[session["id"]] = task

    connection_status, last_error = await wait_tiktok_connect_result(
        session_id=session["id"],
        seconds=5,
    )

    if connection_status in ["error", "ended"]:
        task.cancel()
        ACTIVE_TASKS.pop(session["id"], None)

        message = NO_TIKTOK_LIVE_MESSAGE

        if last_error:
            lowered_error = str(last_error).lower()

            if "not live" in lowered_error or "offline" in lowered_error:
                message = NO_TIKTOK_LIVE_MESSAGE
            else:
                message = f"{NO_TIKTOK_LIVE_MESSAGE} Chi ti?t: {last_error}"

        mark_live_session_connect_failed(session["id"], message)

        raise HTTPException(status_code=404, detail=message)

    session["reused"] = False
    session["connection_status"] = connection_status

    return session


@router.post("/{session_id}/end")
def end_live_session(session_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update live_sessions
                set status = 'ended',
                    connection_status = 'ended',
                    ended_at = now()
                where id = %s
                returning id
                """,
                (session_id,),
            )

            row = cur.fetchone()
            conn.commit()

            if not row:
                raise HTTPException(status_code=404, detail=NO_LIVE_SESSION_MESSAGE)

    task = ACTIVE_TASKS.pop(session_id, None)

    if task:
        task.cancel()

    return {
        "id": session_id,
        "status": "ended",
    }


@router.get("/{session_id}/comments")
def get_live_comments(session_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select
                    id,
                    session_id,
                    platform,
                    external_comment_id,
                    customer_name,
                    customer_avatar,
                    customer_platform_id,
                    message,
                    status,
                    created_at,
                    order_id
                from live_comments
                where session_id = %s
                order by created_at desc
                limit 300
                """,
                (session_id,),
            )

            rows = cur.fetchall()

            return [
                {
                    "id": str(row[0]),
                    "session_id": str(row[1]),
                    "platform": row[2],
                    "external_comment_id": row[3],
                    "customer_name": row[4],
                    "customer_avatar": row[5],
                    "customer_platform_id": row[6],
                    "message": row[7],
                    "status": row[8],
                    "created_at": row[9].isoformat() if row[9] else None,
                    "order_id": str(row[10]) if row[10] else None,
                }
                for row in rows
            ]
