# Event Board

Event Board is a shared ticket tracker for product and engineering teams. Every ticket has **one authoritative status**, a team, optional sprint or backlog placement, an assignee, planned/actual dates, and an append-only history of status and sprint events.

Data lives in **Google Sheets**. The UI is Vite + React. There is no Convex or separate database in production.

---

## What you can do

| Area | What it does |
| --- | --- |
| Identity | Join with a display name (no email/password). Changes are attributed to that name. Switch person from the sidebar. |
| Home (All teams) | After login you land on **Your board is here**. All tickets from every team in one list (board or sheet). Pagination of 20 per page. |
| Team workspace | Pick a team in the sidebar. Sprint tickets sit above backlog. Board, Sheet, and **Report** tabs. |
| Add menu | **New ticket**, **New team**, and (on a team) **New sprint**. |
| Tickets | Create, edit, duplicate, delete. Change status from a dropdown with legal transitions only. Mark **Completed**. |
| Sprints | Create a sprint with start/end dates; optionally make it the active sprint. Move a ticket into a sprint or back to backlog while editing. |
| Report | Team-only sprint report: health, work-item counts, blocked, scope changes, and a Date / Event / Work item log. |
| Filters | Search by title or ticket ID. Filter by assignee, status, team (home only), sprint vs backlog (team only). |
| Demo data | Empty board can **Load demo data**: 6 tickets per status (48 tickets), dummy assignees, Sprint 14 per team. |

---

## Identity

- First visit: enter a **display name** and **Enter the board**. There is no password.
- The name is stored in the `users` sheet and in the browser (`localStorage`).
- There is no authentication provider. Anyone who knows the app URL can join as any name.
- **Switch person** signs out of that display name.

Assignee dropdowns do **not** list the person who logged in. They always offer these five dummy people:

- Priya Shah
- Jordan Hale
- Mina Cho
- Alex Rivera
- Sam Okonkwo

---

## Navigation

```
/                  Home — Your board is here (all teams, all tickets)
/t/:teamId         Team workspace (sprint + backlog, Report tab)
/sprint/:sprintId  Standalone sprint report
/?ticket=:id       Ticket drawer open on top of the current page
```

**Sidebar**

- Event Board branding
- **All teams** → home
- **Teams** list (Product, Engineering, Design, Data, Growth by default) plus **+** to add a team
- Signed-in name and Switch person

**Add** (top right)

- New ticket
- New team
- New sprint (only when a team is selected)

---

## Ticket pipeline (all cases)

### Main line

| Status | Meaning |
| --- | --- |
| **New** | Raised, not yet looked at |
| **Under Review / PRD** | Being scoped; PRD being written |
| **Groomed** | PRD done, ready for a sprint |
| **In Progress** | Actively being built |
| **Testing** | Dev complete, in QA |
| **Done** | Testing passed / shipped |

### Side statuses

| Status | Meaning |
| --- | --- |
| **Blocked** | Stalled on a dependency (from Review, Groomed, In Progress, or Testing) |
| **Rejected** | Will not be done (from any status). Re-open only by moving back to **New**. |

You cannot jump to Blocked from New or Done. From Blocked you resume to Review / Groomed / In Progress / Testing / Rejected — not New or Done in one step.

Moving to **Done** also sets **Completed**. Toggling Completed on a sprint ticket writes a `marked_complete` event.

Each status change appends a row to **status history** (who, when, from → to, optional note). The ticket drawer shows a **lifecycle** bar built from that history.

---

## Tickets

**Create**

- Title and description (required)
- Team (required)
- Assignee (optional, dummy roster)
- Sprint or **Backlog — not in a sprint**
- Initial status

Tickets get a sequential key: `TKT-0001`, `TKT-0002`, …

**Edit (drawer)**

- Title, description, assignee, sprint vs backlog
- Planned / actual dates: dev start/end, testing start/end
- Completed checkbox
- Status dropdown
- **Save ticket**
- Duplicate, delete

**Sheet view row menu**

- Edit (opens drawer)
- Duplicate
- Delete

**Board view**

- One column per status (including Blocked and Rejected)
- Card shows key, title, assignee initials

---

## Home vs team workspace

### Your board is here (all teams)

- Single **All tickets** list — no sprint/backlog split
- Board or Sheet
- Filter by search, assignee, status, team
- 20 tickets per page (Previous / Next)
- No Report tab

### Team workspace

- Header is the team name
- **Board / Sheet / Report**
- **Sprint** section: tickets in the active sprint(s)
- **Backlog** section: tickets with no sprint
- Filter includes sprint vs backlog (Sprint + backlog / Sprint only / Backlog only)
- New sprint from Add

---

## Sprints

- Name, start date, end date
- **Make this the active sprint** demotes the previous active sprint for that team to planning
- Tickets can be added or removed from a sprint in the ticket editor
- Adding/removing logs sprint events
- Clicking an active sprint chip can open the standalone report route

---

## Report

Available only when a **team** is selected (or via `/sprint/:sprintId`).

**Dashboard cards**

- Sprint health: On track / Watch / At risk
- Work items: total, completed, in progress
- Blocked count
- Scope changes: added during sprint / removed
- Progress bar (% complete)

**Event log columns:** Date, Event, Work item (no Completed/Scope columns)

**Event types**

| Event | When |
| --- | --- |
| Sprint started | Sprint created as active |
| Work item created | Ticket created while sprint already running |
| Added to sprint | Ticket moved onto the sprint |
| Removed from sprint | Ticket moved to backlog or another sprint |
| Status changed | Pipeline status change |
| Moved to Blocked | Status → Blocked |
| Assignee changed | Assignee updated |
| Description updated | Description saved |
| Due date changed | Planned testing end changed |
| Work item completed | Completed checked or moved to Done |

The report page scrolls through the full table (including the last rows).

---

## Demo data

On an empty board, **Load demo data** (or `seed.loadDemo` via API) writes:

- Default teams if missing
- An active **Sprint 14** (2026-09-01 → 2026-09-12) per team if missing
- Dummy assignees
- **6 tickets for each status** (New, Under Review / PRD, Groomed, In Progress, Testing, Done, Blocked, Rejected) → 48 tickets
- Mix of sprint vs backlog; titles are skipped if they already exist

Default teams: Product, Engineering, Design, Data, Growth.

---

## Google Sheets database

Share the spreadsheet with the **service account email as Editor**. Enable the **Google Sheets API**.

The app creates these tabs if they are missing:

| Tab | Contents |
| --- | --- |
| `users` | Display names |
| `teams` | Name, slug, color |
| `sprints` | Team, dates, status (planning / active / completed) |
| `tickets` | Fields listed below |
| `sprintEvents` | Sprint activity log |
| `statusHistory` | Per-ticket status audit |
| `counters` | Ticket key sequence |

**Ticket fields:** `_id`, `ticketKey`, `title`, `description`, `teamId`, `assigneeId`, `status`, `blockedFromStatus`, `sprintId`, `muted`, `completed`, `statusChangedAt`, planned/actual date columns, `createdAt`, `createdBy`.

Reads are batched and cached in memory (~45s) so the Google read quota is not exhausted. Writes update the cache immediately. Do not put the private key in `VITE_*` variables — it stays on the server.

---

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Fill in:

```
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n....\n-----END PRIVATE KEY-----\n"
```

Optional: `GOOGLE_SERVICE_ACCOUNT_JSON` instead of email + key.

3. Share the sheet with the service account (**Editor**).
4. Install and start:

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Join with a display name.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite + `/api` Sheets backend |
| `npm run build` | Typecheck, client build, bundle `dist-server` |
| `npm start` | Production: Node serves `dist` + `/api` (`PORT`) |
| `npm run typecheck` | `tsc -b --noEmit` |

---

## Deploy on Render

1. Repo: this GitHub project, branch `main`.
2. **Web Service**, Node, root directory empty.
3. **Build:** `npm install && npm run build`
4. **Start:** `npm start`
5. Environment:

```
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
NODE_VERSION=22
```

Keep `GOOGLE_PRIVATE_KEY` as one line with `\n` (quotes are fine). Render sets `PORT`. Prefer **Node 22** (`NODE_VERSION=22`); Node 26 is not required.

6. Share the same spreadsheet with the service account as Editor.

`render.yaml` in the repo matches this setup.

---

## Stack

- React 19, React Router, Tailwind CSS 4, Vite 7
- Node server (`server/`) calling the Google Sheets API (`googleapis`)
- Production bundle: `esbuild` → `dist-server/index.js`
