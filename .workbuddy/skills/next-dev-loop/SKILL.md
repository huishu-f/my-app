---
name: next-cache-components
description: Next.js 16 Cache Components, PPR, use cache, cacheTag, cacheLife, partial prerendering.
source: https://github.com/vercel-labs/next-skills
version:1.0.0
user-invocable: true
---

# next-cache-components

Use this skill to adopt and optimize Cache Components / Partial Prerendering.

## Core Concepts

- `'use cache'` marks async functions or components for cached evaluation.
- Cache Components are server-rendered, cached, can be partially static / dynamic with PPR.
- PPR: Partial Prerendering, prerender static shell, stream dynamic holes at request time.
- `cacheLife()`: Declare cache lifetime for a cached component/function.
- `cacheTag()`: Attach tags to cached entries, use `revalidateTag()` to invalidate.
- `revalidatePath()`: Invalidate by route path.

## Rules

1. `'use cache'` only works inside async server functions / async server components.
2. Cannot use `'use cache'` in client components.
3. Cached components cannot have state, event handlers, browser APIs.
4. Use Suspense to separate dynamic holes from static shell.
5. Avoid putting high-cardinality dynamic data inside the static shell.
6. When migrating, first identify routes that cannot be prerendered (no-store dynamic).
