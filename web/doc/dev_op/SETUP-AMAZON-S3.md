# Amazon S3 setup for product images

**Status:** Active
**Related:** [Environment variables – Product images](../ENVIRONMENT_VARIABLES.md#product-images-amazon-s3), [`web/src/lib/product-images/s3-storage.ts`](../../src/lib/product-images/s3-storage.ts)

## Overview

The riben.life web app stores **store-admin product gallery images** and **store logos** in **Amazon S3** (or an S3-compatible API such as MinIO). The Next.js app uploads via the Store Admin API (product images: `POST` multipart to `/api/storeAdmin/{storeId}/product/{productId}/image`; store logo: `POST` multipart to `/api/storeAdmin/{storeId}/settings/logo`), writes metadata to PostgreSQL (`ProductImages`, `Store.logo` / `logoPublicId`), and serves files using **HTTPS URLs** that point at the object in the bucket (virtual-hosted style by default).

This guide walks through **AWS account setup**, **bucket configuration**, **public read for the PDP**, **IAM for the application**, **local `.env`**, and **verification**. It does not modify application code.

## What gets stored

| Item | Value |
|------|--------|
| **Object key (products)** | `{PRODUCT_IMAGES_KEY_PREFIX}products/{productId}/{uuid}.{ext}` |
| **Object key (store logo)** | `{PRODUCT_IMAGES_KEY_PREFIX}stores/{storeId}/logo/{uuid}.{ext}` |
| **Extensions** | Products: `.jpg`, `.png`, `.webp`, `.gif`, models; logos: `.jpg`, `.png`, `.webp` |
| **Max upload size** | 10 MB per raster image (product gallery and store logos) |
| **`imgPublicId` / `logoPublicId` (DB)** | Full S3 object key |
| **`url` / `Store.logo` (DB)** | Public HTTPS URL to the object (see below) |

**Default public URL shape** (no `PRODUCT_IMAGES_PUBLIC_BASE_URL`):

`https://{bucket}.s3.{region}.amazonaws.com/{url-encoded-key}`

**Override** (CloudFront, MinIO, custom domain): set `PRODUCT_IMAGES_PUBLIC_BASE_URL` to the origin base; the app appends the encoded key path.

## Prerequisites

- An [AWS account](https://aws.amazon.com/).
- Permission to create S3 buckets, IAM users or roles, and policies.
- For local dev: `web/.env.local` (or your process manager’s env) where the Next.js server runs.

Optional:

- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) for smoke tests.

## Step 1: Choose region and bucket name

1. Open **AWS Console** → **S3** → **Create bucket**.
2. **Bucket name:** globally unique (e.g. `riben.life-product-images-dev`, `riben.life-prod`).
3. **AWS Region:** note the code (e.g. `ap-northeast-1`, `us-east-1`). You will set `AWS_REGION` and it must match the bucket’s region or uploads may fail with signature/endpoint errors.

**Recommendation:** Use **separate buckets** for production and non-production, or one bucket with **`PRODUCT_IMAGES_KEY_PREFIX`** (e.g. `dev/`, `staging/`) so keys never collide across environments.

## Step 2: Public read for shop and `next/image`

Browsers and `next/image` load product URLs **directly from S3** (or your CDN base URL). Objects must be **readable anonymously** for that URL pattern, unless you later move to signed URLs or a private origin + CloudFront (out of scope for this doc’s “phase 1” setup).

### 2.1 Object Ownership

In **S3** → your bucket → **Permissions** → **Object Ownership**:

- Prefer **Bucket owner enforced** (ACLs disabled). Access is controlled with **bucket policies**, not object ACLs.

### 2.2 Block Public Access

Still under **Permissions** → **Block public access (bucket settings)**:

- To allow a **bucket policy** that grants `s3:GetObject` to everyone, you must **not** block policies that grant public access. Typical adjustment:
  - Turn **off** “Block *all* public access”, **or**
  - Turn **off** at least **“Block public access to buckets and objects granted through new public bucket or access point policies”** (wording varies slightly by console version).

If this stays fully on, adding a public `GetObject` statement to the bucket policy will **not** take effect.

### 2.3 Bucket policy (anonymous `GetObject`)

**Permissions** → **Bucket policy** → paste a policy like the following. Replace:

- `YOUR-BUCKET-NAME`
- `YOUR-PREFIX` — if you use `PRODUCT_IMAGES_KEY_PREFIX`, the public prefix must cover those keys (e.g. `dev/products/*` and `dev/stores/*`). If the prefix is empty, allow both `products/*` and `stores/*` (store logos).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadProductImagesAndStoreLogos",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::bagonia-product-images-552979339892-ap-northeast-1-an/products/*",
        "arn:aws:s3:::bagonia-product-images-552979339892-ap-northeast-1-an/stores/*"
      ]
    }
  ]
}
```

**Examples:**

- No app prefix (two statements or one array): include `products/*` and `stores/*` for logos, e.g. `"Resource": ["arn:aws:s3:::my-bucket/products/*", "arn:aws:s3:::my-bucket/stores/*"]`
- App prefix `dev/`: `"Resource": ["arn:aws:s3:::my-bucket/dev/products/*", "arn:aws:s3:::my-bucket/dev/stores/*"]`

**Security note:** This exposes **every object under those key prefixes** to the internet. Keep the bucket (or these prefixes) dedicated to public storefront assets; do not reuse them for secrets or private data.

### 2.4 CORS

Product images are loaded with **GET** from the bucket hostname in the **browser** (img / `next/image`). Default S3 CORS often allows simple GETs from web pages; if you see CORS errors in the console when loading images, add a CORS configuration on the bucket allowing `GET` from your site origins. Uploads go **through your Next.js API**, so the browser does not need CORS on the bucket for `PUT` in the default design.

## Step 3: IAM for the application (PutObject / DeleteObject)

Create an **IAM user** (long-lived keys for local/Vercel env) or an **IAM role** (EC2, ECS, Lambda, etc.). Attach an **inline policy** or **customer managed policy** like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AppWriteProductImagesAndStoreLogos",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::riben.life-prod/products/*",
        "arn:aws:s3:::riben.life-prod/stores/*"
      ]
    }
  ]
}
```

Match `YOUR-PREFIX` to the same logical prefix as in the bucket policy. IAM `Resource` must cover **both** `{prefix}products/*` and `{prefix}stores/*` or uploads will return **502** / `AccessDenied` on store logo uploads while product images still work.

**Not required** for the current code path: `s3:ListBucket` (no server-side listing of arbitrary keys for this feature).

**Least privilege:** Restrict `Resource` to the exact prefix the app uses. Do not use `arn:aws:s3:::bucket/*` unless that bucket is image-only.

### Access keys (dev / Vercel env vars)

1. **IAM** → **Users** → your user → **Security credentials** → **Create access key**.
2. Use case: “Application running outside AWS” (or your platform’s recommendation).
3. Store **`AWS_ACCESS_KEY_ID`** and **`AWS_SECRET_ACCESS_KEY`** in `.env.local` (never commit them).

For production on AWS compute, prefer **instance/instance-profile** or **OIDC** and **do not** embed long-lived keys.

## Step 4: Environment variables

Add to `web/.env.local` (and to your host’s secret store in production):

```bash
# Required for uploads to work
PRODUCT_IMAGES_BUCKET=YOUR-BUCKET-NAME
AWS_REGION=ap-northeast-1

# IAM user (or equivalent)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Optional: isolate keys per environment in one bucket
# PRODUCT_IMAGES_KEY_PREFIX=dev/

# Optional: CloudFront / MinIO / custom public base (no trailing slash)
# PRODUCT_IMAGES_PUBLIC_BASE_URL=https://d111111abcdef8.cloudfront.net

# Optional: S3-compatible local endpoint
# AWS_S3_ENDPOINT=http://127.0.0.1:9000
# AWS_S3_FORCE_PATH_STYLE=true
```

If **`PRODUCT_IMAGES_BUCKET`** is unset or empty, the upload API returns **503** (“Product image storage is not configured”).

Restart the Next.js dev server after changes.

Full variable list and short notes: [ENVIRONMENT_VARIABLES.md – Product images](../ENVIRONMENT_VARIABLES.md#product-images-amazon-s3).

## Step 5: Next.js image optimization

The repo configures `images.remotePatterns` in `next.config.ts` for common **public S3** host patterns (e.g. `*.s3.*.amazonaws.com`). If you use a **custom hostname** (CloudFront, MinIO on `localhost`), add a matching `remotePatterns` entry or use `unoptimized` for those URLs in UI code.

## Step 6: Verify end-to-end

### 6.1 In the app

1. Sign in as a user who can access **Store Admin** for a store.
2. Open **Products** → edit a product → **Product Images** section.
3. Upload a JPEG, PNG, or WebP under 10 MB.
4. Confirm the image appears in the gallery and loads (no broken image icon).
5. Open the shop PDP for that product and confirm the same URL displays.
6. **Store logo:** **Settings** (basic) → upload a logo (JPEG / PNG / WebP / GIF, max 10 MB, same MIME rules as product images including raw `application/octet-stream`). If product uploads work but logo returns **502**, widen IAM and bucket policy to include `stores/*` as above. Server logs include `s3Code`, `s3RequestId` for support tickets.

### 6.2 With AWS CLI (optional)

Replace bucket, region, and a test key that matches your prefix:

```bash
aws s3 cp ./test.jpg s3://YOUR-BUCKET-NAME/products/manual-test/test.jpg --region YOUR-REGION
```

Then open in a browser (encode path segments if needed):

`https://YOUR-BUCKET-NAME.s3.YOUR-REGION.amazonaws.com/products/manual-test/test.jpg`

If you get **403**, check bucket policy, Block Public Access, and that the object key is under the allowed `Resource` ARN pattern.

### 6.3 Delete path

Deleting an image in Store Admin should remove the DB row and call **`DeleteObject`** on the key stored in `imgPublicId`. If S3 delete fails (e.g. wrong credentials), check server logs; the app logs a warning and may still remove the DB row depending on code paths—in practice fix IAM and retry.

## Optional: MinIO (local S3-compatible)

1. Run MinIO (Docker or binary) and create a bucket mirroring your prod naming.
2. Create an access key in MinIO console.
3. Set:

```bash
PRODUCT_IMAGES_BUCKET=your-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minio
AWS_SECRET_ACCESS_KEY=minio-secret
AWS_S3_ENDPOINT=http://127.0.0.1:9000
AWS_S3_FORCE_PATH_STYLE=true
PRODUCT_IMAGES_PUBLIC_BASE_URL=http://127.0.0.1:9000/your-bucket
```

Adjust `PRODUCT_IMAGES_PUBLIC_BASE_URL` to how MinIO exposes **public** object URLs in your setup (path-style vs virtual-hosted). You may need **`http`** entries in `next.config.ts` `remotePatterns` for `localhost` if you optimize images with `next/image`.

Apply a bucket policy (or MinIO policy) that allows **anonymous read** on `products/*` and `stores/*` if the browser must load objects without signing.

## Troubleshooting

| Symptom | Things to check |
|--------|------------------|
| **503** on upload | `PRODUCT_IMAGES_BUCKET` set; server restarted. |
| **400** “Only JPEG, PNG…” | File MIME/type; extension not enough—browser must send correct `Content-Type`. |
| **400** “Image too large” | File ≤ 10 MB. |
| **Signature / region errors** | `AWS_REGION` matches bucket region; clock skew on server. |
| **403** on GET in browser | Bucket policy `Resource` matches key; Block Public Access allows policy; key path correct. |
| **403** / **502** on PutObject | IAM policy `Resource` includes **both** `{prefix}products/*` and `{prefix}stores/*`; credentials attached to running process. Logos use `stores/…` keys only. |
| **`next/image` errors** | `remotePatterns` includes your image hostname; or use `unoptimized`. |

## Summary

1. Create an S3 bucket in a chosen **region**.
2. Allow **anonymous `GetObject`** on `{prefix}products/*` via bucket policy; adjust **Block Public Access** so the policy can apply.
3. Give the app IAM **PutObject** and **DeleteObject** on the same key prefix.
4. Set **`PRODUCT_IMAGES_BUCKET`**, **`AWS_REGION`**, and credentials in **`.env.local`** (or the host’s env).
5. Restart Next.js and test **Store Admin → product → upload** and the **shop PDP**.

For a later phase, you can point **`PRODUCT_IMAGES_PUBLIC_BASE_URL`** at CloudFront and tighten the bucket to **private** + OAC; object keys stay the same.
