FACEBOOK_TOKEN_EXPIRED_MESSAGE = "Token Facebook ?? h?t h?n. H?y c?p nh?t l?i FACEBOOK_PAGE_ACCESS_TOKEN trong file .env r?i restart backend."

import asyncio
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from psycopg.types.json import Jsonb

from app.services.database import get_connection
from app.services.live_comment_service import (
    is_live_session_active,
    mark_session_connected,
    mark_session_ended,
    mark_session_error,
)

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

FACEBOOK_GRAPH_VERSION = os.getenv("FACEBOOK_GRAPH_VERSION", "v25.0")
FACEBOOK_PAGE_ID = os.getenv("FACEBOOK_PAGE_ID")
FACEBOOK_PAGE_ACCESS_TOKEN = (
    os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
    or os.getenv("FACEBOOK_ACCESS_TOKEN")
)

GRAPH_BASE_URL = f"https://graph.facebook.com/{FACEBOOK_GRAPH_VERSION}"

SESSION_SEEN_COMMENT_IDS: dict[str, set[str]] = {}


def validate_facebook_config():
    missing = []

    if not FACEBOOK_PAGE_ID:
        missing.append("FACEBOOK_PAGE_ID")

    if not FACEBOOK_PAGE_ACCESS_TOKEN:
        missing.append("FACEBOOK_PAGE_ACCESS_TOKEN")

    if missing:
        raise RuntimeError(
            "Missing Facebook config: "
            + ", ".join(missing)
            + f". Checked env file at: {ENV_PATH}"
        )


async def find_current_facebook_live():
    validate_facebook_config()

    url = f"{GRAPH_BASE_URL}/{FACEBOOK_PAGE_ID}/live_videos"

    params = {
        "fields": "id,title,status,creation_time,permalink_url",
        "limit": 10,
        "access_token": FACEBOOK_PAGE_ACCESS_TOKEN,
    }

    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.get(url, params=params)

        if response.status_code >= 400:
            raise RuntimeError(response.text)

        videos = response.json().get("data", [])

    print("[Facebook] live_videos count:", len(videos))

    for item in videos:
        status = str(item.get("status") or "").upper()

        if status in ["LIVE", "LIVE_NOW"]:
            print("[Facebook] Found current live:", item.get("id"))
            return item

    print("[Facebook] No current LIVE video found.")
    return None


async def fetch_facebook_comments(live_video_id: str, limit: int = 25):
    validate_facebook_config()

    url = f"{GRAPH_BASE_URL}/{live_video_id}/comments"

    params = {
        "fields": "id,from{id,name},message,created_time",
        "order": "reverse_chronological",
        "limit": limit,
        "access_token": FACEBOOK_PAGE_ACCESS_TOKEN,
    }

    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.get(url, params=params)

        if response.status_code >= 400:
            raise RuntimeError(response.text)

        payload = response.json()

    return payload.get("data", [])


def get_existing_comment_ids(session_id: str, limit: int = 1000):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select external_comment_id
                from live_comments
                where session_id = %s
                  and external_comment_id is not null
                order by created_at desc
                limit %s
                """,
                (
                    session_id,
                    limit,
                ),
            )

            rows = cur.fetchall()

            return {row[0] for row in rows if row[0]}




def fallback_facebook_customer_name(comment_id: str | None):
    clean = str(comment_id or "").strip()

    if "_" in clean:
        suffix = clean.split("_")[-1]
    else:
        suffix = clean[-6:]

    if suffix:
        return f"Khách Facebook #{suffix[-6:]}"

    return "Khách Facebook"


def save_facebook_comments_batch(
    session_id: str,
    comments: list[dict],
    seen_ids: set[str] | None = None,
):
    if not comments:
        return 0

    rows_to_upsert = []

    for comment in comments:
        external_comment_id = comment.get("id")
        message = comment.get("message") or ""

        if not external_comment_id and not message:
            continue

        if seen_ids is not None and external_comment_id in seen_ids:
            continue

        from_user = comment.get("from") or {}

        customer_name = (
            from_user.get("name")
            or comment.get("sender_name")
            or comment.get("user_name")
            or fallback_facebook_customer_name(external_comment_id)
        )

        customer_platform_id = (
            from_user.get("id")
            or comment.get("sender_id")
            or comment.get("from_id")
            or comment.get("user_id")
        )

        rows_to_upsert.append(
            (
                session_id,
                external_comment_id,
                customer_name,
                customer_platform_id,
                message,
                Jsonb(comment),
            )
        )

    if not rows_to_upsert:
        return 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.executemany(
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
                values (%s, 'facebook', %s, %s, null, %s, %s, 'new', %s, now())
                on conflict (platform, external_comment_id)
                where external_comment_id is not null
                do update set
                    customer_name = coalesce(
                        nullif(excluded.customer_name, ''),
                        live_comments.customer_name
                    ),
                    customer_platform_id = coalesce(
                        nullif(excluded.customer_platform_id, ''),
                        live_comments.customer_platform_id
                    ),
                    message = coalesce(
                        nullif(excluded.message, ''),
                        live_comments.message
                    ),
                    raw_data = excluded.raw_data
                """,
                rows_to_upsert,
            )

            conn.commit()

    if seen_ids is not None:
        for row in rows_to_upsert:
            if row[1]:
                seen_ids.add(row[1])

    return len(rows_to_upsert)

async def seed_facebook_comments_once(
    session_id: str,
    live_video_id: str,
    limit: int = 25,
):
    seen_ids = SESSION_SEEN_COMMENT_IDS.setdefault(
        session_id,
        get_existing_comment_ids(session_id),
    )

    comments = await fetch_facebook_comments(live_video_id, limit=limit)

    saved = save_facebook_comments_batch(
        session_id=session_id,
        comments=comments,
        seen_ids=seen_ids,
    )

    print(
        f"[Facebook Seed] session={session_id} fetched={len(comments)} new_saved={saved}"
    )

    return saved


async def run_facebook_comment_poller(session_id: str, live_video_id: str):
    try:
        print(
            f"[Facebook Poller] START session={session_id} live_video_id={live_video_id}"
        )

        mark_session_connected(session_id)

        seen_ids = SESSION_SEEN_COMMENT_IDS.setdefault(
            session_id,
            get_existing_comment_ids(session_id),
        )

        while is_live_session_active(session_id):
            comments = await fetch_facebook_comments(live_video_id, limit=25)

            saved = save_facebook_comments_batch(
                session_id=session_id,
                comments=comments,
                seen_ids=seen_ids,
            )

            print(
                f"[Facebook Poller] session={session_id} fetched={len(comments)} new_saved={saved}"
            )

            await asyncio.sleep(2)

        mark_session_ended(session_id)

    except asyncio.CancelledError:
        print(f"[Facebook Poller] CANCELLED session={session_id}")
        raise

    except Exception as error:
        print(f"[Facebook Poller] ERROR session={session_id}: {error}")
        mark_session_error(session_id, str(error))