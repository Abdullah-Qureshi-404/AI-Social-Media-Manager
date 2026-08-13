"""
Centralized security validation utilities.

Provides:
  - validate_image_upload()       — combined MIME + magic-byte + size gate
  - sanitize_ai_prompt_input()    — prompt-injection hardening for all AI callsites
"""
import re
from typing import Optional

from fastapi import status

from app.middleware.exception_handler import AppException

# ---------------------------------------------------------------------------
# Image validation
# ---------------------------------------------------------------------------

ALLOWED_IMAGE_MIME_TYPES: frozenset[str] = frozenset(
    {"image/jpeg", "image/png", "image/webp"}
)

# Maximum size used for all *post* image uploads (edited canvas blob included).
POST_MAX_IMAGE_BYTES: int = 10 * 1024 * 1024  # 10 MB


def _check_magic_bytes(header: bytes) -> bool:
    """Return True when the leading bytes match JPEG, PNG, or WEBP signatures."""
    if len(header) < 12:
        return False
    if header.startswith(b"\xff\xd8\xff"):           # JPEG
        return True
    if header.startswith(b"\x89PNG\r\n\x1a\n"):      # PNG
        return True
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":  # WEBP
        return True
    return False


def validate_image_upload(
    content: bytes,
    claimed_mime: Optional[str],
    *,
    max_bytes: int = POST_MAX_IMAGE_BYTES,
) -> None:
    """
    Gate that must pass before any image bytes are processed or stored.

    Checks (in fast-fail order):
    1. MIME type is in the allow-list.
    2. Leading magic bytes match a known safe format.
    3. Total size is within the configured limit.

    Raises AppException(400) on any failure so the caller's business logic is
    never reached with untrusted data.
    """
    # 1. MIME allow-list
    if claimed_mime not in ALLOWED_IMAGE_MIME_TYPES:
        raise AppException(
            message=(
                f"Unsupported file format '{claimed_mime}'. "
                "Allowed formats: JPEG, PNG, WEBP."
            ),
            code="UNSUPPORTED_FILE_TYPE",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )

    # 2. Magic-byte verification — guards against MIME-spoofed uploads
    if not _check_magic_bytes(content[:12]):
        raise AppException(
            message="File content does not match a valid image format (JPEG, PNG, WEBP).",
            code="INVALID_IMAGE_CONTENT",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 3. Size limit
    if len(content) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise AppException(
            message=f"File size exceeds the maximum allowed limit of {limit_mb} MB.",
            code="FILE_TOO_LARGE",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


# ---------------------------------------------------------------------------
# AI prompt injection hardening
# ---------------------------------------------------------------------------

# Hard length cap applied *before* inserting user text into any AI prompt.
_MAX_USER_TEXT_LENGTH: int = 2000

# Role/instruction prefixes to strip at the start of any line (case-insensitive).
_FORBIDDEN_LINE_PREFIXES: tuple[str, ...] = (
    "system:",
    "assistant:",
    "user:",
    "###",
    "<|system|>",
    "<|assistant|>",
    "<|user|>",
    "[system]",
    "[assistant]",
    "[user]",
)

# Phrase patterns that signal direct injection attempts.
_INJECTION_PATTERNS: re.Pattern = re.compile(
    r"""
    ignore\s+(?:previous|above|all|prior|the\s+above)\s+instructions?
    | forget\s+(?:your|all\s+previous)\s+instructions?
    | you\s+are\s+now\s+(?:a|an|the)?
    | new\s+instructions?\s*:
    | disregard\s+(?:previous|all|your)
    | override\s+(?:previous|system|your|all)
    | reveal\s+(?:your|the)\s+(?:system\s+)?prompt
    | print\s+(?:your|the)\s+(?:system\s+)?prompt
    | show\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?)
    | act\s+as\s+(?:a|an|if)
    | pretend\s+(?:you\s+are|to\s+be)
    | do\s+anything\s+now
    | jailbreak
    | dan\s+mode
    | developer\s+mode
    | no\s+restrictions
    | bypass\s+(?:your|all|the)?
    | from\s+now\s+on\s+(?:you\s+(?:are|will|must))?
    | following\s+new\s+instructions?
    """,
    re.IGNORECASE | re.VERBOSE,
)


def sanitize_ai_prompt_input(text: Optional[str], max_length: int = _MAX_USER_TEXT_LENGTH) -> str:
    """
    Harden arbitrary user-supplied text before it is inserted into any AI prompt.

    Strategy:
      1. Truncate to max_length (fail-safe default: 2 000 chars).
      2. Remove lines that start with known role/instruction prefixes.
      3. Remove substrings matching injection-attempt patterns.
      4. Collapse excessive whitespace.

    The sanitized text should be inserted in AI prompts clearly labelled as
    DATA — never as a continuation of the system instruction block.

    This is a defence-in-depth layer.  The caller is still responsible for
    structuring prompts so user content cannot overwrite developer instructions
    (see the build_caption_prompt / build_strategy_prompt helpers in each
    service that call this function).
    """
    if not text:
        return ""

    # 1. Hard truncate before any other processing
    text = text[:max_length]

    # 2. Strip lines that begin with role markers
    clean_lines: list[str] = []
    for line in text.splitlines():
        stripped = line.strip().lower()
        if any(stripped.startswith(prefix) for prefix in _FORBIDDEN_LINE_PREFIXES):
            continue
        clean_lines.append(line)
    text = "\n".join(clean_lines)

    # 3. Erase injection phrases
    text = _INJECTION_PATTERNS.sub("", text)

    # 4. Normalise whitespace but preserve newlines
    text = re.sub(r"[^\S\n]+", " ", text).strip()

    return text
