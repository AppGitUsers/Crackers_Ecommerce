# Sivakasi Crackers — E-commerce + Admin CRM

Full-stack crackers (fireworks) e-commerce site with a custom Admin CRM.
No payment gateway — customers check out with name + phone, an admin calls
them to confirm and collect payment manually.

**Stack:** Django + Django REST Framework + PostgreSQL (backend) · React + Vite + Tailwind (frontend)

```
crackers-ecommerce/
├── backend/     Django REST API (no django.contrib.admin — see below)
└── frontend/    React storefront + Admin CRM, one app, two areas
```

---

## 1. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env with your Postgres credentials + a real SECRET_KEY
```

Create the database (Postgres must already be running):

```sql
CREATE DATABASE crackers_db;
CREATE USER crackers_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE crackers_db TO crackers_user;
```

Run migrations and create your first admin login:

```bash
python manage.py makemigrations
python manage.py migrate

# there's no django.contrib.admin here — the Admin CRM is the React app,
# so use this custom command to create the first superadmin login:
python manage.py create_admin --username=admin --password=change-me --email=you@example.com

python manage.py runserver
```

API is now live at `http://localhost:8000/api/`.

### Why no `django.contrib.admin`?
Per the brief, the Admin CRM is a purpose-built React app (dashboard, orders
board, offers builder, finance, calls) — not the default Django admin site.
`django.contrib.admin` isn't even installed. All admin functionality goes
through the DRF endpoints in `config/urls.py`, protected by JWT + role checks
in `apps/accounts/permissions.py`.

### Key endpoints
| Area | Endpoint |
|---|---|
| Admin login | `POST /api/auth/login/` |
| Storefront categories | `GET /api/categories/` |
| Storefront products | `GET /api/products/?category=<id>` |
| Checkout | `POST /api/orders/checkout/` |
| My Orders (by phone) | `GET /api/orders/my-orders/?phone=...` |
| Active offers (banner) | `GET /api/offers/active/` |
| Admin: orders list/detail | `GET /api/orders/`, `GET /api/orders/{id}/` |
| Admin: update order/payment status | `POST /api/orders/{id}/update-status/` |
| Admin: dashboard stats + sales graph | `GET /api/dashboard/overview/?days=30` |
| Admin: finance summary | `GET /api/finance/summary/` |

---

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your API isn't at http://localhost:8000/api

npm run dev
```

Storefront: `http://localhost:5173/`
Admin CRM: `http://localhost:5173/admin/login`

---

## 3. Data model overview

- **accounts.User** — custom user model (roles: superadmin / admin / staff) for every Admin CRM login. No customer accounts — shoppers are anonymous until checkout.
- **categories.Category** → **products.Product** (n products per category) → **products.ProductImage** (n images per product, uploaded via camera or gallery — the file input in the admin's product form uses `capture="environment"`, which lets a phone user choose the camera or fall back to the gallery picker).
- **customers.Customer** — created/reused by phone number at checkout. Powers "My Orders" lookup, no login needed.
- **orders.Order** → **orders.OrderItem** (line items, with an `is_free_item` flag for offer freebies) → **orders.OrderStatusHistory** (one row per status change — either `fulfillment` (received/packed/out_for_delivery/delivered/cancelled) or `payment` (pending/paid/failed/refunded), each with its own timestamp — this is what powers the customer-facing tracking timeline and the admin's status log).
- **offers.Offer** — base record shown in the storefront banner while active, with exactly one of:
  - **offers.BuyXGetYOffer** — `buy_quantity` / `get_quantity`, scoped to specific `buy_products` and `free_products` (M2M), so a promo can be restricted to just sparklers, for example.
  - **offers.AmountDiscountOffer** — `min_purchase_amount` + `discount_value`, either as a flat rupee discount or a "free products worth ₹Y" credit, optionally scoped to `applicable_products`.
  - The actual discount math lives in `apps/offers/services.py::evaluate_cart_offers()` — it's intentionally documented with its MVP assumptions (e.g. free items must already be in the cart) so it's easy to extend later.
- **calls.CallLog** — sales follow-up tracking per customer/order: was it called, did they answer, are they interested, closed/cancelled.
- **finance.Transaction** — simple income/expense ledger; `apps/finance/views.py::finance_summary` computes income, expense, and savings on the fly.

---

## 4. Cart & checkout flow

1. Items are added to the cart entirely in the browser via `localStorage` (`CartContext.jsx`) — nothing hits the server until checkout.
2. At checkout, the customer gives name + phone (+ address). This calls `POST /api/orders/checkout/`, which:
   - creates/updates the `Customer` by phone,
   - validates stock,
   - runs `evaluate_cart_offers()` to apply any active Buy-X-Get-Y / amount-discount offers,
   - creates the `Order` + `OrderItem`s + initial `OrderStatusHistory` rows,
   - decrements product stock.
3. "My Orders" (`/my-orders`) looks up all past orders by the same phone number and shows the received → packed → out for delivery → delivered timeline, pulled straight from `OrderStatusHistory`.

---

## 5. Admin CRM pages

- **Dashboard** — total sales, products available/out of stock, active categories, pending calls, and a sales-trend graph (Recharts).
- **Categories / Products** — full CRUD; product form supports uploading photos from camera or gallery, toggling availability, and setting price/stock directly.
- **Orders** — lean list view (order #, customer, item count, status, payment, total) that only loads full details (items, customer, timeline) when a row is opened, keeping the list fast. Order status and payment status are updated independently, each logged with a timestamp.
- **Offers** — build Buy-X-Get-Y and amount-discount offers, scoped to specific products.
- **Finance** — income / expense / savings cards + transaction ledger.
- **Calls** — track whether a customer was called, whether they answered, and where the deal stands (interested / not interested / closed / cancelled).

---

## 6. Notes / things to decide before going to production

- `SIMPLE_JWT` access tokens last 8 hours — tune to taste for how long staff stay logged in.
- The "free products worth ₹Y" amount-discount type currently applies as a straight cart discount; letting the customer actually *pick* which products to take free is a frontend enhancement on top of the existing discount amount.
- No payment gateway is wired in by design — `payment_status` is set manually by an admin after a phone call.
- Add `django-storages` (S3/GCS) for production media storage once you're off local disk.
