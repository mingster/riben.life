# Deployment Note

Currently [riben.life](https://playground.riben.life) is hosted at [vercel](https://vercel.com).

As you commit to main branch, new code will deploy to the stage automatically.

Be sure to [maintain .env](https://vercel.com/mingsters-projects/legod/settings/environment-variables) manually should there be amy change.

## Production

production site [riben.life](https://riben.life) is hosted at mx2.mingster.com, which is on Ubuntu 22 with local postgres 18.

### deployment note

#### Change hostname if needed

```bash
sudo hostnamectl set-hostname riben.life
```

Verify the new setting:

```bash
sudo hostnamectl status
```

```bash
sudo nano /etc/hosts

localhost    localhost
127.0.1.1    riben.life
```

#### SSH

```bash
ssh-keygen -t ed25519

# also you need to setup authorized_keys
```

#### system update

```bash
sudo apt update && sudo apt upgrade -y
```

#### Essential Software

```bash
sudo apt install wget nano unzip ufw
```

#### postgres/psql (optional)

this is just so we can use psql client on the box.

```bash
# Import the repository signing key:
sudo apt install curl ca-certificates

sudo mkdir -p /usr/share/postgresql-common/pgdg
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc

# Create the repository configuration file:
. /etc/os-release
sudo sh -c "echo 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $VERSION_CODENAME-pgdg main' > /etc/apt/sources.list.d/pgdg.list"

# Update the package lists:
sudo apt update

# install
sudo apt install postgresql-client-18
#sudo apt install postgresql-18
```

##### config db access

On the db box,

```bash
sudo nano /etc/postgresql/18/main/pg_hba.conf
```

```text
# tc2
host    all     all     59.126.30.241/32       scram-sha-256
hostssl    all     all     59.126.30.241/32       scram-sha-256
```

```bash
sudo systemctl restart postgresql
```

```bash
sudo ufw allow proto tcp from 63.141.238.242 to any port 5432

```

##### check db access

back to the web site:

```bash
psql -h mx2.mingster.com -d riben_life -U pstv_user
```

#### Install Node.js and npm

For latest version, visit the Node.js official documentation page.

```bash
sudo apt install -y ca-certificates curl gnupg

curl -fsSL https://deb.nodesource.com/setup_24.x | sudo bash -
sudo apt-get install -y nodejs

# installs nvm (Node Version Manager)
#sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
# download and install Node.js (you may need to restart the terminal)
#nvm install 24.12.0
# verifies the right Node.js version is in the environment
node -v # should print `v24.xxx`

# verifies the right npm version is in the environment
npm -v # should print `11.xxx`

# install bun
curl -fsSL https://bun.com/install | bash
```

#### git

```bash
sudo apt install git gh
```

```bash
gh auth login
```

#### lazygit

```bash
LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | \grep -Po '"tag_name": *"v\K[^"]*')
curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/download/v${LAZYGIT_VERSION}/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
tar xf lazygit.tar.gz lazygit
sudo install lazygit -D -t /usr/local/bin/
```

#### PM2

```bash
bun install -g pm2
```

#### ufw

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

sudo ufw enable
sudo ufw reload

sudo ufw status verbose
```

#### nginx

```bash
sudo apt install nginx -y

sudo nano /etc/nginx/sites-available/riben.life
```

Add the following configuration:

```bash
server {
    listen 80;
    server_name riben.life;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        # Critical for OAuth callbacks and better-auth: pass proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # critical: avoid caching dynamic responses
        add_header Cache-Control "no-store" always;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for OAuth callbacks
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static build assets can be cached aggressively (safe)
    #location ^~ /_next/static/ {
    #    proxy_pass http://localhost:3001;
    #    add_header Cache-Control "public, max-age=31536000, immutable" always;
    #}

    # If you use next/image
    #location ^~ /_next/image/ {
    #    proxy_pass http://localhost:3001;
    #    add_header Cache-Control "public, max-age=60" always;
    #}
}
```

link to sites-enabled

```bash
sudo ln -s /etc/nginx/sites-available/riben.life /etc/nginx/sites-enabled/
```

test:

```bash
sudo nginx -t
```

If the test is successful, restart Nginx:

```bash
sudo systemctl restart nginx
```

#### SSL

```bash
sudo apt install certbot python3-certbot-nginx -y

sudo certbot --nginx -d riben.life
```

## configure

### clone the source

```bash
sudo mkdir -p /var/www
cd /var/www
sudo  git clone https://github.com/mingster/riben.life.git
```

### .env

copy or edit .env over to production

### file permission

```bash
# Replace 'youruser' with your actual username

sudo usermod -aG www-data youruser
sudo chown -R youruser:www-data /var/www

# Apply 755 to all directories
sudo find /var/www -type d -exec chmod 755 {} \;

# Apply 644 to all files
cd
```

### build

```bash
cd /var/www/riben.life/web/bin

sh deploy.sh

#bun install
#bun run build
```

### pm2

```bash

#mkdir -p /var/www/riben.life
cd /var/www/riben.life/web
#pm2 start bun --name "riben.life" -- start -- -p 3001

# 6. Restart PM2 (without the duplicate -p flag)
#pm2 delete riben.life
pm2 start bun --name "riben.life" -- start

pm2 startup systemd
pm2 save
pm2 status

# 7. Check the logs
pm2 logs riben.life --lines 50
```

## Cron jobs

```bash
sudo apt-get install cron
```

### Environment Variables for Cron Jobs

All cron jobs require the `CRON_SECRET` environment variable for authentication. To make it available to all cron jobs, add it to your `.bashrc`:

```bash
nano ~/.bashrc
```

Add the following line at the end:

```bash
export CRON_SECRET=f338800f54e901ac40d1f24785f8e81bc2c2768b3df1b81651b3c0c6a3a4aa2d
```

Then reload your shell:

```bash
source ~/.bashrc
```

Verify it's set:

```bash
echo $CRON_SECRET
```

### Sendmail

Cron Script: `bin/run-sendmail-cron.sh`

Calls the API endpoint via curl with Bearer token authentication

API Endpoint: `web/src/app/api/cron-jobs/sendmail/route.ts`

Handles GET requests with Bearer token authentication

Calls sendMailsInQueue() action

Crontab Configuration:

* Runs every 10 seconds: `* * * * *` with sleep offsets (0s, 10s, 20s, 30s, 40s, 50s)

Actual Implementation:

The script calls: `curl -H "Authorization: Bearer ${CRON_SECRET}" https://riben.life/api/cron-jobs/sendmail?batchSize=10&maxConcurrent=3`

The API route processes the email queue using sendMailsInQueue() from `@/actions/mail/send-mails-in-queue`

**Environment Variables:**

* `CRON_SECRET`: (required) Secret token for authenticating cron job requests (should be set in `.bashrc`)
* `BATCH_SIZE`: (optional) Number of emails to process per batch (default: 10)
* `MAX_CONCURRENT`: (optional) Maximum concurrent emails to send (default: 3)
* `API_URL`: (optional) Base URL for the API (default: `http://localhost:3001`)

**Setup Instructions:**

1. **Ensure CRON_SECRET is set in .bashrc** (see "Environment Variables for Cron Jobs" section above)

2. **Add to crontab:**

   ```bash
   sudo crontab -e
   ```

   Add these lines (runs every 10 seconds with sleep offsets):

   ```bash
   * * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   * * * * * sleep 10; . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   * * * * * sleep 20; . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   * * * * * sleep 30; . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   * * * * * sleep 40; . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   * * * * * sleep 50; . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   ```

   Or to customize batch size and concurrency:

   ```bash
   * * * * * . ~/.bashrc && BATCH_SIZE=20 MAX_CONCURRENT=5 /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   * * * * * sleep 10; . ~/.bashrc && BATCH_SIZE=20 MAX_CONCURRENT=5 /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   * * * * * sleep 20; . ~/.bashrc && BATCH_SIZE=20 MAX_CONCURRENT=5 /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   * * * * * sleep 30; . ~/.bashrc && BATCH_SIZE=20 MAX_CONCURRENT=5 /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   * * * * * sleep 40; . ~/.bashrc && BATCH_SIZE=20 MAX_CONCURRENT=5 /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   * * * * * sleep 50; . ~/.bashrc && BATCH_SIZE=20 MAX_CONCURRENT=5 /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
   ```

3. **Test the API endpoint manually:**

   ```bash
   source ~/.bashrc
   curl -X GET https://riben.life/api/cron-jobs/sendmail \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```

**Logging:**

* Cron job logs to: `/var/log/sendmail.log`
* View logs: `tail -f /var/log/sendmail.log`
* View last 100 lines: `tail -n 100 /var/log/sendmail.log`

#### configure aws ses

``` bash
# https://us-west-2.console.aws.amazon.com/ses/home?region=us-west-2#/mail-manager/rule-sets/rs-2jjst7ahp3llup6i4izshjpa/edit
#Amazon SES > Mail Manager > Rule sets > rs-2jjst7ahp3llup6i4izshjpa > Edit rule set

192.154.111.78/32,63.141.238.242/32
```

### Process Notification Queue

Cron Script: `bin/run-process-notification-queue-cron.sh`

Processes the notification queue so LINE, On-Site, push, and email queue items are actually sent. Without this cron, notifications stay "pending" and are never delivered via LINE/On-Site/etc.

API Endpoint: `web/src/app/api/cron-jobs/process-notification-queue/route.ts`

Handles GET requests with Bearer token authentication. Calls `QueueManager.processBatch()` to send pending notifications via each channel adapter.

Crontab Configuration:

* Runs every 2 minutes: `*/2 * * * *` (recommended)

Actual Implementation:

The script calls: `curl -X GET "https://riben.life/api/cron-jobs/process-notification-queue?batchSize=100" -H "Authorization: Bearer ${CRON_SECRET}"`

**Environment Variables:**

* `CRON_SECRET`: (required) Secret token for authenticating cron job requests (should be set in `.bashrc`)
* `BATCH_SIZE`: (optional) Max items per channel batch (default: 100)
* `API_URL`: (optional) Base URL for the API (default: `http://localhost:3001`)

**Setup Instructions:**

1. **Ensure CRON_SECRET is set in .bashrc** (see "Environment Variables for Cron Jobs" section above)

2. **Add to crontab:**

   ```bash
   sudo crontab -e
   ```

   Add this line (runs every 2 minutes):

   ```bash
   */2 * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-process-notification-queue-cron.sh >> /var/log/process-notification-queue.log 2>&1
   ```

3. **Test the API endpoint manually:**

   ```bash
   source ~/.bashrc
   curl -X GET "https://riben.life/api/cron-jobs/process-notification-queue?batchSize=100" \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```

**Logging:**

* Cron job logs to: `/var/log/process-notification-queue.log`
* View logs: `tail -f /var/log/process-notification-queue.log`
* View last 100 lines: `tail -n 100 /var/log/process-notification-queue.log`

**What it does:**

* Fetches pending `NotificationDeliveryStatus` (LINE, On-Site, push, etc.) and unsent `EmailQueue` items
* For each item, calls the channel adapter's `send()` (LINE API, On-Site, push, or adds email to queue)
* Updates delivery status to "sent" or "failed" after each attempt
* Must run before or alongside the Sendmail cron so notifications are processed; Sendmail cron then sends emails via SMTP

**Security:**

* Requires Bearer token authentication using `CRON_SECRET`
* Unauthorized attempts are logged with `tags: ["cron", "notification-queue", "security", "unauthorized"]`

### Cleanup Unpaid RSVPs

Cron Script: `bin/run-cleanup-unpaid-rsvps-cron.sh`

Calls the API endpoint via curl with Bearer token authentication

API Endpoint: `web/src/app/api/cron-jobs/cleanup-unpaid-rsvps/route.ts`

Handles GET requests with Bearer token authentication

**Business Requirement:**
Prevent unpaid RSVPs from blocking time slots for more than 5 minutes. After the time threshold is reached, unpaid RSVPs are automatically deleted to free up the reservation slot.

**Crontab Configuration:**

* Runs every 5 minutes: `*/5 * * * *`

**Actual Implementation:**

The script calls: `curl -H "Authorization: Bearer ${CRON_SECRET}" https://riben.life/api/cron-jobs/cleanup-unpaid-rsvps?ageMinutes=5`

The API route deletes unpaid RSVPs where:

* `alreadyPaid = false`
* `status = RsvpStatus.Pending` or `RsvpStatus.ReadyToConfirm` (both unpaid statuses)
* `confirmedByStore = false` (do not delete RSVPs confirmed by store staff)
* `createdAt` is older than the age threshold (default: 5 minutes)

**How it Works:**

1. Cron job runs every 5 minutes
2. Checks all unpaid RSVPs to find ones older than 5 minutes
3. Deletes only those RSVPs that have been unpaid for ≥ 5 minutes
4. Frees up the reserved time slots so other customers can book them
5. Related StoreOrder records are also deleted as part of the cleanup

**Environment Variables:**

* `CRON_SECRET`: (required) Secret token for authenticating cron job requests (should be set in `.bashrc`)
* `AGE_MINUTES`: (optional) Minimum age in minutes before deleting unpaid RSVPs (default: 5 minutes) - matches business requirement to block slots for max 5 minutes
* `API_URL`: (optional) Base URL for the API (default: `http://localhost:3001`)

**Setup Instructions:**

1. **Ensure CRON_SECRET is set in .bashrc** (see "Environment Variables for Cron Jobs" section above)

2. **Add to crontab:**

   ```bash
   sudo crontab -e
   ```

   Add this line (runs every 5 minutes):

   ```bash
   */5 * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-cleanup-unpaid-rsvps-cron.sh >> /var/log/cleanup-unpaid-rsvps.log 2>&1
   ```

   This enforces the business requirement: unpaid RSVPs block slots for max 5 minutes, then are deleted.

   Or to customize age threshold (e.g., 10 minutes):

   ```bash
   */5 * * * * . ~/.bashrc && AGE_MINUTES=10 /var/www/riben.life/web/bin/run-cleanup-unpaid-rsvps-cron.sh >> /var/log/cleanup-unpaid-rsvps.log 2>&1
   ```

3. **Test the API endpoint manually:**

   ```bash
   source ~/.bashrc
   curl -X GET https://riben.life/api/cron-jobs/cleanup-unpaid-rsvps \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```

**Logging:**

* Cron job logs to: `/var/log/cleanup-unpaid-rsvps.log`
* View logs: `tail -f /var/log/cleanup-unpaid-rsvps.log`
* View last 100 lines: `tail -n 100 /var/log/cleanup-unpaid-rsvps.log`

### RSVP Reminder Notifications

Cron Script: `bin/run-rsvp-reminders-cron.sh`

Calls the API endpoint via curl with Bearer token authentication

API Endpoint: `web/src/app/api/cron-jobs/process-reminders/route.ts`

Handles GET requests with Bearer token authentication

Processes RSVP reminder notifications based on `reminderHours` configuration

Crontab Configuration:

* Runs every 10 minutes: `*/10 * * * *`

Actual Implementation:

The script calls: `curl -X GET http://localhost:3000/api/cron-jobs/process-reminders -H "Authorization: Bearer ${CRON_SECRET}"`

The API route processes due reminders using `ReminderProcessor.processDueReminders()` from `@/lib/notification/reminder-processor`

**Environment Variables:**

* `CRON_SECRET`: (required) Secret token for authenticating cron job requests. Generate using: `openssl rand -hex 32`
* `API_URL`: (optional) Base URL for the API (default: `http://localhost:3000`)

**Setup Instructions:**

1. **Set CRON_SECRET in environment:**

   ```bash
   # Generate a secure random string
   openssl rand -hex 32
   
   # Add to .env file
   CRON_SECRET=generated_secret_here
   ```

2. **Add to crontab:**

   ```bash
   sudo crontab -e
   ```

   Add this line (runs every 10 minutes):

   ```bash
   */10 * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-rsvp-reminders-cron.sh >> /var/log/rsvp-reminders.log 2>&1
   ```

3. **Test the API endpoint manually:**

   ```bash
   source ~/.bashrc
   curl -X GET https://riben.life/api/cron-jobs/process-reminders \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```

**Logging:**

* Cron job logs to: `/var/log/rsvp-reminders.log`
* View logs: `tail -f /var/log/rsvp-reminders.log`
* View last 100 lines: `tail -n 100 /var/log/rsvp-reminders.log`

**What it does:**

* Queries all stores with RSVP enabled
* Finds reservations due for reminders (based on `reminderHours` setting in `RsvpSettings`)
* Sends reminder notifications via enabled channels (email, LINE, SMS, etc.)
* Tracks sent reminders in `RsvpReminderSent` table to prevent duplicates
* Only processes reservations with status `ReadyToConfirm` or `Ready` (excludes `Pending`)

**Security:**

* Requires Bearer token authentication using `CRON_SECRET`
* Unauthorized attempts are logged
* Secret should be a strong random string (minimum 32 characters recommended)

### Notification Delivery Status Sync

Cron Script: `bin/run-sync-delivery-status-cron.sh`

Calls the API endpoint via curl with Bearer token authentication

API Endpoint: `web/src/app/api/cron-jobs/sync-delivery-status/route.ts`

Handles GET requests with Bearer token authentication

Polls all notification channels to sync delivery statuses (sent, delivered, read, failed, etc.)

Crontab Configuration:

* Runs hourly: `0 * * * *`
* Or every 30 minutes: `*/30 * * * *`

Actual Implementation:

The script calls: `curl -X GET https://riben.life/api/cron-jobs/sync-delivery-status -H "Authorization: Bearer ${CRON_SECRET}"`

The API route syncs delivery statuses using `syncDeliveryStatusInternal()` from `@/actions/sysAdmin/notification/sync-delivery-status`

**Environment Variables:**

* `CRON_SECRET`: (required) Secret token for authenticating cron job requests (should be set in `.bashrc`)
* `API_URL`: (optional) Base URL for the API (default: `http://localhost:3001`)

**Setup Instructions:**

1. **Ensure CRON_SECRET is set in .bashrc** (see "Environment Variables for Cron Jobs" section above)

2. **Copy script to system location:**

3. **Add to crontab:**

   ```bash
   sudo crontab -e
   ```

   Add this line (runs every hour):

   ```bash
   0 * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-sync-delivery-status-cron.sh >> /var/log/sync-delivery-status.log 2>&1
   ```

   Or if you prefer every 3 minutes:

   ```bash
   */3 * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-sync-delivery-status-cron.sh >> /var/log/sync-delivery-status.log 2>&1
   ```

4. **Test the API endpoint manually:**

   ```bash
   source ~/.bashrc
   curl -X GET https://riben.life/api/cron-jobs/sync-delivery-status \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```

**Logging:**

* Cron job logs to: `/var/log/sync-delivery-status.log`
* View logs: `tail -f /var/log/sync-delivery-status.log`
* View last 100 lines: `tail -n 100 /var/log/sync-delivery-status.log`

**What it does:**

* Queries all `NotificationDeliveryStatus` records with "pending" or "sent" status
* For each record, calls the appropriate channel adapter's `getDeliveryStatus()` method
* Updates delivery statuses in the database when they change
* Supports email, on-site, LINE, WhatsApp, WeChat, SMS, Telegram, and push notifications
* Only updates records when the status has actually changed

**Security:**

* Requires Bearer token authentication using `CRON_SECRET`
* Unauthorized attempts are logged with `tags: ["cron", "delivery-sync", "security", "unauthorized"]`
* Secret should be the same value as in your `.env` file

**Manual Refresh:**

Administrators can also manually trigger the delivery status sync from the admin dashboard:

* Navigate to: System Admin → Notifications → Message Queue
* Click the "Sync All Status" button
* The UI will show a loading spinner and display the sync results

## Complete Crontab Configuration

Add all five cron jobs to your crontab with the recommended schedule:

```bash
sudo crontab -e
```

Then add these lines:

```bash
# Send emails from queue (every 10 seconds)
* * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
* * * * * sleep 10; . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
* * * * * sleep 20; . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
* * * * * sleep 30; . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
* * * * * sleep 40; . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1
* * * * * sleep 50; . ~/.bashrc && /var/www/riben.life/web/bin/run-sendmail-cron.sh >> /var/log/sendmail.log 2>&1

# Process notification queue - LINE, On-Site, push, email queue (every 2 minutes)
*/2 * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-process-notification-queue-cron.sh >> /var/log/process-notification-queue.log 2>&1

# Cleanup unpaid RSVPs older than 30 minutes (every 5 minutes)
*/5 * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-cleanup-unpaid-rsvps-cron.sh >> /var/log/cleanup-unpaid-rsvps.log 2>&1

# Process RSVP reminder notifications (every 5 minutes)
*/5 * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-rsvp-reminders-cron.sh >> /var/log/rsvp-reminders.log 2>&1

# Sync notification delivery statuses (every hour)
#0 * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-sync-delivery-status-cron.sh >> /var/log/sync-delivery-status.log 2>&1

# Sync notification delivery statuses (every 5 minutes)
*/5 * * * * . ~/.bashrc && /var/www/riben.life/web/bin/run-sync-delivery-status-cron.sh >> /var/log/sync-delivery-status.log 2>&1

# renew cert at 3:01AM everyday
1   3   *   *   *   certbot renew
```

**Recommended Schedule Rationale:**

* **Sendmail (every 10 seconds)**: Near real-time email delivery. Emails are processed in batches of 10 with up to 3 concurrent sends. Uses sleep offsets to distribute load evenly across the minute (0s, 10s, 20s, 30s, 40s, 50s).
* **Process Notification Queue (every 2 minutes)**: Sends pending notifications via LINE, On-Site, push, and processes email queue items. Without this cron, notifications stay "pending" and are never delivered via LINE/On-Site/etc.
* **Cleanup RSVPs (every 5 minutes)**: Cleans up unpaid RSVPs older than 30 minutes to keep the queue clean and free up resources.
* **RSVP Reminders (every 10 minutes)**: Sends reminder notifications with appropriate timing. Prevents duplicate reminders using `RsvpReminderSent` table.
* **Sync Delivery Status (every hour)**: Polls all notification channels to sync delivery statuses. Can be increased to every 30 minutes for more frequent updates.
