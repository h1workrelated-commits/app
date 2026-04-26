from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import asyncio
import logging
import secrets as py_secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
import resend
import requests as http_requests
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
)
from emergentintegrations.llm.chat import LlmChat, UserMessage


# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
JWT_ALG = "HS256"
ACCESS_TOKEN_TTL_DAYS = 7

# Object storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "stand-board"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
PRO_PRICE_USD = 10.0
PRO_DAYS = 30
storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        resp = http_requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_LLM_KEY},
            timeout=30,
        )
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logging.getLogger("storefront").warning(f"Storage init failed: {e}")
        return None


def put_object_sync(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(503, "Storage unavailable")
    resp = http_requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object_sync(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(503, "Storage unavailable")
    resp = http_requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

resend.api_key = RESEND_API_KEY

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("storefront")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Creator Storefront")
api = APIRouter(prefix="/api")


# ---------- Models ----------
class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    username: str = Field(min_length=3, max_length=30)
    name: Optional[str] = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    accent_color: Optional[str] = None
    links: Optional[List[dict]] = None
    testimonials: Optional[List[dict]] = None
    faqs: Optional[List[dict]] = None


ProductType = Literal["digital", "coaching", "course", "lead_magnet", "membership"]


class ProductCreate(BaseModel):
    type: ProductType
    title: str
    description: Optional[str] = ""
    one_liner: Optional[str] = ""
    price: float = 0.0
    image_url: Optional[str] = ""
    file_url: Optional[str] = ""
    category: Optional[str] = ""
    featured: bool = False
    is_active: bool = True
    recurring: bool = False
    cta_type: Optional[str] = None  # 'buy' | 'waitlist' | 'support'
    cta_text: Optional[str] = None


class ProductUpdate(BaseModel):
    type: Optional[ProductType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    one_liner: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    file_url: Optional[str] = None
    category: Optional[str] = None
    featured: Optional[bool] = None
    is_active: Optional[bool] = None
    recurring: Optional[bool] = None
    cta_type: Optional[str] = None
    cta_text: Optional[str] = None


class CheckoutBody(BaseModel):
    product_id: str
    origin_url: str
    buyer_email: Optional[EmailStr] = None
    affiliate_code: Optional[str] = None
    discount_code: Optional[str] = None


class SubscribeBody(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    store_username: str
    product_id: Optional[str] = None


class AffiliateCreate(BaseModel):
    product_id: str
    commission_pct: float = 20.0


class CustomerCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class AIImproveBody(BaseModel):
    text: str = Field(min_length=3, max_length=1000)


class TrackBody(BaseModel):
    item_id: Optional[str] = None
    board_username: Optional[str] = None
    event: Literal["view", "click", "cta_click", "email_submit", "time_spent"]
    session_id: str
    time_ms: Optional[int] = None
    source: Optional[str] = None
    path: Optional[str] = None


class UpgradeBody(BaseModel):
    origin_url: str


# ---------- Helpers ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_TTL_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def public_user(u: dict) -> dict:
    return {k: v for k, v in u.items() if k not in ("password_hash", "_id")}


async def send_email_async(to: str, subject: str, html: str) -> Optional[str]:
    if not RESEND_API_KEY or RESEND_API_KEY.startswith("re_placeholder"):
        logger.info(f"[EMAIL MOCK] to={to} subject={subject}")
        return None
    try:
        result = await asyncio.to_thread(
            resend.Emails.send,
            {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html},
        )
        return result.get("id") if isinstance(result, dict) else None
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return None


def order_confirmation_html(product_title: str, amount: float, file_url: Optional[str]) -> str:
    download_block = (
        f'<p>Your download: <a href="{file_url}">{file_url}</a></p>' if file_url else ""
    )
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="color:#003CFF;font-size:22px;margin-bottom:8px;">Thanks for your purchase!</h1>
      <p style="color:#52525B;">You bought <strong>{product_title}</strong> for ${amount:.2f}.</p>
      {download_block}
      <p style="color:#52525B;font-size:13px;margin-top:32px;">Sent via your creator storefront.</p>
    </div>
    """


# ---------- Auth ----------
@api.post("/auth/signup")
async def signup(body: SignupBody, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    username = body.username.lower().strip()
    if await db.users.find_one({"username": username}):
        raise HTTPException(400, "Username already taken")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "username": username,
        "name": body.name or username,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    await db.stores.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "username": username,
        "name": body.name or username,
        "bio": "Welcome to my board",
        "avatar_url": "",
        "accent_color": "#003CFF",
        "links": [],
        "testimonials": [],
        "faqs": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    token = make_token(user_id, email)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 7, path="/")
    return {"token": token, "user": public_user(user_doc)}


@api.post("/auth/login")
async def login(body: LoginBody, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user["id"], email)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 7, path="/")
    return {"token": token, "user": public_user(user)}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.delete("/auth/account")
async def delete_account(user: dict = Depends(get_current_user)):
    uid = user["id"]
    await db.users.delete_one({"id": uid})
    await db.stores.delete_many({"user_id": uid})
    await db.products.delete_many({"user_id": uid})
    await db.orders.delete_many({"user_id": uid})
    await db.subscribers.delete_many({"user_id": uid})
    await db.affiliates.delete_many({"user_id": uid})
    return {"deleted": True}


# ---------- Store ----------
@api.get("/store/{username}")
async def get_store_public(username: str):
    username = username.lower()
    store = await db.stores.find_one({"username": username}, {"_id": 0})
    if not store:
        raise HTTPException(404, "Store not found")
    products = await db.products.find(
        {"username": username, "is_active": True}, {"_id": 0}
    ).to_list(200)
    # Ranking score: clicks*1 + email_submits*3 + time_spent_factor (capped)
    for p in products:
        clicks = int(p.get("click_count", 0)) + int(p.get("cta_clicks", 0))
        emails = int(p.get("email_submits", 0)) + int(p.get("sales_count", 0))
        time_factor = min(int(p.get("time_spent_total", 0)) / 60000, 50)  # ms→minutes, cap 50
        p["score"] = round(clicks * 1 + emails * 3 + time_factor, 2)
    products.sort(key=lambda p: (not p.get("featured", False), -p["score"], p.get("created_at", "")))
    return {"store": store, "products": products}


@api.get("/board/{username}")
async def get_board_public(username: str):
    return await get_store_public(username)


@api.get("/store")
async def get_my_store(user: dict = Depends(get_current_user)):
    store = await db.stores.find_one({"user_id": user["id"]}, {"_id": 0})
    if not store:
        raise HTTPException(404, "Store not found")
    return store


@api.put("/store")
async def update_my_store(body: StoreUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        return await db.stores.find_one({"user_id": user["id"]}, {"_id": 0})
    await db.stores.update_one({"user_id": user["id"]}, {"$set": update})
    if "name" in update:
        await db.users.update_one({"id": user["id"]}, {"$set": {"name": update["name"]}})
    return await db.stores.find_one({"user_id": user["id"]}, {"_id": 0})


# ---------- Products ----------
@api.get("/products")
async def list_my_products(user: dict = Depends(get_current_user)):
    items = await db.products.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return items


@api.post("/products")
async def create_product(body: ProductCreate, user: dict = Depends(get_current_user)):
    pid = str(uuid.uuid4())
    doc = {
        **body.model_dump(),
        "id": pid,
        "user_id": user["id"],
        "username": user["username"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sales_count": 0,
        "revenue": 0.0,
        "view_count": 0,
        "click_count": 0,
        "cta_clicks": 0,
        "email_submits": 0,
        "time_spent_total": 0,
    }
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    await db.products.update_one({"id": product_id}, {"$inc": {"view_count": 1}})
    return product


@api.put("/products/{product_id}")
async def update_product(product_id: str, body: ProductUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    res = await db.products.update_one({"id": product_id, "user_id": user["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Product not found")
    return await db.products.find_one({"id": product_id}, {"_id": 0})


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    res = await db.products.delete_one({"id": product_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    return {"deleted": True}


# ---------- Subscribers / Customers ----------
@api.post("/subscribe")
async def subscribe(body: SubscribeBody):
    store = await db.stores.find_one({"username": body.store_username.lower()}, {"_id": 0})
    if not store:
        raise HTTPException(404, "Store not found")
    existing = await db.subscribers.find_one({
        "user_id": store["user_id"], "email": body.email.lower(),
    })
    if existing:
        return {"ok": True, "already": True}
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": store["user_id"],
        "email": body.email.lower(),
        "name": body.name or "",
        "product_id": body.product_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "lead_magnet" if body.product_id else "store",
    }
    await db.subscribers.insert_one(doc)
    asyncio.create_task(send_email_async(
        body.email,
        f"Welcome to {store['name']}",
        f"<p>Hi {body.name or ''}, thanks for subscribing to <strong>{store['name']}</strong>.</p>",
    ))
    return {"ok": True}


@api.get("/customers")
async def list_customers(user: dict = Depends(get_current_user)):
    subs = await db.subscribers.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    buyers = await db.orders.find(
        {"user_id": user["id"], "status": "paid"}, {"_id": 0}
    ).to_list(1000)
    by_email = {}
    for s in subs:
        by_email[s["email"]] = {
            "email": s["email"], "name": s.get("name", ""), "subscribed": True,
            "orders": 0, "spent": 0.0, "created_at": s["created_at"],
        }
    for b in buyers:
        em = b["buyer_email"]
        rec = by_email.setdefault(em, {
            "email": em, "name": "", "subscribed": False, "orders": 0,
            "spent": 0.0, "created_at": b["created_at"],
        })
        rec["orders"] += 1
        rec["spent"] += float(b.get("amount", 0))
    return list(by_email.values())


@api.post("/customers")
async def create_customer(body: CustomerCreate, user: dict = Depends(get_current_user)):
    existing = await db.subscribers.find_one({"user_id": user["id"], "email": body.email.lower()})
    if existing:
        return {"ok": True, "already": True}
    await db.subscribers.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "email": body.email.lower(),
        "name": body.name or "",
        "product_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "manual",
    })
    return {"ok": True}


# ---------- Orders ----------
@api.get("/orders")
async def list_orders(user: dict = Depends(get_current_user)):
    items = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


# ---------- Affiliate ----------
@api.get("/affiliates")
async def list_affiliates(user: dict = Depends(get_current_user)):
    items = await db.affiliates.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return items


@api.post("/affiliates")
async def create_affiliate(body: AffiliateCreate, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id, "user_id": user["id"]}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    code = py_secrets.token_urlsafe(8)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "product_id": body.product_id,
        "product_title": product["title"],
        "code": code,
        "commission_pct": body.commission_pct,
        "clicks": 0,
        "conversions": 0,
        "earnings": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.affiliates.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/affiliate/{code}/click")
async def affiliate_click(code: str):
    res = await db.affiliates.update_one({"code": code}, {"$inc": {"clicks": 1}})
    if res.matched_count == 0:
        raise HTTPException(404, "Invalid code")
    return {"ok": True}


# ---------- Analytics ----------
@api.get("/analytics")
async def analytics(user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"user_id": user["id"], "status": "paid"}, {"_id": 0}
    ).to_list(1000)
    products = await db.products.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    subs = await db.subscribers.count_documents({"user_id": user["id"]})

    total_revenue = sum(float(o.get("amount", 0)) for o in orders)
    total_sales = len(orders)
    total_views = sum(int(p.get("view_count", 0)) for p in products)
    conv_rate = (total_sales / total_views * 100) if total_views else 0.0

    # last 14 days revenue trend
    today = datetime.now(timezone.utc).date()
    days = [(today - timedelta(days=i)) for i in range(13, -1, -1)]
    daily = {d.isoformat(): 0.0 for d in days}
    for o in orders:
        try:
            d = datetime.fromisoformat(o["created_at"]).date().isoformat()
            if d in daily:
                daily[d] += float(o.get("amount", 0))
        except Exception:
            pass
    trend = [{"date": d, "revenue": round(v, 2)} for d, v in daily.items()]

    top = sorted(products, key=lambda p: p.get("revenue", 0), reverse=True)[:5]
    top = [{"title": p["title"], "revenue": p.get("revenue", 0), "sales": p.get("sales_count", 0)} for p in top]

    return {
        "total_revenue": round(total_revenue, 2),
        "total_sales": total_sales,
        "total_views": total_views,
        "conversion_rate": round(conv_rate, 2),
        "subscribers": subs,
        "products_count": len(products),
        "trend": trend,
        "top_products": top,
    }


# ---------- Stripe Checkout ----------
@api.post("/checkout/create-session")
async def create_checkout_session(body: CheckoutBody, request: Request):
    product = await db.products.find_one({"id": body.product_id}, {"_id": 0})
    if not product or not product.get("is_active", True):
        raise HTTPException(404, "Product not available")
    amount = float(product["price"])
    if amount <= 0:
        raise HTTPException(400, "Price must be greater than 0")

    # discount code (very simple: 10% off any code)
    discount_pct = 0.0
    if body.discount_code and body.discount_code.upper().startswith("SAVE10"):
        discount_pct = 10.0
    final_amount = round(amount * (1 - discount_pct / 100), 2)

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/checkout?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/product/{body.product_id}"

    metadata = {
        "product_id": body.product_id,
        "user_id": product["user_id"],
        "buyer_email": body.buyer_email or "",
        "affiliate_code": body.affiliate_code or "",
        "discount_code": body.discount_code or "",
    }

    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{origin}/api/webhook/stripe")
    req = CheckoutSessionRequest(
        amount=final_amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session: CheckoutSessionResponse = await stripe.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "product_id": body.product_id,
        "user_id": product["user_id"],
        "buyer_email": body.buyer_email or "",
        "amount": final_amount,
        "currency": "usd",
        "metadata": metadata,
        "payment_status": "initiated",
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}


async def _process_paid_session(session_id: str, payment_status: str, amount_total: int, currency: str):
    """Idempotent post-payment processing."""
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        return False
    if txn.get("payment_status") == "paid":
        return True  # already processed
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": payment_status, "status": "complete"}},
    )
    if payment_status != "paid":
        return False

    md = txn.get("metadata", {}) or {}
    kind = md.get("kind") or txn.get("kind")
    if kind == "upgrade":
        user_id = md.get("user_id") or txn.get("user_id")
        if user_id:
            current = await db.users.find_one({"id": user_id}, {"_id": 0, "pro_until": 1})
            now = datetime.now(timezone.utc)
            base = now
            if current and current.get("pro_until"):
                try:
                    existing = datetime.fromisoformat(current["pro_until"])
                    if existing > now:
                        base = existing
                except Exception:
                    pass
            new_until = (base + timedelta(days=PRO_DAYS)).isoformat()
            await db.users.update_one({"id": user_id}, {"$set": {"pro_until": new_until}})
        return True

    product_id = md.get("product_id")
    user_id = md.get("user_id")
    buyer_email = md.get("buyer_email") or txn.get("buyer_email", "")
    amount = txn.get("amount", amount_total / 100.0)

    product = await db.products.find_one({"id": product_id}, {"_id": 0}) if product_id else None
    if product:
        await db.products.update_one(
            {"id": product_id},
            {"$inc": {"sales_count": 1, "revenue": float(amount)}},
        )

    order = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "product_id": product_id,
        "product_title": product["title"] if product else "Product",
        "buyer_email": buyer_email,
        "amount": float(amount),
        "currency": currency or "usd",
        "status": "paid",
        "session_id": session_id,
        "affiliate_code": md.get("affiliate_code") or None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)

    # affiliate
    aff_code = md.get("affiliate_code")
    if aff_code:
        aff = await db.affiliates.find_one({"code": aff_code}, {"_id": 0})
        if aff:
            commission = round(float(amount) * float(aff["commission_pct"]) / 100, 2)
            await db.affiliates.update_one(
                {"code": aff_code},
                {"$inc": {"conversions": 1, "earnings": commission}},
            )

    # email
    if buyer_email and product:
        asyncio.create_task(send_email_async(
            buyer_email,
            f"Your purchase: {product['title']}",
            order_confirmation_html(product["title"], float(amount), product.get("file_url")),
        ))
    return True


@api.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(404, "Session not found")
    host_url = str(request.base_url).rstrip("/")
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host_url}/api/webhook/stripe")
    try:
        status_resp: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)
    except Exception as e:
        logger.warning(f"Stripe status lookup failed for {session_id}: {e}")
        return {
            "session_id": session_id,
            "status": txn.get("status") or "open",
            "payment_status": txn.get("payment_status") or "initiated",
            "amount": txn.get("amount"),
            "currency": txn.get("currency"),
            "product_id": (txn.get("metadata") or {}).get("product_id"),
        }
    if status_resp.payment_status == "paid":
        await _process_paid_session(session_id, "paid", status_resp.amount_total, status_resp.currency)
    else:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status_resp.payment_status, "status": status_resp.status}},
        )
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    return {
        "session_id": session_id,
        "status": status_resp.status,
        "payment_status": status_resp.payment_status,
        "amount": txn.get("amount"),
        "currency": txn.get("currency"),
        "product_id": (txn.get("metadata") or {}).get("product_id"),
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url).rstrip("/")
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host_url}/api/webhook/stripe")
    try:
        event = await stripe.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return JSONResponse({"received": False}, status_code=400)
    if event.payment_status == "paid" and event.session_id:
        await _process_paid_session(event.session_id, "paid", 0, "usd")
    return {"received": True}


# ---------- AI Quick Idea ----------
@api.post("/ai/improve-idea")
async def ai_improve_idea(body: AIImproveBody, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")
    system = (
        "You convert a creator's quick idea description into a published item. "
        "Output ONLY a JSON object with these keys: "
        '{"title": str (max 6 words, clear, sentence case), '
        '"one_liner": str (one short sentence, plain language, no fluff), '
        '"cta_text": str (max 4 words for a button, action-oriented like "Join waitlist" or "Get notified")}. '
        "Do not include markdown, code fences, or any extra text."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"idea-{user['id']}-{uuid.uuid4().hex[:8]}",
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    try:
        raw = await chat.send_message(UserMessage(text=body.text))
    except Exception as e:
        logger.error(f"AI improve failed: {e}")
        raise HTTPException(502, "AI service error")
    import json
    import re
    text = (raw or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        parsed = json.loads(text)
        title = str(parsed.get("title", "")).strip() or body.text[:60]
        one_liner = str(parsed.get("one_liner", "")).strip()
        cta_text = str(parsed.get("cta_text", "Join waitlist")).strip() or "Join waitlist"
    except Exception:
        title = body.text.strip()[:60]
        one_liner = body.text.strip()
        cta_text = "Join waitlist"
    return {"title": title, "one_liner": one_liner, "cta_text": cta_text}


# ---------- Telemetry ----------
@api.post("/track")
async def track_event(body: TrackBody, request: Request):
    now = datetime.now(timezone.utc).isoformat()
    src = body.source or request.headers.get("Referer") or ""
    event_doc = {
        "id": str(uuid.uuid4()),
        "item_id": body.item_id,
        "board_username": (body.board_username or "").lower() or None,
        "event": body.event,
        "session_id": body.session_id,
        "time_ms": body.time_ms or 0,
        "source": src[:300],
        "path": (body.path or "")[:300],
        "created_at": now,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
    }
    await db.events.insert_one(event_doc)
    if body.item_id:
        inc = {}
        if body.event == "view":
            inc["view_count"] = 1
        elif body.event == "click":
            inc["click_count"] = 1
        elif body.event == "cta_click":
            inc["cta_clicks"] = 1
        elif body.event == "email_submit":
            inc["email_submits"] = 1
        elif body.event == "time_spent" and body.time_ms:
            inc["time_spent_total"] = int(body.time_ms)
        if inc:
            await db.products.update_one({"id": body.item_id}, {"$inc": inc})
    if body.board_username and body.event == "view":
        await db.stores.update_one(
            {"username": body.board_username.lower()},
            {"$inc": {"view_count": 1}},
        )
    return {"ok": True}


# ---------- Health ----------
@api.post("/upload")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Unsupported image type")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "File too large (5 MB max)")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        ext = "jpg"
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4().hex}.{ext}"
    result = await asyncio.to_thread(put_object_sync, path, data, file.content_type)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "storage_path": result["path"],
        "filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": f"/api/files/{result['path']}", "path": result["path"]}


@api.get("/files/{path:path}")
async def get_file(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Not found")
    data, ctype = await asyncio.to_thread(get_object_sync, path)
    return Response(
        content=data,
        media_type=rec.get("content_type") or ctype,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


# ---------- Pro Upgrade ----------
@api.post("/upgrade/checkout")
async def upgrade_checkout(body: UpgradeBody, user: dict = Depends(get_current_user)):
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/checkout?session_id={{CHECKOUT_SESSION_ID}}&upgrade=1"
    cancel_url = f"{origin}/dashboard"
    metadata = {
        "kind": "upgrade",
        "user_id": user["id"],
        "buyer_email": user["email"],
    }
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{origin}/api/webhook/stripe")
    req = CheckoutSessionRequest(
        amount=PRO_PRICE_USD,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "kind": "upgrade",
        "user_id": user["id"],
        "buyer_email": user["email"],
        "amount": PRO_PRICE_USD,
        "currency": "usd",
        "metadata": metadata,
        "payment_status": "initiated",
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


# ---------- Health ----------
@api.get("/")
async def root():
    return {"status": "ok", "service": "creator-storefront"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("username", unique=True)
        await db.stores.create_index("username", unique=True)
        await db.products.create_index("id", unique=True)
        await db.orders.create_index("session_id")
        await db.payment_transactions.create_index("session_id", unique=True)
        await db.affiliates.create_index("code", unique=True)
        await db.events.create_index("expires_at", expireAfterSeconds=0)
        await db.events.create_index("item_id")
        await db.events.create_index("session_id")
        await db.files.create_index("storage_path")
    except Exception as e:
        logger.warning(f"Index setup: {e}")
    init_storage()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
