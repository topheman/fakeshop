# Phase 0: Make the repo tell the truth

No Next.js feature work in this phase. It fixes the things that would make every later measurement unreliable: a build that skips type checking, a lint command that does not run, a commit hook that never lints, and an install that needs `--force`.

## The before state

Captured on the `workshop/phase-0` branch at `827243a`, clean tree, `.next` deleted first so the build is cold. Node 24.17.0, `next` 16.1.6, `react` 19.0.4.

### `npm run build` — passes

```
⚠ `eslint` configuration in next.config.mjs is no longer supported. See more info here: https://nextjs.org/docs/app/api-reference/cli/next#next-lint-options
⚠ Invalid next.config.mjs options detected:
⚠     Unrecognized key(s) in object: 'dynamicIO' at "experimental"
⚠     Unrecognized key(s) in object: 'eslint'
⚠ See more info here: https://nextjs.org/docs/messages/invalid-next-config
▲ Next.js 16.1.6 (Turbopack, Cache Components)
- Environments: .env
- Experiments (use with caution):
  ? dynamicIO (invalid experimental key)
  ✓ parallelServerBuildTraces
  ✓ parallelServerCompiles
  ✓ webpackBuildWorker

⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
  Creating an optimized production build ...
Turbopack build encountered 1 warnings:
./tailwind.config.js
Specified module format (EcmaScript Modules) is not matching the module format of the source code (CommonJs)
The EcmaScript module format was specified in the package.json that is affecting this source file or by using an special extension, but it looks like that CommonJs syntax is used in the source code.
Exports made by CommonJs syntax will lead to a runtime error, since the module is in EcmaScript mode. Either change the "type" field in the package.json or replace CommonJs syntax with EcmaScript import/export syntax in the source file.

✓ Compiled successfully in 1286.5ms
  Skipping validation of types
  Collecting page data using 13 workers ...
  Generating static pages using 13 workers (0/11) ...
* Home
  CategoryList
  > getCategories
  CustomQRCode
  > generateQRCode { url: 'https://thefakeshop.vercel.app/' }
* ProductGridLoading
* ProductGridLoading
  Generating static pages using 13 workers (2/11)
  Generating static pages using 13 workers (5/11)
* Home
  CategoryList
  > getCategories
  Generating static pages using 13 workers (8/11)
During prerendering, fetch() rejects when the prerender is complete. Typically these errors are handled by React but if you move fetch() to a different context by using `setTimeout`, `after`, or similar functions you may observe this error and you should handle it in that context. This occurred at route "/api/og".
* ProductGridLoading
* ProductGridLoading
✓ Generating static pages using 13 workers (11/11) in 400.2ms
  Finalizing page optimization ...

Route (app)           Revalidate  Expire
┌ ◐ /                        15m      1y
├ ◐ /_not-found
├ ◐ /account
├ ○ /api/hello/world
├ ƒ /api/og
├ ◐ /category/[slug]
│ └ /category/[slug]
├ ◐ /checkout
├ ◐ /login
├ ◐ /product/[slug]
│ └ /product/[slug]
└ ◐ /search


ƒ Proxy (Middleware)

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand

npm run build  9.47s user 1.61s system 339% cpu 3.267 total
```

Cold wall-clock build: **3.267s**. Compile 1286.5ms, static generation of 11 pages 400.2ms across 13 workers.

### `npm run typecheck` — passes, 1.662s

No output. Note that this is `tsc` run by hand; the build itself printed `Skipping validation of types` and checked nothing.

### `npx vitest run` — passes

```
 ✓ src/utils/__tests__/cart.test.ts (5 tests) 2ms
 ✓ src/utils/__tests__/slugUtils.test.ts (6 tests) 1ms

 Test Files  2 passed (2)
      Tests  11 passed (11)
   Duration  469ms
```

### `npm run lint` — fails, and has since the Next 16 bump

```
> next lint
Invalid project directory provided, no such directory: /Users/tophe/projects/fakeshop/lint
```

`next lint` was removed in Next 16. The `lint` argument is now parsed as the directory to build, so the command does not fail because of a lint error, it fails because Next looked for a folder called `lint`. This is the finding that reshaped the phase, and it is covered under "Scope change" below.

## What the before state tells us

Six things the build output says that the written audit did not.

**The `eslint` key in `next.config.mjs` is already dead, not merely undesirable.** Next 16 prints `` `eslint` configuration in next.config.mjs is no longer supported `` and lists `eslint` among the unrecognized keys. So `ignoreDuringBuilds: true` is not what is suppressing lint during the build. Nothing suppresses it; there is simply no lint step in `next build` any more. Removing the key changes no behaviour, it only stops a warning.

**`typescript.ignoreBuildErrors` is the one escape hatch still doing real work.** `Skipping validation of types` is printed on every build because of it. `npm run typecheck` passing is what has been holding the line, and only because it is wired into a separate script.

**`experimental.dynamicIO` is rejected outright.** It shows as `? dynamicIO (invalid experimental key)`. The canary-era flag has been gone for a while; the app has been running on the top-level `cacheComponents: true` alone. The header confirms it: `Next.js 16.1.6 (Turbopack, Cache Components)`.

**The three webpack flags are still accepted and still pointless.** `webpackBuildWorker`, `parallelServerBuildTraces` and `parallelServerCompiles` all print with a `✓`, which reads as if they are doing something, but the same header line says Turbopack. They tune a bundler this build does not use.

**`tailwind.config.js` produces a Turbopack warning.** `package.json` has `"type": "module"`, so a `.js` file is ESM, but the config is written with `module.exports`. Turbopack is explicit that CommonJS exports in an ESM-typed file lead to a runtime error. It has not bitten yet because the config is read by PostCSS at build time rather than bundled, but it is a real mismatch and a one-line fix.

**The middleware deprecation warning is already printing.** `The "middleware" file convention is deprecated. Please use "proxy" instead.` That is phase 3, recorded here so the diff is visible when it goes away.

## Scope change: ESLint moves from phase 2 into phase 0

The plan put the ESLint flat-config migration in phase 2 and the CI workflow in phase 0. That ordering does not survive contact with the build output above.

Phase 0's job is to make the repo's own signals trustworthy, and CI is how that gets enforced. But a CI workflow that runs `npm run lint` today would fail on a missing directory, and a workflow that quietly omits the lint step would be a lie of exactly the kind this phase exists to remove. The `eslint` config key being unsupported in Next 16 seals it: there is no version of "turn off `ignoreDuringBuilds` and see what falls out" that produces lint output, because `next build` no longer lints at all.

So the flat config lands here, with the CI workflow that depends on it. Phase 2 keeps TypeScript 7, the Turbopack bundle analyzer and the open Tailwind 4 question.

## Concepts

### Why `next lint` is gone

Next used to ship a lint command that wrapped ESLint, resolved a config for you, and could be run as part of `next build` and configured through the `eslint` key in `next.config.mjs`. Next 16 removed all three. The reasoning is that ESLint's own flat config made the wrapper redundant: a flat config is a plain JavaScript module that imports configs as values, so a framework no longer needs to inject a resolver to tell ESLint where `eslint-config-next` lives. You import it yourself.

The knock-on effect is that linting is no longer a build step at all. `next build` compiles and type checks; linting is a separate command you run in CI. That is why `eslint.ignoreDuringBuilds` no longer has anything to ignore.

### `.eslintrc.json` to `eslint.config.mjs`

The two formats differ in more than syntax. In eslintrc, `extends` is a string of a package name that ESLint resolves through a search path, config merging is a bespoke algorithm, and a `plugins` entry names a package that ESLint locates on your behalf. In flat config, a config is an array of plain objects, `extends` becomes spreading an imported array, plugins are objects you import and hold, and merging is just array order: later entries override earlier ones for files they both match.

That last point produced the one behavioural change in this migration. The old `.eslintrc.json` listed `plugin:prettier/recommended` **first** in `extends`, so every config after it could re-enable a formatting rule that Prettier's config had just turned off. Flat config makes the ordering explicit and the fix obvious: `prettierRecommended` now sits last, after the Next and Tailwind configs, which is where it has always been meant to go.

`eslint-config-next@16` exports flat config arrays from three subpaths. `eslint-config-next/core-web-vitals` carries the Next rules, the plugin registrations for `react`, `react-hooks`, `import`, `jsx-a11y` and `@next/next`, and a default `ignores` for `.next/**`, `out/**`, `build/**` and `next-env.d.ts`. `eslint-config-next/typescript` carries the `typescript-eslint` recommended rules. The old config extended both, so the new one spreads both.

### Why ESLint 9 and not 10

ESLint 10 is out and npm even warns that 9.39.5 is past support. We are on 9 anyway, because `eslint-config-next@16.1.6` depends on `eslint-plugin-import@^2.32.0`, and that plugin's peer range still stops at `eslint ^9`. Installing ESLint 10 would produce exactly the `ERESOLVE` this phase exists to eliminate. Next's own config package is the constraint, so this resolves itself when `eslint-plugin-import` widens its range or Next drops the dependency; it is worth rechecking at phase 2.

## What the lint run found

Turning on a linter that had never run produced eight errors, and none of them were style.

### `react-hooks/error-boundaries` in the category page

`CategoryContent` wrapped both its `await` and its returned JSX in a single `try`/`catch`. That reads as if it catches render errors, and it does not. Constructing JSX only creates a description object; React renders it later, outside the stack frame the `try` is guarding. A fetch rejection is caught, but an error thrown inside `ProductGrid` while rendering escapes untouched.

The fix in this phase is minimal on purpose: narrow the `try` to the `await` alone and return the JSX after it, which is what the code always meant. Replacing the whole thing with a `catchError` boundary is phase 5.

### `react-hooks/set-state-in-effect` in the two loading components

`ProductGridLoading` and `ProductCardLoading` both derive a heading from the URL. Both did it by rendering a placeholder, then reading `window.location` in a `useEffect` and calling `setState`. That is a mount, a paint, and a second render every time a loading shell appears — cascading renders in the exact component whose job is to appear fast.

They were written that way for a real reason, recorded in the original comment: reading the URL through `useRouter` makes the prerender fail, and the value genuinely differs between server and client, so computing it during render would be a hydration mismatch.

`useSyncExternalStore` is the API for precisely that shape. It takes three arguments: a `subscribe` function, a client `getSnapshot`, and a server `getServerSnapshot`. React calls the server snapshot during prerender and hydration, then the client snapshot afterwards, and it treats the difference as expected rather than as a mismatch. Here the URL does not change while a fallback is on screen, so `subscribe` returns a no-op unsubscribe and never fires. The result renders the real title in one pass with no effect and no second render.

```tsx
const subscribe = () => () => {};
const getServerTitle = () => "Loading ...";

export function ProductGridLoading() {
  const title = useSyncExternalStore(subscribe, getClientTitle, getServerTitle);
  // ...
}
```

`subscribe` and `getServerTitle` are defined at module scope deliberately. React compares them by identity, so declaring them inside the component would re-subscribe on every render.

### `lucide-react` v1 dropped brand icons

The `Github` export no longer exists. Lucide removed its brand icons in v1 rather than keep shipping trademarked marks. Twelve files import from `lucide-react` and only the homepage broke, which `tsc` caught immediately. The mark now lives in `src/components/GithubIcon.tsx` as a local SVG with a lucide-shaped `size` prop.

The plan said 1.39.0; 1.38.0 was the newest version available from the registry at install time, and it carries the same `react ^19` peer range, which is the property this phase needed.

## The after state

`npm run build`, cold, same machine:

```
⚠ Invalid next.config.mjs options detected:
⚠     Unrecognized key(s) in object: 'dynamicIO' at "experimental"
▲ Next.js 16.1.6 (Turbopack, Cache Components)
...
✓ Compiled successfully in 1213.7ms
  Running TypeScript ...
  Collecting page data using 13 workers ...
✓ Generating static pages using 13 workers (11/11) in 403.0ms

Route (app)           Revalidate  Expire
┌ ◐ /                        15m      1y
├ ◐ /_not-found
├ ◐ /account
├ ○ /api/hello/world
├ ƒ /api/og
├ ◐ /category/[slug]
│ └ /category/[slug]
├ ◐ /checkout
├ ◐ /login
├ ◐ /product/[slug]
│ └ /product/[slug]
└ ◐ /search

npm run build  12.14s user 1.61s system 314% cpu 4.368s total
```

What changed and what did not:

|                                        | Before                                   | After                |
| -------------------------------------- | ---------------------------------------- | -------------------- |
| Route table                            | 8 Partial Prerender, 1 static, 1 dynamic | identical            |
| Static generation                      | 400.2ms                                  | 403.0ms              |
| Type checking during build             | `Skipping validation of types`           | `Running TypeScript` |
| Cold build wall clock                  | 3.267s                                   | 4.368s               |
| `eslint` config warning                | present                                  | gone                 |
| `tailwind.config.js` Turbopack warning | present                                  | gone                 |
| `npm run lint`                         | crashes                                  | 0 errors, 0 warnings |
| `npm ci`                               | fails without `--force`                  | exit 0               |

**The route table is byte-identical**, which is the important result. Everything in this phase was supposed to be invisible to the running app, and it was.

The build got about a second slower, and that is the honest price of the phase: `Running TypeScript` replaced `Skipping validation of types`, so the build now does work it previously refused to do. Phase 2's TypeScript 7 migration is where that second is likely to come back.

Two warnings survive on purpose. `dynamicIO` is a dead flag and belongs to phase 1, which is where deleting it is the teaching moment. The middleware deprecation belongs to phase 3.

## Key files

- `eslint.config.mjs` — the whole flat config, replacing `.eslintrc.json`
- `src/components/ProductGridLoading.tsx` — the `useSyncExternalStore` pattern, and the comment explaining why the URL is read as an external store
- `src/app/(shop)/category/[slug]/page.tsx` — a `try`/`catch` that now catches what it claims to, until phase 5 replaces it
- `.github/workflows/ci.yml` — install, lint, typecheck, test, build, on every PR
- `lint-staged.config.js` — one glob key instead of two, so `eslint --fix` runs again

## Learning outcomes

- `next lint` and the `eslint` key in `next.config.mjs` were both removed in Next 16, and linting is no longer part of `next build` at all. A repo that only lints through `next build` silently stops linting on the upgrade.
- Flat config resolves merge order by array position, which makes "Prettier last" enforceable rather than conventional.
- `eslint-plugin-react-hooks@7` ships rules that catch design errors, not formatting: JSX constructed inside a `try`/`catch` does not have its render errors caught, and `setState` in an effect body costs a second render.
- `useSyncExternalStore` is the sanctioned way to read a browser-only value that differs between server and client, without a hydration mismatch and without an effect.
- Two build escape hatches looked equivalent and were not. `eslint.ignoreDuringBuilds` had been inert since the Next 16 bump; `typescript.ignoreBuildErrors` was the only one still suppressing real work.
