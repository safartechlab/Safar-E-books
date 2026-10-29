# Deploying safarebooks.com (GoDaddy) — step by step

This guide assumes you only have the **domain name** so far. Take it slowly; each step says what to do and why.

---

## Part 0 — Understand the pieces (2 minutes)

| Piece | What it is | Where it will live |
|---|---|---|
| **Domain** `safarebooks.com` | The address people type | GoDaddy (you already bought it) |
| **Server (VPS)** | A computer that is always on and runs your website | **GoDaddy VPS** (you still need to buy this) |
| **Database** | Stores users, books, purchases | **MongoDB Atlas** (free tier) |
| **Files** | Book covers and PDFs | **Cloudinary** (you already use it) |
| **Payments** | Razorpay | Razorpay (switch to *live* keys) |
| **Emails** (OTP etc.) | Gmail | Gmail "App Password" |

A domain alone cannot run this project. It must point to a server.

### ⚠️ Which GoDaddy product to buy — important

GoDaddy sells several things. For THIS project:

| GoDaddy product | Works? | Why |
|---|---|---|
| **VPS Hosting** (Linux) | ✅ **Yes — buy this** | You get a full server: Node.js, MongoDB connection, and Gmail emails all work. |
| Web Hosting / cPanel ("Economy", "Deluxe"…) | ❌ No | Built for PHP/WordPress, not for a Node.js + MongoDB app. |
| **Node.js Hosting** (new, launched Aug 2026) | ❌ No | GoDaddy's published rules say apps there can only connect out on ports 80/443 and to GoDaddy's own **MySQL** database. Your project uses **MongoDB** and **Gmail email**, which are blocked there. Using it would mean rewriting the whole database layer. |
| Website Builder | ❌ No | Not for custom code. |

> These rules are what GoDaddy published in August 2026. Before paying, double-check on GoDaddy's VPS page (or ask their chat) that you get **root/SSH access** and can choose **Ubuntu** (or any Linux) **without cPanel**.
>
> Suggested size: **2 GB RAM, 1–2 vCPU** is plenty to start.

---

## Part 1 — Accounts you need to prepare (do these first)

### 1A. MongoDB Atlas (database)
1. Go to <https://www.mongodb.com/cloud/atlas> → sign up → create a **free (M0)** cluster. Choose a region close to your VPS / India (e.g. Mumbai).
2. **Database Access** → *Add New Database User* → username + a strong password (use letters and numbers only to avoid URL problems). Save them.
3. **Network Access** → *Add IP Address* → for now choose **Allow access from anywhere** (`0.0.0.0/0`). After the VPS is running, replace it with just the VPS IP.
4. **Connect → Drivers** → copy the connection string. It looks like  
   `mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`  
   Put your database name before the `?`:  
   `mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/safar_ebooks?retryWrites=true&w=majority`

### 1B. Gmail App Password (for OTP emails)
Google Account → Security → turn on **2-Step Verification** → search **App passwords** → create one → copy the 16 letters. This is `EMAIL_PASS`. `EMAIL_USER` is the Gmail address.

### 1C. Cloudinary
You already have this. Keep these three values from the dashboard: **Cloud name, API key, API secret**.

### 1D. Razorpay
- Finish KYC / activate your account so **Live mode** works.
- Settings → API Keys → generate **Live** keys (`rzp_live_…`).
- Later (Part 6) you will add the webhook.

---

## Part 2 — Prepare the project on YOUR computer

You need **Node.js 20 or 22 (LTS)** installed on your computer: <https://nodejs.org>.

Open a terminal (PowerShell) inside the project folder:

```bash
cd client
npm install
npm run build        # creates client/dist  (the finished website)
cd ..
```

Check that the folder `client/dist` now exists and contains `index.html`.

**Move your existing data (optional but recommended).** If you already added books/users on your computer and want to keep them:
1. Install *MongoDB Database Tools*: <https://www.mongodb.com/try/download/database-tools>
2. Export your local database and import it into Atlas (replace the Atlas URL with yours):
   ```bash
   mongodump --uri="mongodb://127.0.0.1:27017/YOUR_LOCAL_DB_NAME" --out=backup
   mongorestore --uri="mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net" --nsFrom="YOUR_LOCAL_DB_NAME.*" --nsTo="safar_ebooks.*" backup
   ```
3. Some of your older books may still have their PDFs/covers saved **inside the project folder** (`server/uploads`). Move them to Cloudinary **once**, from your computer, with your Cloudinary keys in `server/.env`:
   ```bash
   cd server
   node scripts/migrateUploadsToCloudinary.js
   ```
   (If you prefer a fresh start, skip this whole step and just upload your books again from the Admin panel.)

---

## Part 3 — Buy and open the VPS

1. In GoDaddy: buy **VPS Hosting → Linux**, choose **Ubuntu** (22.04 or 24.04) and **no control panel** if asked.
2. When it is ready, open *My Products → VPS → Manage*. Note the **IP address** (like `203.0.113.10`) and the **root password / SSH details**.
3. **Point the domain to the VPS.** GoDaddy → *My Products → Domains → safarebooks.com → DNS*:
   - Edit/create an **A** record: **Name** `@` → **Value** = your VPS IP → TTL 600 sec  
   - Edit/create an **A** record: **Name** `www` → **Value** = your VPS IP  
   - Delete any old "Parked" / "Website Builder" A or CNAME records for `@` and `www`.  
   It can take from a few minutes to a few hours to start working.
4. Connect to the server. On Windows open **PowerShell**:
   ```bash
   ssh root@YOUR_VPS_IP
   ```
   (type `yes` once, then the password).

---

## Part 4 — Set up the server (copy & paste, one block at a time)

```bash
# 1. Update the system
apt update && apt upgrade -y

# 2. Install Node.js 22, Nginx (front door), Certbot (free HTTPS), Git, unzip
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx unzip

# 3. Install PM2 (keeps the app running forever)
npm install -g pm2

# 4. Firewall: allow only SSH + web
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 5. Folder for the website
mkdir -p /var/www/safarebooks
```

### Upload the project
On **your computer** (PowerShell, in the folder that CONTAINS `ebook_platform`), zip it **without** `node_modules`, or simply use WinSCP/FileZilla (SFTP, same IP/user/password as SSH) to copy these into `/var/www/safarebooks/`:

- `client/dist/`  ← the built website (**required**)
- `server/` (everything **except** `node_modules`)
- `deploy/`
- `package.json`

Easiest with a zip:
```bash
# on your computer, from the folder where ebook_platform lives
scp ebook_platform.zip root@YOUR_VPS_IP:/var/www/safarebooks/
```
Then on the server:
```bash
cd /var/www/safarebooks
unzip ebook_platform.zip
# if everything landed inside a folder called ebook_platform, move it up:
# mv ebook_platform/* ebook_platform/.[!.]* . 2>/dev/null; rmdir ebook_platform
ls          # you should see: client  deploy  server  package.json
ls client/dist   # must show index.html and an assets folder
```

### Create the secret settings file
```bash
cd /var/www/safarebooks/server
cp .env.example .env
nano .env
```
Fill in every value (see comments inside). The important ones for the live site:

```
PORT=5000
NODE_ENV=production
SERVE_CLIENT=true
CORS_ORIGIN=https://safarebooks.com,https://www.safarebooks.com
MONGODB_URI=<Atlas string from 1A>
JWT_SECRET=<long random string>
EMAIL_USER=<gmail address>
EMAIL_PASS=<16-letter app password>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=<you choose this text in Part 6>
```
Make a JWT secret on the server with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Save in nano: `Ctrl+O`, Enter, `Ctrl+X`. Then lock the file: `chmod 600 .env`

### Install and start
```bash
cd /var/www/safarebooks/server
npm ci --omit=dev          # (use "npm install --omit=dev" if there is no package-lock.json)
cd /var/www/safarebooks
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup                # run the command it prints, then: pm2 save
pm2 logs safar-ebooks --lines 30
```
You should see "MongoDB Connected Successfully" and "Server running on port 5000". Test locally on the server:
```bash
curl http://127.0.0.1:5000/api/health      # -> {"success":true,"status":"ok"}
```

### Connect Nginx and turn on HTTPS
```bash
cp /var/www/safarebooks/deploy/nginx-safarebooks.conf /etc/nginx/sites-available/safarebooks
ln -s /etc/nginx/sites-available/safarebooks /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```
Now open `http://safarebooks.com` — you should see the website. (If not, DNS is probably still updating.) Then turn on HTTPS:
```bash
certbot --nginx -d safarebooks.com -d www.safarebooks.com
```
Answer the questions (email, agree, **redirect HTTP to HTTPS = yes**). The certificate renews automatically.

---

## Part 5 — Make your admin account

Because the first account is a normal user:
1. On a **computer**, open <https://safarebooks.com> and **register** with the email you want to be admin; verify the OTP email.
2. In **MongoDB Atlas → Browse Collections → `users`**, find that user and change `role` from `"user"` to `"admin"`.
3. Log in again **from a computer** (admin login is blocked on phones/tablets) and open the admin panel.

---

## Part 6 — Razorpay webhook (so payments are never lost)

Razorpay Dashboard → **Settings → Webhooks → Add**:
- **URL:** `https://safarebooks.com/api/payments/webhook`
- **Secret:** the same text you put in `RAZORPAY_WEBHOOK_SECRET`
- **Events:** tick `payment.captured`, `payment.failed`, `order.paid` and `refund.processed` (the app handles these four)

Then on the server: `pm2 restart safar-ebooks`.

---

## Part 7 — Final checklist (open the live site)

- [ ] Home page loads on `https://` (padlock shown) — also `www.`
- [ ] Footer has **no** email / phone / address
- [ ] Home page: New Arrivals (6 latest), **Free Books**, **VIP Access Books**
- [ ] Logged out: **no category chips**. Logged in on phone: chips show
- [ ] Sign up → OTP email arrives → login works
- [ ] A **paid** book shows **Buy Now** in Library; opening it shows only a **20-page preview**
- [ ] Make a real small payment (₹1 book/plan) → book unlocks → refund it from Razorpay
- [ ] Admin login works on laptop, is **refused on a phone**
- [ ] Open the site on your phone: all pages fit the screen

---

## Updating the site later

```bash
# on your computer: change code, then
cd client && npm run build
# upload the new client/dist (and any changed server files) to /var/www/safarebooks
# on the server:
pm2 restart safar-ebooks
```

## Backups & safety
- **Atlas free tier has no automatic backups.** Run `mongodump` regularly, or upgrade the Atlas plan.
- **Never share `server/.env`.** The project zip you originally sent contained a `.env` with real keys. Treat those as exposed: **change** the Gmail App Password, Cloudinary API secret, JWT secret and Razorpay keys, and use the new values in the server `.env`.
- Once the VPS works, restrict Atlas **Network Access** to the VPS IP only.
- Use a strong, unique admin password (the phone block is a convenience guard, not a replacement for it).

## Troubleshooting

| Problem | What to do |
|---|---|
| Site shows Nginx welcome page | `rm /etc/nginx/sites-enabled/default && systemctl reload nginx` |
| **502 Bad Gateway** | App is not running: `pm2 status`, then `pm2 logs safar-ebooks` |
| App exits at start: "Missing required environment variable" | A value is empty in `server/.env` |
| "MongoDB connection error" | Wrong password in `MONGODB_URI`, or the VPS IP isn't allowed in Atlas Network Access |
| Blank white page | `client/dist` missing → rebuild and upload it; check `SERVE_CLIENT=true` |
| OTP emails not arriving | Test: `openssl s_client -connect smtp.gmail.com:465 </dev/null` — if it can't connect, the server blocks outbound mail; contact GoDaddy support or use a transactional email service |
| Domain doesn't open | DNS not updated yet (wait) or A records wrong: `nslookup safarebooks.com` should show your VPS IP |
| Can't upload a book | File over 10 MB (limit set in the app) |
