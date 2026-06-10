interface Entry<T> { data: T; ts: number; }

const store = new Map<string, Entry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export const FOREVER = Number.MAX_SAFE_INTEGER;

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 60_000,
): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data as T;

  const fly = inFlight.get(key);
  if (fly) return fly as Promise<T>;

  const p = fetcher()
    .then((data) => { store.set(key, { data, ts: Date.now() }); inFlight.delete(key); return data; })
    .catch((err) => { inFlight.delete(key); throw err; });

  inFlight.set(key, p);
  return p;
}

export function invalidate(key: string): void {
  store.delete(key);
}
