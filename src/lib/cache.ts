/**
 * Tiny in-process LRU. Lives for the life of the Fly machine
 * (min_machines_running = 1), so it survives between requests.
 * Used to memoize immutable commit diffs (keyed by SHA) and short-TTL graphs.
 */
interface Entry<V> {
  value: V;
  expires: number; // epoch ms; Infinity = never
}

export class LruCache<V> {
  private map = new Map<string, Entry<V>>();
  constructor(
    private max = 500,
    private ttlMs = Infinity,
  ) {}

  get(key: string): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // refresh recency
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, {
      value,
      expires: this.ttlMs === Infinity ? Infinity : Date.now() + this.ttlMs,
    });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }
}

// Diffs are immutable (SHA = content) → never expire.
export const diffCache = new LruCache<unknown>(1000, Infinity);
// Graphs change on push → short TTL.
export const graphCache = new LruCache<unknown>(200, 60_000);
