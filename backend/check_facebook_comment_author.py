import os
import json
import re
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


def safe_print_json(data):
    text = json.dumps(data, ensure_ascii=False, indent=2)

    if TOKEN:
        text = text.replace(TOKEN, "***TOKEN_HIDDEN***")

    print(text)


def extract_video_object_id(permalink_url=""):
    # Ví dụ: /1457911059469427/videos/986480887704157
    match = re.search(r"/videos/(\d+)", permalink_url or "")

    if match:
        return match.group(1)

    return None


def get_json(path, params=None):
    params = params or {}
    params["access_token"] = TOKEN

    response = httpx.get(
        f"{GRAPH}/{path}",
        params=params,
        timeout=30,
    )

    try:
        payload = response.json()
    except Exception:
        payload = {"raw": response.text}

    return response.status_code, payload


print("PAGE_ID:", PAGE_ID)
print("Đang lấy live videos...")

status, payload = get_json(
    f"{PAGE_ID}/live_videos",
    {
        "fields": "id,title,status,creation_time,permalink_url",
        "limit": 3,
    },
)

print("Live videos status:", status)
safe_print_json(payload)

videos = payload.get("data") or []

for video in videos:
    live_video_id = video.get("id")
    permalink_url = video.get("permalink_url")
    video_object_id = extract_video_object_id(permalink_url)

    print("\n==============================")
    print("Live video ID:", live_video_id)
    print("Video object ID từ permalink:", video_object_id)
    print("Status:", video.get("status"))
    print("Permalink:", permalink_url)

    targets = [
        ("live_video_id", live_video_id),
        ("video_object_id", video_object_id),
    ]

    for label, target_id in targets:
        if not target_id:
            continue

        print(f"\n--- Test comments bằng {label}: {target_id} ---")

        c_status, c_payload = get_json(
            f"{target_id}/comments",
            {
                "fields": "id,message,created_time,from{id,name}",
                "order": "reverse_chronological",
                "limit": 5,
            },
        )

        print("Comment status:", c_status)
        safe_print_json(c_payload)

        comments = c_payload.get("data") or []

        if comments:
            first_comment_id = comments[0].get("id")

            print(f"\n--- Test đọc trực tiếp comment ID: {first_comment_id} ---")

            d_status, d_payload = get_json(
                first_comment_id,
                {
                    "fields": "id,message,created_time,from{id,name},parent",
                },
            )

            print("Direct comment status:", d_status)
            safe_print_json(d_payload)

            has_from = any("from" in item for item in comments)
            print("Có field from trong danh sách comment không?", has_from)

            if "from" in d_payload:
                print("Đọc trực tiếp comment có from:", d_payload["from"])
            else:
                print("Đọc trực tiếp comment vẫn KHÔNG có from.")
