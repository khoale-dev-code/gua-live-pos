from app.services.database import get_connection
from app.services.text_utils import fix_mojibake_text


TABLE_COLUMNS = {
    "orders": [
        "customer_name",
        "customer_phone",
        "customer_address",
        "fb_name",
        "fb_link",
        "province",
        "district",
        "ward",
        "address_detail",
        "note",
    ],
    "customers": [
        "name",
        "phone",
        "address",
        "fb_name",
        "fb_link",
        "province",
        "district",
        "ward",
        "address_detail",
        "note",
    ],
}


def fix_table(table_name, columns):
    updated_count = 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            column_sql = ", ".join(columns)

            cur.execute(
                f"""
                select id, {column_sql}
                from {table_name}
                """
            )

            rows = cur.fetchall()

            for row in rows:
                row_id = row[0]
                values = row[1:]

                updates = {}
                for column, value in zip(columns, values):
                    fixed = fix_mojibake_text(value)

                    if fixed != value:
                        updates[column] = fixed

                if not updates:
                    continue

                set_sql = ", ".join([f"{column} = %s" for column in updates.keys()])
                params = list(updates.values()) + [row_id]

                cur.execute(
                    f"""
                    update {table_name}
                    set {set_sql}
                    where id = %s
                    """,
                    params,
                )

                updated_count += 1

            conn.commit()

    print(f"{table_name}: updated {updated_count} rows")


def main():
    for table_name, columns in TABLE_COLUMNS.items():
        fix_table(table_name, columns)


if __name__ == "__main__":
    main()