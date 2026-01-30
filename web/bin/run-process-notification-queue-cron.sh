#!/bin/sh
# Cron script to process the notification queue (LINE, On-Site, push, email queue items).
# Without this cron, notifications stay "pending" and are never sent via LINE/On-Site/etc.
#
# Usage:
#   /usr/local/bin/run-process-notification-queue-cron.sh
#   Or: /var/www/riben.life/web/bin/run-process-notification-queue-cron.sh
#
# Environment variables:
#   - CRON_SECRET: Secret token for API authentication (required)
#   - BATCH_SIZE: Max items per channel batch (default: 100)
#   - API_URL: Base URL for the API (default: http://localhost:3001)
#
# Exit codes:
#   0 - Success
#   1 - Configuration error
#   2 - API request failed
#
# Note: Uses POSIX sh so cron (which often invokes /bin/sh) runs it without errors.

set -eu

BATCH_SIZE=${BATCH_SIZE:-100}
API_URL="${API_URL:-http://localhost:3001}"
ENDPOINT="${API_URL}/api/cron-jobs/process-notification-queue"

if [ -z "${CRON_SECRET:-}" ]; then
	echo "Error: CRON_SECRET environment variable is not set" >&2
	exit 1
fi

response=$(curl -X GET "$ENDPOINT?batchSize=${BATCH_SIZE}" \
	-H "Authorization: Bearer $CRON_SECRET" \
	-H "Content-Type: application/json" \
	--silent \
	--show-error \
	--write-out "\n%{http_code}" \
	--max-time 300)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
	echo "Success: $body"
	exit 0
elif [ "$http_code" -eq 401 ]; then
	echo "Error: Unauthorized - CRON_SECRET may be incorrect" >&2
	exit 1
elif [ "$http_code" -eq 500 ]; then
	echo "Error: Server error - $body" >&2
	exit 2
else
	echo "Error: Unexpected HTTP status $http_code - $body" >&2
	exit 2
fi
