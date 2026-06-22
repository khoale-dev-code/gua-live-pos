import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.database import get_connection

router = APIRouter(prefix="/api/live-games", tags=["Live Games"])


class DrawWinnerPayload(BaseModel):
    prize_product_id: str | None = None
    prize_product_name: str | None = None
    prize_quantity: int = Field(default=1, ge=1)
    participant_key: str | None = None
    exclude_previous_winners: bool = True


def to_int(value):
    return int(value or 0)


def column_exists(cur, table_name: str, column_name: str):
    cur.execute(
        """
        select exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = %s
              and column_name = %s
        )
        """,
        (table_name, column_name),
    )
    return bool(cur.fetchone()[0])


def ensure_live_game_tables(cur):
    # Khóa để tránh lỗi 2 request cùng tạo bảng.
    cur.execute("select pg_advisory_xact_lock(hashtext('gua_live_game_draws_schema_lock'))")
    cur.execute("create extension if not exists pgcrypto")

    cur.execute(
        """
        create table if not exists live_game_draws (
            id uuid primary key default gen_random_uuid(),
            session_id uuid not null references live_sessions(id) on delete cascade,

            draw_round integer not null default 1,

            prize_product_id uuid null references products(id),
            prize_product_name text,
            prize_quantity integer not null default 1,

            winner_key text not null,
            winner_name text,
            winner_avatar text,
            winner_platform text,
            winner_comment text,
            winner_comment_id uuid null references live_comments(id),

            created_at timestamptz not null default now()
        )
        """
    )

    cur.execute(
        """
        alter table live_game_draws
        add column if not exists draw_round integer not null default 1
        """
    )

    cur.execute(
        """
        create index if not exists idx_live_game_draws_session_id
        on live_game_draws(session_id, created_at desc)
        """
    )

    cur.execute(
        """
        create index if not exists idx_live_game_draws_session_round
        on live_game_draws(session_id, draw_round desc)
        """
    )


def get_session(cur, session_id: str):
    cur.execute(
        """
        select id, platform, title, external_live_id, status, connection_status
        from live_sessions
        where id = %s
        """,
        (session_id,),
    )

    row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên live.")

    return {
        "id": str(row[0]),
        "platform": row[1],
        "title": row[2],
        "external_live_id": row[3],
        "status": row[4],
        "connection_status": row[5],
    }


def serialize_draw(row):
    return {
        "id": str(row[0]),
        "session_id": str(row[1]),
        "draw_round": to_int(row[2]),
        "prize_product_id": str(row[3]) if row[3] else None,
        "prize_product_name": row[4],
        "prize_quantity": to_int(row[5]),
        "winner_key": row[6],
        "winner_name": row[7],
        "winner_avatar": row[8],
        "winner_platform": row[9],
        "winner_comment": row[10],
        "winner_comment_id": str(row[11]) if row[11] else None,
        "created_at": row[12].isoformat() if row[12] else None,
    }


def get_draw_rows(cur, session_id: str):
    ensure_live_game_tables(cur)

    cur.execute(
        """
        select
            id,
            session_id,
            draw_round,
            prize_product_id,
            prize_product_name,
            prize_quantity,
            winner_key,
            winner_name,
            winner_avatar,
            winner_platform,
            winner_comment,
            winner_comment_id,
            created_at
        from live_game_draws
        where session_id = %s
        order by draw_round desc, created_at desc
        """,
        (session_id,),
    )

    return [serialize_draw(row) for row in cur.fetchall()]


def get_participants(cur, session_id: str):
    # Quan trọng: chỉ lấy comment của đúng phiên live đang chọn.
    get_session(cur, session_id)
    ensure_live_game_tables(cur)

    cur.execute(
        """
        with scoped_comments as (
            select
                id,
                session_id,
                platform,
                message,
                customer_name,
                customer_avatar,
                customer_platform_id,
                external_comment_id,
                created_at,

                coalesce(
                    nullif(coalesce(platform, 'live') || ':user:' || coalesce(customer_platform_id, ''), coalesce(platform, 'live') || ':user:'),
                    nullif(coalesce(platform, 'live') || ':name:' || coalesce(customer_name, ''), coalesce(platform, 'live') || ':name:'),
                    nullif(coalesce(platform, 'live') || ':comment:' || coalesce(external_comment_id, ''), coalesce(platform, 'live') || ':comment:'),
                    coalesce(platform, 'live') || ':row:' || id::text
                ) as participant_key
            from live_comments
            where session_id = %s
              and nullif(message, '') is not null
        )
        select
            participant_key,
            platform,
            (
                array_remove(
                    array_agg(nullif(customer_name, '') order by created_at desc),
                    null
                )
            )[1] as customer_name,
            (
                array_remove(
                    array_agg(nullif(customer_avatar, '') order by created_at desc),
                    null
                )
            )[1] as customer_avatar,
            count(*) as comment_count,
            max(created_at) as last_commented_at,
            (array_agg(id order by created_at desc))[1] as latest_comment_id,
            (
                array_remove(
                    array_agg(nullif(message, '') order by created_at desc),
                    null
                )
            )[1] as latest_message
        from scoped_comments
        group by participant_key, platform
        order by last_commented_at desc
        limit 2000
        """,
        (session_id,),
    )

    rows = cur.fetchall()

    cur.execute(
        """
        select winner_key
        from live_game_draws
        where session_id = %s
        """,
        (session_id,),
    )

    previous_winner_keys = {row[0] for row in cur.fetchall()}

    participants = []

    for row in rows:
        participant_key = row[0]
        platform = row[1]
        customer_name = row[2]
        customer_avatar = row[3]
        comment_count = to_int(row[4])
        last_commented_at = row[5]
        latest_comment_id = row[6]
        latest_message = row[7]

        display_name = customer_name or f"Khách {platform or 'live'} #{str(participant_key)[-6:]}"

        participants.append(
            {
                "participant_key": participant_key,
                "platform": platform,
                "customer_name": customer_name,
                "display_name": display_name,
                "customer_avatar": customer_avatar,
                "comment_count": comment_count,
                "last_commented_at": last_commented_at.isoformat() if last_commented_at else None,
                "latest_comment_id": str(latest_comment_id) if latest_comment_id else None,
                "latest_message": latest_message,
                "is_previous_winner": participant_key in previous_winner_keys,
            }
        )

    return participants


def get_prize_info(cur, payload: DrawWinnerPayload):
    prize_product_id = payload.prize_product_id
    prize_product_name = payload.prize_product_name

    if prize_product_id:
        cur.execute(
            """
            select id, name
            from products
            where id = %s
            """,
            (prize_product_id,),
        )

        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm quà tặng.")

        prize_product_id = str(row[0])
        prize_product_name = row[1]

    if not prize_product_name:
        prize_product_name = "Quà livestream"

    return prize_product_id, prize_product_name


@router.get("/sessions")
def list_live_game_sessions():
    with get_connection() as conn:
        with conn.cursor() as cur:
            ensure_live_game_tables(cur)

            cur.execute(
                """
                select
                    ls.id,
                    ls.platform,
                    ls.title,
                    ls.external_live_id,
                    ls.status,
                    ls.connection_status,
                    ls.started_at,
                    (
                        select count(*)
                        from live_comments lc
                        where lc.session_id = ls.id
                    ) as comment_count,
                    (
                        select count(distinct coalesce(
                            nullif(coalesce(lc.platform, 'live') || ':user:' || coalesce(lc.customer_platform_id, ''), coalesce(lc.platform, 'live') || ':user:'),
                            nullif(coalesce(lc.platform, 'live') || ':name:' || coalesce(lc.customer_name, ''), coalesce(lc.platform, 'live') || ':name:'),
                            nullif(coalesce(lc.platform, 'live') || ':comment:' || coalesce(lc.external_comment_id, ''), coalesce(lc.platform, 'live') || ':comment:'),
                            coalesce(lc.platform, 'live') || ':row:' || lc.id::text
                        ))
                        from live_comments lc
                        where lc.session_id = ls.id
                          and nullif(lc.message, '') is not null
                    ) as participant_count,
                    (
                        select max(lc.created_at)
                        from live_comments lc
                        where lc.session_id = ls.id
                    ) as last_comment_at,
                    (
                        select count(*)
                        from live_game_draws lgd
                        where lgd.session_id = ls.id
                    ) as draw_count,
                    (
                        select max(lgd.created_at)
                        from live_game_draws lgd
                        where lgd.session_id = ls.id
                    ) as latest_draw_at
                from live_sessions ls
                order by coalesce(
                    (
                        select max(lc.created_at)
                        from live_comments lc
                        where lc.session_id = ls.id
                    ),
                    ls.started_at
                ) desc nulls last
                limit 100
                """
            )

            rows = cur.fetchall()

            return [
                {
                    "id": str(row[0]),
                    "platform": row[1],
                    "title": row[2],
                    "external_live_id": row[3],
                    "status": row[4],
                    "connection_status": row[5],
                    "started_at": row[6].isoformat() if row[6] else None,
                    "comment_count": to_int(row[7]),
                    "participant_count": to_int(row[8]),
                    "last_comment_at": row[9].isoformat() if row[9] else None,
                    "draw_count": to_int(row[10]),
                    "latest_draw_at": row[11].isoformat() if row[11] else None,
                }
                for row in rows
            ]


@router.get("/{session_id}/participants")
def list_game_participants(session_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            session = get_session(cur, session_id)
            participants = get_participants(cur, session_id)
            draws = get_draw_rows(cur, session_id)

            return {
                "session": session,
                "participant_count": len(participants),
                "winner_count": len(draws),
                "participants": participants,
            }


@router.get("/{session_id}/draws")
def list_game_draws(session_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            get_session(cur, session_id)
            return get_draw_rows(cur, session_id)


@router.post("/{session_id}/draw")
def draw_game_winner(session_id: str, payload: DrawWinnerPayload):
    with get_connection() as conn:
        with conn.cursor() as cur:
            get_session(cur, session_id)
            ensure_live_game_tables(cur)

            participants = get_participants(cur, session_id)

            if payload.exclude_previous_winners:
                participants = [
                    participant
                    for participant in participants
                    if not participant["is_previous_winner"]
                ]

            if not participants:
                raise HTTPException(
                    status_code=400,
                    detail="Phiên live này chưa có người chơi hợp lệ hoặc tất cả đã trúng trước đó.",
                )

            if payload.participant_key:
                winner = next(
                    (
                        participant
                        for participant in participants
                        if participant["participant_key"] == payload.participant_key
                    ),
                    None,
                )

                if not winner:
                    raise HTTPException(
                        status_code=404,
                        detail="Không tìm thấy người chơi trong phiên live này.",
                    )
            else:
                winner = random.choice(participants)

            prize_product_id, prize_product_name = get_prize_info(cur, payload)

            cur.execute(
                """
                select coalesce(max(draw_round), 0) + 1
                from live_game_draws
                where session_id = %s
                """,
                (session_id,),
            )
            draw_round = to_int(cur.fetchone()[0])

            cur.execute(
                """
                insert into live_game_draws (
                    session_id,
                    draw_round,
                    prize_product_id,
                    prize_product_name,
                    prize_quantity,
                    winner_key,
                    winner_name,
                    winner_avatar,
                    winner_platform,
                    winner_comment,
                    winner_comment_id
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                returning
                    id,
                    session_id,
                    draw_round,
                    prize_product_id,
                    prize_product_name,
                    prize_quantity,
                    winner_key,
                    winner_name,
                    winner_avatar,
                    winner_platform,
                    winner_comment,
                    winner_comment_id,
                    created_at
                """,
                (
                    session_id,
                    draw_round,
                    prize_product_id,
                    prize_product_name,
                    payload.prize_quantity,
                    winner["participant_key"],
                    winner["display_name"],
                    winner["customer_avatar"],
                    winner["platform"],
                    winner["latest_message"],
                    winner["latest_comment_id"],
                ),
            )

            row = cur.fetchone()
            conn.commit()

            return serialize_draw(row)
