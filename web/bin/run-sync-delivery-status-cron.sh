#!/bin/bash
# Sync notification delivery statuses
# This script is called by system cron periodically
#
# Usage:
#   /var/www/riben.life/web/bin/run-sync-delivery-status-cron.sh
#

set -euo pipefail

# Default API URL (can be overridden by environment variable)
API_URL="${API_URL:-http://localhost:3001}"
ENDPOINT="${API_URL}/api/cron-jobs/sync-delivery-status"

# Check if CRON_SECRET is set
if [ -z "${CRON_SECRET:-}" ]; then
	echo "Error: CRON_SECRET environment variable is not set" >&2
	exit 1
fi

# Make the API request
response=$(curl -X GET "$ENDPOINT" \
	-H "Authorization: Bearer $CRON_SECRET" \
	-H "Content-Type: application/json" \
	--silent \
	--show-error \
	--write-out "\n%{http_code}" \
	--max-time 300)

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)

# Extract response body (all lines except last)
# Use sed instead of head to avoid issues with negative line counts
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
