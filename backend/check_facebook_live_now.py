import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv(".env")

TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
PAGE_ID = os.getenv("FACEBOOK_PAGE_ID")
VERSION = os.getenv("FACEBOOK_GRAPH_VERSION", "v25.0")

if not TOKEN:
    raise RuntimeError("Missing FACEBOOK_PAGE_ACCESS_TOKEN")

if not PAGE_ID:
    raise RuntimeError("Missing FACEBOOK_PAGE_ID")

GRAPH = f"https://graph.facebook.com/{VERSION}"

print("PAGE_ID:", PAGE_ID)
print("Đang kiểm tra live videos...")

r = httpx.get(
    f"{GRAPH}/{PAGE_ID}/live_videos",
    params={
        "fields": "id,title,status,creation_time,permalink_url",
        "limit": 10,
        "access_token": TOKEN,
    },
    timeout=20,
)

print("Status:", r.status_code)
data = r.json()
print(json.dumps(data, ensure_ascii=False, indent=2))

print("\n===== KIỂM TRA COMMENT TỪNG LIVE VIDEO =====")

for item in data.get("data", []):
    video_id = item.get("id")
    title = item.get("title")
    status = item.get("status")

    print("\nVideo ID:", video_id)
    print("Title:", title)
    print("Status:", status)

    cr = httpx.get(
        f"{GRAPH}/{video_id}/comments",
        params={
            "fields": "id,message,created_time,from{id,name}",
            "order": "reverse_chronological",
            "limit": 5,
            "access_token": TOKEN,
        },
        timeout=20,
    )

    print("Comment API status:", cr.status_code)
    comment_payload = cr.json()
    comments = comment_payload.get("data", [])
    print("Comment count sample:", len(comments))
    print(json.dumps(comment_payload, ensure_ascii=False, indent=2))