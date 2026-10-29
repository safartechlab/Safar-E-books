# BookVerse — Server

Express + MongoDB API for the BookVerse ebook platform: auth (with email
OTP verification), book catalog, subscriptions and one-time purchases via
Razorpay, PDF delivery with preview limits, reviews, wishlist, reading
history, admin dashboard analytics, and contact form handling.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your own MongoDB URI, JWT secret, email and Razorpay credentials
npm run dev
```

The API listens on the port set in `.env` (defaults to `5000`). See
`.env.example` for every required environment variable and what each one
is for.

## Available scripts

- `npm run dev` — start the server with nodemon (auto-restarts on change)
- `npm start` — start the server normally (production)

## Tech stack

Express, Mongoose (MongoDB), JWT auth, bcrypt, Nodemailer (OTP/notification
emails), Multer (file uploads), Razorpay (payments), pdf-lib (server-side
PDF preview enforcement), Helmet, express-rate-limit.

## Project layout

- `controllers/` — request handlers, grouped by feature
- `routes/` — Express route definitions, wiring controllers to endpoints
- `models/` — Mongoose schemas
- `middleware/` — auth, rate limiting, file upload handling
- `config/` — DB connection, email transporter, subscription plan definitions
- `scripts/` — standalone jobs: `renewalReminderJob.js` (subscription-ending
  reminder emails) and `reconcilePendingOrders.js` (polls Razorpay for
  orders that never got marked "paid" — a backstop for when the webhook
  isn't reachable yet, or in case a webhook delivery is ever missed)

## Payments: webhook vs reconciliation

Razorpay's webhook needs a public HTTPS URL, so it can't be configured
until this API has a real domain (or a tunnel, for testing — see
`RAZORPAY_WEBHOOK_SECRET` in `.env.example`). Until then, and as a safety
net afterward, `reconcilePendingOrders.js` checks Razorpay directly for
any order still stuck "pending" and grants access if the payment actually
went through. Once you have a domain, add the webhook in the Razorpay
dashboard (Settings → Webhooks) pointing at `/api/payments/webhook`, with
`payment.captured` and `order.paid` enabled, and put that secret in
`RAZORPAY_WEBHOOK_SECRET`.