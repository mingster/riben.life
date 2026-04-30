# Lifecycle Notification Matrix

## Overview

This document lists lifecycle notifications by domain and event, including recipients, channels, and message outline.

Template key format:

- `domain.event.recipient.channel`
- Example: `order.credit_topup_completed.customer.email`

Shared recipients/channels:

- Recipients: `customer`, `staff`
- Channels: `email`, `onsite`, `line`, `whatsapp`, `wechat`, `sms`, `telegram`, `push`
- Locales: `zh-TW`, `en-US`, `ja-JP`

## Order Lifecycle

| Domain | Event | Recipients | Channels | Message Outline |
| --- | --- | --- | --- | --- |
| order | paid | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | Order paid status update with payment completion context. |
| order | cancelled | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | Order cancellation notice, including changed status context. |
| order | refunded | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | Refund processed notice with refund amount/currency context. |
| order | completed | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | Order completion notice with final status summary. |
| order | credit_topup_completed | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | Credit/account top-up completion notice with order and payment context. |

## Reservation Lifecycle

| Domain | Event | Recipients | Channels | Message Outline |
| --- | --- | --- | --- | --- |
| reservation | updated | customer | email, onsite, line, whatsapp, wechat, sms, telegram, push | Reservation updated notice with previous and current status/details. |
| reservation | cancelled | staff, customer | email, onsite, line, whatsapp, wechat, sms, telegram, push | Reservation cancelled notice with status and potential refund context. |
| reservation | deleted | customer | email, onsite, line, whatsapp, wechat, sms, telegram, push | Reservation deleted notice for audit/awareness. |
| reservation | confirmed_by_store | customer | email, onsite, line, whatsapp, wechat, sms, telegram, push | Store confirmation notice for reservation readiness/progress. |
| reservation | confirmed_by_customer | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | Customer confirmation notice for reservation commitment. |
| reservation | payment_received | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | Reservation payment received confirmation with amount context. |
| reservation | ready_to_confirm | staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | send to staff for confirmation as the Reservation is paid. |
| reservation | ready | customer | email, onsite, line, whatsapp, wechat, sms, telegram, push | staff has confirmed the reservation. |
| reservation | checked_in | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | Check-in confirmation with code/time context. |
| reservation | completed | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | Reservation completed notice with final summary. |
| reservation | no_show | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | No-show notification for follow-up and records. |
| reservation | reminder | customer, staff | email, onsite, line, whatsapp, wechat, sms, telegram, push | Reminder notification before reservation time. |
| reservation | customer_confirm_required | customer | email, onsite, line, whatsapp, wechat, sms, telegram, push | Customer confirmation required prompt with action URL/code context. |

## Seed Message Variables (Current Default Outline)

The current lifecycle seed templates include placeholders across these groups:

- Header/context: `{{recipientLabel}}`, `{{channel}}`, `{{domain}}`, `{{event}}`
- Customer: `{{customer.name}}`, `{{customer.email}}`, `{{customer.phone}}`
- Store: `{{store.name}}`
- Reservation: ID/status/datetime/arrive/facility/service-staff/party size/message/check-in code/action URL/order link/payment/refund fields
- Order: `{{order.orderNumber}}`, `{{order.createdOn}}`, `{{order.total}}`

## Actual Message Copy (Draft Templates)

The following message copy is ready to use as baseline content for each event in the current table.

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
| completed | customer | `Reservation completed` | `Hi {{customer.name}}, reservation {{reservation.id}} is completed. Thank you for visiting {{store.name}}.` |
| completed | staff | `Reservation {{reservation.id}} completed` | `Reservation {{reservation.id}} has been completed for {{customer.name}}.` |
| no_show | customer | `Reservation marked no-show` | `Hi {{customer.name}}, reservation {{reservation.id}} was marked as no-show. Contact {{store.name}} if this needs correction.` |
| no_show | staff | `Reservation {{reservation.id}} marked no-show` | `Reservation {{reservation.id}} is marked no-show. Customer: {{customer.name}}.` |
| reminder | customer | `Upcoming reservation reminder` | `Reminder: reservation {{reservation.id}} is scheduled at {{reservation.dateTime}}. Facility: {{reservation.facilityName}}.` |
| reminder | staff | `Upcoming reservation reminder` | `Reminder: reservation {{reservation.id}} for {{customer.name}} is scheduled at {{reservation.dateTime}}.` |
| customer_confirm_required | customer | `Please confirm your reservation` | `Hi {{customer.name}}, please confirm reservation {{reservation.id}}. Confirm here: {{reservation.actionUrl}}.` |
