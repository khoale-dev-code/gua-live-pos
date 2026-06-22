import re
import unicodedata

from app.services.database import get_connection


BAD_MARKERS = ["Ã", "Â", "Æ", "Ä", "áº", "á»", "�"]


def bad_score(text: str) -> int:
    if not text:
        return 0

    score = 0

    for marker in BAD_MARKERS:
        score += text.count(marker) * 10

    # C1 control chars hay xuất hiện khi bị mojibake: \x80-\x9f
    score += len(re.findall(r"[\u0080-\u009f]", text)) * 20

    return score


def try_fix(text):
    if text is None:
        return None

    if not isinstance(text, str):
        return text

    original = text
    candidates = {original}

    for encoding in ["latin1", "cp1252"]:
        try:
            one = original.encode(encoding, errors="ignore").decode("utf-8", errors="ignore")
            candidates.add(one)

            two = one.encode(encoding, errors="ignore").decode("utf-8", errors="ignore")
            candidates.add(two)
        except Exception:
            pass

    best = min(candidates, key=bad_score)
    best = unicodedata.normalize("NFC", best)
    best = re.sub(r"\s+", " ", best).strip()

    return best


def fix_table(table, columns):
    updated = 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                select id, {", ".join(columns)}
                from {table}
                """
            )

            rows = cur.fetchall()

            for row in rows:
                row_id = row[0]
                values = row[1:]

                changes = {}

                for column, value in zip(columns, values):
                    fixed = try_fix(value)

                    if fixed != value:
                        changes[column] = fixed

                if not changes:
                    continue

                print(f"\n{table} {row_id}")
                for key, value in changes.items():
                    print(f"- {key}: {repr(value)}")

                set_sql = ", ".join([f"{column} = %s" for column in changes.keys()])
                params = list(changes.values()) + [row_id]

                cur.execute(
                    f"""
                    update {table}
                    set {set_sql}
                    where id = %s
                    """,
                    params,
                )

                updated += 1

            conn.commit()

    print(f"\n{table}: updated {updated} rows")


def main():
    fix_table(
        "orders",
        [
            "customer_name",
            "customer_address",
            "fb_name",
            "province",
            "district",
            "ward",
            "address_detail",
            "note",
        ],
    )

    fix_table(
        "customers",
        [
            "name",
            "address",
            "fb_name",
            "province",
            "district",
            "ward",
            "address_detail",
            "note",
        ],
    )


if __name__ == "__main__":
    main()