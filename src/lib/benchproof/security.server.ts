import { getRequest, getRequestIP, setResponseStatus } from "@tanstack/react-start/server";

const WINDOW_MS = 60_000;
const MAX_BUCKETS = 2_000;
const LIMITS: Record<string, number> = {
  create_claim: 3,
  challenge: 6,
  evaluation: 3,
  preview: 6,
  evidence_hash: 30,
};

type Bucket = { startedAt: number; count: number };
const buckets = new Map<string, Bucket>();

function reject(status: 403 | 413 | 429, message: string): never {
  setResponseStatus(status);
  throw new Error(message);
}

function requestOrigin(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim() ||
    request.headers.get("host") ||
    new URL(request.url).host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim() ||
    new URL(request.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function assertMutationAccess(operation: string): void {
  const request = getRequest();
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin(request)) {
    reject(403, "Request origin is not allowed.");
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    reject(403, "Cross-site mutation is not allowed.");
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64_000) reject(413, "Request is too large.");

  const now = Date.now();
  const ip = getRequestIP({ xForwardedFor: true }) || "unknown";
  const key = `${operation}:${ip}`;
  const existing = buckets.get(key);
  const bucket = existing && now - existing.startedAt < WINDOW_MS ? existing : { startedAt: now, count: 0 };
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, value] of buckets) {
      if (now - value.startedAt >= WINDOW_MS) buckets.delete(bucketKey);
      if (buckets.size <= MAX_BUCKETS) break;
    }
  }
  if (bucket.count > (LIMITS[operation] ?? 3)) {
    setResponseStatus(429);
    throw new Error("Too many requests. Try again shortly.");
  }
}
