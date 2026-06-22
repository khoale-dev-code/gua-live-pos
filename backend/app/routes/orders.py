from datetime import datetime
from random import randint
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.database import get_connection

router = APIRouter(prefix="/api/orders", tags=["Orders"])

OPEN_ORDER_STATUSES = ("new", "confirmed", "printed")
DEFAULT_SHIPPING_FEE = 30000


class OrderItemPayload(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1)
    item_note: str | None = None


class CreateOrderFromCommentPayload(BaseModel):
    comment_id: str

    customer_name: str | None = None
    fb_name: str | None = None
    customer_phone: str | None = None
    fb_link: str | None = None

    customer_address: str | None = None
    province: str | None = None
    district: str | None = None
    ward: str | None = None
    address_detail: str | None = None

    shipping_fee: float = DEFAULT_SHIPPING_FEE
    discount: float = 0
    note: str | None = None

    items: list[OrderItemPayload]


class UpdateOrderStatusPayload(BaseModel):
    status: str


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def normalize_phone(value: str | None) -> str | None:
    value = normalize_text(value)

    if not value:
        return None

    phone = (
        value.replace(" ", "")
        .replace(".", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    if phone.startswith("+84"):
        phone = "0" + phone[3:]

    return phone



def platform_label(platform: str | None) -> str:
    value = (platform or "").lower()

    if value == "facebook":
        return "Facebook"

    if value == "tiktok":
        return "TikTok"

    return platform or "Không rõ"


def get_live_event_id_for_session(cur, session_id):
    cur.execute(
        """
        select live_event_id
        from live_sessions
        where id = %s
        """,
        (session_id,),
    )

    row = cur.fetchone()

    return row[0] if row else None


def sync_order_live_event(cur, order_id, session_id):
    live_event_id = get_live_event_id_for_session(cur, session_id)

    if not live_event_id:
        return None

    cur.execute(
        """
        update orders
        set live_event_id = %s
        where id = %s
          and live_event_id is null
        """,
        (
            live_event_id,
            order_id,
        ),
    )

    return live_event_id


def decimal_to_float(value: Any) -> float:
    return float(value or 0)


def build_full_address(payload: CreateOrderFromCommentPayload) -> str | None:
    direct_address = normalize_text(payload.customer_address)

    if direct_address:
        return direct_address

    parts = [
        normalize_text(payload.address_detail),
        normalize_text(payload.ward),
        normalize_text(payload.district),
        normalize_text(payload.province),
    ]

    parts = [part for part in parts if part]

    if not parts:
        return None

    return ", ".join(parts)


def generate_order_code() -> str:
    now = datetime.now().strftime("%Y%m%d%H%M%S%f")
    suffix = randint(100, 999)
    return f"ORD{now}{suffix}"


def get_or_create_customer(
    cur,
    customer_name: str,
    customer_phone: str,
    customer_address: str,
    fb_name: str | None,
    fb_link: str | None,
    province: str | None,
    district: str | None,
    ward: str | None,
    address_detail: str | None,
    note: str | None,
):
    cur.execute(
        """
        select id
        from customers
        where phone = %s
        limit 1
        """,
        (customer_phone,),
    )

    existing = cur.fetchone()

    if existing:
        customer_id = existing[0]

        cur.execute(
            """
            update customers
            set
                name = coalesce(%s, name),
                fb_name = coalesce(%s, fb_name),
                fb_link = coalesce(%s, fb_link),
                address = coalesce(%s, address),
                province = coalesce(%s, province),
                district = coalesce(%s, district),
                ward = coalesce(%s, ward),
                address_detail = coalesce(%s, address_detail),
                note = coalesce(%s, note),
                updated_at = now()
            where id = %s
            """,
            (
                customer_name,
                fb_name,
                fb_link,
                customer_address,
                province,
                district,
                ward,
                address_detail,
                note,
                customer_id,
            ),
        )

        return customer_id

    cur.execute(
        """
        insert into customers (
            name,
            phone,
            fb_name,
            fb_link,
            address,
            province,
            district,
            ward,
            address_detail,
            note
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        returning id
        """,
        (
            customer_name,
            customer_phone,
            fb_name,
            fb_link,
            customer_address,
            province,
            district,
            ward,
            address_detail,
            note,
        ),
    )

    return cur.fetchone()[0]



def find_mergeable_order_by_event(cur, session_id, customer_phone: str):
    live_event_id = get_live_event_id_for_session(cur, session_id)

    if live_event_id:
        cur.execute(
            """
            select
                o.id,
                o.order_code,
                o.shipping_fee,
                o.discount,
                o.status
            from orders o
            left join live_sessions ls on ls.id = o.session_id
            where coalesce(o.live_event_id, ls.live_event_id) = %s
              and o.customer_phone = %s
              and o.status in ('new', 'confirmed', 'printed')
            order by o.created_at asc
            limit 1
            for update
            """,
            (
                live_event_id,
                customer_phone,
            ),
        )

        return cur.fetchone()

    cur.execute(
        """
        select
            id,
            order_code,
            shipping_fee,
            discount,
            status
        from orders
        where session_id = %s
          and customer_phone = %s
          and status in ('new', 'confirmed', 'printed')
        order by created_at asc
        limit 1
        for update
        """,
        (
            session_id,
            customer_phone,
        ),
    )

    return cur.fetchone()


def find_mergeable_order(cur, session_id: str, customer_phone: str):
    """
    Luật bắt buộc:
    Cùng 1 buổi live + cùng số điện thoại + đơn còn mở
    thì cộng cây vào đơn cũ, không tạo đơn mới.
    """
    cur.execute(
        """
        select
            id,
            order_code,
            shipping_fee,
            discount,
            status
        from orders
        where session_id = %s
          and customer_phone = %s
          and status = any(%s)
        order by created_at asc
        limit 1
        for update
        """,
        (
            session_id,
            customer_phone,
            list(OPEN_ORDER_STATUSES),
        ),
    )

    return cur.fetchone()


def create_new_order(
    cur,
    customer_id,
    session_id,
    source_comment_id,
    customer_name,
    customer_phone,
    customer_address,
    fb_name,
    fb_link,
    province,
    district,
    ward,
    address_detail,
    shipping_fee,
    discount,
    note,
):
    order_code = generate_order_code()

    cur.execute(
        """
        insert into orders (
            order_code,
            customer_id,
            session_id,
            source_comment_id,
            customer_name,
            fb_name,
            customer_phone,
            fb_link,
            customer_address,
            province,
            district,
            ward,
            address_detail,
            subtotal,
            shipping_fee,
            discount,
            total,
            status,
            note
        )
        values (
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            0, %s, %s, 0,
            'new',
            %s
        )
        returning id, order_code
        """,
        (
            order_code,
            customer_id,
            session_id,
            source_comment_id,
            customer_name,
            fb_name,
            customer_phone,
            fb_link,
            customer_address,
            province,
            district,
            ward,
            address_detail,
            shipping_fee,
            discount,
            note,
        ),
    )

    return cur.fetchone()


def update_order_customer_info_for_merge(
    cur,
    order_id,
    customer_id,
    customer_name,
    customer_phone,
    customer_address,
    fb_name,
    fb_link,
    province,
    district,
    ward,
    address_detail,
    discount,
    note,
):
    """
    Khi gộp đơn: cập nhật thông tin khách mới nhất,
    nhưng KHÔNG cộng thêm shipping_fee lần nữa.
    """
    cur.execute(
        """
        update orders
        set
            customer_id = %s,
            customer_name = coalesce(%s, customer_name),
            fb_name = coalesce(%s, fb_name),
            customer_phone = %s,
            fb_link = coalesce(%s, fb_link),
            customer_address = coalesce(%s, customer_address),
            province = coalesce(%s, province),
            district = coalesce(%s, district),
            ward = coalesce(%s, ward),
            address_detail = coalesce(%s, address_detail),
            discount = coalesce(%s, discount),
            note = case
                when nullif(%s::text, '') is null then note
                when note is null or note = '' then %s::text
                else note || E'\n' || %s::text
            end,
            updated_at = now()
        where id = %s
        """,
        (
            customer_id,
            customer_name,
            fb_name,
            customer_phone,
            fb_link,
            customer_address,
            province,
            district,
            ward,
            address_detail,
            discount,
            note,
            note,
            note,
            order_id,
        ),
    )


def recalculate_order_total(cur, order_id):
    cur.execute(
        """
        select coalesce(sum(total), 0)
        from order_items
        where order_id = %s
        """,
        (order_id,),
    )

    subtotal = decimal_to_float(cur.fetchone()[0])

    cur.execute(
        """
        update orders
        set
            subtotal = %s,
            total = %s + coalesce(shipping_fee, 0) - coalesce(discount, 0),
            updated_at = now()
        where id = %s
        returning total
        """,
        (
            subtotal,
            subtotal,
            order_id,
        ),
    )

    return decimal_to_float(cur.fetchone()[0])


def map_order_summary(row):
    return {
        "id": str(row[0]),
        "order_code": row[1],
        "customer_name": row[2],
        "fb_name": row[3],
        "customer_phone": row[4],
        "customer_address": row[5],
        "subtotal": decimal_to_float(row[6]),
        "shipping_fee": decimal_to_float(row[7]),
        "discount": decimal_to_float(row[8]),
        "total": decimal_to_float(row[9]),
        "status": row[10],
        "note": row[11],
        "created_at": row[12].isoformat() if row[12] else None,
        "updated_at": row[13].isoformat() if row[13] else None,
        "session_id": str(row[14]) if row[14] else None,
        "source_comment_id": str(row[15]) if row[15] else None,
        "item_count": row[16] or 0,
        "comment_count": row[17] or 0,
    }


def fetch_order_detail(cur, order_id: str):
    cur.execute(
        """
        select
            o.id,
            o.order_code,
            o.customer_name,
            o.fb_name,
            o.customer_phone,
            o.customer_address,
            o.subtotal,
            o.shipping_fee,
            o.discount,
            o.total,
            o.status,
            o.note,
            o.created_at,
            o.updated_at,
            o.session_id,
            o.source_comment_id,
            o.province,
            o.district,
            o.ward,
            o.address_detail,
            ls.title as session_title,
            ls.platform as session_platform,
            count(distinct oi.id) as item_count,
            count(distinct lc.id) as comment_count
        from orders o
        left join live_sessions ls on ls.id = o.session_id
        left join order_items oi on oi.order_id = o.id
        left join live_comments lc on lc.order_id = o.id
        where o.id = %s
        group by
            o.id,
            o.order_code,
            o.customer_name,
            o.fb_name,
            o.customer_phone,
            o.customer_address,
            o.subtotal,
            o.shipping_fee,
            o.discount,
            o.total,
            o.status,
            o.note,
            o.created_at,
            o.updated_at,
            o.session_id,
            o.source_comment_id,
            o.province,
            o.district,
            o.ward,
            o.address_detail,
            ls.title,
            ls.platform
        """,
        (order_id,),
    )

    order = cur.fetchone()

    if not order:
        return None

    cur.execute(
        """
        select
            id,
            product_id,
            product_code,
            product_name,
            quantity,
            price,
            total,
            source_comment_id,
            item_note,
            print_count,
            last_printed_at,
            created_at
        from order_items
        where order_id = %s
        order by created_at asc
        """,
        (order_id,),
    )

    item_rows = cur.fetchall()

    cur.execute(
        """
        select
            id,
            platform,
            customer_name,
            customer_platform_id,
            message,
            created_at
        from live_comments
        where order_id = %s
        order by created_at asc
        """,
        (order_id,),
    )

    comment_rows = cur.fetchall()

    return {
        "id": str(order[0]),
        "order_code": order[1],
        "customer_name": order[2],
        "fb_name": order[3],
        "customer_phone": order[4],
        "customer_address": order[5],
        "subtotal": decimal_to_float(order[6]),
        "shipping_fee": decimal_to_float(order[7]),
        "discount": decimal_to_float(order[8]),
        "total": decimal_to_float(order[9]),
        "status": order[10],
        "note": order[11],
        "created_at": order[12].isoformat() if order[12] else None,
        "updated_at": order[13].isoformat() if order[13] else None,
        "session_id": str(order[14]) if order[14] else None,
        "source_comment_id": str(order[15]) if order[15] else None,
        "province": order[16],
        "district": order[17],
        "ward": order[18],
        "address_detail": order[19],
        "session_title": order[20],
        "session_platform": order[21],
        "item_count": order[22] or 0,
        "comment_count": order[23] or 0,
        "items": [
            {
                "id": str(item[0]),
                "product_id": str(item[1]) if item[1] else None,
                "product_code": item[2],
                "product_name": item[3],
                "quantity": item[4],
                "price": decimal_to_float(item[5]),
                "total": decimal_to_float(item[6]),
                "source_comment_id": str(item[7]) if item[7] else None,
                "item_note": item[8],
                "print_count": item[9] or 0,
                "last_printed_at": item[10].isoformat() if item[10] else None,
                "created_at": item[11].isoformat() if item[11] else None,
            }
            for item in item_rows
        ],
        "source_comments": [
            {
                "id": str(comment[0]),
                "platform": comment[1],
                "customer_name": comment[2],
                "customer_platform_id": comment[3],
                "message": comment[4],
                "created_at": comment[5].isoformat() if comment[5] else None,
            }
            for comment in comment_rows
        ],
    }


@router.get("")
def get_orders():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select
                    o.id,
                    o.order_code,
                    o.customer_name,
                    o.fb_name,
                    o.customer_phone,
                    o.customer_address,
                    o.subtotal,
                    o.shipping_fee,
                    o.discount,
                    o.total,
                    o.status,
                    o.note,
                    o.created_at,
                    o.updated_at,
                    o.session_id,
                    o.source_comment_id,
                    count(distinct oi.id) as item_count,
                    count(distinct lc.id) as comment_count
                from orders o
                left join order_items oi on oi.order_id = o.id
                left join live_comments lc on lc.order_id = o.id
                group by
                    o.id,
                    o.order_code,
                    o.customer_name,
                    o.fb_name,
                    o.customer_phone,
                    o.customer_address,
                    o.subtotal,
                    o.shipping_fee,
                    o.discount,
                    o.total,
                    o.status,
                    o.note,
                    o.created_at,
                    o.updated_at,
                    o.session_id,
                    o.source_comment_id
                order by o.created_at desc
                limit 300
                """
            )

            return [map_order_summary(row) for row in cur.fetchall()]




@router.get("/customer-by-phone/{phone}")
def get_customer_by_phone(phone: str):
    customer_phone = normalize_phone(phone)

    if not customer_phone:
        return {
            "found": False,
            "customer": None,
        }

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select
                    id,
                    name,
                    phone,
                    fb_name,
                    fb_link,
                    address,
                    province,
                    district,
                    ward,
                    address_detail,
                    note,
                    created_at,
                    updated_at
                from customers
                where phone = %s
                order by updated_at desc nulls last, created_at desc nulls last
                limit 1
                """,
                (customer_phone,),
            )

            row = cur.fetchone()

            if not row:
                return {
                    "found": False,
                    "customer": None,
                }

            return {
                "found": True,
                "customer": {
                    "id": str(row[0]),
                    "name": row[1],
                    "phone": row[2],
                    "fb_name": row[3],
                    "fb_link": row[4],
                    "address": row[5],
                    "province": row[6],
                    "district": row[7],
                    "ward": row[8],
                    "address_detail": row[9],
                    "note": row[10],
                    "created_at": row[11].isoformat() if row[11] else None,
                    "updated_at": row[12].isoformat() if row[12] else None,
                },
            }


@router.get("/{order_id}")
def get_order_by_id(order_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            order = fetch_order_detail(cur, order_id)

            if not order:
                raise HTTPException(status_code=404, detail="Order not found.")

            return order


@router.post("/from-comment")
def create_order_from_comment(payload: CreateOrderFromCommentPayload):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Vui l?ng ch?n ?t nh?t m?t s?n ph?m.")

    customer_name = normalize_text(payload.customer_name)
    fb_name = normalize_text(payload.fb_name)
    customer_phone = normalize_phone(payload.customer_phone)
    fb_link = normalize_text(payload.fb_link)

    province = normalize_text(payload.province)
    district = normalize_text(payload.district)
    ward = normalize_text(payload.ward)
    address_detail = normalize_text(payload.address_detail)
    customer_address = build_full_address(payload)

    if not customer_name:
        raise HTTPException(status_code=400, detail="Vui l?ng nh?p t?n kh?ch h?ng.")

    if not customer_phone:
        raise HTTPException(status_code=400, detail="Vui l?ng nh?p s? ?i?n tho?i kh?ch h?ng.")

    if not customer_address:
        raise HTTPException(status_code=400, detail="Vui l?ng nh?p ??y ?? ??a ch? giao h?ng.")

    requested_shipping_fee = float(payload.shipping_fee or DEFAULT_SHIPPING_FEE)
    requested_discount = float(payload.discount or 0)
    order_note = normalize_text(payload.note)

    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    select
                        id,
                        session_id,
                        platform,
                        customer_name,
                        message,
                        status,
                        order_id
                    from live_comments
                    where id = %s
                    for update
                    """,
                    (payload.comment_id,),
                )

                comment = cur.fetchone()

                if not comment:
                    raise HTTPException(status_code=404, detail="Kh?ng t?m th?y b?nh lu?n n?y.")

                if comment[6]:
                    raise HTTPException(
                        status_code=400,
                        detail="B?nh lu?n n?y ?? ???c th?m v?o ??n h?ng r?i. H?y ch?n comment kh?c.",
                    )

                session_id = comment[1]
                comment_platform = comment[2]
                comment_message = comment[4] or ""

                source_note = (
                    f"Nền tảng: {platform_label(comment_platform)}"
                    + (f" | Comment: {comment_message}" if comment_message else "")
                )

                order_note = "\n".join(
                    part for part in [order_note, source_note] if part
                )

                customer_id = get_or_create_customer(
                    cur=cur,
                    customer_name=customer_name,
                    customer_phone=customer_phone,
                    customer_address=customer_address,
                    fb_name=fb_name,
                    fb_link=fb_link,
                    province=province,
                    district=district,
                    ward=ward,
                    address_detail=address_detail,
                    note=f"From live comment: {comment_message}",
                )

                open_order = find_mergeable_order_by_event(
                    cur=cur,
                    session_id=session_id,
                    customer_phone=customer_phone,
                )

                merged_into_existing_order = open_order is not None

                if open_order:
                    order_id = open_order[0]
                    order_code = open_order[1]

                    update_order_customer_info_for_merge(
                        cur=cur,
                        order_id=order_id,
                        customer_id=customer_id,
                        customer_name=customer_name,
                        customer_phone=customer_phone,
                        customer_address=customer_address,
                        fb_name=fb_name,
                        fb_link=fb_link,
                        province=province,
                        district=district,
                        ward=ward,
                        address_detail=address_detail,
                        discount=requested_discount,
                        note=order_note,
                    )
                else:
                    new_order = create_new_order(
                        cur=cur,
                        customer_id=customer_id,
                        session_id=session_id,
                        source_comment_id=payload.comment_id,
                        customer_name=customer_name,
                        customer_phone=customer_phone,
                        customer_address=customer_address,
                        fb_name=fb_name,
                        fb_link=fb_link,
                        province=province,
                        district=district,
                        ward=ward,
                        address_detail=address_detail,
                        shipping_fee=requested_shipping_fee,
                        discount=requested_discount,
                        note=order_note,
                    )

                    order_id = new_order[0]
                    order_code = new_order[1]

                sync_order_live_event(
                    cur=cur,
                    order_id=order_id,
                    session_id=session_id,
                )

                added_items = []

                for item in payload.items:
                    cur.execute(
                        """
                        select
                            id,
                            code,
                            name,
                            price,
                            stock
                        from products
                        where id = %s
                          and is_active = true
                        for update
                        """,
                        (item.product_id,),
                    )

                    product = cur.fetchone()

                    if not product:
                        raise HTTPException(status_code=404, detail="Kh?ng t?m th?y s?n ph?m ho?c s?n ph?m ?? b? ?n.")

                    product_id = product[0]
                    product_code = product[1]
                    product_name = product[2]
                    price = decimal_to_float(product[3])
                    stock = int(product[4] or 0)
                    quantity = int(item.quantity or 1)
                    item_note = normalize_text(item.item_note)

                    if stock < quantity:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Product {product_name} only has {stock} in stock.",
                        )

                    item_total = price * quantity

                    cur.execute(
                        """
                        insert into order_items (
                            order_id,
                            product_id,
                            product_code,
                            product_name,
                            quantity,
                            price,
                            total,
                            source_comment_id,
                            item_note,
                            print_count
                        )
                        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0)
                        returning id
                        """,
                        (
                            order_id,
                            product_id,
                            product_code,
                            product_name,
                            quantity,
                            price,
                            item_total,
                            payload.comment_id,
                            item_note,
                        ),
                    )

                    order_item_id = cur.fetchone()[0]

                    cur.execute(
                        """
                        update products
                        set stock = stock - %s,
                            updated_at = now()
                        where id = %s
                        """,
                        (
                            quantity,
                            product_id,
                        ),
                    )

                    added_items.append(
                        {
                            "id": str(order_item_id),
                            "product_id": str(product_id),
                            "product_code": product_code,
                            "product_name": product_name,
                            "quantity": quantity,
                            "price": price,
                            "total": item_total,
                            "source_comment_id": payload.comment_id,
                            "item_note": item_note,
                        }
                    )

                total = recalculate_order_total(cur, order_id)

                cur.execute(
                    """
                    update live_comments
                    set
                        status = 'used',
                        order_id = %s,
                        customer_name = coalesce(nullif(%s, ''), customer_name)
                    where id = %s
                    """,
                    (
                        order_id,
                        customer_name,
                        payload.comment_id,
                    ),
                )

                
                conn.commit()

                detail = fetch_order_detail(cur, str(order_id))

                return {
                    **detail,
                    "merged": merged_into_existing_order,
                    "added_items": added_items,
                    "message": (
                        f"Đã cộng thêm sản phẩm vào đơn cũ {order_code}. Phí ship chỉ tính một lần."
                        if merged_into_existing_order
                        else f"Đã tạo đơn mới {order_code}."
                    ),
                    "total": total,
                }

            except HTTPException:
                conn.rollback()
                raise

            except Exception as error:
                conn.rollback()
                print("[Order Create Error]", repr(error))
                raise HTTPException(status_code=400, detail=str(error))


@router.post("/{order_id}/items/{item_id}/print")
def mark_order_item_printed(order_id: str, item_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update order_items
                set
                    print_count = coalesce(print_count, 0) + 1,
                    last_printed_at = now()
                where id = %s
                  and order_id = %s
                returning
                    id,
                    order_id,
                    product_code,
                    product_name,
                    quantity,
                    item_note,
                    print_count,
                    last_printed_at
                """,
                (
                    item_id,
                    order_id,
                ),
            )

            row = cur.fetchone()
            conn.commit()

            if not row:
                raise HTTPException(status_code=404, detail="Order item not found.")

            return {
                "id": str(row[0]),
                "order_id": str(row[1]),
                "product_code": row[2],
                "product_name": row[3],
                "quantity": row[4],
                "item_note": row[5],
                "print_count": row[6],
                "last_printed_at": row[7].isoformat() if row[7] else None,
            }


@router.put("/{order_id}/status")
def update_order_status(order_id: str, payload: UpdateOrderStatusPayload):
    allowed_statuses = ["new", "confirmed", "printed", "shipped", "done", "cancelled"]

    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid order status.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update orders
                set status = %s,
                    updated_at = now()
                where id = %s
                returning id, status
                """,
                (
                    payload.status,
                    order_id,
                ),
            )

            row = cur.fetchone()
            conn.commit()

            if not row:
                raise HTTPException(status_code=404, detail="Order not found.")

            return {
                "id": str(row[0]),
                "status": row[1],
            }


@router.delete("/{order_id}")
def cancel_order(order_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    select status
                    from orders
                    where id = %s
                    for update
                    """,
                    (order_id,),
                )

                order = cur.fetchone()

                if not order:
                    raise HTTPException(status_code=404, detail="Order not found.")

                if order[0] == "cancelled":
                    return {
                        "id": order_id,
                        "status": "cancelled",
                    }

                cur.execute(
                    """
                    select product_id, quantity
                    from order_items
                    where order_id = %s
                    """,
                    (order_id,),
                )

                items = cur.fetchall()

                for item in items:
                    product_id = item[0]
                    quantity = item[1]

                    if product_id:
                        cur.execute(
                            """
                            update products
                            set stock = stock + %s,
                                updated_at = now()
                            where id = %s
                            """,
                            (
                                quantity,
                                product_id,
                            ),
                        )

                cur.execute(
                    """
                    update orders
                    set status = 'cancelled',
                        updated_at = now()
                    where id = %s
                    """,
                    (order_id,),
                )

                cur.execute(
                    """
                    update live_comments
                    set status = 'new',
                        order_id = null
                    where order_id = %s
                    """,
                    (order_id,),
                )

                conn.commit()

                return {
                    "id": order_id,
                    "status": "cancelled",
                }

            except HTTPException:
                conn.rollback()
                raise

            except Exception as error:
                conn.rollback()
                print("[Order Create Error]", repr(error))
                raise HTTPException(status_code=400, detail=str(error))
