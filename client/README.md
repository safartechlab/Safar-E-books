# BookVerse — Client

React + Vite frontend for the BookVerse ebook platform: browse and read books,
buy individual titles or subscribe for unlimited access, track reading
history and wishlist, leave reviews, and (for admins) manage the catalog,
users, banners, and contact messages.

## Getting started

```bash
npm install
cp .env.example .env   # then set VITE_API_URL to your backend's URL
npm run dev
```

The app expects the [`server`](../server) API to be running separately —
see that folder's own setup instructions.

## Available scripts

- `npm run dev` — start the Vite dev server with hot reload
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint

## Tech stack

React, Vite, React Router, Axios, React-Bootstrap, React-PDF (in-app book
reader), Recharts (admin dashboard), Razorpay Checkout (payments).