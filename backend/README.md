# Backend

This folder contains the Node.js/Express backend that connects to Zoho CRM.

## Files
- `server.js` — Full backend (see reference `server.js` provided separately or the deployed instance at `deploy-3or5.onrender.com`)
- `mongodb.js` — Mongoose models
- `package.json` — Dependencies
- `.env.example` — Required environment variables

## Deploy to Render

1. Create a new Web Service on render.com
2. Connect your GitHub repo
3. Set **Build Command**: `cd backend && npm install`
4. Set **Start Command**: `cd backend && npm start`
5. Add environment variables from `.env.example`

## The frontend connects to this backend via `VITE_API_BASE_URL`

Set in the frontend `.env`:
```
VITE_API_BASE_URL=https://your-backend.onrender.com
```

If using the existing deployed backend, keep:
```
VITE_API_BASE_URL=https://deploy-3or5.onrender.com
```
