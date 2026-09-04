# Event Board

Team ticket tracker backed by Google Sheets.

## Local development

1. Copy `.env.example` to `.env.local` and fill in the Sheets credentials.
2. Share the spreadsheet with the service account email (**Editor**).
3. Run:

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Enter a display name to join.

## Deploy on Render

1. Push this repo to GitHub.
2. In Render, create a **Web Service** from the repo (or use `render.yaml`).
3. Set:
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
   - Environment: `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (same values as `.env.local`; keep the private key in one quoted line with `\n`).
4. Share the Google Sheet with the service account as Editor.

Render injects `PORT`; the production server serves the Vite build and `/api`.
