import { google, type sheets_v4 } from "googleapis";

export type Row = Record<string, string>;

const TABLES = [
  "users",
  "teams",
  "sprints",
  "tickets",
  "sprintEvents",
  "statusHistory",
  "counters",
] as const;

export type TableName = (typeof TABLES)[number];

const HEADERS: Record<TableName, string[]> = {
  users: ["_id", "name", "normalizedName", "createdAt"],
  teams: ["_id", "name", "slug", "color", "createdAt"],
  sprints: ["_id", "teamId", "name", "startDate", "endDate", "status", "createdAt"],
  tickets: [
    "_id",
    "ticketKey",
    "title",
    "description",
    "teamId",
    "assigneeId",
    "status",
    "blockedFromStatus",
    "sprintId",
    "muted",
    "completed",
    "statusChangedAt",
    "plannedDevStart",
    "plannedDevEnd",
    "plannedTestingStart",
    "plannedTestingEnd",
    "actualDevStart",
    "actualDevEnd",
    "actualTestingStart",
    "actualTestingEnd",
    "createdAt",
    "createdBy",
  ],
  sprintEvents: [
    "_id",
    "sprintId",
    "eventType",
    "ticketId",
    "actorId",
    "timestamp",
    "description",
    "oldValue",
    "newValue",
  ],
  statusHistory: [
    "_id",
    "ticketId",
    "fromStatus",
    "toStatus",
    "changedBy",
    "timestamp",
    "note",
  ],
  counters: ["_id", "name", "value"],
};

const CACHE_TTL_MS = 45_000;

function credentials() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json && json.trim().length > 0) {
    return JSON.parse(json) as { client_email: string; private_key: string };
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const raw = process.env.GOOGLE_PRIVATE_KEY?.trim() ?? "";
  const key = raw.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "Set GOOGLE_SHEETS_ID plus GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env",
    );
  }
  return { client_email: email, private_key: key };
}

function spreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ID ?? process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error("Set GOOGLE_SHEETS_ID in .env");
  }
  return id;
}

let client: sheets_v4.Sheets | null = null;

function sheetsClient(): sheets_v4.Sheets {
  if (client) return client;
  const creds = credentials();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  client = google.sheets({ version: "v4", auth });
  return client;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /quota exceeded|rate.?limit|429/i.test(message);
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!isQuotaError(error) || attempt === 5) throw error;
      await sleep(Math.min(32_000, 1000 * 2 ** attempt));
    }
  }
  throw last;
}

let cache: Record<TableName, Row[]> | null = null;
let cacheAt = 0;
let ensured = false;
let loadInFlight: Promise<Record<TableName, Row[]>> | null = null;

export function configured(): boolean {
  try {
    spreadsheetId();
    credentials();
    return true;
  } catch {
    return false;
  }
}

function rowsFromValues(table: TableName, values: string[][] | undefined): Row[] {
  const header = HEADERS[table];
  return (values ?? []).slice(1).map((row) => {
    const record: Row = {};
    for (let i = 0; i < header.length; i += 1) {
      const key = header[i];
      if (key) record[key] = String(row[i] ?? "");
    }
    return record;
  });
}

export async function ensureSheets(): Promise<void> {
  if (ensured) return;
  const sheets = sheetsClient();
  const id = spreadsheetId();
  const meta = await withRetry(() => sheets.spreadsheets.get({ spreadsheetId: id }));
  const existing = new Set(
    (meta.data.sheets ?? []).map((sheet) => sheet.properties?.title ?? ""),
  );
  const requests: sheets_v4.Schema$Request[] = [];
  for (const table of TABLES) {
    if (!existing.has(table)) {
      requests.push({ addSheet: { properties: { title: table } } });
    }
  }
  if (requests.length > 0) {
    await withRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: id,
        requestBody: { requests },
      }),
    );
  }
  const headers = await withRetry(() =>
    sheets.spreadsheets.values.batchGet({
      spreadsheetId: id,
      ranges: TABLES.map((table) => `${table}!1:1`),
    }),
  );
  const headerData: sheets_v4.Schema$ValueRange[] = [];
  TABLES.forEach((table, index) => {
    const row = headers.data.valueRanges?.[index]?.values?.[0] ?? [];
    if (row.length === 0) {
      headerData.push({ range: `${table}!A1`, values: [HEADERS[table]] });
    }
  });
  if (headerData.length > 0) {
    await withRetry(() =>
      sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: id,
        requestBody: { valueInputOption: "RAW", data: headerData },
      }),
    );
  }
  ensured = true;
}

async function fetchAll(): Promise<Record<TableName, Row[]>> {
  const sheets = sheetsClient();
  const id = spreadsheetId();
  await ensureSheets();
  const response = await withRetry(() =>
    sheets.spreadsheets.values.batchGet({
      spreadsheetId: id,
      ranges: TABLES.map((table) => `${table}!A:ZZ`),
    }),
  );
  const result = {
    users: [] as Row[],
    teams: [] as Row[],
    sprints: [] as Row[],
    tickets: [] as Row[],
    sprintEvents: [] as Row[],
    statusHistory: [] as Row[],
    counters: [] as Row[],
  };
  TABLES.forEach((table, index) => {
    result[table] = rowsFromValues(table, response.data.valueRanges?.[index]?.values);
  });
  cache = result;
  cacheAt = Date.now();
  return result;
}

export async function loadAll(): Promise<Record<TableName, Row[]>> {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) {
    return cache;
  }
  if (loadInFlight) return loadInFlight;
  loadInFlight = fetchAll().finally(() => {
    loadInFlight = null;
  });
  return loadInFlight;
}

export async function writeTables(updates: Partial<Record<TableName, Row[]>>): Promise<void> {
  const tables = Object.keys(updates) as TableName[];
  if (tables.length === 0) return;
  const sheets = sheetsClient();
  const id = spreadsheetId();
  await ensureSheets();
  await withRetry(() =>
    sheets.spreadsheets.values.batchClear({
      spreadsheetId: id,
      requestBody: { ranges: tables.map((table) => `${table}!A:ZZ`) },
    }),
  );
  await withRetry(() =>
    sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        valueInputOption: "RAW",
        data: tables.map((table) => {
          const header = HEADERS[table];
          const rows = updates[table] ?? [];
          return {
            range: `${table}!A1`,
            values: [header, ...rows.map((row) => header.map((key) => row[key] ?? ""))],
          };
        }),
      },
    }),
  );
  if (!cache) {
    cache = {
      users: [],
      teams: [],
      sprints: [],
      tickets: [],
      sprintEvents: [],
      statusHistory: [],
      counters: [],
    };
  }
  for (const table of tables) {
    cache[table] = updates[table] ?? [];
  }
  cacheAt = Date.now();
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
