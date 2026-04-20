# Luxury D2C storefront work plan (riben.life)

**Date:** 2026-04-03
**Last updated:** 2026-04-03
**Status:** Active
**Related:** [AGENTS.md](../../AGENTS.md), [RIBEN_SYNC.md](./RIBEN_SYNC.md), [web/prisma/schema.prisma](../prisma/schema.prisma) (`Category`, `ProductCategories`), upstream baseline [mingster/riben.life](https://github.com/mingster/riben.life), reference UX patterns [tw.louisvuitton.com](https://tw.louisvuitton.com/) (do not copy brand assets or trademarks).

## Overview

Build a flagship-style **direct-to-consumer** experience on top of the existing **riben.life / riben-derived** Next.js app: luxury IA, catalog (PLP/PDP), **customization** (riben.life pattern), cart/checkout, and services. **Categories** are managed in the **`Category`** table and linked to products via **`ProductCategories`**—PLP routes should key off that data, not a parallel taxonomy.

Use this document as the **checklist** for execution. Check items off as you complete them (`[x]`).

---

## Year 1 scope: ≈5 products (simple UX, room to grow)

**Assumption:** first year ships roughly **five sellable products** (and a small variant set each). Optimize for **clarity and conversion**, not catalog-scale UI.

**Simplify now (customer-facing)**

- **Navigation:** short primary nav (e.g. Shop / Story / Account); avoid mega-menus and deep category trees in the chrome.
- **PLP:** a **single “Shop” listing** or **one PLP per `Category`** is enough; skip multi-facet filters, dense filter sidebars, and “compare” flows until the catalog grows.
- **Pagination:** optional for year 1; a single scrollable grid is fine.
- **Search:** omit a prominent global search **or** point it at the same shop listing; defer typeahead, Algolia, and “no results” merchandising beyond a basic empty state.
- **PDP:** keep **strong** imagery and customization entry; treat **related products** as a small manual block or hide until you have more than a handful of SKUs.
- **Homepage:** hero + featured picks + link to shop; defer heavy campaign/CMS rotation.

**Keep for growth (no throwaway work)**

- Data model stays **normalized:** `Product`, **`Category`**, **`ProductCategories`**, variants, and order lines as today—admin can add SKUs without schema rewrites.
- **Routes:** keep a real **`/shop` or `/{storeId}/…` PLP pattern** keyed by `Category` (even if year 1 only uses one category or “all”) so adding categories later is routing + nav, not a new app.
- **Code:** implement filters/search as **thin or stubbed** layers (e.g. client-side filter on the small list) only if needed; prefer leaving hooks in components for later server-side filters.

**Milestones under this scope:** **M1** still means DB-backed PDP + at least one PLP surface; it does **not** require full luxury-scale discovery UI.

---

## A. Riben baseline and upstream

- [x] Choose upstream sync policy (merge / cherry-pick / subtree / fork-only) and record it in [`web/doc/RIBEN_SYNC.md`](./RIBEN_SYNC.md) (last sync SHA, excluded paths).
- [x] Map riben modules (storefront, cart, checkout, payments, storeAdmin, account) to milestones M1–M5 below (see **Riben module → milestone map** in [`RIBEN_SYNC.md`](./RIBEN_SYNC.md)).
- [x] List restaurant-only flows to **hide, remove, or bypass** for D2C (tables, reservations, queue, seating) without breaking store admin you still need — see **Restaurant-only flows (D2C)** in [`RIBEN_SYNC.md`](./RIBEN_SYNC.md).
- [x] Confirm **table-free checkout** path: cart/checkout must not depend on `tableId` for flagship D2C (default or optional table) — see **Table-free checkout** in [`RIBEN_SYNC.md`](./RIBEN_SYNC.md); optional `tableId` behavior in [`dropdown-cart.tsx`](../src/components/dropdown-cart.tsx).
- [x] When porting patches from riben, port **session/auth behavior** only—riben.life uses **Better Auth**, not riben’s historical NextAuth — see **Porting patches from riben — auth and session** in [`RIBEN_SYNC.md`](./RIBEN_SYNC.md).

---

## B. Milestones (completion gates)

- [x] **M1** — Navigable storefront with real PLP/PDP from DB; PLP uses **`Category` + `ProductCategories`** via [`/shop`](../src/app/shop/) (`/shop/c/[categoryId]`, `/shop/p/[productId]`). Default store: `NEXT_PUBLIC_DEFAULT_STORE_ID` or first store (see [`default-store.ts`](../src/lib/default-store.ts)).
- [x] **M2** — End-to-end purchase: **Stripe Checkout** ([`/api/shop/checkout`](../src/app/api/shop/checkout/route.ts)), pending order + `OrderItem` rows, success page marks paid. Requires `STRIPE_SECRET_KEY`, a **shipping method** mapped to the store (or a global default), and sign-in. **LINE Pay:** not wired in this pass (follow-up using store `LINE_PAY_*`).
- [x] **M3** — Customizer add-to-bag uses **Zod-validated** payload ([`customize-product.validation.ts`](../src/actions/product/customize-product.validation.ts)); **priced** lines with `customizationData` on cart + order items.
- [x] **M4** — Account **Order history** tab ([`account-orders-tab.tsx`](../src/app/account/components/account-orders-tab.tsx)); **Saved** list at `/shop/saved` (localStorage).
- [x] **M5** — **PDP** `generateMetadata` + Open Graph ([`shop/p/[productId]/page.tsx`](../src/app/shop/p/[productId]/page.tsx)). **Pickup / click-collect:** not implemented (still optional per scope).

---

## C. Phase A — Foundation (IA + shell)

- [x] Define public **route map** (below). **Search:** no dedicated `/search` in year 1. Flagship catalog: **`/shop`**, **`/shop/c/[categoryId]`** (PLP from **`Category` + `ProductCategories`**), **`/shop/p/[productId]`** (PDP), **`/shop/cart`**, **`/shop/saved`**, **`/shop/checkout/success`**. **Static / marketing:** **`/`** (home / virtual experience), **`/about`**, **`/contact`**, **`/faq`**, **`/privacy`**, **`/terms`**, **`/signIn`**, **`/account`**, **`/blog`**, **`/qr-generator`**. Multi-tenant store URLs follow riben patterns when enabled (see **RIBEN_SYNC**); default D2C uses **`getDefaultStoreId()`** + `/shop`.
- [x] Avoid duplicating category hierarchy outside **`Category`** — shop chrome loads category links via **`listCategoriesForStore`** only ([`shop/layout.tsx`](../src/app/shop/layout.tsx) → [`ShopShell`](../src/components/shop/shop-shell.tsx)).
- [x] Global layout: **[`GlobalNavbar`](../src/components/global-navbar.tsx)** (locale, theme, cart, account/sign-in); **[`SiteFooter`](../src/components/site-footer.tsx)** on **`(root)`** marketing pages ([`(root)/layout.tsx`](../src/app/(root)/layout.tsx)) and **shop** shell.
- [x] **D2C nav** — primary links: Shop, Saved, About, FAQ (desktop); mobile sheet + bag via **`DropdownCart`** on small screens; **shop** header uses **DB category** pills + All / Bag / Saved / About.
- [x] Design pass: serif page titles in navbar/shop, uppercase tracking on labels, **4:5** PLP tiles and PDP hero ([`shop/c/[categoryId]/page.tsx`](../src/app/shop/c/[categoryId]/page.tsx)), **skeleton** route loaders ([`shop/loading.tsx`](../src/app/shop/loading.tsx), [`shop/c/.../loading.tsx`](../src/app/shop/c/[categoryId]/loading.tsx), [`shop/p/.../loading.tsx`](../src/app/shop/p/[productId]/loading.tsx)).

---

## D. Phase B — Catalog engine

- [x] **Product** extensions: optional **`seoTitle`**, **`seoDescription`**; **`ProductImages.sortOrder`** for gallery ordering ([`schema.prisma`](../prisma/schema.prisma)). Variants/options/media/stock remain on existing **`ProductOption*`**, **`ProductImages`**, **`ProductAttribute`** (no redundant models).
- [x] **`Category` + `ProductCategories`** unchanged as the only PLP segmentation ([`catalog.ts`](../src/lib/shop/catalog.ts)).
- [x] **PLP:** same responsive grid, ordered by **featured + sort**; **toolbar** for in-category **name filter** (`q`) and **sort** (`new` / name / price) via URL — no pagination until ~15–20+ SKUs ([`shop-plp-toolbar.tsx`](../src/components/shop/shop-plp-toolbar.tsx), [`c/[categoryId]/page.tsx`](../src/app/shop/c/[categoryId]/page.tsx)).
- [x] **Search:** no global `/search`; **MVP = DB `contains` on category PLP** + empty state copy ([`listProductsInCategory`](../src/lib/shop/catalog.ts)).
- [x] **PDP:** **image gallery** + thumbnails, **`ProductOption`** selection (radio / multi), **Story** (`description` HTML), **Details** from **`ProductAttribute`**, **related** = same-category slice ([`p/[productId]/page.tsx`](../src/app/shop/p/[productId]/page.tsx), [`shop-product-gallery.tsx`](../src/components/shop/shop-product-gallery.tsx), [`shop-product-buy-panel.tsx`](../src/components/shop/shop-product-buy-panel.tsx)).
- [x] **Checkout** recomputes unit price from **`optionSelections`** + Zod body validation ([`checkout/route.ts`](../src/app/api/shop/checkout/route.ts), [`option-selections.ts`](../src/lib/shop/option-selections.ts)). RSC payloads stay JSON-safe (numbers for money on the client stub; **BigInt** only in specs via `epochToDate` on server).

**DB:** run `bun run sql:dbpush` (or a migration) after pulling schema changes.

---

## E. Phase C — Customization (riben.life core)

- [x] Customizer UI: **3D** primary ([`bag-3d-canvas.tsx`](../src/components/customizer/bag-3d-canvas.tsx)); **2D layered** companion preview ([`bag-2d-layered-preview.tsx`](../src/components/customizer/bag-2d-layered-preview.tsx)); product customizer shell [`[productId]/page.tsx`](../src/app/customized/[productId]/page.tsx) + [`product-customize-client.tsx`](../src/app/customized/[productId]/product-customize-client.tsx).
- [x] **Zod** configuration schema **`schemaVersion: 1`** + legacy normalization ([`customize-product.validation.ts`](../src/actions/product/customize-product.validation.ts)); validated on **add-to-cart** action and **checkout** ([`customize-product.ts`](../src/actions/product/customize-product.ts), [`checkout/route.ts`](../src/app/api/shop/checkout/route.ts)).
- [x] Option **pricing** in totals via [`computeUnitPriceBreakdown`](../src/lib/shop/option-selections.ts); **breakdown** on PDP ([`shop-product-buy-panel.tsx`](../src/components/shop/shop-product-buy-panel.tsx)), customizer sidebar, and cart lines ([`cart-item-info.tsx`](../src/components/cart-item-info.tsx), `shopPriceBreakdown` on [`Item`](../src/hooks/use-cart.tsx)); product meta API [`meta/route.ts`](../src/app/api/shop/product/[productId]/meta/route.ts).
- [x] **Save design** to `localStorage` ([`use-saved-designs.ts`](../src/hooks/use-saved-designs.ts), [`/shop/saved`](../src/app/shop/saved/page.tsx)); **merge on login** = dedupe per product when session appears ([`design-merge-on-login.tsx`](../src/components/shop/design-merge-on-login.tsx)).

---

## F. Phase D — Cart, checkout, orders

- [x] Reuse **`use-cart` / `CartProvider`**; line items carry customization + option selections (see Phase C); order lines persist **`variants` / `variantCosts`** from option summary ([`checkout/route.ts`](../src/app/api/shop/checkout/route.ts), [`option-selections.ts`](../src/lib/shop/option-selections.ts)).
- [x] Checkout: saved or inline shipping snapshot on **`StoreOrder.shippingAddress`**, resolved shipping method, **Stripe** or **LINE Pay** ([`checkout/route.ts`](../src/app/api/shop/checkout/route.ts), [`linepay/confirm/route.ts`](../src/app/api/shop/checkout/linepay/confirm/route.ts)); success page supports Stripe session and LINE Pay return ([`success/page.tsx`](../src/app/shop/checkout/success/page.tsx)).
- [x] Order history + **order detail** ([`account-orders-tab.tsx`](../src/app/account/components/account-orders-tab.tsx), [`account/orders/[orderId]/page.tsx`](../src/app/account/orders/[orderId]/page.tsx)); addresses API for cart ([`api/user/addresses/route.ts`](../src/app/api/user/addresses/route.ts)).
- [x] Transactional **order confirmation** email via **`EmailQueue`** ([`queue-shop-order-confirmation.ts`](../src/lib/mail/queue-shop-order-confirmation.ts)), triggered when payment finalizes ([`finalize-shop-order-payment.ts`](../src/lib/shop/finalize-shop-order-payment.ts)).

---

## G. Phase E — Fulfillment (optional, “luxury-like”)

- [x] Shipping rules (free threshold, ETA copy from config/store settings).
- [x] **Click & collect:** store list, store selection at checkout, admin/staff “ready for pickup” workflow (reuse or add Prisma models as needed).

---

## H. Phase F — Services and content

- [x] Store locator (admin CRUD or data import).
- [x] Help / FAQ (MDX or CMS pattern).
- [x] Homepage: simple hero + featured products (year 1); **campaign blocks / headless CMS** when marketing needs rotation at scale.

---

## I. Phase G — Quality

- [x] Accessibility: keyboard, focus order, alt text, contrast.
- [x] Performance: LCP for hero/PLP images; ISR/SSG where appropriate.
- [x] Analytics: funnel events (view item, customize start, add to cart, purchase).

---

## J. Risks and open decisions

_All items below are **decided** for year 1; revisit when catalog scale, new markets, or legal review requires it._

- [x] **2D vs 3D preview + asset pipeline** — **Hybrid (shipped):** **3D primary** ([`bag-3d-canvas.tsx`](../src/components/customizer/bag-3d-canvas.tsx)) for the main customizer preview; **2D layered companion** ([`bag-2d-layered-preview.tsx`](../src/components/customizer/bag-2d-layered-preview.tsx)) for clarity/perf fallback and composited pattern. **Assets:** GLB/Three for 3D mesh; project **riben.life pattern** (`asset/pattern.jpg` per [AGENTS.md](../../AGENTS.md)) applied in both paths. _Defer removing either mode until an explicit accessibility/performance review._
- [x] **Single flagship vs multi-tenant** — **Customer path = single flagship D2C:** [`getDefaultStoreId()`](../src/lib/default-store.ts) + [`/shop`](../src/app/shop/) (no store slug in the primary storefront URL). **Multi-tenant** remains in **Prisma** + **storeAdmin** for operators and future channels; set **`NEXT_PUBLIC_DEFAULT_STORE_ID`** in production to pin the public catalog. Riben-style multi-store URLs stay documented in [RIBEN_SYNC.md](./RIBEN_SYNC.md) when needed.
- [x] **Legal / content (riben.life-only surfaces)** — Policy recorded in [`CUSTOMER_CONTENT_POLICY.md`](./CUSTOMER_CONTENT_POLICY.md): riben.life brand and **owned** assets on customer-facing routes; **no** third-party luxury trademarks or mimicked trade dress (competitor sites remain **UX references only**, as in the overview).
- [x] **Taiwan / local payments & installments** — **Year 1 scope:** **Stripe Checkout** + **LINE Pay** as implemented ([`checkout/route.ts`](../src/app/api/shop/checkout/route.ts); LINE Pay where currency is supported). **Local BNPL / card installments** (e.g. AFTEE, bank installment APIs): **out of scope** for year 1; re-open when Taiwan conversion data or partner agreements justify engineering. **Research artifact:** prefer Stripe’s Taiwan card methods first; add a second provider only for a documented gap.

---

## Summary

Execute **A → B** in parallel with milestone **M1**; drive **M2** via **F** (Phase D); **E** (Phase C) unlocks **M3**; account work aligns with **M4**; **G–H** and **I** roll forward continuously. The **`Category`** table remains the **source of truth** for category PLP and admin-managed navigation.

**§J (risks / decisions):** Resolved for year 1 — **3D + 2D** customizer, **flagship default store** for `/shop`, **riben.life-only** customer content ([`CUSTOMER_CONTENT_POLICY.md`](./CUSTOMER_CONTENT_POLICY.md)), **Stripe + LINE Pay** now; **local installments/BNPL** deferred.

**Year 1:** ship a **small-catalog** experience (~5 products)—minimal PLP/search/nav complexity while keeping **data model and routes** ready to grow without a redesign.
