"""Encryption helpers for sensitive data at rest (Gmail OAuth tokens).

Uses Fernet (symmetric encryption) with a key from the environment.
Kept separate from auth.py so any module can encrypt/decrypt without
creating import cycles, and so encryption is a single, clearly-owned concern.
"""

import os

from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

_fernet = Fernet(os.environ["FERNET_KEY"])


def encrypt_token(plaintext: str) -> str:
    """Encrypt a token for safe storage. Returns an encrypted string."""
    return _fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(encrypted: str) -> str:
    """Decrypt a stored token back to its original value."""
    return _fernet.decrypt(encrypted.encode("utf-8")).decode("utf-8")
