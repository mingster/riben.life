#!/bin/bash
# Cron script to process and send emails from the email queue

# Default batch size: 10 (number of emails to process per batch)
BATCH_SIZE=${BATCH_SIZE:-10}

# Default max concurrent: 3 (maximum concurrent emails to send)
MAX_CONCURRENT=${MAX_CONCURRENT:-3}

curl "https://riben.life/api/cron-jobs/sendmail?batchSize=${BATCH_SIZE}&maxConcurrent=${MAX_CONCURRENT}"