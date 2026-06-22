from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.database import get_connection

router = APIRouter(prefix="/api/categories", tags=["Categories"])


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None


@router.get("")
def get_categories():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select id, name, description, is_active, created_at
                from product_categories
                where is_active = true
                order by created_at asc
                """
            )

            rows = cur.fetchall()

            return [
                {
                    "id": str(row[0]),
                    "name": row[1],
                    "description": row[2],
                    "is_active": row[3],
                    "created_at": row[4].isoformat() if row[4] else None,
                }
                for row in rows
            ]


@router.post("")
def create_category(payload: CategoryCreate):
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    insert into product_categories (name, description)
                    values (%s, %s)
                    returning id, name, description, is_active, created_at
                    """,
                    (
                        payload.name.strip(),
                        payload.description,
                    ),
                )

                row = cur.fetchone()
                conn.commit()

                if not row:
                    raise HTTPException(status_code=400, detail="Cannot create category")

                return {
                    "id": str(row[0]),
                    "name": row[1],
                    "description": row[2],
                    "is_active": row[3],
                    "created_at": row[4].isoformat() if row[4] else None,
                }

            except Exception as e:
                conn.rollback()
                raise HTTPException(status_code=400, detail=str(e))
