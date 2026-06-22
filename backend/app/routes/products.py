from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.database import get_connection

router = APIRouter(prefix="/api/products", tags=["Products"])


class ProductCreate(BaseModel):
    code: str
    name: str
    category_id: str | None = None

    price: float = 0
    cost_price: float = 0
    stock: int = 0
    min_stock: int = 0
    unit: str = "cay"

    supplier_name: str | None = None
    barcode: str | None = None

    image_url: str | None = None
    image_urls: list[str] = Field(default_factory=list)
    note: str | None = None


class ProductUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    category_id: str | None = None

    price: float | None = None
    cost_price: float | None = None
    stock: int | None = None
    min_stock: int | None = None
    unit: str | None = None

    supplier_name: str | None = None
    barcode: str | None = None

    image_url: str | None = None
    image_urls: list[str] | None = None
    note: str | None = None
    is_active: bool | None = None


class VariantCreate(BaseModel):
    sku: str | None = None
    name: str
    unit: str | None = None
    price: float = 0
    cost_price: float = 0
    stock: int = 0
    min_stock: int = 0


class VariantUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    unit: str | None = None
    price: float | None = None
    cost_price: float | None = None
    stock: int | None = None
    min_stock: int | None = None
    is_active: bool | None = None


class StockInPayload(BaseModel):
    quantity: int = Field(gt=0)
    unit_cost: float | None = None
    supplier_name: str | None = None
    note: str | None = None
    variant_id: str | None = None


class StockAdjustPayload(BaseModel):
    quantity_delta: int
    unit_cost: float | None = None
    note: str | None = None
    variant_id: str | None = None
    type: str = "adjust"


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def normalize_code(value: str | None) -> str:
    text = normalize_text(value)

    if not text:
        raise HTTPException(status_code=400, detail="Product code is required.")

    return text.upper()


def decimal_to_float(value: Any) -> float:
    return float(value or 0)


def map_image_row(image: dict | None):
    if not image:
        return None

    return {
        "id": str(image.get("id")) if image.get("id") else None,
        "image_url": image.get("image_url"),
        "sort_order": image.get("sort_order") or 0,
    }


def map_product_row(row):
    return {
        "id": str(row[0]),
        "code": row[1],
        "name": row[2],
        "price": decimal_to_float(row[3]),
        "cost_price": decimal_to_float(row[4]),
        "stock": int(row[5] or 0),
        "min_stock": int(row[6] or 0),
        "unit": row[7],
        "supplier_name": row[8],
        "barcode": row[9],
        "image_url": row[10],
        "note": row[11],
        "is_active": row[12],
        "created_at": row[13].isoformat() if row[13] else None,
        "updated_at": row[14].isoformat() if row[14] else None,
        "category_id": str(row[15]) if row[15] else None,
        "category_name": row[16],
        "images": row[17] or [],
        "variant_count": int(row[18] or 0),
        "variant_stock": int(row[19] or 0),
        "total_stock": int(row[5] or 0) + int(row[19] or 0),
        "low_stock": int(row[5] or 0) <= int(row[6] or 0),
        "profit": decimal_to_float(row[3]) - decimal_to_float(row[4]),
    }


def map_variant_row(row):
    return {
        "id": str(row[0]),
        "product_id": str(row[1]),
        "sku": row[2],
        "name": row[3],
        "unit": row[4],
        "price": decimal_to_float(row[5]),
        "cost_price": decimal_to_float(row[6]),
        "stock": int(row[7] or 0),
        "min_stock": int(row[8] or 0),
        "is_active": row[9],
        "created_at": row[10].isoformat() if row[10] else None,
        "updated_at": row[11].isoformat() if row[11] else None,
        "low_stock": int(row[7] or 0) <= int(row[8] or 0),
        "profit": decimal_to_float(row[5]) - decimal_to_float(row[6]),
    }


def map_inventory_row(row):
    return {
        "id": str(row[0]),
        "product_id": str(row[1]) if row[1] else None,
        "variant_id": str(row[2]) if row[2] else None,
        "type": row[3],
        "quantity": int(row[4] or 0),
        "before_stock": int(row[5] or 0),
        "after_stock": int(row[6] or 0),
        "unit_cost": decimal_to_float(row[7]),
        "total_cost": decimal_to_float(row[8]),
        "reference_type": row[9],
        "reference_id": str(row[10]) if row[10] else None,
        "supplier_name": row[11],
        "note": row[12],
        "created_at": row[13].isoformat() if row[13] else None,
        "product_code": row[14],
        "product_name": row[15],
        "variant_name": row[16],
        "variant_sku": row[17],
    }


def ensure_product_exists(cur, product_id: str):
    cur.execute(
        """
        select id, code, name, stock, cost_price
        from products
        where id = %s
          and is_active = true
        for update
        """,
        (product_id,),
    )

    row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Product not found.")

    return row


def ensure_variant_exists(cur, product_id: str, variant_id: str):
    cur.execute(
        """
        select id, product_id, sku, name, stock, cost_price
        from product_variants
        where id = %s
          and product_id = %s
          and is_active = true
        for update
        """,
        (variant_id, product_id),
    )

    row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Variant not found.")

    return row


def insert_inventory_transaction(
    cur,
    *,
    product_id,
    variant_id=None,
    transaction_type,
    quantity,
    before_stock,
    after_stock,
    unit_cost=0,
    supplier_name=None,
    note=None,
    reference_type=None,
    reference_id=None,
):
    total_cost = float(unit_cost or 0) * abs(int(quantity or 0))

    cur.execute(
        """
        insert into inventory_transactions (
            product_id,
            variant_id,
            type,
            quantity,
            before_stock,
            after_stock,
            unit_cost,
            total_cost,
            reference_type,
            reference_id,
            supplier_name,
            note
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        returning id
        """,
        (
            product_id,
            variant_id,
            transaction_type,
            quantity,
            before_stock,
            after_stock,
            unit_cost or 0,
            total_cost,
            reference_type,
            reference_id,
            supplier_name,
            note,
        ),
    )

    return cur.fetchone()[0]


def upsert_product_images(cur, product_id, image_urls: list[str] | None):
    if image_urls is None:
        return

    cur.execute(
        """
        delete from product_images
        where product_id = %s
        """,
        (product_id,),
    )

    for index, image_url in enumerate(image_urls):
        image_url = normalize_text(image_url)

        if not image_url:
            continue

        cur.execute(
            """
            insert into product_images (
                product_id,
                image_url,
                sort_order
            )
            values (%s, %s, %s)
            """,
            (
                product_id,
                image_url,
                index,
            ),
        )


def get_product_detail_by_id(cur, product_id: str):
    cur.execute(
        """
        select
            p.id,
            p.code,
            p.name,
            p.price,
            p.cost_price,
            p.stock,
            p.min_stock,
            p.unit,
            p.supplier_name,
            p.barcode,
            p.image_url,
            p.note,
            p.is_active,
            p.created_at,
            p.updated_at,
            p.category_id,
            c.name as category_name,
            coalesce(
                json_agg(
                    distinct jsonb_build_object(
                        'id', pi.id,
                        'image_url', pi.image_url,
                        'sort_order', pi.sort_order
                    )
                ) filter (where pi.id is not null),
                '[]'::json
            ) as images,
            count(distinct pv.id) as variant_count,
            coalesce(sum(distinct pv.stock), 0) as variant_stock
        from products p
        left join product_categories c on c.id = p.category_id
        left join product_images pi on pi.product_id = p.id
        left join product_variants pv on pv.product_id = p.id and pv.is_active = true
        where p.id = %s
          and p.is_active = true
        group by
            p.id,
            p.code,
            p.name,
            p.price,
            p.cost_price,
            p.stock,
            p.min_stock,
            p.unit,
            p.supplier_name,
            p.barcode,
            p.image_url,
            p.note,
            p.is_active,
            p.created_at,
            p.updated_at,
            p.category_id,
            c.name
        """,
        (product_id,),
    )

    row = cur.fetchone()

    if not row:
        return None

    return map_product_row(row)


@router.get("/inventory/history")
def get_all_inventory_history(
    limit: int = Query(default=200, ge=1, le=1000),
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select
                    it.id,
                    it.product_id,
                    it.variant_id,
                    it.type,
                    it.quantity,
                    it.before_stock,
                    it.after_stock,
                    it.unit_cost,
                    it.total_cost,
                    it.reference_type,
                    it.reference_id,
                    it.supplier_name,
                    it.note,
                    it.created_at,
                    p.code as product_code,
                    p.name as product_name,
                    pv.name as variant_name,
                    pv.sku as variant_sku
                from inventory_transactions it
                left join products p on p.id = it.product_id
                left join product_variants pv on pv.id = it.variant_id
                order by it.created_at desc
                limit %s
                """,
                (limit,),
            )

            return [map_inventory_row(row) for row in cur.fetchall()]


@router.get("")
def get_products():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select
                    p.id,
                    p.code,
                    p.name,
                    p.price,
                    p.cost_price,
                    p.stock,
                    p.min_stock,
                    p.unit,
                    p.supplier_name,
                    p.barcode,
                    p.image_url,
                    p.note,
                    p.is_active,
                    p.created_at,
                    p.updated_at,
                    p.category_id,
                    c.name as category_name,
                    coalesce(
                        json_agg(
                            distinct jsonb_build_object(
                                'id', pi.id,
                                'image_url', pi.image_url,
                                'sort_order', pi.sort_order
                            )
                        ) filter (where pi.id is not null),
                        '[]'::json
                    ) as images,
                    count(distinct pv.id) as variant_count,
                    coalesce(sum(distinct pv.stock), 0) as variant_stock
                from products p
                left join product_categories c on c.id = p.category_id
                left join product_images pi on pi.product_id = p.id
                left join product_variants pv on pv.product_id = p.id and pv.is_active = true
                where p.is_active = true
                group by
                    p.id,
                    p.code,
                    p.name,
                    p.price,
                    p.cost_price,
                    p.stock,
                    p.min_stock,
                    p.unit,
                    p.supplier_name,
                    p.barcode,
                    p.image_url,
                    p.note,
                    p.is_active,
                    p.created_at,
                    p.updated_at,
                    p.category_id,
                    c.name
                order by p.created_at desc
                """
            )

            return [map_product_row(row) for row in cur.fetchall()]


@router.get("/{product_id}")
def get_product_by_id(product_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            product = get_product_detail_by_id(cur, product_id)

            if not product:
                raise HTTPException(status_code=404, detail="Product not found.")

            cur.execute(
                """
                select
                    id,
                    product_id,
                    sku,
                    name,
                    unit,
                    price,
                    cost_price,
                    stock,
                    min_stock,
                    is_active,
                    created_at,
                    updated_at
                from product_variants
                where product_id = %s
                  and is_active = true
                order by created_at asc
                """,
                (product_id,),
            )

            product["variants"] = [map_variant_row(row) for row in cur.fetchall()]

            return product


@router.post("")
def create_product(payload: ProductCreate):
    image_urls = payload.image_urls or []

    if payload.image_url and payload.image_url not in image_urls:
        image_urls.insert(0, payload.image_url)

    main_image_url = image_urls[0] if image_urls else None

    code = normalize_code(payload.code)
    name = normalize_text(payload.name)

    if not name:
        raise HTTPException(status_code=400, detail="Product name is required.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    insert into products (
                        code,
                        name,
                        category_id,
                        price,
                        cost_price,
                        stock,
                        min_stock,
                        unit,
                        supplier_name,
                        barcode,
                        image_url,
                        note
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    returning id
                    """,
                    (
                        code,
                        name,
                        payload.category_id or None,
                        payload.price or 0,
                        payload.cost_price or 0,
                        payload.stock or 0,
                        payload.min_stock or 0,
                        normalize_text(payload.unit) or "cay",
                        normalize_text(payload.supplier_name),
                        normalize_text(payload.barcode) or code,
                        main_image_url,
                        normalize_text(payload.note),
                    ),
                )

                product_id = cur.fetchone()[0]

                upsert_product_images(cur, product_id, image_urls)

                if int(payload.stock or 0) != 0:
                    insert_inventory_transaction(
                        cur,
                        product_id=product_id,
                        transaction_type="initial",
                        quantity=int(payload.stock or 0),
                        before_stock=0,
                        after_stock=int(payload.stock or 0),
                        unit_cost=float(payload.cost_price or 0),
                        supplier_name=normalize_text(payload.supplier_name),
                        note="Initial product stock",
                    )

                conn.commit()

                product = get_product_detail_by_id(cur, str(product_id))
                return product

            except HTTPException:
                conn.rollback()
                raise

            except Exception as error:
                conn.rollback()
                raise HTTPException(status_code=400, detail=str(error))


@router.put("/{product_id}")
def update_product(product_id: str, payload: ProductUpdate):
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    select
                        id,
                        code,
                        name,
                        category_id,
                        price,
                        cost_price,
                        stock,
                        min_stock,
                        unit,
                        supplier_name,
                        barcode,
                        image_url,
                        note,
                        is_active
                    from products
                    where id = %s
                      and is_active = true
                    for update
                    """,
                    (product_id,),
                )

                current = cur.fetchone()

                if not current:
                    raise HTTPException(status_code=404, detail="Product not found.")

                code = normalize_code(payload.code) if payload.code is not None else current[1]
                name = normalize_text(payload.name) if payload.name is not None else current[2]
                category_id = payload.category_id if payload.category_id is not None else current[3]
                price = payload.price if payload.price is not None else current[4]
                cost_price = payload.cost_price if payload.cost_price is not None else current[5]
                old_stock = int(current[6] or 0)
                new_stock = payload.stock if payload.stock is not None else old_stock
                min_stock = payload.min_stock if payload.min_stock is not None else current[7]
                unit = normalize_text(payload.unit) if payload.unit is not None else current[8]
                supplier_name = normalize_text(payload.supplier_name) if payload.supplier_name is not None else current[9]
                barcode = (normalize_text(payload.barcode) if payload.barcode is not None else current[10]) or code
                note = normalize_text(payload.note) if payload.note is not None else current[12]
                is_active = payload.is_active if payload.is_active is not None else current[13]

                if payload.image_urls is not None:
                    image_urls = payload.image_urls or []
                    main_image_url = image_urls[0] if image_urls else None
                elif payload.image_url is not None:
                    image_urls = [payload.image_url] if payload.image_url else []
                    main_image_url = payload.image_url
                else:
                    image_urls = None
                    main_image_url = current[11]

                cur.execute(
                    """
                    update products
                    set
                        code = %s,
                        name = %s,
                        category_id = %s,
                        price = %s,
                        cost_price = %s,
                        stock = %s,
                        min_stock = %s,
                        unit = %s,
                        supplier_name = %s,
                        barcode = %s,
                        image_url = %s,
                        note = %s,
                        is_active = %s,
                        updated_at = now()
                    where id = %s
                    returning id
                    """,
                    (
                        code,
                        name,
                        category_id,
                        price,
                        cost_price,
                        new_stock,
                        min_stock,
                        unit or "cay",
                        supplier_name,
                        barcode,
                        main_image_url,
                        note,
                        is_active,
                        product_id,
                    ),
                )

                updated = cur.fetchone()

                if not updated:
                    raise HTTPException(status_code=400, detail="Cannot update product.")

                upsert_product_images(cur, product_id, image_urls)

                stock_delta = int(new_stock or 0) - old_stock

                if stock_delta != 0:
                    insert_inventory_transaction(
                        cur,
                        product_id=product_id,
                        transaction_type="manual_update",
                        quantity=stock_delta,
                        before_stock=old_stock,
                        after_stock=int(new_stock or 0),
                        unit_cost=float(cost_price or 0),
                        supplier_name=supplier_name,
                        note="Stock changed from product edit",
                    )

                conn.commit()

                product = get_product_detail_by_id(cur, product_id)
                return product

            except HTTPException:
                conn.rollback()
                raise

            except Exception as error:
                conn.rollback()
                raise HTTPException(status_code=400, detail=str(error))


@router.delete("/{product_id}")
def delete_product(product_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update products
                set is_active = false,
                    updated_at = now()
                where id = %s
                returning id
                """,
                (product_id,),
            )

            row = cur.fetchone()
            conn.commit()

            if not row:
                raise HTTPException(status_code=404, detail="Product not found.")

            return {
                "id": str(row[0]),
                "deleted": True,
            }


@router.get("/{product_id}/variants")
def get_product_variants(product_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            product = get_product_detail_by_id(cur, product_id)

            if not product:
                raise HTTPException(status_code=404, detail="Product not found.")

            cur.execute(
                """
                select
                    id,
                    product_id,
                    sku,
                    name,
                    unit,
                    price,
                    cost_price,
                    stock,
                    min_stock,
                    is_active,
                    created_at,
                    updated_at
                from product_variants
                where product_id = %s
                  and is_active = true
                order by created_at asc
                """,
                (product_id,),
            )

            return [map_variant_row(row) for row in cur.fetchall()]


@router.post("/{product_id}/variants")
def create_product_variant(product_id: str, payload: VariantCreate):
    name = normalize_text(payload.name)

    if not name:
        raise HTTPException(status_code=400, detail="Variant name is required.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                product = ensure_product_exists(cur, product_id)

                unit = normalize_text(payload.unit) or "cay"
                stock = int(payload.stock or 0)
                cost_price = float(payload.cost_price or 0)

                cur.execute(
                    """
                    insert into product_variants (
                        product_id,
                        sku,
                        name,
                        unit,
                        price,
                        cost_price,
                        stock,
                        min_stock
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s)
                    returning
                        id,
                        product_id,
                        sku,
                        name,
                        unit,
                        price,
                        cost_price,
                        stock,
                        min_stock,
                        is_active,
                        created_at,
                        updated_at
                    """,
                    (
                        product_id,
                        normalize_text(payload.sku),
                        name,
                        unit,
                        payload.price or 0,
                        cost_price,
                        stock,
                        payload.min_stock or 0,
                    ),
                )

                row = cur.fetchone()

                if stock != 0:
                    insert_inventory_transaction(
                        cur,
                        product_id=product_id,
                        variant_id=row[0],
                        transaction_type="initial_variant",
                        quantity=stock,
                        before_stock=0,
                        after_stock=stock,
                        unit_cost=cost_price,
                        note="Initial variant stock",
                    )

                conn.commit()
                return map_variant_row(row)

            except HTTPException:
                conn.rollback()
                raise

            except Exception as error:
                conn.rollback()
                raise HTTPException(status_code=400, detail=str(error))


@router.put("/{product_id}/variants/{variant_id}")
def update_product_variant(product_id: str, variant_id: str, payload: VariantUpdate):
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                current = ensure_variant_exists(cur, product_id, variant_id)

                old_stock = int(current[4] or 0)

                sku = normalize_text(payload.sku) if payload.sku is not None else current[2]
                name = normalize_text(payload.name) if payload.name is not None else current[3]
                stock = payload.stock if payload.stock is not None else old_stock
                cost_price = payload.cost_price if payload.cost_price is not None else current[5]

                cur.execute(
                    """
                    select
                        id,
                        product_id,
                        sku,
                        name,
                        unit,
                        price,
                        cost_price,
                        stock,
                        min_stock,
                        is_active,
                        created_at,
                        updated_at
                    from product_variants
                    where id = %s
                    """,
                    (variant_id,),
                )

                before = cur.fetchone()

                unit = normalize_text(payload.unit) if payload.unit is not None else before[4]
                price = payload.price if payload.price is not None else before[5]
                min_stock = payload.min_stock if payload.min_stock is not None else before[8]
                is_active = payload.is_active if payload.is_active is not None else before[9]

                cur.execute(
                    """
                    update product_variants
                    set
                        sku = %s,
                        name = %s,
                        unit = %s,
                        price = %s,
                        cost_price = %s,
                        stock = %s,
                        min_stock = %s,
                        is_active = %s,
                        updated_at = now()
                    where id = %s
                      and product_id = %s
                    returning
                        id,
                        product_id,
                        sku,
                        name,
                        unit,
                        price,
                        cost_price,
                        stock,
                        min_stock,
                        is_active,
                        created_at,
                        updated_at
                    """,
                    (
                        sku,
                        name,
                        unit,
                        price,
                        cost_price,
                        stock,
                        min_stock,
                        is_active,
                        variant_id,
                        product_id,
                    ),
                )

                row = cur.fetchone()

                stock_delta = int(stock or 0) - old_stock

                if stock_delta != 0:
                    insert_inventory_transaction(
                        cur,
                        product_id=product_id,
                        variant_id=variant_id,
                        transaction_type="manual_update_variant",
                        quantity=stock_delta,
                        before_stock=old_stock,
                        after_stock=int(stock or 0),
                        unit_cost=float(cost_price or 0),
                        note="Variant stock changed from edit",
                    )

                conn.commit()
                return map_variant_row(row)

            except HTTPException:
                conn.rollback()
                raise

            except Exception as error:
                conn.rollback()
                raise HTTPException(status_code=400, detail=str(error))


@router.delete("/{product_id}/variants/{variant_id}")
def delete_product_variant(product_id: str, variant_id: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update product_variants
                set is_active = false,
                    updated_at = now()
                where id = %s
                  and product_id = %s
                returning id
                """,
                (variant_id, product_id),
            )

            row = cur.fetchone()
            conn.commit()

            if not row:
                raise HTTPException(status_code=404, detail="Variant not found.")

            return {
                "id": str(row[0]),
                "deleted": True,
            }


@router.post("/{product_id}/stock-in")
def stock_in_product(product_id: str, payload: StockInPayload):
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                product = ensure_product_exists(cur, product_id)

                quantity = int(payload.quantity)
                supplier_name = normalize_text(payload.supplier_name)
                note = normalize_text(payload.note)

                if payload.variant_id:
                    variant = ensure_variant_exists(cur, product_id, payload.variant_id)

                    before_stock = int(variant[4] or 0)
                    after_stock = before_stock + quantity
                    unit_cost = float(payload.unit_cost if payload.unit_cost is not None else variant[5] or 0)

                    cur.execute(
                        """
                        update product_variants
                        set stock = %s,
                            cost_price = %s,
                            updated_at = now()
                        where id = %s
                          and product_id = %s
                        """,
                        (
                            after_stock,
                            unit_cost,
                            payload.variant_id,
                            product_id,
                        ),
                    )

                    transaction_id = insert_inventory_transaction(
                        cur,
                        product_id=product_id,
                        variant_id=payload.variant_id,
                        transaction_type="stock_in",
                        quantity=quantity,
                        before_stock=before_stock,
                        after_stock=after_stock,
                        unit_cost=unit_cost,
                        supplier_name=supplier_name,
                        note=note,
                    )

                else:
                    before_stock = int(product[3] or 0)
                    after_stock = before_stock + quantity
                    unit_cost = float(payload.unit_cost if payload.unit_cost is not None else product[4] or 0)

                    cur.execute(
                        """
                        update products
                        set stock = %s,
                            cost_price = %s,
                            supplier_name = coalesce(%s, supplier_name),
                            updated_at = now()
                        where id = %s
                        """,
                        (
                            after_stock,
                            unit_cost,
                            supplier_name,
                            product_id,
                        ),
                    )

                    transaction_id = insert_inventory_transaction(
                        cur,
                        product_id=product_id,
                        transaction_type="stock_in",
                        quantity=quantity,
                        before_stock=before_stock,
                        after_stock=after_stock,
                        unit_cost=unit_cost,
                        supplier_name=supplier_name,
                        note=note,
                    )

                conn.commit()

                return {
                    "ok": True,
                    "transaction_id": str(transaction_id),
                    "product_id": product_id,
                    "variant_id": payload.variant_id,
                    "quantity": quantity,
                    "before_stock": before_stock,
                    "after_stock": after_stock,
                    "unit_cost": unit_cost,
                }

            except HTTPException:
                conn.rollback()
                raise

            except Exception as error:
                conn.rollback()
                raise HTTPException(status_code=400, detail=str(error))


@router.post("/{product_id}/stock-adjust")
def adjust_product_stock(product_id: str, payload: StockAdjustPayload):
    if int(payload.quantity_delta or 0) == 0:
        raise HTTPException(status_code=400, detail="Quantity delta cannot be 0.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                product = ensure_product_exists(cur, product_id)

                quantity_delta = int(payload.quantity_delta)
                transaction_type = normalize_text(payload.type) or "adjust"
                note = normalize_text(payload.note)

                if payload.variant_id:
                    variant = ensure_variant_exists(cur, product_id, payload.variant_id)

                    before_stock = int(variant[4] or 0)
                    after_stock = before_stock + quantity_delta

                    if after_stock < 0:
                        raise HTTPException(status_code=400, detail="Variant stock cannot be negative.")

                    unit_cost = float(payload.unit_cost if payload.unit_cost is not None else variant[5] or 0)

                    cur.execute(
                        """
                        update product_variants
                        set stock = %s,
                            updated_at = now()
                        where id = %s
                          and product_id = %s
                        """,
                        (
                            after_stock,
                            payload.variant_id,
                            product_id,
                        ),
                    )

                    transaction_id = insert_inventory_transaction(
                        cur,
                        product_id=product_id,
                        variant_id=payload.variant_id,
                        transaction_type=transaction_type,
                        quantity=quantity_delta,
                        before_stock=before_stock,
                        after_stock=after_stock,
                        unit_cost=unit_cost,
                        note=note,
                    )

                else:
                    before_stock = int(product[3] or 0)
                    after_stock = before_stock + quantity_delta

                    if after_stock < 0:
                        raise HTTPException(status_code=400, detail="Product stock cannot be negative.")

                    unit_cost = float(payload.unit_cost if payload.unit_cost is not None else product[4] or 0)

                    cur.execute(
                        """
                        update products
                        set stock = %s,
                            updated_at = now()
                        where id = %s
                        """,
                        (
                            after_stock,
                            product_id,
                        ),
                    )

                    transaction_id = insert_inventory_transaction(
                        cur,
                        product_id=product_id,
                        transaction_type=transaction_type,
                        quantity=quantity_delta,
                        before_stock=before_stock,
                        after_stock=after_stock,
                        unit_cost=unit_cost,
                        note=note,
                    )

                conn.commit()

                return {
                    "ok": True,
                    "transaction_id": str(transaction_id),
                    "product_id": product_id,
                    "variant_id": payload.variant_id,
                    "quantity_delta": quantity_delta,
                    "before_stock": before_stock,
                    "after_stock": after_stock,
                }

            except HTTPException:
                conn.rollback()
                raise

            except Exception as error:
                conn.rollback()
                raise HTTPException(status_code=400, detail=str(error))


@router.get("/{product_id}/inventory-history")
def get_product_inventory_history(
    product_id: str,
    limit: int = Query(default=100, ge=1, le=500),
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            product = get_product_detail_by_id(cur, product_id)

            if not product:
                raise HTTPException(status_code=404, detail="Product not found.")

            cur.execute(
                """
                select
                    it.id,
                    it.product_id,
                    it.variant_id,
                    it.type,
                    it.quantity,
                    it.before_stock,
                    it.after_stock,
                    it.unit_cost,
                    it.total_cost,
                    it.reference_type,
                    it.reference_id,
                    it.supplier_name,
                    it.note,
                    it.created_at,
                    p.code as product_code,
                    p.name as product_name,
                    pv.name as variant_name,
                    pv.sku as variant_sku
                from inventory_transactions it
                left join products p on p.id = it.product_id
                left join product_variants pv on pv.id = it.variant_id
                where it.product_id = %s
                order by it.created_at desc
                limit %s
                """,
                (
                    product_id,
                    limit,
                ),
            )

            return [map_inventory_row(row) for row in cur.fetchall()]
