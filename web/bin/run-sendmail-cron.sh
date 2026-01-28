#!/bin/bash
# Cron script to process and send emails from the email queue
#
# Usage:
#   /usr/local/bin/run-sendmail-cron.sh
#   Or: /var/www/riben.life/web/bin/run-sendmail-cron.sh
#
# Environment variables:
#   - CRON_SECRET: Secret token for API authentication (required)
#   - BATCH_SIZE: Number of emails to process per batch (default: 10)
#   - MAX_CONCURRENT: Maximum concurrent emails to send (default: 3)
#   - API_URL: Base URL for the API (default: http://localhost:3001)
#
# Exit codes:
#   0 - Success
#   1 - Configuration error
#   2 - API request failed

set -euo pipefail

# Default batch size: 10 (number of emails to process per batch)
BATCH_SIZE=${BATCH_SIZE:-10}

# Default max concurrent: 3 (maximum concurrent emails to send)
MAX_CONCURRENT=${MAX_CONCURRENT:-3}

# Default API URL (can be overridden by environment variable)
API_URL="${API_URL:-http://localhost:3001}"
ENDPOINT="${API_URL}/api/cron-jobs/sendmail"

# Check if CRON_SECRET is set
if [ -z "${CRON_SECRET:-}" ]; then
	echo "Error: CRON_SECRET environment variable is not set" >&2
	exit 1
fi

# Make the API request
response=$(curl -X GET "$ENDPOINT?batchSize=${BATCH_SIZE}&maxConcurrent=${MAX_CONCURRENT}" \
	-H "Authorization: Bearer $CRON_SECRET" \
	-H "Content-Type: application/json" \
	--silent \
	--show-error \
	--write-out "\n%{http_code}" \
	--max-time 300)

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)

# Extract response body (all lines except last)
body=$(echo "$response" | sed '$d')

# Check HTTP status code
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
