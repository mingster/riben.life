# Research: Sending LINE Messages by Phone Number

**Date:** 2025-01-26  
**Status:** Research  
**Related:** [LINE and Notification System Integration](./LINE-NOTIFICATION-INTEGRATION.md), [LINE Messaging API overview](./LINE%20Messaging%20API%20overview.md)

---

## 1. Summary

**The standard LINE Messaging API does NOT support sending by phone number.** It requires a LINE **user ID** (obtained when users add your Official Account as a friend or sign in with LINE).

To send by **phone number**, you must use **LINE Notification Messages** (LINE 通知メッセージ), a separate, restricted service.

---

## 2. LINE Notification Messages (Phone-Number-Based)

### 2.1 What It Is

- **LINE Notification Messages** lets you send messages to users by specifying their **phone number** (hashed), even if they have **not** added your LINE Official Account as a friend.
- Messages are shown as **「重要なお知らせ」 / 「重要通知」 / 「Important notification」** next to the Official Account icon.
- **Regions:** Japan, Thailand, and **Taiwan** only.
- **Audience:** Corporate customers who have completed LINE’s application/approval process.

### 2.2 How to Get Access

- **Application required.** Only corporate users who have submitted the required applications can use it.
- **Contact:** [LINE Sales partners](https://www.lycbiz.com/jp/partner/sales/) or your LINE sales representative.
- You must apply for your LINE Official Account (Messaging API channel) to be enabled for LINE Notification Messages.

### 2.3 Use Restrictions

- **Purpose:** Limited to uses LINE deems useful and appropriate for users.
- **Not for:** Commercial or advertising.
- UX and consent rules apply; see LINE’s [template](https://www.lycbiz.com/sites/default/files/media/jp/download/LINE_Official_Notification_Template_UXGuideline.pdf) and [flexible](https://www.lycbiz.com/sites/default/files/media/jp/download/LINE通知メッセージUXガイドライン.pdf) UX guidelines (Japanese).

---

## 3. Two Types of LINE Notification Messages

| Type | API Endpoint | Description |
|------|--------------|-------------|
| **Template** | `POST https://api.line.me/v2/bot/message/pnp/templated/push` | Predefined templates + items + buttons. Easier, no UX review. |
| **Flexible** | `POST https://api.line.me/bot/pnp/push` | Flex and similar types. **Requires prior UX review** by LINE. |

---

## 4. Phone Number Format and Hashing

- **Format:** E.164 (e.g. `+886912345678`, `+818000001234`). No hyphens or spaces.
- **API input:** You do **not** send the raw number. You send the **SHA256 hash** of the E.164 string.

Example (Python 3):

```python
import hashlib
phone_number = "+818000001234"
hashed = hashlib.sha256(phone_number.encode()).hexdigest()
# e.g. d41e0ad70dddfeb68f149ad6fc61574b9c5780ab7bcb2fba5517771ffbb2409c
```

- LINE hashes the number on their side, matches it to the phone number in the user’s LINE account, and does **not** persist your hashed value for other uses.
- **Important:** The recipient’s LINE account must have that **exact** phone number registered and validated (SMS verification within LINE’s required period).

---

## 5. API Specifications (Template)

### 5.1 Send LINE Notification Message (Template)

- **Endpoint:** `POST https://api.line.me/v2/bot/message/pnp/templated/push`
- **Auth:** `Authorization: Bearer {channel access token}` (Messaging API channel)
- **Headers:**
  - `Content-Type: application/json`
  - `X-Line-Delivery-Tag` (optional, 16–100 chars): echoed in the delivery webhook for correlation.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | SHA256 hex of E.164 phone number |
| `templateKey` | string | Yes | Key of a [predefined template](https://developers.line.biz/en/docs/partner-docs/line-notification-messages/template/#templates) (e.g. `shipment_completed_ja`, Taiwan keys differ) |
| `body` | object | No | `emphasizedItem`, `items[]`, `buttons[]` |
| `body.emphasizedItem` | object | No | One item with `itemKey` + `content` (max 15 chars) |
| `body.items` | array | No | 0–15 items, each `itemKey` + `content` (max 300 chars) |
| `body.buttons` | array | No | 0–2 buttons, each `buttonKey` + `url` (max 1000 chars) |

- **Response:** `202` and empty JSON on success.
- **Rate limit:** 2,000 requests/second.
- **Security:** Do **not** restrict source IPs in the Messaging API channel’s Security settings when calling this API, or sends may fail.

**Note:** Template keys, item keys, and button keys differ by region (Japan / Thailand / Taiwan) and are chosen from LINE’s predefined list.

---

## 6. API Specifications (Flexible)

### 6.1 Send LINE Notification Message (Flexible)

- **Endpoint:** `POST https://api.line.me/bot/pnp/push`
- **Auth:** `Authorization: Bearer {channel access token}`
- **Headers:** Same as template (`Content-Type`, optional `X-Line-Delivery-Tag`).

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | SHA256 hex of E.164 phone number |
| `messages` | array | Yes | Message objects (e.g. Flex). Max 5. No image/video/audio. |

- **Response:** `200` and empty JSON on success.
- **Rate limit:** 2,000 requests/second.
- **UX review:** Messages must pass LINE’s UX review before they can be sent.

---

## 7. When a Message Is Actually Delivered

LINE sends only if **all** of the following hold:

1. The E.164 phone number (after hashing and matching) **matches** the number registered in the user’s LINE account.
2. That number is **valid** in LINE (SMS-verified within their required period).
3. The user has **agreed** to receive LINE Notification Messages (Settings → Privacy → Provide usage data → LINE notification messages).
4. The user has **not blocked** your LINE Official Account.
5. The number is from **Japan, Thailand, or Taiwan** and can be used for [phone-number authentication in the LINE app](https://help.line.me/line/smartphone/pc?lang=en&contentId=20000104).
6. The user has agreed to [LINE’s Privacy Policy (revised March 2022)](https://guide.line.me/privacy-policy_update/2022/0001/?lang=en-jp).

If the API returns `200`/`202` but the user doesn’t get the message, common causes: no LINE user for that number, wrong country, user refused notification messages, or consent/block/UX not satisfied.

---

## 8. HTTP 422 (Template and Flexible)

`422` means LINE did **not** send the notification. Typical reasons:

- No LINE user for the given (hashed) phone number.
- Phone number not from Japan, Thailand, or Taiwan.
- User has refused to receive LINE Notification Messages.
- User has not agreed to LINE’s Privacy Policy (revised March 2022).

---

## 9. Delivery Completion Webhook

- After you call the send API, a **delivery completion** webhook may be sent to your configured webhook URL.
- If you set `X-Line-Delivery-Tag` in the request, that value is returned in the webhook’s `delivery.data` so you can match requests to outcomes.
- Doc: [Webhook delivery completion event](https://developers.line.biz/en/docs/partner-docs/line-notification-messages/message-sending-complete-webhook-event/).

---

## 10. Billing

- Only messages **actually delivered** to the user are billed.
- You can get the count of delivered messages via:
  - Template: `GET https://api.line.me/v2/bot/message/delivery/pnp/templated?date=yyyyMMdd` (date in UTC+9)
  - Flexible: `GET https://api.line.me/v2/bot/message/delivery/pnp?date=yyyyMMdd`

---

## 11. Comparison: Messaging API (userId) vs Notification Messages (phone)

| Aspect | Messaging API (push by `userId`) | LINE Notification Messages (by phone) |
|--------|-----------------------------------|---------------------------------------|
| **Recipient** | LINE user ID | E.164 phone number (SHA256) |
| **Friend required?** | Yes (user must add OA or use Account Link / Login) | No |
| **Regions** | All where Messaging API is available | Japan, Thailand, Taiwan only |
| **Access** | Create Messaging API channel | Corporate application + approval |
| **Use limits** | Per Messaging API/ToS | Non‑commercial, no advertising; UX rules |
| **Endpoint (example)** | `POST /v2/bot/message/push` | Template: `POST /v2/bot/message/pnp/templated/push`; Flexible: `POST /bot/pnp/push` |
| **Our `User.line_userId`** | ✅ Used as `to` | ❌ Not used; we use `User.phoneNumber` (E.164) hashed |

---

## 12. Fit for riben.life

- **If we only have `User.line_userId`:**  
  Use the **Messaging API** (push by `userId`) as in [LINE-NOTIFICATION-INTEGRATION.md](./LINE-NOTIFICATION-INTEGRATION.md). No phone number needed.

- **If we want to reach users by phone and they may not be friends:**  
  We need **LINE Notification Messages**:
  1. Apply for the service (corporate, via LINE Sales / partners).
  2. Store `User.phoneNumber` in E.164 and ensure it’s usable for this (and compliant with our policy).
  3. Hash with SHA256 and call the template or flexible PnP API.
  4. Use **template** for simpler, pre-approved layouts, or **flexible** after UX review.
  5. Handle `422` and webhook events for delivery and billing.

- **Data:**  
  For Notification Messages, the relevant field is **`User.phoneNumber`** (E.164). `User.line_userId` is for Messaging API push only.

---

## 13. References

- [LINE notification messages overview](https://developers.line.biz/en/docs/partner-docs/line-notification-messages/overview/)
- [Technical specifications of the LINE notification messages API](https://developers.line.biz/en/docs/partner-docs/line-notification-messages/technical-specs/)
- [LINE notification messages API reference](https://developers.line.biz/en/reference/line-notification-messages/)
- [LINE notification messages (template)](https://developers.line.biz/en/docs/partner-docs/line-notification-messages/template/)
- [Webhook delivery completion event](https://developers.line.biz/en/docs/partner-docs/line-notification-messages/message-sending-complete-webhook-event/)
- [E.164 (LINE glossary)](https://developers.line.biz/en/glossary/#e164)

---

**End of Document**
