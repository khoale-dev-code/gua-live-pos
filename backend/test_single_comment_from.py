import os
import json
import httpx
from dotenv import load_dotenv
from app.services.database import get_connection

load_dotenv(".env")

TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
VERSION = os.getenv("FACEBOOK_GRAPH_VERSION", "v25.0")
GRAPH = f"https://graph.facebook.com/{VERSION}"

SESSION_ID = "8b5537ac-dc0f-4f93-a716-b11255d4040d"

with get_connection() as conn:
    with conn.cursor() as cur:
        cur.execute(
            """
            select external_comment_id, message
            from live_comments
            where session_id = %s
              and external_comment_id is not null
            order by created_at asc
            limit 5
            """,
            (SESSION_ID,),
        )

        rows = cur.fetchall()

for comment_id, message in rows:
    print("=" * 80)
    print("Comment ID:", comment_id)
    print("Message:", message)

    url = f"{GRAPH}/{comment_id}"

    response = httpx.get(
        url,
        params={
            "fields": "id,from{id,name,picture},message,created_time,permalink_url",
            "access_token": TOKEN,
        },
        timeout=20,
    )

    print("Status:", response.status_code)
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))