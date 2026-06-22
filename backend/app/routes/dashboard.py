from fastapi import APIRouter
from app.services.database import get_connection

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def to_float(value):
    if value is None:
        return 0
    return float(value)


def to_int(value):
    if value is None:
        return 0
    return int(value)


def table_exists(cur, table_name: str):
    cur.execute(
        """
        select exists (
            select 1
            from information_schema.tables
            where table_schema = 'public'
              and table_name = %s
        )
        """,
        (table_name,),
    )
    return bool(cur.fetchone()[0])


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


def get_order_summary(cur, extra_where: str = ""):
    has_shipping_fee = column_exists(cur, "orders", "shipping_fee")
    has_discount = column_exists(cur, "orders", "discount")

    shipping_sql = "coalesce(sum(shipping_fee), 0)" if has_shipping_fee else "0"
    discount_sql = "coalesce(sum(discount), 0)" if has_discount else "0"

    cur.execute(
        f"""
        select
            coalesce(sum(total), 0) as revenue,
            count(*) as order_count,
            count(distinct nullif(customer_phone, '')) as customer_count,
            {shipping_sql} as shipping_total,
            {discount_sql} as discount_total
        from orders
        where coalesce(status, '') <> 'cancelled'
        {extra_where}
        """
    )

    row = cur.fetchone()

    return {
        "revenue": to_float(row[0]),
        "order_count": to_int(row[1]),
        "customer_count": to_int(row[2]),
        "shipping_total": to_float(row[3]),
        "discount_total": to_float(row[4]),
    }


def build_cost_expr(cur):
    has_order_item_cost = column_exists(cur, "order_items", "cost_price")
    has_product_cost = column_exists(cur, "products", "cost_price")

    if has_order_item_cost and has_product_cost:
        return "coalesce(oi.cost_price, p.cost_price, 0)", "order_items.cost_price hoặc products.cost_price"

    if has_order_item_cost:
        return "coalesce(oi.cost_price, 0)", "order_items.cost_price"

    if has_product_cost:
        return "coalesce(p.cost_price, 0)", "products.cost_price hiện tại"

    return "0", "chưa có cost_price"


def get_product_profit_summary(cur, extra_where: str = ""):
    cost_expr, cost_source = build_cost_expr(cur)

    # Trong hàm này có join orders o + order_items oi,
    # nên created_at phải hiểu là o.created_at để tránh lỗi ambiguous column.
    safe_extra_where = extra_where.replace("created_at", "o.created_at")

    cur.execute(
        f"""
        select
            coalesce(sum(oi.total), 0) as product_revenue,
            coalesce(sum(coalesce(oi.quantity, 0) * ({cost_expr})), 0) as product_cost,
            coalesce(sum(coalesce(oi.quantity, 0)), 0) as sold_quantity
        from order_items oi
        join orders o on o.id = oi.order_id
        left join products p on p.id = oi.product_id
        where coalesce(o.status, '') <> 'cancelled'
        {safe_extra_where}
        """
    )

    row = cur.fetchone()

    product_revenue = to_float(row[0])
    product_cost = to_float(row[1])
    gross_profit = product_revenue - product_cost
    profit_margin = (gross_profit / product_revenue * 100) if product_revenue > 0 else 0

    return {
        "product_revenue": product_revenue,
        "product_cost": product_cost,
        "gross_profit": gross_profit,
        "profit_margin": profit_margin,
        "sold_quantity": to_int(row[2]),
        "cost_source": cost_source,
    }


def get_inventory_capital(cur):
    has_product_cost = column_exists(cur, "products", "cost_price")
    has_product_stock = column_exists(cur, "products", "stock")
    has_product_min_stock = column_exists(cur, "products", "min_stock")

    product_inventory_capital = 0
    product_stock_quantity = 0
    low_stock_count = 0

    has_variants = table_exists(cur, "product_variants")
    has_variant_cost = has_variants and column_exists(cur, "product_variants", "cost_price")
    has_variant_stock = has_variants and column_exists(cur, "product_variants", "stock")
    has_variant_min_stock = has_variants and column_exists(cur, "product_variants", "min_stock")

    if has_product_cost and has_product_stock:
        if has_variants and has_variant_stock:
            cur.execute(
                """
                select
                    coalesce(sum(coalesce(p.stock, 0) * coalesce(p.cost_price, 0)), 0),
                    coalesce(sum(coalesce(p.stock, 0)), 0)
                from products p
                where not exists (
                    select 1
                    from product_variants pv
                    where pv.product_id = p.id
                )
                """
            )
        else:
            cur.execute(
                """
                select
                    coalesce(sum(coalesce(stock, 0) * coalesce(cost_price, 0)), 0),
                    coalesce(sum(coalesce(stock, 0)), 0)
                from products
                """
            )

        row = cur.fetchone()
        product_inventory_capital = to_float(row[0])
        product_stock_quantity = to_int(row[1])

    if has_product_stock and has_product_min_stock:
        cur.execute(
            """
            select count(*)
            from products
            where is_active = true
              and coalesce(stock, 0) <= coalesce(min_stock, 0)
            """
        )
        low_stock_count += to_int(cur.fetchone()[0])

    variant_inventory_capital = 0
    variant_stock_quantity = 0

    if has_variant_cost and has_variant_stock:
        cur.execute(
            """
            select
                coalesce(sum(coalesce(stock, 0) * coalesce(cost_price, 0)), 0),
                coalesce(sum(coalesce(stock, 0)), 0)
            from product_variants
            """
        )

        row = cur.fetchone()
        variant_inventory_capital = to_float(row[0])
        variant_stock_quantity = to_int(row[1])

    if has_variant_stock and has_variant_min_stock:
        cur.execute(
            """
            select count(*)
            from product_variants
            where coalesce(stock, 0) <= coalesce(min_stock, 0)
            """
        )
        low_stock_count += to_int(cur.fetchone()[0])

    return {
        "product_inventory_capital": product_inventory_capital,
        "variant_inventory_capital": variant_inventory_capital,
        "inventory_capital": product_inventory_capital + variant_inventory_capital,
        "stock_quantity": product_stock_quantity + variant_stock_quantity,
        "low_stock_count": low_stock_count,
    }


def get_repeat_customers(cur):
    cur.execute(
        """
        select
            customer_phone,
            max(customer_name) as customer_name,
            count(*) as order_count,
            coalesce(sum(total), 0) as total_spent,
            max(created_at) as last_order_at
        from orders
        where coalesce(status, '') <> 'cancelled'
          and nullif(customer_phone, '') is not null
        group by customer_phone
        having count(*) >= 2
        order by total_spent desc, order_count desc
        limit 10
        """
    )

    rows = cur.fetchall()

    return [
        {
            "customer_phone": row[0],
            "customer_name": row[1],
            "order_count": to_int(row[2]),
            "total_spent": to_float(row[3]),
            "last_order_at": row[4].isoformat() if row[4] else None,
        }
        for row in rows
    ]


def get_top_products(cur):
    cost_expr, _ = build_cost_expr(cur)

    cur.execute(
        f"""
        select
            coalesce(oi.product_name, 'Sản phẩm không tên') as product_name,
            coalesce(sum(oi.quantity), 0) as sold_quantity,
            coalesce(sum(oi.total), 0) as revenue,
            coalesce(sum(coalesce(oi.quantity, 0) * ({cost_expr})), 0) as cost
        from order_items oi
        join orders o on o.id = oi.order_id
        left join products p on p.id = oi.product_id
        where coalesce(o.status, '') <> 'cancelled'
        group by coalesce(oi.product_name, 'Sản phẩm không tên')
        order by revenue desc
        limit 8
        """
    )

    rows = cur.fetchall()

    return [
        {
            "product_name": row[0],
            "sold_quantity": to_int(row[1]),
            "revenue": to_float(row[2]),
            "cost": to_float(row[3]),
            "profit": to_float(row[2]) - to_float(row[3]),
        }
        for row in rows
    ]


def get_recent_days(cur):
    cost_expr, _ = build_cost_expr(cur)

    cur.execute(
        f"""
        select
            (o.created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
            count(distinct o.id) as order_count,
            coalesce(sum(oi.total), 0) as product_revenue,
            coalesce(sum(coalesce(oi.quantity, 0) * ({cost_expr})), 0) as product_cost
        from orders o
        left join order_items oi on oi.order_id = o.id
        left join products p on p.id = oi.product_id
        where coalesce(o.status, '') <> 'cancelled'
          and o.created_at >= now() - interval '14 days'
        group by day
        order by day asc
        """
    )

    rows = cur.fetchall()

    return [
        {
            "day": row[0].isoformat() if row[0] else None,
            "order_count": to_int(row[1]),
            "revenue": to_float(row[2]),
            "cost": to_float(row[3]),
            "profit": to_float(row[2]) - to_float(row[3]),
        }
        for row in rows
    ]


@router.get("/analytics")
def get_dashboard_analytics():
    with get_connection() as conn:
        with conn.cursor() as cur:
            today_where = """
              and (created_at at time zone 'Asia/Ho_Chi_Minh')::date =
                  (now() at time zone 'Asia/Ho_Chi_Minh')::date
            """

            month_where = """
              and date_trunc('month', created_at at time zone 'Asia/Ho_Chi_Minh') =
                  date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')
            """

            all_orders = get_order_summary(cur)
            today_orders = get_order_summary(cur, today_where)
            month_orders = get_order_summary(cur, month_where)

            all_profit = get_product_profit_summary(cur)
            today_profit = get_product_profit_summary(cur, today_where)
            month_profit = get_product_profit_summary(cur, month_where)

            inventory = get_inventory_capital(cur)
            repeat_customers = get_repeat_customers(cur)
            top_products = get_top_products(cur)
            recent_days = get_recent_days(cur)

            repeat_customer_count = len(repeat_customers)
            customer_count = all_orders["customer_count"]
            repeat_rate = (
                repeat_customer_count / customer_count * 100
                if customer_count > 0
                else 0
            )

            return {
                "summary": {
                    **all_orders,
                    **all_profit,
                    **inventory,
                    "repeat_customer_count": repeat_customer_count,
                    "repeat_customer_rate": repeat_rate,
                    "total_capital_tracked": inventory["inventory_capital"]
                    + all_profit["product_cost"],
                },
                "today": {
                    **today_orders,
                    **today_profit,
                },
                "month": {
                    **month_orders,
                    **month_profit,
                },
                "repeat_customers": repeat_customers,
                "top_products": top_products,
                "recent_days": recent_days,
            }
