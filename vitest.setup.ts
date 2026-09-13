import { createRequire } from "node:module";

/**
 * The App Router runs on the React that Next bundles, which is a canary build
 * and exports `<ViewTransition>`. The `react` resolved from the project root is
 * the stable release, and it does not, so any component that renders one is
 * `undefined` here while working in the browser.
 *
 * Aliasing the tests onto Next's bundled copy is not an option: Testing Library
 * is externalized and resolves `react-dom` through Node, which ignores the
 * bundler's aliases, so the renderer and the components would end up on two
 * different Reacts. A passthrough costs nothing instead — jsdom implements no
 * view transitions, so there is no animation to observe and nothing an
 * assertion could read. What the transition does at runtime is covered by
 * `e2e/view-transitions.test.ts`, in a browser that actually runs it.
 */
const require = createRequire(import.meta.url);
const react: { ViewTransition?: unknown } = require("react");

react.ViewTransition ??= ({ children }: { children: React.ReactNode }) =>
  children;
