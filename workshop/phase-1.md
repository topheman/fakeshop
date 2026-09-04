# Phase 1: Reach 16.3 and React 19.2

Phase 0 made the repo tell the truth. This phase moves it forward: `next` 16.1.6 to 16.3.4, React 19.0.4 to 19.2.8, and the deletion of four config flags that had stopped meaning anything. The app code is untouched. The interesting result is a build that does roughly a seventh of the compile work it used to.

## The before state

Measured on the `workshop/phase-1` branch at `a36a7b0`, which is `master` with phase 0 merged. Node 24.20.0, clean tree. Phase 0's numbers were taken on Node 24.17.0, so everything below was re-measured rather than carried over.

```
⚠ Invalid next.config.mjs options detected:
⚠     Unrecognized key(s) in object: 'dynamicIO' at "experimental"
▲ Next.js 16.1.6 (Turbopack, Cache Components)
- Environments: .env
- Experiments (use with caution):
  ? dynamicIO (invalid experimental key)
  ✓ parallelServerBuildTraces
  ✓ parallelServerCompiles
  ✓ webpackBuildWorker

⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
✓ Compiled successfully in 1219.7ms
  Running TypeScript ...
✓ Generating static pages using 13 workers (11/11) in 498.2ms
```

Cold build 5.12s. Two more builds straight after, without deleting `.next`, compiled in 1198.7ms and 1214.1ms. **Building twice in a row cost the same as building once**, which is the fact this phase is going to change.

## Concepts

### `next upgrade` is a codemod runner, not an install

`next upgrade` shipped in 16.1. The temptation is to read it as a wrapper around `npm install next@latest`, but the install is the boring half. It resolves the target version, rewrites `next`, `react`, `react-dom` and the React types together so they cannot drift apart, then replays every codemod registered in the window between your installed version and your target.

That registry is a list of `{ codemod, version }` pairs shipped inside `@next/codemod`, and you can read it at `lib/utils.js` in the package. Anything registered at a version above yours and at or below your target gets offered. For the 16.1 to 16.3 window there are exactly two:

- `cache-components-instant-false` (16.3.0) — adds `export const instant = false` to every page and layout.
- `remove-partial-prefetch` (16.3.0) — removes `export const prefetch = 'partial'` route segment configs.

Neither ran here, and both reasons are worth understanding. `remove-partial-prefetch` is a genuine no-op: the app has no such export. The one `prefetch` in the codebase is `prefetch={false}` on a `<Link>` in `CategoryList.tsx`, which is a JSX prop and a completely different API from the route segment config the codemod targets.

`cache-components-instant-false` was **skipped on purpose**. It exists as an escape hatch for apps adopting the 16.3 Instant Navigations work: it opts every route out of the new behaviour so you can turn it on route by route. Running it here would sprinkle `export const instant = false` across eleven files that phase 6 would then have to delete one at a time. This app has been on Cache Components since before it had a stable name, so it takes the new default and deals with the consequences when it gets to phase 6.

### `dynamicIO` and `cacheComponents` were always the same feature

The config carried both. `experimental.dynamicIO: true` was the canary-era name; `cacheComponents: true` at the top level is what the feature shipped as. Next 16 had already stopped accepting the old key — phase 0's build printed `? dynamicIO (invalid experimental key)` — so the app had been running on `cacheComponents` alone for two CVE bumps without anyone noticing.

The three webpack flags were the same kind of fossil. `webpackBuildWorker`, `parallelServerCompiles` and `parallelServerBuildTraces` all printed with a `✓`, which reads as if they were doing something. They tune webpack. Turbopack has been the default bundler since Next 16, and the header line said so on the same screen.

The commented-out `// ppr: true` went with them. Partial Prerendering is not something you enable next to Cache Components; it is the render mode Cache Components produces. Every `◐` in the route table below is PPR output.

### Reading the route table

The legend has three symbols and they describe **when the HTML for a route is produced**, not how the route is written.

- `○` **Static** — fully prerendered at build time, no request-time work. Only `/api/hello/world` qualifies.
- `ƒ` **Dynamic** — nothing is prerendered, the server renders on demand. `/api/og` is here because it reads the request.
- `◐` **Partial Prerender** — the shell is prerendered at build time, and the parts that need request-time data stream in afterwards. Everything else in this app.

`◐` is the whole point of Cache Components. A route lands there when part of its tree can be resolved at build time and part cannot, and the split is decided by where a request-time read like `cookies()` or an uncached `fetch` sits relative to a Suspense boundary. Phase 4 is where that becomes something we control deliberately instead of something we inherit.

The `Revalidate` and `Expire` columns only apply to what was prerendered. `/` revalidates at 15m and expires at 1y; the rest carry no lifetime because nothing in their prerendered part has one yet.

## What changed

`next.config.mjs`, in full:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dummyjson.com",
      },
    ],
  },
  cacheComponents: true,
};

export default nextConfig;
```

The `experimental` block is gone entirely.

`package.json` moved `next` from the range `^16.0.11` to the exact pin `16.3.4`, and `eslint-config-next` from `^16.1.6` to `16.3.4`. Pinning is what `next upgrade` writes, and it is the right call for this repo: the two CVE bumps that carried this app from a 15.2 canary to Next 16 got in through a caret range without anyone deciding to cross a major version. React was already pinned. Now the framework is too, and the version the repo runs is a thing somebody chose.

### The build rewrote `tsconfig.json`

Unprompted, the first 16.3 build printed:

```
We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
The following mandatory changes were made to your tsconfig.json:

	- moduleResolution was set to bundler (to match modern bundler resolution)
```

`moduleResolution: "node"` is TypeScript's model of how Node's CommonJS `require` resolved a specifier in 2015: walk up `node_modules`, try `.js`, then `/index.js`, ignore the `exports` field in `package.json` completely. Turbopack does not resolve modules that way and neither does any current bundler. `"bundler"` is the mode that honours `exports`, which is how every dependency in this tree declares its entry points.

Next calls this change mandatory and applies it rather than warning about it, so it is not optional and there is nothing to decide. It is worth committing rather than reverting, because reverting it only means the next build rewrites it again. `npm run typecheck` passes either way.

### The agent rules block in `AGENTS.md`

From 16.3, `next dev` detects that a coding agent is running and appends a managed block, delimited by `<!-- BEGIN:nextjs-agent-rules -->`, to `AGENTS.md`. The block points the agent at `node_modules/next/dist/docs/`, where Next has bundled its own documentation since 16.2. An agent working in this repo reads the docs for 16.3.4 instead of recalling whatever Next.js looked like when it was trained, which for a framework that renamed middleware and shipped a caching model in the same major version is not a small difference.

The block is committed rather than gitignored. It is regenerated on every `next dev` run, so leaving it out of the commit means carrying a permanent uncommitted change; the block's own text says as much. The generator is readable at `node_modules/next/dist/server/lib/generate-agent-files.js` and was run directly here rather than waiting for a dev server, because `AGENTS.md` already existed and the code path for that case only appends to it — it never creates `CLAUDE.md` unless neither file is there.

The stale facts in the same file were corrected while it was open: it still described ESLint 8 and a legacy `.eslintrc.json`, which phase 0 had replaced, and still warned that `npm install` might need `--force`, which phase 0 had fixed.

## Turbopack disk caching

This is the phase's real result. In 16.3 Turbopack's persistent disk cache is on by default for both `next dev` and `next build`. No flag, no opt-in.

|                      | 16.1.6                    | 16.3.4                |
| -------------------- | ------------------------- | --------------------- |
| Cold compile         | 1219.7ms                  | 1683ms                |
| Warm compile         | 1198.7ms, 1214.1ms        | 235ms, 225ms, 232ms   |
| Cold build, total    | 5.12s                     | 5.25s                 |
| Warm build, total    | 4.36s, 4.35s              | 3.02s, 3.06s, 3.05s   |
| Warm build, user CPU | 12.38s                    | 1.75s                 |
| `.next/cache`        | 212K, no `turbopack/`     | 74M, with `turbopack/` |

Three things in that table matter more than the headline.

**The cache is visible on disk.** Under 16.1 `.next/cache` held 212K: a fetch cache and a `.tsbuildinfo`, nothing from the bundler. Under 16.3 it holds 74M and a `turbopack/` directory. The speedup is not a scheduling accident, it is a real artifact you can delete and watch the slow build come back.

**The cold build got slower, and that is the price.** 1219.7ms to 1683ms of compile, because the cold build now writes the cache it is about to benefit from. You pay once and collect on every build after. Note also that phase 0 made the build type check again, so cold builds carry that cost too — TypeScript takes 1326ms cold and 651ms warm, since `.tsbuildinfo` is its own incremental cache and was already working.

**User CPU fell from 12.38s to 1.75s.** Wall clock only improved by about 1.3s, which undersells it badly. On a 12-core laptop with everything parallel, wall clock is bounded by the longest chain rather than the total work; the CPU number is what actually shrank, by 86%. On CI, where the runner has two cores and no cache to restore, that is the number to care about.

## The route table changed shape

Phase 0's headline was a byte-identical route table. This phase does not get that, and the difference is worth reading carefully.

Before:

```
├ ◐ /category/[slug]
│ └ /category/[slug]
```

After:

```
├   /category/[slug]
│ └ ◐ /category/[slug]
```

Same for `/product/[slug]`. Every other row is identical, and the legend, the counts and the `Revalidate`/`Expire` columns are unchanged.

Nothing about the app's behaviour moved. What moved is which line carries the symbol. On a dynamic route Next prints two lines: the route pattern, and indented beneath it each concrete path `generateStaticParams` produced. 16.1 put the render mode on the pattern; 16.3 puts it on the instance. That is the more honest placement, because the render mode is a property of a prerendered page and the pattern is not a page. A route where different params resolve to different modes could not have been shown correctly under the old layout at all.

So the phase's invariant held in the sense that matters — eight Partial Prerender routes, one static, one dynamic, same lifetimes — but "byte-identical route table" is the wrong assertion to make across a minor version bump, because the table is a rendering of the facts and not the facts.

## Warnings that survive, on purpose

Two remain, both belonging to later phases.

The middleware deprecation still prints, and 16.3 now includes the codemod invocation in the message. That is phase 3.

`/api/og` still warns `During prerendering, fetch() rejects when the prerender is complete.` That is phase 9.

## Decisions

**ESLint stays on 9.** `next upgrade` set `eslint` to `10.9.1` and the install failed outright with `ERESOLVE`. The cause is exactly what phase 0 recorded: `eslint-config-next@16.3.4` still depends on `eslint-plugin-import@^2.32.0`, whose peer range ends at `eslint ^9`, and 2.32.0 is still the latest release. The `>=9.0.0` peer that `eslint-config-next` advertises is not the binding constraint; its own transitive dependency is. Recheck at phase 2.

**No `overrides` block.** `next upgrade` also added one forcing `@types/react` and `@types/react-dom` across the tree. It was dropped and the install resolved cleanly without it, so it is not carrying its weight. A version override is a claim that the dependency graph is wrong, and this one is not.

**`@types/react-dom` is at 19.2.5, not 19.2.7.** A local install policy holds back packages published within the last two days, and 19.2.6 and 19.2.7 both landed the day before this phase was built. 19.2.5 is the newest version that clears it. Nothing in the app depends on the difference, and the lockfile makes CI reproduce this exact resolution regardless of when it runs.

## Key files

- `next.config.mjs` — down to `images` and `cacheComponents`
- `package.json` / `package-lock.json` — the version moves, exact pins on `next` and `eslint-config-next`
- `tsconfig.json` — `moduleResolution: "bundler"`, written by the build
- `AGENTS.md` — the managed agent rules block, and the stale facts phase 0 left behind

## Learning outcomes

- `next upgrade` is worth running for the codemod registry alone, and worth reading rather than trusting. It made two choices here that had to be reversed: ESLint 10, which does not resolve, and an `overrides` block that was not needed.
- A codemod being offered is not a reason to run it. `cache-components-instant-false` is an adoption escape hatch, and taking an escape hatch you do not need means writing code for a later phase to delete.
- `dynamicIO` and `cacheComponents` were one feature under two names, and the app had been asking for it twice for two CVE bumps without anything breaking or anyone noticing.
- Turbopack's disk cache is the whole reason to be on 16.3 rather than 16.1. Wall clock hides it; user CPU shows an 86% drop.
- Wall-clock time is the wrong metric on a parallel build. Measure CPU, and check the cache on disk to confirm the mechanism rather than inferring it from a stopwatch.
- Route table symbols sit on prerendered instances, not on route patterns, and a table that renders facts is not itself a stable fact to diff.
