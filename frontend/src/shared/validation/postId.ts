const POST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const PERCENT_ESCAPE = /%[0-9A-Fa-f]{2}/;

const MAX_DECODE_DEPTH = 3;

export function isValidPostId(id: string): boolean {
  return POST_ID_PATTERN.test(id);
}

export function assertValidPostId(id: string): void {
  if (!isValidPostId(id)) {
    throw new Error(`Invalid post id: ${JSON.stringify(id)}`);
  }
}

export function encodePostId(id: string): string {
  return encodeURIComponent(id);
}

export function decodePostId(segment: string): string {
  if (!PERCENT_ESCAPE.test(segment)) return segment;

  let decoded = segment;
  for (let depth = 0; depth < MAX_DECODE_DEPTH; depth++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

export function postPath(id: string): string {
  return `/posts/${encodePostId(id)}`;
}

export function postEditPath(id: string): string {
  return `/write?id=${encodePostId(id)}`;
}
