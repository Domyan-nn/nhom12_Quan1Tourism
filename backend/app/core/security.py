"""Password and session-token helpers compatible with the demo seed."""

import base64
import binascii
import hashlib
import hmac
import secrets
import unicodedata

PBKDF2_ITERATIONS = 600_000


def normalize_username(username: str) -> str:
    return unicodedata.normalize("NFC", username.strip()).casefold()


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, digest_text = encoded.split("$")
        iterations = int(iterations_text)
        salt = base64.b64decode(salt_text, validate=True)
        expected = base64.b64decode(digest_text, validate=True)
        if algorithm != "pbkdf2_sha256" or not 1 <= iterations <= 2_000_000 or len(salt) != 16 or len(expected) != 32:
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except (ValueError, OverflowError, binascii.Error):
        return False


def consume_password_work(password: str) -> None:
    """Perform comparable work when an account/hash cannot be verified."""
    hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes(16), PBKDF2_ITERATIONS)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
