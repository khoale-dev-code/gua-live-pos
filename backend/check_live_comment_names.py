import os
import json
import uuid
import httpx
from dotenv import load_dotenv

from app.services.database import get_connection

load_dotenv(".env")

TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
VERSION = os.getenv("FACEBOOK_GRAPH_VERSION", "v25.0")


def is_uuid(value):
    try:
        uuid.UUID(value)
        return True
    except Exception:
        return False


def resolve_facebook_live_id(value):
    if not is_uuid(value):
        return value

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select platform, external_live_id, title
                from live_sessions
                where id = %s
                """,
                (value,),
            )
            row = cur.fetchone()

            if not row:
                raise SystemExit("Không tìm thấy session_id này trong live_sessions.")

            platform, external_live_id, title = row

            print("Đây là session nội bộ.")
            print("Platform:", platform)
            print("Title:", title)
            print("external_live_id:", external_live_id)

            if platform != "facebook":
                raise SystemExit("Session này không phải Facebook live.")

            if not external_live_id:
                raise SystemExit("Session này chưa có external_live_id Facebook.")

            return external_live_id


raw_id = input("Nhập Session ID hoặc Facebook live_video_id: ").strip()
LIVE_VIDEO_ID = resolve_facebook_live_id(raw_id)

url = f"https://graph.facebook.com/{VERSION}/{LIVE_VIDEO_ID}/comments"

params = {
    "fields": "id,message,created_time,from{id,name}",
    "order": "reverse_chronological",
    "limit": 10,
    "access_token": TOKEN,
}

res = httpx.get(url, params=params, timeout=30)

print("Graph object ID:", LIVE_VIDEO_ID)
print("Status:", res.status_code)

payload = res.json()
text = json.dumps(payload, ensure_ascii=False, indent=2)

if TOKEN:
    text = text.replace(TOKEN, "***TOKEN_HIDDEN***")

print(text)

data = payload.get("data") or []
has_from = any("from" in item for item in data)

print("\nCó field from không?", has_from)
