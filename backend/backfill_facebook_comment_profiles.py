import asyncio
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

from app.services.database import get_connection

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

FACEBOOK_GRAPH_VERSION = os.getenv("FACEBOOK_GRAPH_VERSION", "v25.0")
FACEBOOK_PAGE_ACCESS_TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")

GRAPH_BASE_URL = f"https://graph.facebook.com/{FACEBOOK_GRAPH_VERSION}"


async def get_avatar(client, facebook_user_id):
    if not facebook_user_id:
        return None

    try:
        response = await client.get(
            f"{GRAPH_BASE_URL}/{facebook_user_id}/picture",
            params={
                "type": "normal",
                "redirect": "false",
                "access_token": FACEBOOK_PAGE_ACCESS_TOKEN,
            },
            timeout=20,
        )

        if response.status_code >= 400:
            return None

        payload = response.json()
        data = payload.get("data") or {}

        return data.get("url")

    except Exception:
        return None


async def fetch_facebook_comments(video_id):
    comments = []

    url = f"{GRAPH_BASE_URL}/{video_id}/comments"

    params = {
        "fields": "id,from{id,name},message,created_time",
        "order": "chronological",
        "limit": 100,
        "access_token": FACEBOOK_PAGE_ACCESS_TOKEN,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        while url:
            response = await client.get(url, params=params)

            if response.status_code >= 400:
                raise RuntimeError(response.text)

            payload = response.json()
            data = payload.get("data", [])

            for comment in data:
                from_user = comment.get("from") or {}
                facebook_user_id = from_user.get("id")
                avatar = await get_avatar(client, facebook_user_id)
                comment["_avatar"] = avatar
                comments.append(comment)

            paging = payload.get("paging") or {}
            url = paging.get("next")
            params = None

            if len(comments) >= 1000:
                break

    return comments


def get_session_video_id(session_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select external_live_id, title
                from live_sessions
                where id = %s
                """,
                (session_id,),
            )

            row = cur.fetchone()

            if not row:
                raise RuntimeError("Không tìm thấy phiên live.")

            return row[0], row[1]


async def main():
    if len(sys.argv) < 2:
        raise RuntimeError("Vui lòng truyền session_id. Ví dụ: python backfill_facebook_comment_profiles.py <session_id>")

    session_id = sys.argv[1]

    if not FACEBOOK_PAGE_ACCESS_TOKEN:
        raise RuntimeError("Missing FACEBOOK_PAGE_ACCESS_TOKEN trong .env")

    video_id, title = get_session_video_id(session_id)

    if not video_id:
        raise RuntimeError("Phiên live này không có external_live_id.")

    print("Session:", session_id)
    print("Title:", title)
    print("Facebook video/live ID:", video_id)
    print("Đang lấy comment từ Facebook...")

    comments = await fetch_facebook_comments(video_id)

    updated = 0
    missing_from = 0
    not_found = 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            for comment in comments:
                external_comment_id = comment.get("id")
                from_user = comment.get("from") or {}

                facebook_user_id = from_user.get("id")
                facebook_name = from_user.get("name")
                avatar = comment.get("_avatar")

                if not facebook_user_id and not facebook_name:
                    missing_from += 1
                    continue

                cur.execute(
                    """
                    update live_comments
                    set customer_name = %s,
                        customer_platform_id = %s,
                        customer_avatar = %s,
                        raw_data = %s
                    where session_id = %s
                      and external_comment_id = %s
                    returning id
                    """,
                    (
                        facebook_name,
                        facebook_user_id,
                        avatar,
                        str(comment),
                        session_id,
                        external_comment_id,
                    ),
                )

                row = cur.fetchone()

                if row:
                    updated += 1
                else:
                    not_found += 1

            conn.commit()

    print("Tổng comment Facebook lấy được:", len(comments))
    print("Đã cập nhật tên/avatar:", updated)
    print("Không có field from:", missing_from)
    print("Không tìm thấy comment trong DB:", not_found)


if __name__ == "__main__":
    asyncio.run(main())