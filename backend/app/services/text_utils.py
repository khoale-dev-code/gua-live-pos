import re
import unicodedata


MOJIBAKE_MARKERS = [
    "Ã",
    "Â",
    "Æ",
    "Ä",
    "áº",
    "á»",
    "á»",
    "�",
]


def score_text(value: str) -> int:
    if not value:
        return 0

    score = 0

    for marker in MOJIBAKE_MARKERS:
        score += value.count(marker) * 10

    score += len(re.findall(r"[A-Za-z]�", value)) * 5

    return score


def try_decode_once(value: str, encoding: str):
    try:
        return value.encode(encoding).decode("utf-8")
    except Exception:
        return value


def fix_mojibake_text(value):
    if value is None:
        return None

    if not isinstance(value, str):
        return value

    original = value

    candidates = {original}

    for encoding in ["latin1", "cp1252"]:
        decoded = try_decode_once(original, encoding)
        candidates.add(decoded)

        decoded_twice = try_decode_once(decoded, encoding)
        candidates.add(decoded_twice)

    best = min(candidates, key=score_text)
    best = unicodedata.normalize("NFC", best)

    # Dọn khoảng trắng thừa
    best = re.sub(r"\s+", " ", best).strip()

    return best