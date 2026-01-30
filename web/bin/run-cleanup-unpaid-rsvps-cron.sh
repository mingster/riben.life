#!/bin/sh
# Cron script to cleanup unpaid RSVPs
#
# Usage:
#   /usr/local/bin/run-cleanup-unpaid-rsvps-cron.sh
#   Or: /var/www/riben.life/web/bin/run-cleanup-unpaid-rsvps-cron.sh
#
# Environment variables:
#   - CRON_SECRET: Secret token for API authentication (required)
#   - AGE_MINUTES: Minimum age in minutes before deleting (default: 30)
#   - API_URL: Base URL for the API (default: http://localhost:3001)
#
# Exit codes:
#   0 - Success
#   1 - Configuration error
#   2 - API request failed
#
# Note: Uses POSIX sh so cron (which often invokes /bin/sh) runs it without errors.

set -eu

# Default age in minutes (minimum age before deleting)
AGE_MINUTES=${AGE_MINUTES:-30}

# Default API URL (can be overridden by environment variable)
API_URL="${API_URL:-http://localhost:3001}"
ENDPOINT="${API_URL}/api/cron-jobs/cleanup-unpaid-rsvps"

# Check if CRON_SECRET is set
if [ -z "${CRON_SECRET:-}" ]; then
	echo "Error: CRON_SECRET environment variable is not set" >&2
	exit 1
fi

# Make the API request
response=$(curl -X GET "$ENDPOINT?ageMinutes=${AGE_MINUTES}" \
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
