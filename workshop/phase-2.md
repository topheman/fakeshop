# Phase 2: Toolchain

Phase 1 moved the framework. This phase moves the compiler underneath it, and it is the first phase where the interesting work was deciding what *not* to do. The plan for phase 2 named four things; two of them turned out not to exist as work, one was blocked upstream, and the one nobody had opinions about — the bundle analyzer — produced the only genuine surprises.

What shipped: TypeScript 6 and 7 installed side by side, `npm run typecheck` running on the Go compiler at roughly a third of the CPU, `next build` no longer type checking at all, and a `vercel.json` that keeps production gated anyway.

## The before state

Measured on the `workshop/phase-2` branch cut from `master` at `48ce8ce`. Node 24.20.0, matching `.nvmrc` and CI, clean tree. TypeScript 5.7.3.

```
▲ Next.js 16.3.4 (Turbopack)
- Cache Components enabled

⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
✓ Compiled successfully in 1800ms
  Running TypeScript ...
  Finished TypeScript in 1518ms ...
✓ Generating static pages using 12 workers (11/11) in 559ms
```

The `Running TypeScript` line is the thing this phase removes. It is 1518ms of a 6.96s cold build, and every second of it duplicates work that `npm run typecheck` already does.

## Concepts

### The plan asked for a flag that is already on

The plan listed "TypeScript 7 for `next build` type checking via `useTypeScriptCli`" as the work. There is no such work. `useTypeScriptCli: true` is the default in 16.3.4 — you can read it at `node_modules/next/dist/server/config-shared.js:257` — and the flag exists only to turn the CLI checker back *off*. Builds have been shelling out to the project-local `tsc` binary since before this workshop started. That is exactly what the `Running TypeScript ... Finished TypeScript in NNNms` pair in the build output is.

Worth knowing *why* Next added it, because the reason is the whole subject of this phase: Next used to `require("typescript")` and drive the compiler through its API. It cannot do that any more, so it spawns the binary instead.

### TypeScript 7 ships without an API, on purpose

TypeScript 7.0 is the Go port. Its `package.json` `exports` maps `"."` to `./lib/version.cjs`, and there is no `lib/typescript.js` in the package at all. `require("typescript")` returns a version string and nothing else. Microsoft's release post states it without hedging: "TypeScript 7.0 does not ship with an API. We expect TypeScript 7.1 to ship with a new (and different) API." Everything beyond the CLI sits behind an explicitly unstable `./unstable/*` surface.

That splits every consumer of TypeScript into two groups:

- **Tools that spawn `tsc` as a subprocess** — `next build`, `npm run typecheck`, a pre-commit hook. These only need a binary and an exit code, so TypeScript 7 works for them today.
- **Tools that import the compiler in-process** — `typescript-eslint`, editors, anything doing custom program analysis. These need the API, so TypeScript 7 is unusable for them until 7.1 at the earliest.

### ESLint is the binding constraint, not the build

This took two wrong turns to establish, so it is worth stating flatly. Running TypeScript 7 alone, with `typescript.ignoreBuildErrors: true`, gives a passing `next build` *and* a passing `npm run typecheck` — Next only needs `tsc --showConfig` for its config validation, which the TS 7 CLI provides in about 4ms. What breaks is `npm run lint`.

`typescript-eslint` imports the compiler, so it cannot load at all. The failure is not a polite version check — it is `TypeError: Cannot read properties of undefined (reading 'Cjs')`, thrown while `typescript-estree` reads an enum off the module it just imported. There is no enum, because the module is `{"version":"7.0.2","versionMajorMinor":"7.0"}` and nothing else. TS 7.1 support is tracked at [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940).

There *is* a declared support range, and it is the reason this phase lands on TypeScript 6 specifically rather than staying on 5.7. From `typescript-estree/dist/parseSettings/warnAboutTSVersion.js`:

```js
exports.SUPPORTED_TYPESCRIPT_VERSIONS = '>=4.8.4 <6.1.0';
```

TypeScript 6.0.3 is inside that range. The side-by-side layout is not a hack that happens to work; the compiler holding the `typescript` name is a version `typescript-eslint` explicitly supports.

Dropping `typescript-eslint` is not an escape either, and this is the part that is easy to get wrong. `@typescript-eslint/parser` is not a source of extra type-aware rules that you could live without — it is what lets ESLint parse `.ts` and `.tsx` at all. Remove it and you do not lose a few rules, you lose linting the entire codebase.

### The side-by-side layout, and why the old compiler keeps the name

Microsoft documents a workaround, and it is the inverse of the obvious guess. You do not install TypeScript 7 as `typescript` and alias the old one out of the way. You do the opposite:

```json
"devDependencies": {
  "typescript": "6.0.3",
  "typescript-native": "npm:typescript@7.0.2"
}
```

The name `typescript` is a public interface. Every tool that resolves it — `typescript-eslint`, the editor's language service, Next's config validation — gets TypeScript 6, which still ships the API those tools need. TypeScript 7 is reached only by explicit path, by the one caller that just wants a fast binary.

Microsoft's own example aliases `typescript` to `@typescript/typescript6`. Plain `typescript@6.0.3` is simpler and leaves fewer copies in the tree, because `@typescript/typescript6` depends on real `typescript@6.0.3` under the name `@typescript/old` anyway. Two copies instead of three, for the same result.

### The bin collision, which npm resolves silently

Both packages declare a bin named `tsc`. npm gives `node_modules/.bin/tsc` to the root `typescript` and **creates no bin entry at all for the alias** — no warning, no error, no note in the install output:

```
node_modules/.bin/tsc -> ../typescript/bin/tsc
```

So `npx tsc` is TypeScript 6.0.3 and there is nothing on disk to suggest a second compiler exists. This is a trap with no failure mode attached: if a script calls bare `tsc` expecting the fast one, it silently gets the slow one, everything still passes, and the only symptom is that it takes three times longer. The fix is to never rely on the collision being resolved a particular way:

```json
"typecheck": "node node_modules/typescript-native/bin/tsc -p tsconfig.json --noEmit"
```

`lint-staged.config.js` had the same bare `tsc` and now calls `npm run typecheck`, so the path is written down exactly once.

### `target: "es5"` had to go

TypeScript 6 warns about it (`TS5107`, deprecated) and TypeScript 7 refuses to start (`TS5108: Option 'target=ES5' has been removed`). The replacement is `ES2017`, which is not an arbitrary pick — it is the value Next writes itself in `writeConfigurationDefaults.js`, commented "For top-level `await`". The build would have rewritten it eventually, the way it rewrote `moduleResolution` in phase 1.

### ESLint 10 is still blocked, and it is not a metadata problem

Phase 1 recorded `eslint-plugin-import` as the single blocker. That was incomplete. Three of `eslint-config-next`'s dependencies cap at `eslint ^9`, each verified against the registry today:

| package | latest | peer range |
|---|---|---|
| `eslint-plugin-react` | 7.37.5 | `... \|\| ^8 \|\| ^9.7` |
| `eslint-plugin-jsx-a11y` | 6.10.2 | `... \|\| ^8 \|\| ^9` |
| `eslint-plugin-import` | 2.32.0 | `... \|\| ^8 \|\| ^9` |

`npm install` reports whichever conflict it reaches first, which is why only one was ever seen. Swapping in the maintained `eslint-plugin-import-x` fork, which does declare `eslint ^10`, would therefore not have moved us a single step: it addresses one blocker of three.

The tempting next conclusion is that these are merely cautious peer ranges and `--legacy-peer-deps` would carry us through. It does not, and the way it fails is more interesting than a flat "blocked". Forcing `eslint@10.9.1` in and running `npm run lint`:

```
TypeError: Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function
    at resolveBasedir (node_modules/eslint-plugin-react/lib/util/version.js:31:100)
    at detectReactVersion (node_modules/eslint-plugin-react/lib/util/version.js:85:19)
    at usedPropTypesInstructions (node_modules/eslint-plugin-react/lib/util/usedPropTypes.js:307:36)
```

ESLint 10 removed `context.getFilename()`. Note *where* it is called from: this is `eslint-plugin-react` trying to auto-detect the installed React version, which `eslint-config-next` leaves set to `detect`. That suggests a workaround — pin `settings: { react: { version: "19.2.8" } }` as the last entry in the flat config and the detection never runs. It does get past the React plugin. Then the next plugin in the chain fails on a different removed API:

```
TypeError: context.getSourceCode is not a function
Rule: "tailwindcss/classnames-order"
```

So the block is a queue, not a single package, and `eslint-plugin-tailwindcss` is doubly stuck: 3.18.3 uses removed ESLint APIs, and 4.x requires `tailwindcss ^4`, which the Tailwind decision above defers. `eslint-config-next@16.4.0-canary.17` still depends on all three capped packages unchanged.

Two things worth recording so nobody re-derives them. `eslint-plugin-react@7.37.5` is the latest release and contains the identical `version.js:31`, so upgrading it changes nothing. And `eslint@9.39.5` — the version installed here — is already the newest ESLint 9; npm prints a deprecation warning on install, but that is only because the 9.x line has moved to the `maintenance` dist-tag, not because a newer 9 exists.

The recheck is one command, and it belongs to whichever phase happens to run it: `npm view eslint-plugin-react peerDependencies.eslint`.

## Moving the type-check gate

Turning off the build's type check is the easy half. The half that matters is where the check goes instead.

There is no `vercel.json` in this repo and deployment runs from the Vercel dashboard, so production builds run `next build` and never run `npm run typecheck`. Setting `typescript.ignoreBuildErrors: true` on its own would mean **production stops being type checked entirely** — which is precisely the state phase 0 removed the flag to fix. CI gates the pull request, but merging to `master` is the production deploy, and a direct push to `master` would not pass through CI at all.

So the gate moves rather than disappears:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run typecheck && npm run build"
}
```

`vercel.json` takes precedence over the dashboard's build command setting, so this holds whatever is configured there — which is useful, because the dashboard setting was inferred from the absence of a `vercel.json` rather than read. The check now runs *before* the build instead of inside it, on TypeScript 7 instead of 6, and a type error fails the deploy earlier than it used to.

The net effect on where type errors are caught:

| | before | after |
|---|---|---|
| Editor | TS 5.7.3 | TS 6.0.3 |
| `npm run typecheck` | TS 5.7.3 | TS 7.0.2 |
| Pre-commit (`lint-staged`) | bare `tsc`, TS 5.7.3 | `npm run typecheck`, TS 7.0.2 |
| CI | typecheck step, and again in build | typecheck step, once |
| Production deploy | inside `next build` | `vercel.json`, before the build |

Nothing lost a gate. One gate stopped being counted twice.

## What changed

- **`package.json`** — `typescript` 5.7.3 to 6.0.3, added `typescript-native` as `npm:typescript@7.0.2`. `typecheck` now invokes TypeScript 7 by explicit path. New `analyze` script for the bundle analyzer.
- **`tsconfig.json`** — `"target": "es5"` to `"ES2017"`.
- **`lint-staged.config.js`** — bare `tsc` to `npm run typecheck`, so the compiler path has one definition.
- **`next.config.mjs`** — added `typescript.ignoreBuildErrors: true`, with a comment explaining where the check went.
- **`vercel.json`** — new file, one key, keeps production type checked.

No application code changed. The route table is byte-identical to phase 1's.

## What it cost and what it bought

All numbers on Node 24.20.0. Cold means `rm -rf .next` or `rm -f tsconfig.tsbuildinfo` first. Build numbers are three samples; measure CPU rather than wall clock, since wall clock on a 12-core laptop understates parallel work.

**Type checking the whole project**, same `tsconfig.json`, three cold runs each:

| Compiler | real | user CPU |
|---|---|---|
| TypeScript 5.7.3 | ~1.25s | ~2.49s |
| TypeScript 6.0.3 | 1.27–1.32s | 2.56–2.62s |
| TypeScript 7.0.2 | 0.30–0.31s | 0.76–0.80s |

TypeScript 5.7.3 was run from the npx cache to keep the tsconfig identical, so its figures have the measured npx overhead (0.38s real, 0.35s user) subtracted. TypeScript 6 is not faster than 5.7 and was never going to be — 6.0 is the last JavaScript implementation of the compiler. The 4x wall clock and 3x CPU only arrive with the Go port.

**Cold `next build`**, TypeScript 6 held constant, toggling only `ignoreBuildErrors`:

| | real | user CPU |
|---|---|---|
| Type check in build | 5.27–5.40s | ~16.6s |
| Type check moved out | 3.97–4.03s | ~14.1s |

The `Running TypeScript ... Finished TypeScript in 1518ms` pair is replaced by:

```
  Skipping validation of types
  Finished TypeScript config validation in 4ms ...
```

Next still shells out for `tsc --showConfig` to validate and patch `tsconfig.json` — that is the 4ms line, and it is why the build still needs a resolvable `typescript` and why that resolution has to land on TypeScript 6.

## The bundle analyzer

`next experimental-analyze` builds the app for analysis only — it does not produce a deployable build — and serves an interactive UI on port 4000. With `-o` it writes to `.next/diagnostics/analyze` and exits, which is how it was run here. The whole analysis takes 1.7s.

The output is worth understanding because the UI hides it: `data/*/analyze.data` files are a 4-byte big-endian length header followed by JSON. The JSON holds a `sources` array (a parent-linked tree of module paths), an `output_files` array, and a `chunk_parts` array of `{source_index, output_file_index, size, compressed_size}`. Every number below comes from summing `chunk_parts` per route, splitting client from server on whether the output file sits under `/static/`.

### What it says about the client

Route `/`, 524.9 KB gzipped of client output, grouped by package:

| | gzip | share |
|---|---|---|
| Fonts (7 × woff2) | 213.8 KB | 40.7% |
| `next` runtime | 175.5 KB | 33.4% |
| `polyfill-nomodule.js` | 38.5 KB | 7.3% |
| `@headlessui/react` | 24.1 KB | 4.6% |
| `@tanstack/query-core` | 13.6 KB | 2.6% |
| Application source (`src/`) | 11.1 KB | 2.1% |
| everything else | ~48 KB | 9.3% |

**The application is 2% of its own client bundle.** Three quarters of the page is fonts, the framework runtime, and a polyfill for browsers that cannot run modules.

The two entries that look alarming both need a caveat, and learning to apply the caveat is most of the value of reading an analyzer:

- **The fonts are emitted bytes, not downloaded bytes.** `layout.tsx` asks for `Inter({ subsets: ["latin"] })` and seven `.woff2` files still land in `.next/static/media`. The generated CSS declares each one behind a `unicode-range` — cyrillic, cyrillic-ext, greek, vietnamese, latin-ext, latin, symbols — so a browser rendering an English page downloads one of the seven. The analyzer counts all of them because it counts output, and it is correct to; it is measuring a different thing than the network tab does.
- **`polyfill-nomodule.js` is served with the `nomodule` attribute**, so any browser that supports ES modules parses the tag and skips the download. It is 38.5 KB that essentially nobody fetches.

### What it says about the server

Server bundles are where the real weight is, and the two spikes are both interesting:

| Route | server, gzip | note |
|---|---|---|
| `/api/og` | 20623.9 KB | `@vercel/og` and its font and WASM payloads |
| `/login` | 1722.8 KB | of which `@faker-js/faker` is 962.8 KB |
| `/account` | 1708.8 KB | of which `@faker-js/faker` is 962.8 KB |
| everything else | 510–823 KB | |

`@faker-js/faker` pulls in 78 modules and about 963 KB gzipped on two routes, and it is there for six lines in `src/actions/sessionUtils.ts` that invent a name, an address and a phone number at signup. It is correctly server-only — it appears in `.next/server/chunks/ssr/src_actions_auth_ts_*.js` and in **no client chunk at all** — so it costs users nothing. What it costs is serverless function size and cold start on the two routes that import it, which is a real cost on Vercel and an invisible one locally.

`/api/og` at 20 MB is the same shape of problem an order of magnitude up. Phase 9 already owns that route for the prerender warning; this is a second reason to look at it.

### What it says about `lucide-react`

Nothing bad, which is the useful finding. The plan expected the analyzer to have opinions here. Phase 0's upgrade to v1 left the imports fully tree-shakeable: the client bundle carries exactly the three icons the client components use — `shopping-cart`, `x`, `search` — for 1.7 KB gzipped total, and the other twenty-odd icons stay on the server where the category list renders them. No barrel-file problem, nothing to fix.

## Decisions

- **TypeScript 6 keeps the `typescript` name, 7 is reached by path.** The alternative — 7 as `typescript` — breaks ESLint and the editor language service to speed up one script.
- **`next build` stops type checking, `vercel.json` picks up the gate.** Removing the check without moving it would have undone phase 0.
- **Tailwind 3.4 stays.** It is a CSS engine migration with real regression risk across every component, it teaches nothing about Next.js, and there is no Playwright suite until phase 7 to catch what it breaks. One consequence to record: `eslint-plugin-tailwindcss@4.x` requires `tailwindcss ^4`, so that plugin stays pinned at 3.18.3 until this happens.
- **ESLint stays on 9.** Blocked upstream by three packages, verified as runtime breakage rather than stale metadata. Not a per-phase recheck.
- **`next dev --inspect` was not exercised.** It is a debugging tool, not a change to the app; it will get used when something needs debugging rather than adopted for its own sake.
- **No CI assertion of the TypeScript version was added.** It was considered, because the bin collision could in principle resolve the other way on Linux. It is unnecessary: the `typecheck` script names the path explicitly, so if the alias were missing Node would fail loudly rather than fall through to TypeScript 6.

## Key files

- [`package.json`](../package.json) — the two-compiler `devDependencies` and the explicit-path `typecheck` script
- [`vercel.json`](../vercel.json) — the moved gate, and the only reason `ignoreBuildErrors` is safe
- [`next.config.mjs`](../next.config.mjs) — `typescript.ignoreBuildErrors`, with the reason in a comment
- [`lint-staged.config.js`](../lint-staged.config.js) — no bare `tsc` anywhere

## Learning outcomes

- A package name is an interface. When a major version drops the API half of that interface, the migration is not "upgrade the package", it is "decide which consumers keep the name".
- `useTypeScriptCli` is not a feature to adopt, it is the visible consequence of TypeScript 7 having no API. Reading the default in `config-shared.js` settled in one minute a question the plan had budgeted a phase for.
- Turning off a check is only safe if you know where the check was doing its work. The build's type check was load-bearing for production and merely duplicated for CI, and those two facts point in opposite directions.
- npm resolves bin collisions silently and arbitrarily. A tool reached by a name you do not control is a tool you might not be running.
- A minimal reproduction can be *too* minimal. The ESLint 10 crash above did not reproduce in a two-file scratch project with the same ESLint and the same plugin version — the rule ran clean and only warned. It reproduces in this repo because `eslint-config-next` routes through `usedPropTypes`, which is what reaches the removed API. Reproducing in the real project is what settled it.
- An analyzer measures emitted output, not user experience. Fonts behind `unicode-range` and scripts behind `nomodule` both count fully and cost almost nothing, while a 963 KB server-only dependency costs nothing on the network and real money in function cold starts.
