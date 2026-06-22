from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.database import get_connection

router = APIRouter(prefix="/api/live-events", tags=["Live Events"])


class LiveEventCreate(BaseModel):
    title: str | None = None
    note: str | None = None


def platform_label(platform: str | None):
    value = (platform or "").lower()

    if value == "facebook":
        return "Facebook"

    if value == "tiktok":
        return "TikTok"

    return platform or "Không rõ"


def event_row_to_dict(row):
    return {
        "id": str(row[0]),
        "title": row[1],
        "status": row[2],
        "note": row[3],
        "started_at": row[4].isoformat() if row[4] else None,
        "ended_at": row[5].isoformat() if row[5] else None,
        "session_count": int(row[6] or 0),
        "comment_count": int(row[7] or 0),
        "facebook_count": int(row[8] or 0),
        "tiktok_count": int(row[9] or 0),
        "platforms": row[10] or [],
    }



def get_or_create_active_event(cur, title: str | None = None):
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
            event_date,
            note,
            started_at
        )
        values (
            %s,
            'active',
            (now() at time zone 'Asia/Ho_Chi_Minh')::date,
            %s,
            now()
        )
        returning id
        """,
        (
            title or "Buổi live hôm nay",
            "Tự tạo cho ngày hiện tại",
        ),
    )

    return cur.fetchone()[0]


@router.get("")
def get_live_events():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select
                    le.id,
                    le.title,
                    le.status,
                    le.note,
                    le.started_at,
                    le.ended_at,
                    count(distinct ls.id) as session_count,
                    count(lc.id) as comment_count,
                    count(lc.id) filter (where lc.platform = 'facebook') as facebook_count,
                    count(lc.id) filter (where lc.platform = 'tiktok') as tiktok_count,
                    coalesce(
                        array_remove(array_agg(distinct ls.platform), null),
                        '{}'
                    ) as platforms
                from live_events le
                left join live_sessions ls on ls.live_event_id = le.id
                left join live_comments lc on lc.session_id = ls.id
                group by
                    le.id,
                    le.title,
                    le.status,
                    le.note,
                    le.started_at,
                    le.ended_at
                order by le.started_at desc
                limit 100
                """
            )

            return [event_row_to_dict(row) for row in cur.fetchall()]


@router.post("")
def create_live_event(payload: LiveEventCreate):
    title = (payload.title or "").strip() or "Buổi live tổng hợp"

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into live_events (title, status, note, event_date, started_at)
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
                    title,
                    payload.note,
                ),
            )

            event_id = cur.fetchone()[0]
            conn.commit()

            return {
                "id": str(event_id),
                "title": title,
                "status": "active",
            }


@router.post("/active")
def get_active_live_event():
    with get_connection() as conn:
        with conn.cursor() as cur:
            event_id = get_or_create_active_event(cur)
            conn.commit()

            cur.execute(
                """
                select
                    le.id,
                    le.title,
                    le.status,
                    le.note,
                    le.started_at,
                    le.ended_at,
                    count(distinct ls.id) as session_count,
                    count(lc.id) as comment_count,
                    count(lc.id) filter (where lc.platform = 'facebook') as facebook_count,
                    count(lc.id) filter (where lc.platform = 'tiktok') as tiktok_count,
                    coalesce(
                        array_remove(array_agg(distinct ls.platform), null),
                        '{}'
                    ) as platforms
                from live_events le
                left join live_sessions ls on ls.live_event_id = le.id
                left join live_comments lc on lc.session_id = ls.id
                where le.id = %s
                group by
                    le.id,
                    le.title,
                    le.status,
                    le.note,
                    le.started_at,
                    le.ended_at
                """,
                (event_id,),
            )

            return event_row_to_dict(cur.fetchone())


@router.post("/{event_id}/attach-active-sessions")
def attach_active_sessions(event_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select id
                from live_events
                where id = %s
                """,
                (event_id,),
            )

            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Không tìm thấy buổi live.")

            cur.execute(
                """
                update live_sessions
                set live_event_id = %s
                where status = 'active'
                  and (coalesce(started_at, now()) at time zone 'Asia/Ho_Chi_Minh')::date = (
                    select event_date
                    from live_events
                    where id = %s
                  )
                  and (
                    live_event_id is null
                    or live_event_id = %s
                  )
                returning id
                """,
                (
                    event_id,
                    event_id,
                    event_id,
                ),
            )

            rows = cur.fetchall()
            conn.commit()

            return {
                "ok": True,
                "event_id": event_id,
                "attached_count": len(rows),
                "session_ids": [str(row[0]) for row in rows],
            }


@router.get("/{event_id}/comments")
def get_live_event_comments(event_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select
                    le.id,
                    le.title,
                    le.status,
                    le.started_at,
                    count(distinct ls.id) as session_count,
                    count(lc.id) as comment_count,
                    count(lc.id) filter (where lc.platform = 'facebook') as facebook_count,
                    count(lc.id) filter (where lc.platform = 'tiktok') as tiktok_count
                from live_events le
                left join live_sessions ls on ls.live_event_id = le.id
                left join live_comments lc on lc.session_id = ls.id
                where le.id = %s
                group by le.id, le.title, le.status, le.started_at
                """,
                (event_id,),
            )

            event = cur.fetchone()

            if not event:
                raise HTTPException(status_code=404, detail="Không tìm thấy buổi live.")

            cur.execute(
                """
                select
                    lc.id,
                    lc.session_id,
                    lc.platform,
                    lc.external_comment_id,
                    lc.customer_name,
                    lc.customer_avatar,
                    lc.customer_platform_id,
                    lc.message,
                    lc.status,
                    lc.created_at,
                    lc.order_id,
                    ls.title as session_title,
                    ls.external_live_id
                from live_comments lc
                join live_sessions ls on ls.id = lc.session_id
                join live_events le on le.id = ls.live_event_id
                where ls.live_event_id = %s
                  and (
                    le.event_date is null
                    or (coalesce(ls.started_at, now()) at time zone 'Asia/Ho_Chi_Minh')::date = le.event_date
                  )
                order by lc.created_at desc
                limit 500
                """,
                (event_id,),
            )

            rows = cur.fetchall()

            return {
                "event": {
                    "id": str(event[0]),
                    "title": event[1],
                    "status": event[2],
                    "started_at": event[3].isoformat() if event[3] else None,
                    "session_count": int(event[4] or 0),
                    "comment_count": int(event[5] or 0),
                    "facebook_count": int(event[6] or 0),
                    "tiktok_count": int(event[7] or 0),
                },
                "comments": [
                    {
                        "id": str(row[0]),
                        "session_id": str(row[1]),
                        "platform": row[2],
                        "platform_label": platform_label(row[2]),
                        "external_comment_id": row[3],
                        "customer_name": row[4],
                        "customer_avatar": row[5],
                        "customer_platform_id": row[6],
                        "message": row[7],
                        "status": row[8],
                        "created_at": row[9].isoformat() if row[9] else None,
                        "order_id": str(row[10]) if row[10] else None,
                        "session_title": row[11],
                        "external_live_id": row[12],
                    }
                    for row in rows
                ],
            }


@router.put("/{event_id}/end")
def end_live_event(event_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update live_events
                set status = 'ended',
                    ended_at = now(),
                    updated_at = now()
                where id = %s
                returning id
                """,
                (event_id,),
            )

            row = cur.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy buổi live.")

            cur.execute(
                """
                update live_sessions
                set status = 'ended',
                    connection_status = 'ended',
                    ended_at = now()
                where live_event_id = %s
                  and status = 'active'
                """,
                (event_id,),
            )

            conn.commit()

            return {
                "id": event_id,
                "status": "ended",
            }
