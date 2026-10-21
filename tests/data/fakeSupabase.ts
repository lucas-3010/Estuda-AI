import { vi } from "vitest";

type Result = { data: unknown; error: unknown };

/**
 * Cliente Supabase falso: grava cada chamada encadeada e devolve, por tabela e
 * operação, o resultado configurado em `responses`.
 */
export function fakeSupabase(responses: Record<string, Result | Result[]> = {}) {
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  const counters: Record<string, number> = {};

  function next(key: string): Result {
    const r = responses[key];
    if (Array.isArray(r)) {
      const i = counters[key] ?? 0;
      counters[key] = i + 1;
      return r[Math.min(i, r.length - 1)];
    }
    return r ?? { data: null, error: null };
  }

  function builder(table: string) {
    let op = "select";
    const b: Record<string, unknown> = {};
    const chain = (name: string) =>
      vi.fn((...args: unknown[]) => {
        if (["insert", "update", "delete", "upsert"].includes(name)) op = name;
        if (name === "select" && op !== "select") {
          // select depois de insert/update devolve as linhas gravadas
        } else if (name === "select") op = "select";
        calls.push({ table, op: name, args });
        return b;
      });
    for (const name of ["select", "insert", "update", "delete", "upsert", "eq", "in", "or", "ilike", "lte", "order", "limit"]) {
      b[name] = chain(name);
    }
    const resolve = () => Promise.resolve(next(`${table}.${op}`));
    b.single = vi.fn(resolve);
    b.maybeSingle = vi.fn(resolve);
    b.then = (onFulfilled: (r: Result) => unknown, onRejected?: (e: unknown) => unknown) =>
      resolve().then(onFulfilled, onRejected);
    return b;
  }

  const client = {
    from: vi.fn((table: string) => builder(table)),
    rpc: vi.fn((fn: string, args: unknown) => {
      calls.push({ table: `rpc:${fn}`, op: "rpc", args: [args] });
      return Promise.resolve(next(`rpc.${fn}`));
    }),
    auth: { getClaims: vi.fn(async () => ({ data: { claims: { sub: "user-1" } }, error: null })) },
  };
  return { client, calls };
}
