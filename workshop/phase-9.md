# Phase 9: The OG image

The last phase of the plan, and the only one that touched a route nobody visits. `/api/og` generated the social card. It had printed a warning on every build since phase 1, phase 2's bundle analyzer had put 20.6 MB next to its name, and the route had been on the "we'll get to it" list since the start.

It turned out to be broken in production, and to have been broken for a long time.

## Concepts

### `ImageResponse` is not a picture of a React tree

`ImageResponse` takes JSX and returns a PNG, but nothing about it goes through a browser. The element tree is rendered by React, handed to [satori](https://github.com/vercel/satori) which lays it out and emits an SVG, and then rasterized to PNG. There is no CSS cascade, no layout engine beyond flexbox, and no DOM.

That explains a class of surprise this phase ran into head-first. `z-index` is not supported. `display: grid` is not supported. And `<img width="96">` — a string, which is perfectly legal JSX and exactly what HTML wants — is rejected, because satori's style resolver wants a number, `"auto"`, or a percentage.

### Why the app's font loader cannot feed it

The obvious question, and worth answering because the answer says something about what `next/font` is for: `layout.tsx` already loads Inter with `next/font/google`, so why not reuse it?

Because `next/font` returns a CSS handle and nothing else:

```ts
// next/dist/compiled/@next/font/dist/types.d.ts
type NextFont = {
  className: string;
  style: { fontFamily: string; fontWeight?: number; fontStyle?: string };
};
```

No buffer, no path. It is a bundler loader whose job is to self-host the file, preload it, and generate a metric-matched fallback so text does not shift while the real font arrives. Every one of those concerns is a browser concern. `ImageResponse` has no browser and no layout shift; satori parses the font binary itself and needs the bytes.

Even digging the emitted file out of `.next/static/media` would not work — `next/font` emits `.woff2`, and `ImageResponse` supports only `ttf`, `otf` and `woff`. Two libraries that share a word and solve different problems.

### What 16.2 changed, and why it is not just "faster"

The release notes call it an `ImageResponse` speedup. The mechanism is more specific, and it is documented in Next's own source at `next/dist/server/og/cache-image-response.d.ts`:

> The rendered image is cached in the Resume Data Cache during a prerender, so the prospective prerender renders it once and the final prerender retrieves it from memory within microtasks. **This lets metadata image routes be statically prerendered under Cache Components instead of being treated as dynamic.**
>
> The cache boundary is drawn around only the deterministic rasterization of the element tree into an image. […] **If that tree needs dynamic input the serialization can't complete, and the route falls back to dynamic.**

So the speedup and the static prerender are one feature, and it is conditional. The cache boundary wraps the rasterization only. The element tree is still rendered with React Flight inside the prerender work-unit store, so anything request-time in it — `cookies()`, an uncached `fetch` — is subject to the normal Cache Components rules and drops the route back to dynamic.

That is the whole diagnosis of this phase. The old route `await`ed four SVG icons and a remote font **inside `GET()`**. Under `cacheComponents` an uncached `fetch` is a request-time API, so the route could never prerender; and during the build's prerender pass those fetches were still in flight when the prerender finished, which is the warning verbatim:

```
During prerendering, fetch() rejects when the prerender is complete. […]
This occurred at route "/api/og".
```

### The file convention

Next has a first-party answer for "this route is my social card": `opengraph-image.tsx` in a route segment. It default-exports a function returning an `ImageResponse` and exports `alt`, `size` and `contentType`. Next then writes the `<head>` tags itself, which is the part that turns out to matter — see below.

## Implementation

`src/app/api/og/route.tsx` became `src/app/opengraph-image.tsx`. Four changes, in dependency order:

1. **Import from `next/og`.** The route imported `@vercel/og` directly.
2. **Hoist every read to module scope.** The four icons and the font are read once with `readFile`, at module evaluation, and the element tree handed to `ImageResponse` holds no request-time input.
3. **Vendor the font.** `src/images/fonts/Inter-ExtraBold.ttf`, 65 KB, the latin subset from Google Fonts. The old code fetched a 126 KB `.woff` from `fonts.cdnfonts.com` on every request; hoisting that to module scope would have made a third-party CDN a hard dependency of the production build.
4. **Drop the `try/catch`.** With the reads at module scope it no longer wrapped any I/O, and see the next section for what it had been doing instead.

Along the way: `width="96"` became `width={96}`, the three `zIndex: 10` props came out (satori reports `z-index` as unsupported, and removing them produced a byte-identical PNG, so they were dead), and the copy moved from "Next.js 15" to "Next.js 16" in both the image and the metadata.

`layout.tsx` lost the hand-written `openGraph.images` and `twitter.images` entries.

## The image was broken in production

The build failed the first time the route was prerendered:

```
Invalid value "96" for "width". Expected a number, "auto", or a percentage value.
Error: svgload_buffer: SVG rendering failed
Export encountered an error on /opengraph-image/route: /opengraph-image, exiting the build.
```

The chain: satori rejects the string `"96"`, so the `<img>` has no dimensions; the icons are data-URL SVGs carrying a `viewBox` and no intrinsic size; with neither a declared nor an intrinsic size there is nothing to rasterize.

That bug was in the old route too. It just never failed a build, because the route was dynamic and therefore never rendered at build time — and at request time the `catch` turned it into a 500 with a logged message nobody reads:

```
$ curl -s -o /dev/null -w "%{http_code} %{content_type}" https://thefakeshop.vercel.app/api/og
500 text/plain;charset=UTF-8
# body: Failed to generate the image
```

The live social card had been returning "Failed to generate the image" as plain text. Every deploy was green, every page rendered, and the one feature whose entire audience is a crawler was dead.

This is the argument for dropping the `try/catch` rather than keeping it around the `ImageResponse` call. A metadata route that cannot produce its image should fail the build, loudly, once — not degrade to a 500 that only a Twitter preview would ever show you.

It is also the argument for `e2e/opengraph-image.test.ts`, which reads the PNG's IHDR chunk and asserts 1200×630, plus checks that the home page's `og:image` and `twitter:image` point at the route. Two assertions that would have caught this the day it broke.

## Results

### The build

```
                    before                      after
warning             fetch() rejects…            (none)
route table         ├ ƒ /api/og                 ├ ○ /opengraph-image
                      Dynamic, on demand          Static, prerendered PNG
```

`.next/server/app/opengraph-image.body` is a 60 KB PNG, `1200 x 630, 8-bit/color RGBA`, produced once at build.

### The metadata

The hand-written version set `og:image`, its width, height and alt, plus `twitter:image`. The file convention generates more than that, from one file:

```html
<meta property="og:image" content="https://thefakeshop.vercel.app/opengraph-image?faed38a581f2781b"/>
<meta property="og:image:type" content="image/png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="A demo e-commerce site built with Next.js 16 latest features"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="https://thefakeshop.vercel.app/opengraph-image?faed38a581f2781b"/>
<meta name="twitter:image:alt" content="…"/>
<meta name="twitter:image:type" content="image/png"/>
<meta name="twitter:image:width" content="1200"/>
<meta name="twitter:image:height" content="630"/>
```

Three things to notice. `twitter:image` comes from `opengraph-image.tsx` — no separate `twitter-image.tsx` is needed. `og:image:type` was never set by hand. And the URL carries a content hash, `?faed38a581f2781b`, so a changed image gets a new URL past every crawler cache; `/api/og` had no equivalent.

### The bundle, and a correction to phase 2

This is the part that did not go as planned, and the plan was wrong rather than the work.

Phase 2's analyzer table listed `/api/og` at **20623.9 KB server, gzip**, annotated "`@vercel/og` and its font and WASM payloads". Measuring the actual traced module graph — `route.js.nft.json`, which is what determines serverless function size — says otherwise:

| | before (`/api/og`) | after (`/opengraph-image`) |
|---|---|---|
| files traced | 215 | 207 |
| total on disk | 23.1 MB | 23.2 MB |
| `sharp` + libvips | 18.2 MB | 18.2 MB |
| `@vercel/og` | 3.07 MB | 3.07 MB |

**The 20 MB was never `@vercel/og`.** It is `sharp`, and specifically `@img/sharp-libvips-darwin-arm64/lib/libvips-cpp.dylib` at 17.7 MB — traced in because the og renderer uses libvips to load raster and SVG image sources. The `vips2png` and `svgload_buffer` strings in the build failure above are libvips talking. Phase 2 read a big number next to a route that imports an image library and attributed it to the wrong image library.

**And removing the `@vercel/og` dependency changed nothing in the output**, because the import was never reaching the package. From `next/dist/build/create-compiler-aliases.js:132`:

```js
'@vercel/og$': 'next/dist/server/og/image-response',
```

Next aliases `@vercel/og` to the same module `next/og` resolves to. The before-trace confirms it: it contains `next/dist/compiled/@vercel/og/*` and never `node_modules/@vercel/og/*`. The 6.0 MB package in `node_modules` was installed on every CI run and every Vercel build, and nothing imported it. Deleting it saves install time and removes a lie from `package.json`; it saves zero bytes of function.

So the honest scoreboard: the warning is gone, the route is static, the image works again, the metadata is more complete — and the 20 MB is still there, sitting under a different name than the one phase 2 wrote down. Shrinking it would mean getting `sharp` out of the trace, which is a Next-internal dependency of `ImageResponse` and not something this app can opt out of.

## Key files

- [`src/app/opengraph-image.tsx`](../src/app/opengraph-image.tsx) — the route. The comment above the module-scope reads is the whole phase in four lines.
- [`e2e/opengraph-image.test.ts`](../e2e/opengraph-image.test.ts) — asserts the bytes, not the status code.
- [`src/app/layout.tsx`](../src/app/layout.tsx) — what the file convention let us delete.

## Learning outcomes

- **`ImageResponse` under Cache Components is conditional, not automatic.** The cached-rasterization path only engages if the element tree serializes without request-time input. Where you do your I/O decides whether the route is a build artifact or a per-request render, and the compiler tells you in a warning that does not mention prerendering at all.
- **`next/font` and `ImageResponse` do not connect, by design.** One produces CSS for a browser, the other needs font bytes for a rasterizer. Recognising that two APIs share a noun but not a problem saves an afternoon.
- **A `try/catch` that returns a 500 is a way to not find out.** This one hid a broken social card through an unknown number of deploys. When the only consumer of a route is a crawler, "it returns something" is indistinguishable from "it works" unless a test looks at the bytes.
- **A measurement is not a conclusion.** Phase 2 measured 20.6 MB correctly and explained it incorrectly, and the explanation is what got written down and carried forward for seven phases. The trace file was there the whole time.
