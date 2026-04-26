"""
Backend API tests for Creator Storefront app (FastAPI + MongoDB).
Covers: auth, store, products, subscribe/customers, orders, affiliates,
analytics, Stripe checkout (create-session/status/webhook), account delete.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
# Fall back to reading from frontend .env file
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def creator(session):
    """Sign up a unique creator and return {token, user, username, email, password}."""
    suffix = uuid.uuid4().hex[:8]
    email = f"creator_{suffix}@test.com"
    username = f"creator{suffix}"
    password = "password123"
    r = session.post(f"{API}/auth/signup", json={
        "email": email, "password": password,
        "username": username, "name": "Test Creator",
    })
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return {
        "token": data["token"], "user": data["user"],
        "username": username, "email": email, "password": password,
    }


@pytest.fixture(scope="session")
def auth_headers(creator):
    return {"Authorization": f"Bearer {creator['token']}", "Content-Type": "application/json"}


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_signup_duplicate_email(self, session, creator):
        r = session.post(f"{API}/auth/signup", json={
            "email": creator["email"], "password": "password123",
            "username": f"new{uuid.uuid4().hex[:6]}",
        })
        assert r.status_code == 400

    def test_signup_duplicate_username(self, session, creator):
        r = session.post(f"{API}/auth/signup", json={
            "email": f"x_{uuid.uuid4().hex[:6]}@test.com", "password": "password123",
            "username": creator["username"],
        })
        assert r.status_code == 400

    def test_login_success(self, session, creator):
        r = session.post(f"{API}/auth/login", json={
            "email": creator["email"], "password": creator["password"],
        })
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and d["user"]["email"] == creator["email"]
        assert d["user"]["username"] == creator["username"]
        # Cookie should be set
        assert any(c.name == "access_token" for c in r.cookies)

    def test_login_wrong_password(self, session, creator):
        r = session.post(f"{API}/auth/login", json={
            "email": creator["email"], "password": "wrongpass",
        })
        assert r.status_code == 401

    def test_me_with_bearer(self, session, auth_headers, creator):
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == creator["email"]
        assert "password_hash" not in r.json()

    def test_me_no_token(self, session):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Store ----------
class TestStore:
    def test_get_my_store(self, session, auth_headers, creator):
        r = session.get(f"{API}/store", headers=auth_headers)
        assert r.status_code == 200
        s = r.json()
        assert s["username"] == creator["username"]
        assert s["accent_color"] == "#003CFF"

    def test_public_store(self, creator):
        r = requests.get(f"{API}/store/{creator['username']}")
        assert r.status_code == 200
        d = r.json()
        assert d["store"]["username"] == creator["username"]
        assert isinstance(d["products"], list)

    def test_public_store_not_found(self):
        r = requests.get(f"{API}/store/nonexistent_{uuid.uuid4().hex[:6]}")
        assert r.status_code == 404

    def test_update_store(self, session, auth_headers):
        r = session.put(f"{API}/store", headers=auth_headers, json={
            "name": "Updated Name", "bio": "New bio",
            "avatar_url": "https://example.com/a.png", "accent_color": "#FF0033",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "Updated Name"
        assert d["bio"] == "New bio"
        assert d["accent_color"] == "#FF0033"
        # Verify GET reflects
        r2 = session.get(f"{API}/store", headers=auth_headers)
        assert r2.json()["bio"] == "New bio"


# ---------- Products ----------
@pytest.fixture(scope="session")
def created_product(session, auth_headers):
    r = session.post(f"{API}/products", headers=auth_headers, json={
        "type": "digital", "title": "TEST_Ebook", "description": "An ebook",
        "price": 19.99, "image_url": "", "category": "books",
        "featured": True, "is_active": True,
    })
    assert r.status_code == 200
    return r.json()


class TestProducts:
    def test_create_product(self, created_product):
        assert created_product["title"] == "TEST_Ebook"
        assert created_product["price"] == 19.99
        assert "id" in created_product
        assert created_product["sales_count"] == 0
        assert created_product["view_count"] == 0

    def test_list_products(self, session, auth_headers, created_product):
        r = session.get(f"{API}/products", headers=auth_headers)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert created_product["id"] in ids

    def test_get_product_increments_view(self, session, created_product):
        pid = created_product["id"]
        r1 = session.get(f"{API}/products/{pid}")
        assert r1.status_code == 200
        v1 = r1.json()["view_count"]
        r2 = session.get(f"{API}/products/{pid}")
        v2 = r2.json()["view_count"]
        assert v2 == v1 + 1

    def test_update_product(self, session, auth_headers, created_product):
        pid = created_product["id"]
        r = session.put(f"{API}/products/{pid}", headers=auth_headers, json={
            "title": "TEST_Ebook v2", "price": 29.99,
        })
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST_Ebook v2"
        assert d["price"] == 29.99

    def test_ownership_other_user_cannot_update(self, session, created_product):
        # Create another user
        suffix = uuid.uuid4().hex[:8]
        r = session.post(f"{API}/auth/signup", json={
            "email": f"other_{suffix}@test.com", "password": "password123",
            "username": f"other{suffix}",
        })
        assert r.status_code == 200
        other_token = r.json()["token"]
        h = {"Authorization": f"Bearer {other_token}", "Content-Type": "application/json"}
        r2 = requests.put(f"{API}/products/{created_product['id']}",
                          headers=h, json={"title": "hacked"})
        assert r2.status_code == 404
        r3 = requests.delete(f"{API}/products/{created_product['id']}", headers=h)
        assert r3.status_code == 404


# ---------- Subscribers / Customers ----------
class TestSubscribers:
    def test_subscribe_no_auth(self, session, creator):
        r = requests.post(f"{API}/subscribe", json={
            "email": "TEST_sub@example.com", "name": "Sub", "store_username": creator["username"],
        })
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_subscribe_invalid_store(self):
        r = requests.post(f"{API}/subscribe", json={
            "email": "TEST_sub2@example.com", "store_username": f"none_{uuid.uuid4().hex[:6]}",
        })
        assert r.status_code == 404

    def test_subscribe_dedup(self, creator):
        body = {"email": "TEST_dedup@example.com", "store_username": creator["username"]}
        r1 = requests.post(f"{API}/subscribe", json=body)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/subscribe", json=body)
        assert r2.status_code == 200
        assert r2.json().get("already") is True

    def test_create_customer_manual(self, session, auth_headers):
        r = session.post(f"{API}/customers", headers=auth_headers, json={
            "email": "TEST_manual@example.com", "name": "Manual",
        })
        assert r.status_code == 200

    def test_list_customers(self, session, auth_headers):
        r = session.get(f"{API}/customers", headers=auth_headers)
        assert r.status_code == 200
        emails = [c["email"] for c in r.json()]
        assert "test_sub@example.com" in emails or "TEST_sub@example.com".lower() in emails


# ---------- Orders ----------
class TestOrders:
    def test_orders_initially_empty(self, session, auth_headers):
        r = session.get(f"{API}/orders", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Affiliates ----------
class TestAffiliates:
    def test_create_affiliate(self, session, auth_headers, created_product):
        r = session.post(f"{API}/affiliates", headers=auth_headers, json={
            "product_id": created_product["id"], "commission_pct": 25.0,
        })
        assert r.status_code == 200
        d = r.json()
        assert "code" in d and len(d["code"]) > 0
        assert d["commission_pct"] == 25.0
        # store code for click test
        TestAffiliates._code = d["code"]

    def test_affiliate_click_increments(self, session):
        code = TestAffiliates._code
        r = requests.post(f"{API}/affiliate/{code}/click")
        assert r.status_code == 200
        # list and verify clicks==1
        # (need auth to list, but we just verify status; clicks check via /affiliates)

    def test_affiliate_click_invalid(self):
        r = requests.post(f"{API}/affiliate/invalid_code_xyz/click")
        assert r.status_code == 404

    def test_affiliate_list_reflects(self, session, auth_headers):
        r = session.get(f"{API}/affiliates", headers=auth_headers)
        assert r.status_code == 200
        affs = r.json()
        assert any(a["code"] == TestAffiliates._code and a["clicks"] >= 1 for a in affs)


# ---------- Analytics ----------
class TestAnalytics:
    def test_analytics_shape(self, session, auth_headers):
        r = session.get(f"{API}/analytics", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for key in ["total_revenue", "total_sales", "total_views",
                    "conversion_rate", "subscribers", "trend", "top_products"]:
            assert key in d, f"missing {key}"
        assert isinstance(d["trend"], list)
        assert len(d["trend"]) == 14
        assert all("date" in x and "revenue" in x for x in d["trend"])
        assert isinstance(d["top_products"], list)


# ---------- Stripe Checkout ----------
class TestCheckout:
    def test_create_session_invalid_product(self, session):
        r = requests.post(f"{API}/checkout/create-session", json={
            "product_id": "nonexistent", "origin_url": BASE_URL,
        })
        assert r.status_code == 404

    def test_create_session_zero_price(self, session, auth_headers, creator):
        # Create a free product
        r = session.post(f"{API}/products", headers=auth_headers, json={
            "type": "lead_magnet", "title": "TEST_Free", "price": 0.0,
        })
        assert r.status_code == 200
        free_id = r.json()["id"]
        r2 = requests.post(f"{API}/checkout/create-session", json={
            "product_id": free_id, "origin_url": BASE_URL,
        })
        assert r2.status_code == 400

    def test_create_session_success(self, session, created_product):
        r = requests.post(f"{API}/checkout/create-session", json={
            "product_id": created_product["id"], "origin_url": BASE_URL,
            "buyer_email": "TEST_buyer@example.com",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and "session_id" in d
        assert d["url"].startswith("http")
        TestCheckout._session_id = d["session_id"]

    def test_checkout_status(self, session):
        sid = TestCheckout._session_id
        r = requests.get(f"{API}/checkout/status/{sid}")
        # Must NOT be 500 - per testing requirements
        assert r.status_code == 200, f"status returned {r.status_code}: {r.text}"
        d = r.json()
        assert d["session_id"] == sid
        assert "status" in d
        assert "payment_status" in d
        # In test, expect open/pending (not paid)
        assert d["payment_status"] in ("unpaid", "no_payment_required", "open", "pending", "paid", "initiated")

    def test_checkout_status_not_found(self):
        r = requests.get(f"{API}/checkout/status/cs_nonexistent_xyz123")
        assert r.status_code == 404

    def test_webhook_invalid_signature(self):
        # No real Stripe-Signature -> handle_webhook should fail and return 400
        r = requests.post(f"{API}/webhook/stripe", data=b'{"type":"test"}',
                          headers={"Stripe-Signature": "bad"})
        assert r.status_code == 400, f"expected graceful 400, got {r.status_code}: {r.text}"


# ---------- Account Deletion (run last) ----------
class TestZAccountDelete:
    def test_delete_account(self, session, creator):
        # Create a fresh disposable account for delete test
        suffix = uuid.uuid4().hex[:8]
        r = requests.post(f"{API}/auth/signup", json={
            "email": f"todelete_{suffix}@test.com", "password": "password123",
            "username": f"todel{suffix}",
        })
        assert r.status_code == 200
        tok = r.json()["token"]
        uname = r.json()["user"]["username"]
        h = {"Authorization": f"Bearer {tok}"}

        # Add a product to verify cascade
        rp = requests.post(f"{API}/products", headers={**h, "Content-Type": "application/json"},
                           json={"type": "digital", "title": "TEST_del", "price": 5.0})
        assert rp.status_code == 200

        rd = requests.delete(f"{API}/auth/account", headers=h)
        assert rd.status_code == 200
        assert rd.json().get("deleted") is True

        # Verify store gone
        rs = requests.get(f"{API}/store/{uname}")
        assert rs.status_code == 404

        # /me should now fail
        rm = requests.get(f"{API}/auth/me", headers=h)
        assert rm.status_code == 401
