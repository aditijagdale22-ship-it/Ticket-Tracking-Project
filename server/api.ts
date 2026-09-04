import { configured } from "./db";
import { dispatch } from "./domain";

let queue: Promise<unknown> = Promise.resolve();

function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function healthPayload(): { ok: boolean } {
  return { ok: configured() };
}

export async function runOp(
  op: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (!configured()) {
    throw Object.assign(
      new Error(
        "Google Sheets is not configured. Add GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY.",
      ),
      { status: 503 },
    );
  }
  return exclusive(() => dispatch(op, args));
}

export type ApiResult = { status: number; body: string };

export async function handleJsonApi(
  method: string,
  pathname: string,
  rawBody: string,
): Promise<ApiResult> {
  if (pathname === "/api/health" && method === "GET") {
    return { status: 200, body: JSON.stringify(healthPayload()) };
  }
  if (pathname !== "/api") {
    return { status: 404, body: JSON.stringify({ ok: false, error: "Not found" }) };
  }
  if (method !== "POST") {
    return { status: 405, body: JSON.stringify({ ok: false, error: "POST only" }) };
  }
  try {
    const body = JSON.parse(rawBody || "{}") as {
      op?: string;
      args?: Record<string, unknown>;
    };
    const data = await runOp(body.op ?? "", body.args ?? {});
    return { status: 200, body: JSON.stringify({ ok: true, data }) };
  } catch (error) {
    const status =
      error instanceof Error &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 400;
    return {
      status,
      body: JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Request failed",
      }),
    };
  }
}
