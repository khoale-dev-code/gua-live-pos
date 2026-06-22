import json
from typing import Any

from psycopg.types.json import Jsonb

from app.services.database import get_connection


def insert_live_comment(
    session_id: str,
    platform: str,
    external_comment_id: str | None,
    customer_name: str | None,
    customer_avatar: str | None = None,
    customer_platform_id: str | None = None,
    message: str = "",
    raw_data: dict[str, Any] | None = None,
):
    if not message and not raw_data:
        return None

    raw_data = raw_data or {}

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into live_comments (
                    session_id,
                    platform,
                    external_comment_id,
                    customer_name,
                    customer_avatar,
                    customer_platform_id,
                    message,
                    status,
                    raw_data,
                    created_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, 'new', %s, now())
                on conflict (platform, external_comment_id)
                where external_comment_id is not null
                do update set
                    customer_name = coalesce(excluded.customer_name, live_comments.customer_name),
                    customer_avatar = coalesce(excluded.customer_avatar, live_comments.customer_avatar),
                    customer_platform_id = coalesce(excluded.customer_platform_id, live_comments.customer_platform_id),
                    message = coalesce(nullif(excluded.message, ''), live_comments.message),
                    raw_data = excluded.raw_data
                returning id
                """,
                (
                    session_id,
                    platform,
                    external_comment_id,
                    customer_name,
                    customer_avatar,
                    customer_platform_id,
                    message,
                    Jsonb(raw_data),
                ),
            )

            row = cur.fetchone()
            conn.commit()

            return str(row[0]) if row else None


def is_live_session_active(session_id: str) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select status
                from live_sessions
                where id = %s
                """,
                (session_id,),
            )

            row = cur.fetchone()

            if not row:
                return False

            return row[0] == "active"


def mark_session_connected(session_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update live_sessions
                set connection_status = 'connected',
                    connected_at = now(),
                    last_error = null
                where id = %s
                """,
                (session_id,),
            )

            conn.commit()


def mark_session_error(session_id: str, message: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update live_sessions
                set connection_status = 'error',
                    last_error = %s
                where id = %s
                """,
                (message, session_id),
            )

            conn.commit()


def mark_session_ended(session_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update live_sessions
                set status = 'ended',
                    connection_status = 'ended',
                    ended_at = now()
                where id = %s
                """,
                (session_id,),
            )

            conn.commit()