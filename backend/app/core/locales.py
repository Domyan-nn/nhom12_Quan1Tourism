"""Narration languages the system accepts (PRD 5.6, BR03, BR05).

PRD: the exact languages beyond the minimum are confirmed with the lecturer. Edit this list
only; Admin reads it from GET /api/v1/locales, so the form never offers a code the API rejects.
`speech_tag` is the preferred TTS voice tag on web and mobile.
"""

SUPPORTED_LOCALES = {
    "vi": {"name": "Tiếng Việt", "name_en": "Vietnamese", "speech_tag": "vi-VN"},
    "en": {"name": "English", "name_en": "English", "speech_tag": "en-US"},
    "fr": {"name": "Français", "name_en": "French", "speech_tag": "fr-FR"},
    "zh": {"name": "中文", "name_en": "Chinese", "speech_tag": "zh-CN"},
    "ja": {"name": "日本語", "name_en": "Japanese", "speech_tag": "ja-JP"},
    "ko": {"name": "한국어", "name_en": "Korean", "speech_tag": "ko-KR"},
}


def locale_items() -> list[dict]:
    return [{"code": code, **info} for code, info in SUPPORTED_LOCALES.items()]
