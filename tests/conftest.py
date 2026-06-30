"""Shared pytest fixtures for the test suite."""

import tempfile
import os

import pytest

from email_agent import db, config


@pytest.fixture
def temp_db():
    """Give each test a fresh, temporary database.

    Creates a brand-new empty database file, points the app's DB_PATH at it,
    initializes the schema, runs the test, then deletes the file afterward.
    The real database is never touched.
    """
    # Make a temporary file path for this test's database.
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)  # we just need the path; close the file handle

    # Remember the real DB path, then point the app at the temp one.
    original_path = config.DB_PATH
    config.DB_PATH = path

    # Build the fresh schema in the temp database.
    db.init_db()

    # Hand control to the test.
    yield

    # Cleanup: restore the real path and delete the temp database.
    config.DB_PATH = original_path
    os.remove(path)
