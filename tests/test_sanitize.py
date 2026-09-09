from email_agent.sanitize import sanitize_reply_html


def test_strips_script_tags():
    dirty = '<p>hi</p><script>alert(1)</script>'
    clean = sanitize_reply_html(dirty)
    assert "<script>" not in clean
    assert "hi" in clean


def test_strips_javascript_urls():
    dirty = '<a href="javascript:alert(1)">x</a>'
    clean = sanitize_reply_html(dirty)
    assert "javascript:" not in clean.lower()
