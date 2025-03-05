---
title: React Server Components in Practice: Building a fake E-commerce Site with Next.js 15 latest features
published: true
description: Discover how to use the latest features of Next.js 15 to build a fake e-commerce site with React Server Components and Server Actions.
tags: nextjs, react, servercomponents, serveractions
cover_image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/elieepx6q62vibxz0qiv.png
# Use a ratio of 100:42 for best results.
# published_at: 2025-03-04 13:06 +0000
---

[👀 See the demo here](https://thefakeshop.vercel.app/) - [👨‍💻 See the source code here](https://github.com/topheman/fakeshop)

For the last 18 months, in the react ecosystem, we have been witnessing the rise of server components.

It's not the only new concept that has been introduced. Metaframeworks like Next.js have been relying for months on alpha/beta/RC versions of react 19, preparing for features like:

- RSC (React Server Components)
- Server Actions
- Streaming
- New caching strategies
- Partial Prerendering

The stable version of react 19 shipped in December 2024 (see [their blog post](https://react.dev/blog/2024/12/05/react-19)).

## Table of Contents

- [Experiments](#experiments)
- [Features of the project](#features-of-the-project)
- [Tech stack](#tech-stack)
- [Implementation](#implementation)
  - [Experimental flags](#experimental-flags)
  - [Server components](#server-components)
      - [Layout](#layout-rsc-ppr-build-time-generation-of-static-layout)
      - [QR Code Generation](#qrcode-rsc-ppr-use-cache-build-time-generation-of-static-content)
      - [Header / UserIcon](#header-usericon-rsc-suspense-ppr-dynamicio-streaming)
      - [Header / SearchCombobox](#header-searchcombobox-rsc-suspense-dynamicio-progressive-enhancement)
      - [Category page](#category-page-rsc-suspense-streaming)
      - [Search Page / Product Page](#search-page-product-page-rsc-suspense-streaming)
  - [Mixing RSC and client components](#mixing-rscs-with-client-components)
  - [Server actions](#server-actions)
  - [Progressive Enhancement](#progressive-enhancement)
- [Conclusion](#conclusion)

## Experiments

For the last year, multiple blog posts and videos have been published explaining how you would use those new features (some content even go deeper explaining some implementation details).

Those are great content, however, they don't address the following questions:

- Should we now go all-in on <abbr title="React Server Components">RSCs</abbr> and Server Actions? Drop all client components?
- How does this mix with client-side fetching? (react query, etc ...)
- When should you use either one of them?

This is why I decided to build a real project to experiment on those new features.

## Features of the project

[👀 See the demo here](https://thefakeshop.vercel.app/) - [👨‍💻 See the source code here](https://github.com/topheman/fakeshop)

It's a fake e-commerce website, that allows you to:

- Access list of categories of products
- Access products by category
- Access product details
- Search for products
- Add/remove product to/from cart
- View cart
- Login/Logout (a fake identity is generated for you when you login)
- Checkout (a fake payment is made)

Constraints:

- It should be SSR friendly (for performance and SEO reasons)
- It should also have a good user experience on client-side (fast navigation, interactivity, etc ...)
- It should take in account progressive enhancement
- Real api calls are made to an external API containing mock data

## Tech stack

- Next.js 15.2 - canary version (some features are not yet available in the stable version)
- React 19
- Tailwind CSS
- TypeScript
- Shadcn UI
- Vercel (for hosting)
- No database, everything is stored on cookies for simplicity

## Implementation

### Experimental flags

I turned on the following experimental flags (which needed the canary version of Next.js):

<details>
  <summary><code>dynamicIO</code></summary>
<blockquote>
<p>The <code>dynamicIO</code> flag is an experimental feature in Next.js that causes data fetching operations in the App Router to be excluded from pre-renders unless they are explicitly cached.</p>
<p>It is useful if your application requires fresh data fetching during runtime rather than serving from a pre-rendered cache.</p>
<p>It is expected to be used in conjunction with <code>use cache</code> so that your data fetching happens at runtime by default unless you define specific parts of your application to be cached with <code>use cache</code> at the page, function, or component level.</p>
</blockquote>
  [Link to documentation (dynamicIO)](https://nextjs.org/docs/app/api-reference/config/next-config-js/dynamicIO)
</details>

<details>
  <summary><code>ppr</code></summary>

<blockquote>
<p>Partial Prerendering (PPR) enables you to combine static and dynamic components together in the same route.</p>
</blockquote>

  [Link to documentation (PPR)](https://nextjs.org/docs/app/api-reference/config/next-config-js/ppr)

</details>

Here is the report of the build, you can see most of the routes are partially prerendered as static HTML with dynamic server-streamed content. ◐

```
Route (app)                              Size     First Load JS
┌ ◐ /                                    214 B           195 kB
├ ○ /_not-found                          140 B           120 kB
├ ◐ /account                             671 B           196 kB
├ ○ /api/hello/world                     140 B           120 kB
├ ƒ /api/og                              353 B           121 kB
├ ◐ /category/[slug]                     1.17 kB         196 kB
├   └ /category/[slug]
├ ◐ /checkout                            207 B           195 kB
├ ◐ /login                               214 B           195 kB
├ ◐ /product/[slug]                      1.04 kB         196 kB
├   └ /product/[slug]
└ ◐ /search                              1.17 kB         196 kB
+ First Load JS shared by all            120 kB
  ├ chunks/520-047851854c706276.js       60.6 kB
  ├ chunks/f5e865f6-9abf91c0747daaa2.js  57.8 kB
  └ other shared chunks (total)          1.92 kB


ƒ Middleware                             33.1 kB

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand
```

### Server components

By default, all components are server components in Next.js App Router, unless you explicitly mark them as client components using the `"use client"` directive.

In RSCs, you can:

- Fetch data, access backend resources directly (APIS, databases, file-system, etc ...)
- Keep large dependencies and sensitive data on the server
- Send only the HTML output to the client

RSCs can be rendered on the server, they can also be rendered at build time - any runtime which doesn't have interactive content.

I will detail a few use cases I implemented on this project which leverages RSC features with the experimental flags I enabled.

The server actions part is detailed in the next section.

#### Layout - RSC + PPR = build time generation of static layout

A simplified version of the layout component:

```tsx
<Providers>
  <Header />
  <Cart />
  <main>
    {children}
  </main>
  <Footer />
</Providers>
```

Since every components are server components by default, it will return a static HTML shell.

Since we enabled the `ppr` flag, the layout will be rendered at build time, and the HTML will be cached (as it doesn't need to be rendered on each request).

You still can include client components, like the `Cart` component, which will be rendered on the client.

*Unrelated:* on this project, I use the [Route groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups) feature to have a specific layout for the checkout page and a generic one for the rest of the app.

#### QRCode - RSC + PPR + "use cache" = build time generation of static content

- <small>[src/components/CustomQRCode.tsx](https://github.com/topheman/fakeshop/blob/master/src/components/CustomQRCode.tsx)</small>
- <small>[src/app/page.tsx](https://github.com/topheman/fakeshop/blob/master/src/app/(shop)/page.tsx)</small>

On the home page, I display a QRCode linking to the website, which is rendered by this react component: `<CustomQRCode payload="https://thefakeshop.vercel.app/" />`.

`CustomQRCode` being a server component, it lets us use the `toDataURL` from the [`qrcode`](https://www.npmjs.com/package/qrcode) package to generate the QRCode image. Since RSCs can be async, we can `await toDataURL` directly in the component.

That way, we don't need to ship the `qrcode` package to the client bundle, the RSC will return the HTML containing the QRCode image (an img tag with a data url).

Even better: since the url we want our QRCode is static (it won't change based on the request), we can tag the `CustomQRCode` with the `"use cache"` directive which, when used on a project with `ppr` (Partial Prerendering) enabled, **will prerender the QRCode image at build time**.

#### Header / UserIcon - RSC + Suspense + PPR + DynamicIO = streaming

- <small>[src/components/Header.tsx](https://github.com/topheman/fakeshop/blob/master/src/components/Header.tsx)</small>
- <small>[src/components/UserIcon.tsx](https://github.com/topheman/fakeshop/blob/master/src/components/UserIcon.tsx)</small>

In the `Header` component, I use a `UserIcon` server component, either:

- shows a white user icon if the user is not logged in
- shows a green user icon (which links to the account page) if the user is logged in

```tsx
// Header.tsx - simplified version
import { Suspense } from "react";
import { User } from "lucide-react";

import UserIcon from "./UserIcon";

<header>
  {/* Rest of the header */}
  <Suspense fallback={<User />}>
    <UserIcon />
  </Suspense>
</header>
```

```tsx
// UserIcon.tsx - simplified version
import { User } from "lucide-react"; // The user svg icon
import Link from "next/link";

import { getUserInfos } from "@/actions/session";

export async function UserIcon() {
  // Fetches the user infos server-side
  const userInfos = await getUserInfos();

  return (
    <Link href="/account">
      <User className={userInfos ? "text-green-300" : ""} />
    </Link>
  );
}
```

1. At build time, the `User` component (which is the fallback for our `Suspense` boundary wrapping `UserIcon`) is rendered and cached. Thanks to the `ppr` flag, it will be rendered as static HTML.
2. At runtime, when the server starts streaming the HTML, it first returns this fallback HTML as part as the HTML response.
3. While the HTML is being streamed to the client, the `UserIcon` server component is rendered on the server.
4. If the user is logged in, a fragment of HTML containing the green user icon is streamed to the client which will replace the fallback HTML.

All that **in the same HTTP response**. And since our "loading" state is just the default `User` icon, it doesn't show at all.

Here is a simplified version of the raw HTML response with comments to explain the streaming part, follow the 🔍 comments to understand the streaming process:

```html
<!DOCTYPE html>
<html lang="en">
    <body>
        <header>
            <div>
                <a href="/">
                    <span>Fake</span>
                    <span>Shop</span>
                </a>
                <form action="/search"><!-- form for the search combobox (explained in the next section) --></form>
                <nav>
                    <ul>
                        <li>
                            <!--$?-->
                            <template id="B:0"></template>
<!-- 🔍 1. default icon --> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user " data-prerender-hint="default icon prerendered">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <!--/$-->
                        </li>
                        <li class=""><!-- cart button --></li>
                    </ul>
                </nav>
            </div>
        </header>
        <main></main>
        <footer></footer>
        <div hidden id="S:0"> <!--- 🔍 2. the logged in user icon which was streamed down to the client -->
            <a class="hover:text-gray-300" title="Logged in as Kaley Weimann" href="/account">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-green-300">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </a>
        </div>
        <script>
            // 🔍 3. light runtime that will swap suspense fallback with the streamed content
            $RC = function(b, c, e) {
                c = document.getElementById(c);
                c.parentNode.removeChild(c);
                var a = document.getElementById(b);
                if (a) {
                    b = a.previousSibling;
                    if (e)
                        b.data = "$!",
                        a.setAttribute("data-dgst", e);
                    else {
                        e = b.parentNode;
                        a = b.nextSibling;
                        var f = 0;
                        do {
                            if (a && 8 === a.nodeType) {
                                var d = a.data;
                                if ("/$" === d)
                                    if (0 === f)
                                        break;
                                    else
                                        f--;
                                else
                                    "$" !== d && "$?" !== d && "$!" !== d || f++
                            }
                            d = a.nextSibling;
                            e.removeChild(a);
                            a = d
                        } while (a);
                        for (; c.firstChild; )
                            e.insertBefore(c.firstChild, a);
                        b.data = "$"
                    }
                    b._reactRetry && b._reactRetry()
                }
            }
            ;
            $RC("B:0", "S:0") // 🔍 4. swapping the default icon with the streamed logged in icon
        </script>
        <script>
            (self.__next_f = self.__next_f || []).push([0])
        </script>
        <script>
            self.__next_f.push([1, "..."])
        </script>
    </body>
</html>
```

#### Header / SearchCombobox - RSC + Suspense + dynamicIO = progressive enhancement

- <small>[src/components/Header.tsx](https://github.com/topheman/fakeshop/blob/master/src/components/Header.tsx)</small>
- <small>[src/components/SearchCombobox.tsx](https://github.com/topheman/fakeshop/blob/master/src/components/SearchCombobox.tsx)</small>
- <small>[src/components/SearchComboboxSkeleton.tsx](https://github.com/topheman/fakeshop/blob/master/src/components/SearchComboboxSkeleton.tsx)</small>

The `SearchCombobox` relies on `@headlessui/react` for the combobox UI, and `react-query` for the search request of the autocomplete. So it's a **client component**.

Since we use the `dynamicIO` flag, NextJS will attempt to render the `SearchCombobox` at build time (as it is a client component, on the Layout, which is statically rendered at build time).

However, since we also rely on `useSearchParams` on this component, [we have to wrap it inside a `Supense` boundary](https://nextjs.org/docs/app/api-reference/functions/use-search-params#behavior).

```tsx
// Header.tsx - simplified version
import { Suspense } from "react";

import SearchCombobox from "./SearchCombobox";
import SearchComboboxSkeleton from "./SearchComboboxSkeleton";

<header>
  {/* Rest of the header */}
  <Suspense fallback={<SearchComboboxSkeleton />}>
    <SearchCombobox />
  </Suspense>
</header>
```

```tsx
// SearchCombobox.tsx - simplified version
"use client";

export function SearchCombobox({ initialQuery = "" }) {
  // all the client-side logic for the combobox (autocomplete UI, react-query, etc ...)

  return (
    <form role="search" action="/search">
      <Combobox/>
    </form>
  );
}
```

```tsx
// SearchComboboxSkeleton.tsx - simplified version
export function SearchComboboxSkeleton() {
  // the skeleton of the combobox - exactly looks like the `SearchCombobox` component
  return (
    <form role="search" action="/search">
      <input type="text" name="q" placeholder="Search products..." />
    </form>
  );
}
```

That way, the fallback for the `Suspense` boundary of the `SearchCombobox` component will be the `SearchComboboxSkeleton` which:

- looks just like the `SearchCombobox` component
- is statically rendered at build time
- doesn't require any client-side JavaScript

That way, the search combobox will be usable as soon as this part of the HTML is loaded, even before the whole page or the JavaScript is loaded - **progressive enhancement**.

Once the JavaScript is loaded, the DOM of the `SearchComboboxSkeleton` will be replaced with the real `SearchCombobox` component which will be interactive.

#### Category Page - RSC + Suspense = streaming

- <small>[src/app/(shop)/category/[slug]/page.tsx](https://github.com/topheman/fakeshop/blob/master/src/app/(shop)/category/[slug]/page.tsx)</small>
- <small>[src/components/ProductGridLoading.tsx](https://github.com/topheman/fakeshop/blob/master/src/components/ProductGridLoading.tsx)</small>
- <small>[src/components/ProductGridSkeleton.tsx](https://github.com/topheman/fakeshop/blob/master/src/components/ProductGridSkeleton.tsx)</small>

The category `page.tsx` file exports a sync root component that:

- wraps a `CategoryContent` component with a `Suspense` boundary
  - with the `dynamicIO` flag, if the `page.tsx` exported an async component it would be considered as dynamic and would be rendered on the server everytime
  - since we export a sync component, the `CategoryContent` will be rendered at build time and cached as static HTML (better for perf)
  - the skeleton showed while loading `ProductGridLoading` is rendered at build time and cached as static HTML
- passes the `params` to this `CategoryContent` component
  - this component is async and handles loading the products by category with `getProductsByCategory` at runtime

Splitting the code like this lets us:

- have a fast initial page load (the HTML is rendered at build time)
- stream the products to the client in the same HTTP response (the `CategoryContent` component is server-side rendered)

Other benefits:

- the `ProductGrid` component shows the details of each product with a `Link` to their detail page
- that way, [NextJS will prefetch](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating#2-prefetching) the detail page of each product, that way, accessing the detail page of a product will be very fast

Here is a simplified version of the code of the category page:

```tsx
// src/app/(shop)/category/[slug]/page.tsx - simplified version
import { slugToDisplayName } from "@/utils/slugUtils";

// Sync root component
export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <PageContainer>
      <Suspense fallback={<ProductGridLoading />}>
        <CategoryContent params={params} />
      </Suspense>
    </PageContainer>
  );
}

// Async child component
async function CategoryContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { products } = await getProductsByCategory(slug);

  return (
    <>
      <h1>{slugToDisplayName(slug)}</h1>
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <p>No products found in this category.</p>
      )}
    </>
  );
}
```

This is the component that handles the loading state of the category page (and the search page). In order to avoid a flash on the title of the page (when it will be replaced by the real title), it is infered from the pathname.

```tsx
// ProductGridLoading.tsx - simplified version
"use client";

import { slugToDisplayName } from "@/utils/slugUtils";

export function ProductGridLoading() {
  const [title, setTitle] = useState("Loading ...");

  useEffect(() => {
    const pathname = window.location.pathname;

    if (pathname === "/search") {
      const query = new URLSearchParams(window.location.search).get("q");
      setTitle(`Search results for "${query}"`);
    } else if (pathname.startsWith("/category/")) {
      const slug = pathname.split("/").pop();
      if (slug) {
        setTitle(slugToDisplayName(slug));
      }
    }
  }, []);

  return (
    <>
      <h1>{title}</h1>
      <ProductGridSkeleton />
    </>
  );
}
```

#### Search Page / Product Page - RSC + Suspense = streaming

- <small>[src/app/(shop)/search/page.tsx](https://github.com/topheman/fakeshop/blob/master/src/app/(shop)/search/page.tsx)</small>
- <small>[src/app/(shop)/product/[slug]/page.tsx](https://github.com/topheman/fakeshop/blob/master/src/app/(shop)/product/[slug]/page.tsx)</small>
- <small>[src/components/ProductGridLoading.tsx](https://github.com/topheman/fakeshop/blob/master/src/components/ProductGridLoading.tsx)</small>
- <small>[src/components/ProductGridSkeleton.tsx](https://github.com/topheman/fakeshop/blob/master/src/components/ProductGridSkeleton.tsx)</small>

On the render level, it works mostly the same way as the category page.

### Mixing RSCs with client components

Until now, we have been mainly using RSCs.

Here are the main client components that are used in the project:

- `SearchCombobox` - a client component that relies on `react-query` to fetch the search results
- `AddToCartButton` - a client component that displays an icon button to add a product to the cart
- `Cart` - a client component that displays the cart and allows to update the quantity of the items
  - It shows when you click on the `AddToCartButton` component or on the cart icon in the `Header` component
  - It relies on `react-query` to fetch the cart items and the products

### Server Actions

[NextJS documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

> Server Actions are asynchronous functions that are executed on the server. They can be called in Server and Client Components to handle form submissions and data mutations in Next.js applications.

- No need to mount seperate api routes
- Only call functions from the server actions

Server actions are often presented inside `<form action={myServerAction}>` usage. Here are two examples on this project:

- Login Page: [src/app/(shop)/login/page.tsx](https://github.com/topheman/fakeshop/blob/master/src/app/(shop)/login/page.tsx)
- Checkout Page: [src/app/(checkout)/checkout/page.tsx](https://github.com/topheman/fakeshop/blob/master/src/app/(checkout)/checkout/page.tsx)

I'm also using react-query on the client side to handle the cart. Since react-query only expects a function that returns a promise, you can totally mix it with server actions (you don't have to open a new api route, only call functions from the server actions).

[See my custom react-query hooks example](https://github.com/topheman/fakeshop/blob/master/src/hooks/cart.tsx).

### Progressive enhancement

Often, when people talk about progressive enhancement, they talk about the ability to use the page even if JavaScript is disabled.

With features like RSC streaming that returns the critical HTML first so that the page renders as soon as it loads and swaps the loaded HTML with the final one as soon as the final chunks are loaded, **we need JavaScript to be enabled**.

This is about performance. Example on this project:

- If you land on a category page which takes too long to load
- The header will be sent in the first chunks of the HTML response
- It will contain the JS-free version of the `SearchCombobox` component
- You will still be able to make a search even if the JavaScript is still loading and hasn't bootstrapped the page

Thanks to `<form action="/search"><input name="q" /></form>` which doesn't need JavaScript to be enabled.

## Conclusion

Server components is a great piece of technology.

I really learned a lot about caching strategies on NextJS.

I succeeded in my challenge of mixing server actions and react-query. However, I don't know yet what is the best strategy (maybe like every topic in software development, it depends). If you have any feedback or suggestions, please let me know.


