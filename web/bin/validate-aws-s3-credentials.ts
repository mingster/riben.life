#!/usr/bin/env bun

/**
 * Validates AWS (or S3-compatible) credentials the same way the app uses them:
 * S3Client + HeadBucket on PRODUCT_IMAGES_BUCKET.
 *
 * Usage (from web/):
 *   bun --env-file=.env.local run bin/validate-aws-s3-credentials.ts
 *
 * Or add to package.json script validate:aws-s3.
 */

import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

function maskKeyId(id: string): string {
	if (id.length <= 8) {
		return "***";
	}
	return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

/** Typical IAM user access key: 20-char id (AKIA/ASIA…), 40-char secret. */
function printCredentialShapeWarnings(keyId: string, secret: string): void {
	const warnings: string[] = [];
	if (keyId.length !== 20) {
		warnings.push(
			`AWS_ACCESS_KEY_ID length is ${keyId.length}; standard IAM keys are 20 characters (e.g. AKIAxxxxxxxxxxxxxxxx). If this is 40, you may have put the secret in the key-id field or duplicated the wrong value.`,
		);
	} else if (!keyId.startsWith("AKIA") && !keyId.startsWith("ASIA")) {
		warnings.push(
			`AWS_ACCESS_KEY_ID usually starts with AKIA (long-term IAM) or ASIA (temporary).`,
		);
	}
	if (secret.length !== 40) {
		warnings.push(
			`AWS_SECRET_ACCESS_KEY length is ${secret.length}; standard length is 40. Check for truncation or extra characters.`,
		);
	}
	if (keyId === secret) {
		warnings.push(`AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are identical.`);
	}
	if (warnings.length > 0) {
		console.error("⚠ Credential shape warnings:");
		for (const w of warnings) {
			console.error(`  - ${w}`);
		}
		console.error("");
	}
}

function dumpAwsSdkError(err: unknown, depth = 0): void {
	if (depth > 4 || err == null) {
		return;
	}
	if (typeof err !== "object") {
		console.error(`  (non-object): ${String(err)}`);
		return;
	}
	const o = err as Record<string, unknown>;
	if (o.$metadata && typeof o.$metadata === "object") {
		console.error("  $metadata:", JSON.stringify(o.$metadata, null, 2));
	}
	for (const k of [
		"Code",
		"code",
		"Bucket",
		"Region",
		"Endpoint",
		"$fault",
		"Error",
	]) {
		if (k in o && o[k] !== undefined) {
			console.error(`  ${k}:`, o[k]);
		}
	}
	const resp = o.$response as { statusCode?: number } | undefined;
	if (resp?.statusCode != null) {
		console.error("  HTTP status:", resp.statusCode);
	}
	if (err instanceof Error && err.cause) {
		console.error("  Caused by:");
		dumpAwsSdkError(err.cause, depth + 1);
	}
}

async function main(): Promise<void> {
	const keyId = process.env.AWS_ACCESS_KEY_ID?.trim();
	const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim();
	const bucket = process.env.PRODUCT_IMAGES_BUCKET?.trim();
	const region = process.env.AWS_REGION?.trim() || "us-east-1";
	const endpoint = process.env.AWS_S3_ENDPOINT?.trim();
	const forcePathStyle =
		process.env.AWS_S3_FORCE_PATH_STYLE === "true" ||
		process.env.AWS_S3_FORCE_PATH_STYLE === "1";

	if (!keyId || !secret) {
		console.error(
			"Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in environment.",
		);
		console.error(
			"Run from web/ with: bun --env-file=.env.local run bin/validate-aws-s3-credentials.ts",
		);
		process.exit(1);
	}

	if (!bucket) {
		console.error("PRODUCT_IMAGES_BUCKET is not set.");
		process.exit(1);
	}

	console.log("Configuration (secrets redacted):");
	console.log(
		`  AWS_ACCESS_KEY_ID: ${maskKeyId(keyId)} (length ${keyId.length})`,
	);
	console.log(
		`  AWS_SECRET_ACCESS_KEY: set (length ${secret.length}${secret.includes("\n") || secret.includes("\r") ? " — WARNING: contains newline; fix .env.local" : ""})`,
	);
	console.log(`  AWS_REGION: ${region}`);
	console.log(`  PRODUCT_IMAGES_BUCKET: ${bucket}`);
	console.log(`  AWS_S3_ENDPOINT: ${endpoint || "(default — real AWS S3)"}`);
	console.log(`  AWS_S3_FORCE_PATH_STYLE: ${forcePathStyle}`);
	console.log("");

	printCredentialShapeWarnings(keyId, secret);

	const client = new S3Client({
		region,
		...(endpoint ? { endpoint, forcePathStyle } : {}),
	});

	try {
		await client.send(new HeadBucketCommand({ Bucket: bucket }));
		console.log(
			"OK: Credentials accepted and bucket is reachable (HeadBucket succeeded).",
		);
	} catch (err: unknown) {
		const name = err instanceof Error ? err.name : "";
		const msg = err instanceof Error ? err.message : String(err);
		console.error("HeadBucket failed:");
		console.error(`  ${name ? `${name}: ` : ""}${msg}`);
		console.error("");
		console.error(
			"SDK details (status / request id help explain UnknownError):",
		);
		dumpAwsSdkError(err);
		console.error("");
		if (
			msg.includes("does not exist in our records") ||
			msg.includes("InvalidAccessKeyId")
		) {
			console.error(
				"Hint: AWS rejected the access key. Common causes: typo, deleted/rotated IAM key,",
			);
			console.error(
				"or MinIO/local keys used without AWS_S3_ENDPOINT (requests go to real AWS).",
			);
		}
		if (msg.includes("SignatureDoesNotMatch")) {
			console.error(
				"Hint: Secret does not match this access key, or the secret has stray quotes/spaces/newlines in .env.local.",
			);
		}
		process.exit(1);
	}
}

main();
