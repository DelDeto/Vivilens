# VIVILENS Ecommerce V1.0

**Current release: V1.4.** The homepage uses original product photography, responsive WebP assets, a favicon set and pre-rendered social previews. See [brand assets and link-preview maintenance](docs/BRAND_ASSETS.md). The V1.0 and V1.1A sections below describe those historical releases; decorative homepage swatches and JavaScript-only social metadata have since been replaced.

Responsive storefront for colored contact lenses. React/Vite + Supabase Auth/Postgres + Cloudflare Pages.

## Included
- Home with a K-Beauty hero, shop-by-color selection, featured products and editorial section
- Product catalog with color / wear-period filters, name search, price sorting and detail page
- Wishlist saved in the browser (localStorage)
- Email/password signup, confirmation and sign-in through Supabase Auth
- Cart quantity management with localStorage persistence
- RLS-protected admin page to create/edit/hide products and track stock
- Responsive mobile layout
- Demo storefront when Supabase environment variables are not configured

**Not included yet:** checkout/order creation, payments, shipping, customer address book, lens prescription/left-right power variants, product photo upload interface, production-ready legal/policy pages, or AR try-on. Cart is stored in browser, not synced cross-device. Demo prices/photos are not validated real product data. The circular color swatches on the homepage are decorative previews, not verified lens textures. Do not open for live sales before filling these gaps.

## 1. Install locally

Requires Node.js 20+. Open a terminal in this folder:

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows, replace `cp` with `copy .env.example .env.local`.

## 2. Create Supabase database

1. Open https://supabase.com/dashboard and create a project.
2. Open **SQL Editor**; paste `supabase/schema.sql`, then Run **once** on a fresh project.
3. Find **Project URL** and **publishable key** under project Connect/API settings. Copy into `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Never use service_role/secret key in VITE_* variables or frontend files. Configure authentication email settings, and in Authentication → URL Configuration set **Site URL** to your Cloudflare Pages URL and add local `http://localhost:5173/**` and deployed site redirect URLs. For production, configure email service/rate limits, redirect rules, and test confirmation links.

4. Restart dev server. Register an account, confirm email, then find your user in **Authentication → Users**.
5. To grant yourself **Admin**, in SQL Editor run (replace email):

```sql
insert into public.admin_users(user_id)
select id from auth.users where email = 'YOUR_REAL_EMAIL'
on conflict do nothing;
```

6. Sign out and back in; Admin menu should appear. **Only grant admin through SQL Editor; never add an admin signup button.**

## 3. Publish to GitHub

Create a new **private** repo at https://github.com/new named `vivilens-ecommerce` (do not upload `.env.local`). Then run:

```bash
git init
git add .
git commit -m "Initial VIVILENS ecommerce V1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vivilens-ecommerce.git
git push -u origin main
```

Alternative: unzip the provided ZIP and use GitHub **Add file → Upload files** from the contents folder (do not upload ZIP itself as the site's files).

## 4. Deploy with Cloudflare Pages

1. https://dash.cloudflare.com → **Workers & Pages** → **Create application** → **Pages** → **Import Git repository**. Select repo.
2. Preset **React (Vite)** (or Vite), build command `npm run build`, output `dist`, production branch `main`.
3. Add environment variables in Cloudflare Pages production build settings:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your publishable key
4. Deploy. The `*.pages.dev` domain is shown after success.
5. Go back to Supabase Auth **URL Configuration**: set actual Site URL and allow redirect `https://YOUR_SITE.pages.dev/**` (and your custom domain if used).
6. Test sign-up, email confirmation, login, sign out, catalog, admin product edits, cart and phone layout. Every new push to `main` triggers a deploy. After the first successful local `npm install`, commit the resulting `package-lock.json` and use `npm ci` for repeatable installs.

**Caution:** Vite variables prefixed `VITE_` are publicly embedded in the browser bundle. Publishable key is intended for browsers, but *never* put database secrets there. Supabase Row Level Security protects writes. The supplied admin policies deliberately allow only registered admin_users to mutate products.

## Suggested next iterations
- V1.1: Orders tables + server-side checkout price/stock validation; COD; address validation; inventory concurrency controls
- V1.2: Lens variants for left/right prescription, image uploading to Storage, SEO, promo codes, legal/returns/privacy pages
- V2.0: AR lens virtual try-on with real product textures

## V1.0 preview acceptance checklist

- Without Supabase: home and product catalog show demo products; filtering, wishlist and cart work in this browser.
- With Supabase: sign up, verify email, sign in, and view active products; admin users can add/edit/hide products.
- Recheck on both narrow mobile and desktop screens.
- **Known limitation:** version 1 does not accept real orders and has no real checkout or payment integration.

## Suggested next release (V1.1)

Add inventory per lens power / eye, cart variants, customer address book, COD checkout, order history, admin order management and server-side stock checks before taking real orders.


## V1.1A — Shareable URLs and client-side metadata

- Home: `/`
- Shop: `/shop`
- Product detail: `/products/<slug>` (e.g. `/products/milk-tea-brown`)
- Customer account: `/account`; admin: `/admin`
- Browser Back/Forward, page refresh and deep links are handled by the React router and Cloudflare SPA asset fallback.
- Unknown pages and missing/inactive products show a not-found screen. Cloudflare's SPA fallback may still respond HTTP 200; this is an application-level 404, not an edge HTTP 404.
- The browser updates document title, description, canonical, robots and Open Graph tags. **Client-rendered SEO tags do not guarantee correct rich previews for social crawlers or search engines that do not execute JavaScript.** Edge-side metadata rendering or SSR is required for production-grade per-product link previews.
- Run `npm test` for routing unit tests, then `npm run build`.

Do not claim checkout, prescription selection, order processing or payment availability; these are not included in V1.1A.
