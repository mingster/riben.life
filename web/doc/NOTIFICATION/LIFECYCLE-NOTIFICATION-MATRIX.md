# Lifecycle Notification Matrix

**Status:** Active
**Last updated:** 2026-05-11
**Related:** [lifecycle_template_hook_coverage_42c89a11.plan.md](./lifecycle_template_hook_coverage_42c89a11.plan.md), reservation seed [message-template-backup-reservation.json](../../public/backup/message-template-backup-reservation.json)

## Overview

This document lists lifecycle notifications by domain and event, including recipients, channels, and message outline. Authoritative full subject/body copy for reservation lifecycle rows lives in the reservation backup JSON above; the tables below summarize email subjects and section layout.

Template key format:

- `domain.event.recipient.channel`
- Example: `order.credit_topup_completed.customer.email`

Shared recipients/channels:

- Recipients: `customer`, `staff`
- Channels: `email`, `onsite`, `line`, `whatsapp`, `wechat`, `sms`, `telegram`, `push`
- Locales: `zh-TW`, `en-US`, `ja-JP`

## Channel Semantics

The router resolves the `.email` row at send time and broadcasts the same rendered subject and body to all outbound channels (onsite, LINE, SMS, etc.) via `NotificationService.createNotification`. This means:

- **`.email` row is authoritative** for body copy across all channels.
- Non-email rows (`.onsite`, `.line`, `.sms`, etc.) exist in the DB for future per-channel customization but are not individually resolved today.
- If distinct SMS or LINE copy is needed in future, extend `renderLifecycleTemplateMessage` to pass the actual outbound channel and call it per-channel in the queue processor.

## Catalog exclusions (reservation)

`getLifecycleTemplateCatalog()` and `parseLifecycleTemplateKey()` in [template-registry.ts](../../src/lib/notification/template-registry.ts) omit these keys (no `MessageTemplate` name is generated for them):

| Event | Recipient | Runtime copy |
| --- | --- | --- |
| `completed` | staff | No staff notification; customer-only completion. |
| `no_show` | staff | `handleNoShow` notifies staff via i18n fallback only. |
| `customer_confirm_required` | customer, staff | `handleCustomerConfirmRequired` uses i18n fallback only; event omitted from catalog. |

Removed from the reservation backup seed (not in catalog): `reservation.completed.staff.*`, `reservation.no_show.staff.*`, `reservation.customer_confirm_required.*`. Seeded but not sent today: `reservation.no_show.customer.*` (`handleNoShow` is staff-only).

## Coverage Status Legend

| Status | Meaning |
| --- | --- |
| resolved | Code path calls `renderLifecycleTemplateMessage` (or equivalent) with this event/recipient and a matching catalog key |
| fallback_only | Router runs lifecycle render, but no catalog/seed key exists; i18n builders supply copy |
| wired | Standalone send function exists and caller is wired (e.g. `sendCreditSuccess`) |
| intentionally_unused | Product decision: do not send this notification |
| gap | No active send path, or catalog row with no matching send path |

## Order Lifecycle

| Domain | Event | Recipient | Status | Notes |
| --- | --- | --- | --- | --- |
| order | created | customer, staff | gap | No send path yet. |
| order | payment_received | customer, staff | gap | No send path yet. |
| order | paid | customer, staff | gap | No send path yet. |
| order | cancelled | customer | wired | `sendCancelSubscription` called on `customer.subscription.deleted` webhook. Note: currently used for platform subscription cancel; `order.cancelled` template doubles as the copy. |
| order | cancelled | staff | gap | No send path yet. |
| order | refunded | customer, staff | gap | No send path yet. |
| order | completed | customer, staff | gap | No send path yet. |
| order | credit_topup_completed | customer | wired | `sendCreditSuccess` called after `processCreditTopUpAfterPaymentAction` succeeds. |
| order | credit_topup_completed | staff | gap | No send path yet. |

## Reservation Lifecycle

| Domain | Event | Recipient | Status | Notes |
| --- | --- | --- | --- | --- |
| reservation | created | staff | resolved | `handleCreated` notifies store staff. |
| reservation | created | customer | resolved | Store-admin create with payment due (`orderAmount > 0`): `createRsvpAction` → `routeNotification` with `notifyCustomerReservationCreated` → `handleCreated` lifecycle to customer. Free admin creates use staff-only `created` (no customer duplicate). |
| reservation | updated | customer, staff | resolved | `handleUpdated` notifies both. |
| reservation | cancelled | customer, staff | resolved | `handleCancelled` notifies both. |
| reservation | deleted | staff | resolved | `handleDeleted` notifies staff only. |
| reservation | deleted | customer | gap | No customer notification for deleted. |
| reservation | confirmed_by_store | customer | resolved | `handleConfirmedByStore` notifies customer. |
| reservation | confirmed_by_store | staff | gap | No staff notification for confirmed_by_store. |
| reservation | confirmed_by_customer | staff | resolved | `handleConfirmedByCustomer` notifies staff. |
| reservation | confirmed_by_customer | customer | gap | No customer notification for confirmed_by_customer. |
| reservation | payment_received | staff | resolved | `handlePaymentReceived` notifies staff. |
| reservation | payment_received | customer | gap | No customer notification for payment_received. |
| reservation | ready_to_confirm | staff | resolved | `handleStatusChanged(ReadyToConfirm)` notifies staff. |
| reservation | ready_to_confirm | customer | gap | By design: ready_to_confirm is staff-only. |
| reservation | ready | customer | resolved | `handleReady` and `handleStatusChanged(Ready)` both call `renderLifecycleTemplateMessage`. |
| reservation | ready | staff | gap | No staff notification for ready. |
| reservation | checked_in | customer, staff | resolved | `handleStatusChanged(CheckedIn)` notifies both via lifecycle. |
| reservation | completed | customer | resolved | `handleCompleted` → `reservation.completed.customer.email` when seeded. |
| reservation | completed | staff | gap | No staff notification; not in catalog or backup. |
| reservation | no_show | staff | fallback_only | `handleNoShow` notifies staff; no `reservation.no_show.staff.*` keys. |
| reservation | no_show | customer | gap | `reservation.no_show.customer.*` in backup; no customer send path. |
| reservation | unpaid_order_created | customer | resolved | `handleUnpaidOrderCreated` (logged-in path) uses lifecycle. Anonymous path uses i18n for SMS only. |
| reservation | unpaid_order_created | staff | gap | No staff notification for unpaid_order_created. |
| reservation | reminder | customer, staff | resolved | `handleReminder` → `reservation.reminder.{customer,staff}.email` when seeded. |
| reservation | customer_confirm_required | customer | fallback_only | `handleCustomerConfirmRequired`; no `customer_confirm_required` catalog keys. |
| reservation | customer_confirm_required | staff | gap | No staff notification. |

## Coverage audit (CI)

Email-channel catalog keys are classified in [lifecycle-coverage-audit.test.ts](../../src/lib/notification/__tests__/lifecycle-coverage-audit.test.ts): `resolved_at_send`, `email_canonical` (non-email rows mirroring `.email`), or `gap`. The test pins **19** known gaps; update `EXPECTED_GAP_COUNT` and the inline comment when the catalog or send paths change.

## Seed Message Variables (Current Default Outline)

The current lifecycle seed templates include placeholders across these groups:

- Header/context: `{{recipientLabel}}`, `{{channel}}`, `{{domain}}`, `{{event}}`
- Customer: `{{customer.name}}`, `{{customer.email}}`, `{{customer.phone}}`
- Store: `{{store.name}}`
- Reservation: ID/status/datetime/arrive/facility/service-staff/party size/message/check-in code/action URL/order link/payment/refund fields
- Order: `{{order.orderNumber}}`, `{{order.createdOn}}`, `{{order.total}}`

## Actual Message Copy (Draft Templates)

Summaries below match the reservation backup seed. Full bodies and all channels/locales are in [message-template-backup-reservation.json](../../public/backup/message-template-backup-reservation.json).

### Order Messages

| Event | Recipient | Subject | Message |
| --- | --- | --- | --- |
| paid | customer | `Payment received for order {{order.orderNumber}}` | `Hi {{customer.name}}, we received your payment for order {{order.orderNumber}} at {{store.name}}. Total paid: {{order.total}}. Line items: {{order.itemsSummary}}. Thank you.` |
| paid | staff | `Order {{order.orderNumber}} is paid` | `Order {{order.orderNumber}} has been paid by {{customer.name}}. Total: {{order.total}}. Line items: {{order.itemsSummary}}. Please proceed with fulfillment.` |
| cancelled | customer | `Order {{order.orderNumber}} has been cancelled` | `Hi {{customer.name}}, your order {{order.orderNumber}} was cancelled. If payment was captured, refund details will be sent separately.` |
| cancelled | staff | `Order {{order.orderNumber}} cancelled` | `Order {{order.orderNumber}} for {{customer.name}} was cancelled. Please stop preparation and review follow-up actions.` |
| refunded | customer | `Refund processed for order {{order.orderNumber}}` | `Hi {{customer.name}}, your refund for order {{order.orderNumber}} has been processed. Refund amount: {{reservation.refundAmount}} {{reservation.refundCurrency}}.` |
| refunded | staff | `Refund completed for order {{order.orderNumber}}` | `Refund has been completed for order {{order.orderNumber}}. Customer: {{customer.name}}. Amount: {{reservation.refundAmount}} {{reservation.refundCurrency}}.` |
| completed | customer | `Order {{order.orderNumber}} completed` | `Hi {{customer.name}}, your order {{order.orderNumber}} is completed. Thank you for choosing {{store.name}}.` |
| completed | staff | `Order {{order.orderNumber}} marked completed` | `Order {{order.orderNumber}} has been marked completed. Customer: {{customer.name}}.` |
| credit_topup_completed | customer | `Account top-up completed` | `Hi {{customer.name}}, your account top-up is completed at {{store.name}}. Reference order: {{order.orderNumber}}. Amount: {{order.total}}.` |
| credit_topup_completed | staff | `Customer top-up completed` | `Customer {{customer.name}} completed an account top-up. Order: {{order.orderNumber}}. Amount: {{order.total}}.` |

### Reservation Messages

| Event | Recipient | Subject | Message |
| --- | --- | --- | --- |
| updated | customer | `Reservation {{reservation.id}} updated` | `Hi {{customer.name}}, your reservation has been updated. New status: {{reservation.status}} (previous: {{reservation.previousStatus}}). Time: {{reservation.dateTime}}.` |
| cancelled | customer | `Reservation {{reservation.id}} cancelled` | `Hi {{customer.name}}, your reservation has been cancelled. If applicable, refund: {{reservation.refundAmount}} {{reservation.refundCurrency}}.` |
| cancelled | staff | `Reservation {{reservation.id}} cancelled` | `Reservation {{reservation.id}} has been cancelled by {{actor.name}}. Please release the slot and update internal planning.` |
| deleted | customer | `Reservation {{reservation.id}} removed` | `Hi {{customer.name}}, reservation {{reservation.id}} has been removed. Contact {{store.name}} if this was unexpected.` |
| confirmed_by_store | customer | `Reservation confirmed by {{store.name}}` | `Hi {{customer.name}}, your reservation {{reservation.id}} is confirmed by {{store.name}}. See details: {{reservation.actionUrl}}.` |
| confirmed_by_customer | customer | `Reservation confirmation received` | `Hi {{customer.name}}, we received your confirmation for reservation {{reservation.id}}. We look forward to serving you.` |
| confirmed_by_customer | staff | `Customer confirmed reservation {{reservation.id}}` | `Customer {{customer.name}} confirmed reservation {{reservation.id}}. Please continue service preparation.` |
| payment_received | customer | `Reservation payment received` | `Hi {{customer.name}}, payment for reservation {{reservation.id}} is received. Amount: {{reservation.paymentAmount}} {{reservation.paymentCurrency}}.` |
| payment_received | staff | `Reservation {{reservation.id}} payment received (ready to confirm)` | `Payment has been received for reservation {{reservation.id}}. Customer: {{customer.name}}. Amount: {{reservation.paymentAmount}} {{reservation.paymentCurrency}}. This reservation is now ready to confirm. Please review and confirm in admin: /storeAdmin/{{store.id}}/rsvp/history` |
| ready | customer | `Your reservation is ready` | `Hi {{customer.name}}, reservation {{reservation.id}} is now ready. See details: {{reservation.actionUrl}}.` |
| checked_in | customer | `Check-in confirmed` | `Hi {{customer.name}}, your check-in is confirmed for reservation {{reservation.id}} at {{reservation.arriveTime}}.` |
| checked_in | staff | `Customer checked in` | `Customer {{customer.name}} checked in for reservation {{reservation.id}}. Check-in code: {{reservation.checkInCode}}.` |
| completed | customer | `[{{store.name}}] Thank you for completing your reservation` | Structured email: ■ Reservation (id, status, link, order, payment) and ■ Order summary. |
| no_show | customer | `[{{store.name}}] Notice to customer · No-show reservation` | Structured email: ■ Customer, ■ Store, ■ Reservation, ■ Order summary. Seeded only; no customer send path today. |
| reminder | customer | `[{{store.name}}] Please confirm you will attend your reservation` | Opens with confirmation link; check-in code; ■ Reservation and ■ Order summary. |
| reminder | staff | `[{{store.name}}] Reservation reminder for {{customer.name}}` | Upcoming reminder; related link; no check-in code. |

## Actual Message Copy (ja-JP Draft Templates)

### Order Messages (ja-JP)

| Event | Recipient | Subject | Message |
| --- | --- | --- | --- |
| paid | customer | `注文 {{order.orderNumber}} のお支払いを確認しました` | `{{customer.name}} 様、{{store.name}} にて注文 {{order.orderNumber}} のお支払いを確認しました。お支払い合計: {{order.total}}。明細: {{order.itemsSummary}}。ご利用ありがとうございます。` |
| paid | staff | `注文 {{order.orderNumber}} の入金を確認` | `注文 {{order.orderNumber}} の入金を確認しました。顧客: {{customer.name}}。合計: {{order.total}}。明細: {{order.itemsSummary}}。対応を進めてください。` |
| cancelled | customer | `注文 {{order.orderNumber}} はキャンセルされました` | `{{customer.name}} 様、注文 {{order.orderNumber}} はキャンセルされました。決済済みの場合、返金情報は別途ご案内します。` |
| cancelled | staff | `注文 {{order.orderNumber}} がキャンセルされました` | `{{customer.name}} 様の注文 {{order.orderNumber}} はキャンセルされました。準備を停止し、必要な後続対応を確認してください。` |
| refunded | customer | `注文 {{order.orderNumber}} の返金が完了しました` | `{{customer.name}} 様、注文 {{order.orderNumber}} の返金処理が完了しました。返金額: {{reservation.refundAmount}} {{reservation.refundCurrency}}。` |
| refunded | staff | `注文 {{order.orderNumber}} の返金完了` | `注文 {{order.orderNumber}} の返金が完了しました。顧客: {{customer.name}}。金額: {{reservation.refundAmount}} {{reservation.refundCurrency}}。` |
| completed | customer | `注文 {{order.orderNumber}} が完了しました` | `{{customer.name}} 様、注文 {{order.orderNumber}} は完了しました。{{store.name}} をご利用いただきありがとうございます。` |
| completed | staff | `注文 {{order.orderNumber}} を完了に更新` | `注文 {{order.orderNumber}} を完了に更新しました。顧客: {{customer.name}}。` |
| credit_topup_completed | customer | `アカウントチャージが完了しました` | `{{customer.name}} 様、{{store.name}} でのアカウントチャージが完了しました。参照注文: {{order.orderNumber}}。金額: {{order.total}}。` |
| credit_topup_completed | staff | `顧客のチャージ完了` | `顧客 {{customer.name}} のアカウントチャージが完了しました。注文: {{order.orderNumber}}。金額: {{order.total}}。` |

### Reservation Messages (ja-JP)

| Event | Recipient | Subject | Message |
| --- | --- | --- | --- |
| updated | customer | `予約 {{reservation.id}} が更新されました` | `{{customer.name}} 様、予約内容が更新されました。新しいステータス: {{reservation.status}}（前回: {{reservation.previousStatus}}）。日時: {{reservation.dateTime}}。` |
| cancelled | customer | `予約 {{reservation.id}} はキャンセルされました` | `{{customer.name}} 様、予約 {{reservation.id}} はキャンセルされました。必要に応じて返金額: {{reservation.refundAmount}} {{reservation.refundCurrency}} をご確認ください。` |
| cancelled | staff | `予約 {{reservation.id}} がキャンセルされました` | `予約 {{reservation.id}} は {{actor.name}} によりキャンセルされました。枠を解放し、内部計画を更新してください。` |
| deleted | customer | `予約 {{reservation.id}} は削除されました` | `{{customer.name}} 様、予約 {{reservation.id}} は削除されました。心当たりがない場合は {{store.name}} までご連絡ください。` |
| confirmed_by_store | customer | `{{store.name}} が予約を確認しました` | `{{customer.name}} 様、予約 {{reservation.id}} は {{store.name}} により確認されました。詳細: {{reservation.actionUrl}}。` |
| confirmed_by_customer | customer | `予約確認を受け付けました` | `{{customer.name}} 様、予約 {{reservation.id}} の確認を受け付けました。ご来店をお待ちしております。` |
| confirmed_by_customer | staff | `顧客が予約 {{reservation.id}} を確認` | `顧客 {{customer.name}} が予約 {{reservation.id}} を確認しました。サービス準備を継続してください。` |
| payment_received | customer | `予約のお支払いを確認しました` | `{{customer.name}} 様、予約 {{reservation.id}} のお支払いを確認しました。金額: {{reservation.paymentAmount}} {{reservation.paymentCurrency}}。` |
| payment_received | staff | `予約 {{reservation.id}} の入金確認（確認待ち）` | `予約 {{reservation.id}} の入金を確認しました。顧客: {{customer.name}}。金額: {{reservation.paymentAmount}} {{reservation.paymentCurrency}}。この予約は確認可能な状態です。管理画面で確認してください: /storeAdmin/{{store.id}}/rsvp/history` |
| ready | customer | `ご予約の準備が整いました` | `{{customer.name}} 様、予約 {{reservation.id}} の準備が整いました。詳細: {{reservation.actionUrl}}。` |
| checked_in | customer | `チェックインを確認しました` | `{{customer.name}} 様、予約 {{reservation.id}} のチェックインを {{reservation.arriveTime}} に確認しました。` |
| checked_in | staff | `顧客がチェックインしました` | `顧客 {{customer.name}} が予約 {{reservation.id}} でチェックインしました。チェックインコード: {{reservation.checkInCode}}。` |
| completed | customer | `【{{store.name}}】ご予約の完了ありがとうございます` | Structured email: ■ ご予約 and ■ ご注文 sections. |
| no_show | customer | `【{{store.name}}】お客様へのお知らせ · 無断欠席` | Structured email: ■ お客様情報, ■ 店舗, ■ ご予約, ■ ご注文. Seeded only; no customer send path today. |
| reminder | customer | `【{{store.name}}】ご予約への参加をご確認ください` | Opens with ■ 確認リンク; check-in code; ■ ご予約 and ■ ご注文. |
| reminder | staff | `【{{store.name}}】{{customer.name}} 様の予約リマインダー` | Upcoming reminder; ■ 関連リンク; no check-in code. |

## Actual Message Copy (zh-TW Draft Templates)

### Order Messages (zh-TW)

| Event | Recipient | Subject | Message |
| --- | --- | --- | --- |
| paid | customer | `已收到訂單 {{order.orderNumber}} 的付款` | `{{customer.name}} 您好，{{store.name}} 已收到您對訂單 {{order.orderNumber}} 的付款。付款總額：{{order.total}}。品項：{{order.itemsSummary}}。感謝您的支持。` |
| paid | staff | `訂單 {{order.orderNumber}} 已付款` | `訂單 {{order.orderNumber}} 已由 {{customer.name}} 完成付款。總額：{{order.total}}。品項：{{order.itemsSummary}}。請開始後續履約作業。` |
| cancelled | customer | `訂單 {{order.orderNumber}} 已取消` | `{{customer.name}} 您好，您的訂單 {{order.orderNumber}} 已取消。若款項已收取，退款資訊將另行通知。` |
| cancelled | staff | `訂單 {{order.orderNumber}} 已取消` | `{{customer.name}} 的訂單 {{order.orderNumber}} 已取消。請停止準備，並確認後續處理事項。` |
| refunded | customer | `訂單 {{order.orderNumber}} 退款已完成` | `{{customer.name}} 您好，您的訂單 {{order.orderNumber}} 退款已完成。退款金額：{{reservation.refundAmount}} {{reservation.refundCurrency}}。` |
| refunded | staff | `訂單 {{order.orderNumber}} 退款完成` | `訂單 {{order.orderNumber}} 的退款已完成。顧客：{{customer.name}}。金額：{{reservation.refundAmount}} {{reservation.refundCurrency}}。` |
| completed | customer | `訂單 {{order.orderNumber}} 已完成` | `{{customer.name}} 您好，您的訂單 {{order.orderNumber}} 已完成。感謝您選擇 {{store.name}}。` |
| completed | staff | `訂單 {{order.orderNumber}} 已標記完成` | `訂單 {{order.orderNumber}} 已標記為完成。顧客：{{customer.name}}。` |
| credit_topup_completed | customer | `儲值已完成` | `{{customer.name}} 您好，您在 {{store.name}} 的帳戶儲值已完成。參考訂單：{{order.orderNumber}}。金額：{{order.total}}。` |
| credit_topup_completed | staff | `顧客儲值已完成` | `顧客 {{customer.name}} 已完成帳戶儲值。訂單：{{order.orderNumber}}。金額：{{order.total}}。` |

### Reservation Messages (zh-TW)

| Event | Recipient | Subject | Message |
| --- | --- | --- | --- |
| updated | customer | `預約 {{reservation.id}} 已更新` | `{{customer.name}} 您好，您的預約已更新。新狀態：{{reservation.status}}（前一狀態：{{reservation.previousStatus}}）。時間：{{reservation.dateTime}}。` |
| cancelled | customer | `預約 {{reservation.id}} 已取消` | `{{customer.name}} 您好，您的預約 {{reservation.id}} 已取消。若有適用退款，金額為：{{reservation.refundAmount}} {{reservation.refundCurrency}}。` |
| cancelled | staff | `預約 {{reservation.id}} 已取消` | `預約 {{reservation.id}} 已由 {{actor.name}} 取消。請釋放時段並更新內部排程。` |
| deleted | customer | `預約 {{reservation.id}} 已移除` | `{{customer.name}} 您好，預約 {{reservation.id}} 已移除。如非您預期，請聯繫 {{store.name}}。` |
| confirmed_by_store | customer | `{{store.name}} 已確認您的預約` | `{{customer.name}} 您好，您的預約 {{reservation.id}} 已由 {{store.name}} 確認。查看詳情：{{reservation.actionUrl}}。` |
| confirmed_by_customer | customer | `已收到您的預約確認` | `{{customer.name}} 您好，我們已收到您對預約 {{reservation.id}} 的確認，期待為您服務。` |
| confirmed_by_customer | staff | `顧客已確認預約 {{reservation.id}}` | `顧客 {{customer.name}} 已確認預約 {{reservation.id}}。請持續進行服務準備。` |
| payment_received | customer | `已收到預約付款` | `{{customer.name}} 您好，預約 {{reservation.id}} 的付款已收到。金額：{{reservation.paymentAmount}} {{reservation.paymentCurrency}}。` |
| payment_received | staff | `預約 {{reservation.id}} 付款已收（待確認）` | `預約 {{reservation.id}} 已收到付款。顧客：{{customer.name}}。金額：{{reservation.paymentAmount}} {{reservation.paymentCurrency}}。此預約目前可進行確認，請至後台確認：/storeAdmin/{{store.id}}/rsvp/history` |
| ready | customer | `您的預約已準備就緒` | `{{customer.name}} 您好，預約 {{reservation.id}} 已準備就緒。查看詳情：{{reservation.actionUrl}}。` |
| checked_in | customer | `已確認報到` | `{{customer.name}} 您好，已確認您於 {{reservation.arriveTime}} 完成預約 {{reservation.id}} 的報到。` |
| checked_in | staff | `顧客已完成報到` | `顧客 {{customer.name}} 已完成預約 {{reservation.id}} 的報到。報到碼：{{reservation.checkInCode}}。` |
| completed | customer | `【{{store.name}}】感謝您完成預約` | Structured email: ■ 預約資訊 and ■ 訂單摘要. |
| no_show | customer | `【{{store.name}}】給顧客的通知 · 未出席預約` | Structured email: ■ 顧客資料, ■ 店家, ■ 預約資訊, ■ 訂單摘要. Seeded only; no customer send path today. |
| reminder | customer | `【{{store.name}}】請確認您將參加預約` | Opens with ■ 確認連結; check-in code; ■ 預約資訊 and ■ 訂單摘要. |
| reminder | staff | `【{{store.name}}】{{customer.name}} 的預約提醒` | Upcoming reminder; ■ 相關連結; no check-in code. |
