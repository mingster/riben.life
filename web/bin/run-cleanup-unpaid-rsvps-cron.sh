#!/bin/bash
# Cron script to cleanup unpaid RSVPs

curl "http://localhost:3001/api/cron-jobs/cleanup-unpaid-rsvps"
#curl "https://riben.life/api/cron-jobs/cleanup-unpaid-rsvps"