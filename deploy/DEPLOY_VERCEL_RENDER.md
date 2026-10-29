# Deploying safarebooks.com with Vercel + Render (domain stays at GoDaddy)

No VPS needed. You will use:

| Part | Service | Address |
|---|---|---|
| Website (React) | **Vercel** | `https://safarebooks.com` |
| Backend (API) | **Render** | `https://api.safarebooks.com` |
| Database | **MongoDB Atlas** | (private) |
| Book files | **Cloudinary** | (you already use it) |
| Emails (OTP) | **Resend** (or Brevo) | (see Part 1B — needed on Render) |
| Payments | **Razorpay** | live keys |
| Domain | **GoDaddy** | only used to edit DNS records |

---

## Part 0 — Read this first: what is free and what is not

I checked each service's current rules. These affect a site that **sells things**:

| Topic | What I found | What to do |
|---|---|---|
| **Vercel free (Hobby) plan** | Vercel's terms limit it to **non-commercial, personal use only**. A store that sells books/subscriptions is commercial, so it needs **Vercel Pro (about $20/month)**. | Use Vercel Pro **or** a host with the same steps (Netlify / Cloudflare Pages — check their current free-plan terms for business use). The project already works with all three. |
| **Render free plan: sleeping** | A free service **goes to sleep after ~15 minutes** without visitors. The next visitor waits up to about a minute. | OK for testing. For real customers use Render **Starter** (about $7/month, always on). |
| **Render free plan: email** | Render **blocks email ports (25/465/587) on free services** (since Sept 2025). Gmail-by-SMTP **will not work**, so OTP signup/login emails would fail. | I added a code option to send email over HTTPS instead (Resend/Brevo). Part 1B explains it. Paid Render plans allow ports 465/587, but the HTTPS option works everywhere. |
| **Render free plan: background jobs** | Your app runs two background jobs (subscription renewal reminders, and re-checking unpaid orders). They only run **while the server is awake**. | Another reason to use **Starter** for the real launch. |
| **Atlas + Render** | Render's outgoing IP addresses change, so Atlas must allow connections from anywhere. | `0.0.0.0/0` in Atlas + a strong database password (Part 1A). |

**My recommendation for a real launch:** Render *Starter* + website on *Vercel Pro* (or Cloudflare Pages/Netlify). For a first test, everything can be free.

---

## Part 1 — Prepare your accounts

### 1A. MongoDB Atlas (database)
1. <https://www.mongodb.com/cloud/atlas> → create a **free M0** cluster (region: Mumbai or Singapore).
2. **Database Access** → add a user with a strong password (letters + numbers only).
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`).
4. **Connect → Drivers** → copy the string and add a database name:  
   `mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/safar_ebooks?retryWrites=true&w=majority`

### 1B. Resend (sends your OTP emails over HTTPS)
1. Sign up at <https://resend.com> → **Domains → Add Domain** → `safarebooks.com`.
2. Resend shows a few DNS records (TXT / MX). Add each one in **GoDaddy → My Products → Domains → safarebooks.com → DNS → Add** exactly as shown, then click **Verify** in Resend (can take a few minutes–hours).
3. **API Keys → Create** → copy the key (starts with `re_`).
4. Your sender address will be `SAFAR EBOOKS <no-reply@safarebooks.com>` (already set in `render.yaml`).

> Prefer Brevo? Set `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY=...` and verify your sender/domain there instead. Everything else is identical.
> Staying on a **paid Render plan** and still want Gmail? Keep `EMAIL_PROVIDER=smtp` with `EMAIL_USER` + `EMAIL_PASS` (Gmail App Password).

### 1C. Cloudinary & Razorpay
- Cloudinary: keep **Cloud name, API key, API secret**.
- Razorpay: activate **Live mode**, create **Live** keys (`rzp_live_…`). Use test keys first if you want to rehearse.

---

## Part 2 — Put the project on GitHub

Vercel and Render both deploy from GitHub.

1. Install Git: <https://git-scm.com/downloads>. Create a free account at <https://github.com> and a **new private repository** (e.g. `safar-ebooks`), empty.
2. In PowerShell inside the project folder (the one containing `client` and `server`):
   ```bash
   git init
   git add .
   git status
   ```
   **Check the list:** `server/.env` must **not** appear (the included `.gitignore` blocks it). If it does, stop and tell me.
   ```bash
   git commit -m "first version"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/safar-ebooks.git
   git push -u origin main
   ```

---

## Part 3 — Move your existing data (optional)

Same as in `DEPLOY_GODADDY.md` → *Part 2*:
- `mongodump` your local database and `mongorestore` into Atlas.
- If any old books still keep their PDF/cover inside `server/uploads`, run once from your computer: `cd server && node scripts/migrateUploadsToCloudinary.js`.  
  **Important on Render:** its disk is erased on every restart/deploy, so old local files would be lost. (All *new* uploads already go straight to Cloudinary.)

Or start fresh and upload your books again from the Admin panel.

---

## Part 4 — Backend on Render

1. <https://render.com> → sign up with GitHub.
2. **New + → Blueprint** → choose your repo. Render reads `render.yaml` and shows the service **safar-ebooks-api**.
3. It asks for the secret values. Fill in:

   | Name | Value |
   |---|---|
   | `MONGODB_URI` | Atlas string from 1A |
   | `EMAIL_USER` | your Gmail / inbox address (used as the admin inbox) |
   | `RESEND_API_KEY` | key from 1B |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Cloudinary |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | from Razorpay |
   | `RAZORPAY_WEBHOOK_SECRET` | make up a long random text; use the same in Part 7 |

   (`JWT_SECRET` is generated automatically. `CORS_ORIGIN`, `EMAIL_PROVIDER`, `EMAIL_FROM` are already in `render.yaml`.)
4. Click **Apply** and wait for the deploy to finish (a few minutes).
5. Test: open `https://YOUR-SERVICE.onrender.com/api/health` — you should see `{"success":true,"status":"ok"}`. If you see an error, open **Logs** in Render and read the last lines (see Troubleshooting).
6. **Connect `api.safarebooks.com`:** Render → your service → **Settings → Custom Domains → Add** → `api.safarebooks.com`. Render shows a **CNAME target** (like `safar-ebooks-api.onrender.com`).  
   In **GoDaddy → DNS → Add record**: **Type** `CNAME`, **Name** `api`, **Value** = that target, **TTL** 600. Back in Render click **Verify**. HTTPS is added automatically.
7. Test again: `https://api.safarebooks.com/api/health`.

> To make the backend always-on later: Render → service → **Settings → Instance Type → Starter**.

---

## Part 5 — Website on Vercel

1. <https://vercel.com> → sign up with GitHub → **Add New → Project** → import your repo.
2. Settings on the import screen:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build` · **Output Directory:** `dist`
   - **Environment Variables:** `VITE_API_URL` = `https://api.safarebooks.com/api`  
     (If `api.safarebooks.com` isn't working yet, temporarily use `https://YOUR-SERVICE.onrender.com/api`.)
3. **Deploy.** When done, open the `*.vercel.app` address and check the home page loads books.
4. **Connect `safarebooks.com`:** Vercel → project → **Settings → Domains → Add** `safarebooks.com` and `www.safarebooks.com`. Vercel shows the exact records. Normally:

   | Type | Name | Value |
   |---|---|---|
   | **A** | `@` | `76.76.21.21` (use the value Vercel shows) |
   | **CNAME** | `www` | the target Vercel shows (e.g. `cname.vercel-dns-0.com`) |

   In **GoDaddy → DNS**: first **delete** the existing "Parked" `A @` record and the old `www` CNAME, then add the two above. Wait for Vercel to show a green tick (minutes to a few hours).
5. **Important:** `VITE_API_URL` is baked in when the site is *built*. If you change it later, go to Vercel → **Deployments → … → Redeploy**.

*(Using Netlify or Cloudflare Pages instead? Same idea: base/root folder `client`, build `npm run build`, publish folder `dist`, the same `VITE_API_URL` variable. The file `client/public/_redirects` already makes page refreshes like `/library` work there.)*

---

## Part 6 — Create your admin account
1. On a **computer**, open `https://safarebooks.com` and register with your admin email (verify the OTP).
2. **Atlas → Browse Collections → `users`** → set that user's `role` to `"admin"`.
3. Log in again **from a computer** (admin login is blocked on phones/tablets).

## Part 7 — Razorpay webhook
Razorpay → **Settings → Webhooks → Add**:
- **URL:** `https://api.safarebooks.com/api/payments/webhook`
- **Secret:** the same text as `RAZORPAY_WEBHOOK_SECRET`
- **Events:** `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`

## Part 8 — (Free Render only) keep it awake
A free monitor such as UptimeRobot can open `https://api.safarebooks.com/api/health` every 5 minutes so the server rarely sleeps. Render doesn't officially support this trick, and it doesn't solve the missing-background-jobs issue — for real customers use **Starter**.

---

## Final checklist
- [ ] `https://safarebooks.com` and `www` load with the padlock
- [ ] Home shows New Arrivals (6 latest), Free Books, VIP Access Books; footer has no contact details
- [ ] Register → **OTP email arrives** → login works
- [ ] A paid book shows **Buy Now**; reading it stops at **20 pages**
- [ ] Small real payment works and unlocks the book (then refund it)
- [ ] Admin works on a laptop, is **refused on a phone**
- [ ] Refreshing `https://safarebooks.com/library` does not give a 404

## Updating the site later
Change code → `git add . && git commit -m "message" && git push`. Vercel and Render redeploy automatically.

## Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| Browser console says **CORS** / "Not allowed by CORS" | `CORS_ORIGIN` in Render must contain the exact website addresses: `https://safarebooks.com,https://www.safarebooks.com` (no path). Edit in Render → Environment, then it redeploys. |
| Site loads but no books; Network tab shows `localhost` or wrong address | `VITE_API_URL` wrong or not applied → fix it in Vercel and **Redeploy**. |
| Everything is very slow on the first visit | Free Render was asleep (cold start). Expected on the free plan. |
| **OTP email not arriving** | Check Render **Logs** for "email API error". Usually the domain isn't verified in Resend yet, or `EMAIL_PROVIDER`/`RESEND_API_KEY`/`EMAIL_FROM` is wrong. |
| Render deploy fails "Missing required environment variable" | A secret is empty in Render → Environment. |
| "MongoDB connection error" | Wrong password in `MONGODB_URI`, or Atlas Network Access doesn't allow `0.0.0.0/0`. |
| 404 when refreshing a page on Vercel | `client/vercel.json` must be in the `client` folder (it is) and Root Directory must be `client`. |
| `api.safarebooks.com` shows a certificate error | DNS still updating — wait, then re-click Verify in Render. |
| Can't upload a book | File is over 10 MB (limit set in the app). |

## Security
- The `.env` in your original zip held real keys. Treat them as exposed and **replace** the Gmail App Password, Cloudinary API secret, JWT secret and Razorpay keys.
- Never commit `server/.env` to GitHub.
- Use a strong admin password — the phone block is a convenience guard, not real security.
