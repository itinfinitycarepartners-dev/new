# Nurse Path Hub — ICP Candidate Portal

A React web application for Infinity Care Partners (ICP) nurse candidates to track their deployment journey.

## What's changed from the original

This version replaces the Base44 SDK with a direct connection to the ICP backend (`deploy-3or5.onrender.com`).

### Auth flow (ICP multi-step)
1. **Check Email** → `/api/auth/check-email` — verifies the email exists in Zoho CRM
2. **OTP or Password**
   - First-time: OTP sent by email → `/api/auth/verify-otp` → password setup → `/api/auth/setup-password`
   - Returning: `/api/auth/login-with-password`
3. **Session** — JWT token stored in `localStorage` under `icp_auth_token`

### Data source
All candidate data flows from Zoho CRM via `/api/zoho/my-deals`. The `base44Client.js` is now a **compatibility shim** that maps Zoho CRM fields to the entity shapes the UI expects (CandidateProfile, CandidateDocument, etc.).

### Documents
Documents are fetched directly from Zoho CRM attachment endpoints with the auth token.

## Setup

```bash
npm install
npm run dev
```

### Environment variables

Create a `.env` file:

```
VITE_API_BASE_URL=https://deploy-3or5.onrender.com
```

Change this to point at your own backend if needed.

## Backend

The backend (`server.js`) is the Node.js/Express app that connects to Zoho CRM. Deploy it on Render or any Node.js host. See the `backend/` folder for the full server.

### Backend env vars needed
```
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
ZOHO_REGION=com
BREVO_API_KEY=
EMAIL_FROM=noreply@infinitycarepartners.com
MONGODB_URI=
PORT=4000
```
