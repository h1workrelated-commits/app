"""
Tests for newly-added backend features:
- POST /api/upload (image upload to object storage)
- GET /api/files/{path} (public file serve)
- POST /api/upgrade/checkout (Stripe Pro upgrade)
- GET /api/checkout/status/{session_id} for upgrade kind
- POST /api/ai/improve-idea
- POST /api/track
"""
import io
import os
import uuid
import struct
import zlib
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


def _png_bytes(width=2, height=2):
    """Return a minimal valid PNG byte string."""
    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # RGB, 8 bit
    raw = b""
    for _ in range(height):
        raw += b"\x00" + b"\xff\x00\x00" * width
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def creator():
    suffix = uuid.uuid4().hex[:8]
    email = f"creator_{suffix}@test.com"
    username = f"creator{suffix}"
    password = "password123"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": password,
        "username": username, "name": "New Feature Creator",
    })
    assert r.status_code == 200, r.text
    d = r.json()
    return {
        "token": d["token"], "user": d["user"], "username": username,
        "email": email, "password": password,
    }


@pytest.fixture(scope="module")
def auth_headers(creator):
    return {"Authorization": f"Bearer {creator['token']}"}


# ---------- Upload ----------
class TestUpload:
    def test_upload_no_auth_returns_401(self):
        png = _png_bytes()
        r = requests.post(
            f"{API}/upload",
            files={"file": ("a.png", png, "image/png")},
        )
        assert r.status_code == 401, r.text

    def test_upload_png_success(self, auth_headers):
        png = _png_bytes()
        r = requests.post(
            f"{API}/upload",
            headers=auth_headers,
            files={"file": ("test.png", png, "image/png")},
        )
        # Storage may not be available in env -> 503 acceptable, but record & skip
        if r.status_code == 503:
            pytest.skip(f"Object storage unavailable: {r.text}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and "path" in d
        assert d["url"].startswith("/api/files/")
        assert d["path"] in d["url"]
        TestUpload._uploaded = d

    def test_upload_rejects_non_image(self, auth_headers):
        r = requests.post(
            f"{API}/upload",
            headers=auth_headers,
            files={"file": ("bad.txt", b"hello world", "text/plain")},
        )
        assert r.status_code == 400, r.text

    def test_upload_rejects_oversize(self, auth_headers):
        big = b"\x00" * (5 * 1024 * 1024 + 100)  # 5MB + 100 bytes
        r = requests.post(
            f"{API}/upload",
            headers=auth_headers,
            files={"file": ("big.png", big, "image/png")},
        )
        # Too large should be rejected with 400
        assert r.status_code == 400, r.text

    def test_get_file_public(self, auth_headers):
        # depends on test_upload_png_success
        if not hasattr(TestUpload, "_uploaded"):
            pytest.skip("Upload didn't succeed; skipping serve test.")
        path = TestUpload._uploaded["path"]
        r = requests.get(f"{API}/files/{path}")
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/")
        # NOTE: Cache-Control "public, max-age=31536000, immutable" is set by the route
        # but the public ingress proxy currently overrides it to "no-store, no-cache, must-revalidate".
        # We assert correctness at the backend layer only via direct call (skipped here).
        assert len(r.content) > 0

    def test_get_file_not_found(self):
        r = requests.get(f"{API}/files/nonexistent/path/{uuid.uuid4().hex}.png")
        assert r.status_code == 404


# ---------- Pro upgrade ----------
class TestUpgrade:
    def test_upgrade_no_auth(self):
        r = requests.post(f"{API}/upgrade/checkout", json={"origin_url": BASE_URL})
        assert r.status_code == 401

    def test_upgrade_create_session(self, auth_headers, creator):
        r = requests.post(
            f"{API}/upgrade/checkout",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"origin_url": BASE_URL},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and "session_id" in d
        assert d["url"].startswith("http")
        TestUpgrade._session_id = d["session_id"]

    def test_upgrade_status_graceful(self):
        if not hasattr(TestUpgrade, "_session_id"):
            pytest.skip("upgrade session not created")
        sid = TestUpgrade._session_id
        r = requests.get(f"{API}/checkout/status/{sid}")
        # Critical: must NOT 500 even if Stripe doesn't recognize session
        assert r.status_code == 200, f"got {r.status_code}: {r.text}"
        d = r.json()
        assert d["session_id"] == sid
        assert "payment_status" in d
        assert d["payment_status"] in ("unpaid", "no_payment_required", "open", "pending", "paid", "initiated")
        # Amount should be the upgrade amount of $10
        assert float(d.get("amount") or 0) == 10.0


# ---------- AI improve idea ----------
class TestAI:
    def test_ai_improve_no_auth(self):
        r = requests.post(f"{API}/ai/improve-idea", json={"text": "a course about marketing"})
        assert r.status_code == 401

    def test_ai_improve_too_short(self, auth_headers):
        r = requests.post(
            f"{API}/ai/improve-idea",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"text": "x"},  # < 3
        )
        assert r.status_code == 422

    def test_ai_improve_success(self, auth_headers):
        r = requests.post(
            f"{API}/ai/improve-idea",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"text": "I want to launch a 5-day email course about UX"},
            timeout=60,
        )
        if r.status_code in (500, 502):
            pytest.skip(f"AI service error: {r.text}")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("title", "one_liner", "cta_text"):
            assert k in d and isinstance(d[k], str) and len(d[k]) > 0


# ---------- Tracking ----------
class TestTrack:
    def test_track_view(self, creator):
        r = requests.post(f"{API}/track", json={
            "event": "view",
            "session_id": uuid.uuid4().hex,
            "board_username": creator["username"],
            "path": "/" + creator["username"],
        })
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_track_invalid_event(self):
        r = requests.post(f"{API}/track", json={
            "event": "notarealevent",
            "session_id": uuid.uuid4().hex,
        })
        assert r.status_code == 422


# ---------- Regression smoke for existing critical endpoints ----------
class TestRegression:
    def test_signup_login_me(self):
        suffix = uuid.uuid4().hex[:8]
        email = f"reg_{suffix}@test.com"
        username = f"reg{suffix}"
        r = requests.post(f"{API}/auth/signup", json={
            "email": email, "password": "password123", "username": username,
        })
        assert r.status_code == 200
        tok = r.json()["token"]
        rl = requests.post(f"{API}/auth/login", json={"email": email, "password": "password123"})
        assert rl.status_code == 200
        rm = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert rm.status_code == 200
        assert rm.json()["email"] == email

    def test_board_endpoint_alias(self, creator):
        r = requests.get(f"{API}/board/{creator['username']}")
        assert r.status_code == 200
        d = r.json()
        assert d["store"]["username"] == creator["username"]
        assert isinstance(d["products"], list)

    def test_create_product(self, auth_headers):
        r = requests.post(
            f"{API}/products",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"type": "digital", "title": "TEST_NewFeat", "price": 5.0},
        )
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_NewFeat"

    def test_analytics(self, auth_headers):
        r = requests.get(f"{API}/analytics", headers=auth_headers)
        assert r.status_code == 200
        assert "total_revenue" in r.json()
