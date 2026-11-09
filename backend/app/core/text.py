"""Text helpers shared by search features."""

import unicodedata


def search_key(text: str) -> str:
    """BR02 search key: trim, ignore case and Vietnamese diacritics.

    "Chợ Bến Thành", "CHO BEN THANH" and decomposed (NFD) input share one key, so visitors
    whose keyboards have no Vietnamese layout still find places by name.
    """
    decomposed = unicodedata.normalize("NFD", text.strip())
    without_marks = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return without_marks.replace("đ", "d").replace("Đ", "D").casefold()
