import { useCallback, useEffect, useState } from "react";

type Skip = "skip";

let generation = 0;
const listeners = new Set<() => void>();

function bump() {
  generation += 1;
  for (const listener of listeners) {
    listener();
  }
}

async function callApi(op: string, args: unknown): Promise<unknown> {
  const response = await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, args }),
  });
  const payload = (await response.json()) as {
    ok: boolean;
    data?: unknown;
    error?: string;
  };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload.data;
}

export function useQuery<T>(
  op: string,
  args: object | Skip,
): T | undefined | null {
  const [data, setData] = useState<T | undefined | null>(undefined);
  const [rev, setRev] = useState(0);
  const argsKey = args === "skip" ? "skip" : JSON.stringify(args);

  useEffect(() => {
    const onBump = () => setRev(generation);
    listeners.add(onBump);
    return () => {
      listeners.delete(onBump);
    };
  }, []);

  useEffect(() => {
    if (argsKey === "skip") {
      setData(undefined);
      return;
    }
    let cancelled = false;
    const payload = JSON.parse(argsKey) as object;

    async function load() {
      try {
        const result = (await callApi(op, payload)) as T;
        if (!cancelled) setData(result);
      } catch (error) {
        console.error(error);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [op, argsKey, rev]);

  return data;
}

export function useMutation(op: string): (args: object) => Promise<unknown> {
  return useCallback(
    async (args: object) => {
      const result = await callApi(op, args);
      bump();
      return result;
    },
    [op],
  );
}
