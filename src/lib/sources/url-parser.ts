import { InvalidUrlError } from "./types";
import type { ParsedUrl } from "./types";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "[::1]"]);

export function sanitizeUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidUrlError(`Invalid URL: ${url}`, url);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidUrlError(`Unsupported protocol: ${parsed.protocol}`, url);
  }

  const hostname = parsed.hostname;

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new InvalidUrlError(`Blocked hostname: ${hostname}`, url);
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new InvalidUrlError(`Private/reserved IP address blocked: ${hostname}`, url);
    }
  }

  return parsed.toString();
}

export function extractYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!YOUTUBE_HOSTS.has(parsed.hostname)) {
    return null;
  }

  if (parsed.hostname === "youtu.be" || parsed.hostname === "www.youtu.be") {
    const id = parsed.pathname.slice(1);
    return id.length > 0 ? id : null;
  }

  const watchId = parsed.searchParams.get("v");
  if (watchId) {
    return watchId;
  }

  const pathMatch = parsed.pathname.match(/^\/(shorts|live|embed)\/([^/?#]+)/);
  if (pathMatch) {
    return pathMatch[2];
  }

  return null;
}

export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return YOUTUBE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return !YOUTUBE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function parseUrl(url: string): ParsedUrl {
  const sanitized = sanitizeUrl(url);

  if (isYouTubeUrl(sanitized)) {
    const videoId = extractYouTubeVideoId(sanitized) ?? undefined;
    return { type: "youtube", url: sanitized, videoId };
  }

  if (isArticleUrl(sanitized)) {
    return { type: "article", url: sanitized };
  }

  return { type: "unknown", url: sanitized };
}
