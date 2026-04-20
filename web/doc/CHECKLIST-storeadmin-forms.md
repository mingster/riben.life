# Store admin forms — checklist

**Purpose:** Track alignment of `web/src/app/storeAdmin/**` forms with project patterns (RHF + Zod from actions, live validation, submit UX, accessibility, shared footer where applicable).

**Related:** CRUD guide, `form-handling.mdc`, `admin-settings-tabs.tsx` (`AdminSettingsTabFormFooter`, tab chrome).

---

## Global standards (apply when touching a form)

- [ ] **Zod:** Prefer schemas from `@/actions/.../*.validation.ts`; avoid duplicating `z.object` in components unless the field set is UI-only (e.g. filters). *(Incremental — see section below.)*
- [x] **RHF:** `useForm` with `zodResolver(schema)`; use **`mode: "onChange"`** for admin CRUD. **Shared:** spread **`adminCrudUseFormProps`** from `@/lib/admin-form-defaults` into `useForm({ ... })` (includes `mode: "onChange"`).
- [x] **Submit UX:** While submitting: disable primary actions. **Shared overlay:** **`FormSubmitOverlay`** from `@/components/form-submit-overlay` (ClipLoader, `z-100`, `aria-live="polite"`, `role="status"`) inside a **`relative`** parent per `form-handling.mdc`. Applied to notification preferences, send, channel config, waitlist settings; dialogs may stay lighter but must block double submit.
- [x] **A11y:** Form roots use **`aria-busy`** where we added overlays or loading (`client-preferences`, `client-send-notification`, category/FAQ category basic tabs, waitlist). Overlays use **`FormSubmitOverlay`** (live region).
- [x] **Touch:** **`touch-manipulation`** on primary submit actions for screens touched in this pass (notification prefs/send/channel, category/FAQ category tabs, waitlist Save). Add elsewhere when editing a form.
- [ ] **i18n:** New strings use **snake_case** keys in locale JSON.

---

## Full-page / tabbed settings (right-aligned Save row)

Use **`AdminSettingsTabFormFooter`** from `@/components/admin-settings-tabs` for the primary Save row (and Cancel before Save when both exist), unless the screen intentionally uses a different layout.

- [x] Store settings — basic, contact, bank, credit, paid, storefront/shipping, shipping/payment cards
- [x] RSVP settings (`client-rsvp-settings.tsx`)
- [x] Systems (`client-systems.tsx`)
- [x] Policies (`client-policies.tsx`)
- [x] **Waitlist settings** (`waitlist-settings/components/client-waitlist-settings.tsx`) — `AdminSettingsTabFormFooter` + `FormSubmitOverlay`
- [x] Grep `storeAdmin` for other **`justify-end`** / full-page action rows; align with **`AdminSettingsTabFormFooter`**: notification preferences + send (`flex gap-4` → footer), order edit (`client.tsx` action row), QR codes page (`justify-end` export). Table row actions (e.g. support) and special refund layout left as-is.

---

## Submit overlay / blocking layer

- [x] **High-traffic dialogs:** order update (`order/[orderId]/client.tsx`), refund (`refund-client.tsx`), customer edit (`edit-customer.tsx`), product edit (`edit-product.tsx`) — **`FormSubmitOverlay`** + `aria-busy` on relative wrapper
- [x] **Bulk / import dialogs:** bulk-add facilities/products/categories — **`FormSubmitOverlay`** + `aria-busy`; import dialogs unchanged when not edited
- [x] **Notifications:** send notification, channel config, preferences — use **`FormSubmitOverlay`** + `aria-busy` on form where applicable
- [x] **Support:** `reply-ticket.tsx` — **`FormSubmitOverlay`** + `aria-busy` on drawer form wrapper

**Reuse:** `@/components/form-submit-overlay` (`FormSubmitOverlay`). Dialogs may use `DialogContent` `aria-busy` + disabled footer buttons instead when overlay is too heavy.

---

## Local `z.object` / `formSchema` in components → action validation

Migrate when editing the feature (avoid big-bang unless scheduled).

- [x] `categories/components/edit-category-dialog.tsx` — **`updateCategoryFormSchema`** from action validation
- [x] `categories/components/bulk-add-categories-dialog.tsx` — **`createCategoriesBulkFormSchema`**
- [x] `products/components/bulk-add-products-dialog.tsx` — **`createStoreProductsBulkFormSchema`**
- [x] `faq/.../faq-edit.tsx`, `faqCategory-edit.tsx`, `faq-category` editors as applicable
- [x] `announcements/.../edit-announcement-dialog.tsx`
- [x] `categories/[categoryId]/category-edit-basic-tab.tsx`
- [x] `products/[productId]/edit-product-option-dialog.tsx` (and template dialog if duplicated)
- [x] `order/[orderId]/client.tsx`, `refund/refund-client.tsx`
- [x] `policies/components/client-policies.tsx` — **`updateStorePolicyTabContentSchema`** in `update-store-policies-content.validation.ts`
- [ ] **Keep local** if truly UI-only (e.g. `transactions/.../client-transaction.archived.tsx` time filter) — document in file why

---

## `mode: "onChange"` audit

- [x] Store admin CRUD / substantial forms: use **`...adminCrudUseFormProps`** (or explicit `mode: "onChange"`). Patched: category dialogs, bulk categories, notification preferences/send/channel config, transaction date filter popover, waitlist settings. **Re-grep** after new features: `useForm(` without `adminCrudUseFormProps` / `mode: "onChange"`.

---

## Very large forms (dedicated pass)

- [x] `products/components/edit-product.tsx` — global **`FormSubmitOverlay`** + `aria-busy` (sections / error summary unchanged)
- [x] `service-staff/components/edit-service-staff-dialog.tsx` — same

---

## Non–RHF / special flows

- [x] **Aligned (toast + busy):** manual HTTP + one-shot actions use **`toastError({ title: t("error_title"), description })`** (or domain title where already standard), **`aria-busy`** on the busy region, and **disable all triggers in that region** while a request is in flight (no double-submit).

| Area | Path | Pattern |
|------|------|---------|
| Cash cashier | `cash-cashier/client.tsx` | `fetch` POST mark-paid; **`aria-busy`** on section; all confirm buttons **`disabled` while `confirmingId !== null`**; row spinner on active id; error toasts include **`error_title`**. |
| Billing | `billing/components/store-billing-client.tsx` | Portal **`fetch`** + downgrade **`AlertModal`**; root **`aria-busy`** when portal or free action loading; manage-billing disabled + spinner; downgrade button **`disabled` when busy**; errors use **`store_admin_subscribe_error_title`**. |
| Order dashboard columns | `components/order-pending.tsx`, `order-inprogress.tsx`, `order-ready-to-ship.tsx` | **`axios.post`** status transitions; **`try/catch`**, **`toastError` + `error_title`**; wrapper **`aria-busy`**; all checkboxes **`disabled` while any row submitting**. |

**Deferred (document only):** other `fetch`/`axios` under `storeAdmin` (order detail `client.tsx`, subscribe client, settings/product import UIs, image gallery, etc.) — align when those files are edited; full-page forms already use **`FormSubmitOverlay`** per sections above.

---

## Verification (when closing batches)

- [ ] `cd web && bun run bio_lint` (or project lint) on touched paths
- [ ] Smoke: open form → submit → error path → success path (keyboard + pointer)

---

**Status:** Living checklist — update checkboxes as work lands; prefer one authoritative doc (this file) over scattering the same list elsewhere.
