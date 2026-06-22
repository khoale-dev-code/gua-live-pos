import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
VERSION = os.getenv("FACEBOOK_GRAPH_VERSION", "v25.0")

comment_ids = [
    "1045525354697247_1311352031172489",
    "1311352031172489",
]

if not TOKEN:
    raise RuntimeError("Thiếu FACEBOOK_PAGE_ACCESS_TOKEN trong .env")

for comment_id in comment_ids:
    print("=" * 80)
    print("TEST COMMENT ID:", comment_id)

    url = f"https://graph.facebook.com/{VERSION}/{comment_id}"
    params = {
        "fields": "id,message,created_time,from{id,name}",
        "access_token": TOKEN,
    }

    res = requests.get(url, params=params, timeout=20)
    print("STATUS:", res.status_code)

    try:
        print(json.dumps(res.json(), ensure_ascii=False, indent=2))
    except Exception:
        print(res.text)
