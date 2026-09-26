export function buildPostsUrl(
  searchParams: URLSearchParams | Record<string, string | undefined>,
  changes: Record<string, string | null | undefined>,
): string {
  const params =
    searchParams instanceof URLSearchParams
      ? new URLSearchParams(searchParams)
      : new URLSearchParams(
          Object.entries(searchParams).reduce<Record<string, string>>((acc, [k, v]) => {
            if (v) acc[k] = v;
            return acc;
          }, {}),
        );

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, value);
  }

  if (!Object.keys(changes).some((k) => k === "page")) params.delete("page");

  const qs = params.toString();
  return qs ? `/posts?${qs}` : "/posts";
}
