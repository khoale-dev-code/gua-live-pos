from fastapi import APIRouter, HTTPException

from app.services.database import get_connection
from pydantic import BaseModel

router = APIRouter(prefix="/api/customers", tags=["Customers"])


class CustomerUpdate(BaseModel):
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_address: str | None = None
    province: str | None = None
    district: str | None = None
    ward: str | None = None
    address_detail: str | None = None
    fb_name: str | None = None
    fb_link: str | None = None
    note: str | None = None


def normalize_phone(value: str | None):
    if value is None:
        return ""

    return "".join(char for char in str(value).strip() if char.isdigit() or char == "+")



def to_float(value):
    return float(value or 0)


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


def text_latest_expr(cur, column_name: str):
    if not column_exists(cur, "orders", column_name):
        return "null"

    return f"""
    (
        array_remove(
            array_agg(nullif({column_name}, '') order by created_at desc),
            null
        )
    )[1]
    """


@router.get("")
def get_customers():
    with get_connection() as conn:
        with conn.cursor() as cur:
            if not column_exists(cur, "orders", "customer_phone"):
                return {
                    "summary": {
                        "customer_count": 0,
                        "repeat_customer_count": 0,
                        "one_time_customer_count": 0,
                        "total_spent": 0,
                    },
                    "customers": [],
                }

            name_expr = text_latest_expr(cur, "customer_name")
            address_expr = text_latest_expr(cur, "customer_address")
            fb_name_expr = text_latest_expr(cur, "fb_name")
            fb_link_expr = text_latest_expr(cur, "fb_link")
            province_expr = text_latest_expr(cur, "province")
            district_expr = text_latest_expr(cur, "district")
            ward_expr = text_latest_expr(cur, "ward")
            address_detail_expr = text_latest_expr(cur, "address_detail")
            note_expr = text_latest_expr(cur, "note")

            has_status = column_exists(cur, "orders", "status")
            has_total = column_exists(cur, "orders", "total")
            has_created_at = column_exists(cur, "orders", "created_at")

            status_filter = "and coalesce(status, '') <> 'cancelled'" if has_status else ""
            total_expr = "coalesce(sum(coalesce(total, 0)), 0)" if has_total else "0"
            first_order_expr = "min(created_at)" if has_created_at else "null"
            last_order_expr = "max(created_at)" if has_created_at else "null"

            cur.execute(
                f"""
                with customer_orders as (
                    select
                        regexp_replace(coalesce(customer_phone, ''), '[^0-9+]', '', 'g') as normalized_phone,
                        {name_expr} as customer_name,
                        {address_expr} as customer_address,
                        {fb_name_expr} as fb_name,
                        {fb_link_expr} as fb_link,
                        {province_expr} as province,
                        {district_expr} as district,
                        {ward_expr} as ward,
                        {address_detail_expr} as address_detail,
                        {note_expr} as note,
                        count(*) as order_count,
                        {total_expr} as total_spent,
                        {first_order_expr} as first_order_at,
                        {last_order_expr} as last_order_at
                    from orders
                    where nullif(customer_phone, '') is not null
                    {status_filter}
                    group by regexp_replace(coalesce(customer_phone, ''), '[^0-9+]', '', 'g')
                )
                select
                    normalized_phone,
                    customer_name,
                    customer_address,
                    fb_name,
                    fb_link,
                    province,
                    district,
                    ward,
                    address_detail,
                    note,
                    order_count,
                    total_spent,
                    first_order_at,
                    last_order_at
                from customer_orders
                where nullif(normalized_phone, '') is not null
                order by last_order_at desc nulls last, total_spent desc
                limit 1000
                """
            )

            rows = cur.fetchall()

            customers = [
                {
                    "customer_phone": row[0],
                    "customer_name": row[1],
                    "customer_address": row[2],
                    "fb_name": row[3],
                    "fb_link": row[4],
                    "province": row[5],
                    "district": row[6],
                    "ward": row[7],
                    "address_detail": row[8],
                    "note": row[9],
                    "order_count": to_int(row[10]),
                    "total_spent": to_float(row[11]),
                    "first_order_at": row[12].isoformat() if row[12] else None,
                    "last_order_at": row[13].isoformat() if row[13] else None,
                    "is_repeat_customer": to_int(row[10]) >= 2,
                }
                for row in rows
            ]

            repeat_customer_count = sum(
                1 for customer in customers if customer["is_repeat_customer"]
            )

            total_spent = sum(customer["total_spent"] for customer in customers)

            return {
                "summary": {
                    "customer_count": len(customers),
                    "repeat_customer_count": repeat_customer_count,
                    "one_time_customer_count": len(customers) - repeat_customer_count,
                    "total_spent": total_spent,
                },
                "customers": customers,
            }



@router.put("/{customer_phone}")
def update_customer(customer_phone: str, payload: CustomerUpdate):
    old_phone = normalize_phone(customer_phone)

    if not old_phone:
        raise HTTPException(status_code=400, detail="Số điện thoại khách hàng không hợp lệ.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            if not column_exists(cur, "orders", "customer_phone"):
                raise HTTPException(status_code=400, detail="Bảng orders chưa có cột customer_phone.")

            updates = []
            values = []

            def add_update(column_name: str, value):
                if value is None:
                    return

                if not column_exists(cur, "orders", column_name):
                    return

                updates.append(f"{column_name} = %s")
                values.append(str(value).strip())

            new_phone = old_phone

            if payload.customer_phone is not None:
                new_phone = normalize_phone(payload.customer_phone)

                if not new_phone:
                    raise HTTPException(status_code=400, detail="Số điện thoại mới không hợp lệ.")

                add_update("customer_phone", new_phone)

            add_update("customer_name", payload.customer_name)
            add_update("customer_address", payload.customer_address)
            add_update("province", payload.province)
            add_update("district", payload.district)
            add_update("ward", payload.ward)
            add_update("address_detail", payload.address_detail)
            add_update("fb_name", payload.fb_name)
            add_update("fb_link", payload.fb_link)
            add_update("note", payload.note)

            if column_exists(cur, "orders", "updated_at"):
                updates.append("updated_at = now()")

            if not updates:
                raise HTTPException(status_code=400, detail="Không có thông tin nào để cập nhật.")

            values.append(old_phone)

            cur.execute(
                f"""
                update orders
                set {", ".join(updates)}
                where regexp_replace(coalesce(customer_phone, ''), '[^0-9+]', '', 'g') = %s
                """,
                values,
            )

            updated_count = cur.rowcount

            if updated_count <= 0:
                raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng cần cập nhật.")

            conn.commit()

            return {
                "message": "Đã cập nhật thông tin khách hàng.",
                "customer_phone": new_phone,
                "updated_order_count": updated_count,
            }
