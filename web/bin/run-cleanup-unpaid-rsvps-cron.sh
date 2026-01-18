#!/bin/bash
# Cron script to cleanup unpaid RSVPs

# Default age minutes: 30 (RSVPs older than 30 minutes will be deleted)
AGE_MINUTES=${AGE_MINUTES:-30}

curl "https://riben.life/api/cron-jobs/cleanup-unpaid-rsvps?ageMinutes=${AGE_MINUTES}"