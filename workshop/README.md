# FakeShop workshop

Documentation for taking FakeShop from the Next 15 canary app it was written as to Next 16.3.

## Purpose

- **For the AI**: recover context fast. Where we are, what has been built, why.
- **For me**: a record of what each Next.js feature actually does, written after using it rather than after reading about it.

## Key files

- [`MEMORY.md`](../MEMORY.md) — current phase and progress, updated often
- [`AGENTS.md`](../AGENTS.md) — project rules and how we pair
- [`upgrade-plan.md`](./upgrade-plan.md) — the audit and the ten-phase plan
- [`ARTICLE.md`](../ARTICLE.md) — the original write-up from March 2025

## Phase documentation

Each phase document covers:
- **Concepts** — the Next.js feature and how it works
- **Implementation** — what changed
- **Key files** — the code worth rereading
- **Learning outcomes** — what I took away

### Groundwork

- [x] [Phase 0: Make the repo tell the truth](./phase-0.md)
- [x] [Phase 1: Reach 16.3 and React 19.2](./phase-1.md)
- [x] [Phase 2: Toolchain](./phase-2.md)
- [ ] Phase 3: Middleware becomes proxy

### The caching model

- [ ] Phase 4: Cache Components properly
- [ ] Phase 5: Error boundaries that can retry

### Instant navigations

- [ ] Phase 6: Partial prefetching and instant navigations
- [ ] Phase 7: Locking the behaviour down
- [ ] Phase 8: Navigation polish

### Stretch

- [ ] Phase 9: Root params and the OG image

## Approach

1. **Concept first, code second.** The explanation comes before the diff.
2. **Measure the before.** Build output, route table, terminal logs, DevTools. A demo app is only interesting if you can see what changed.
3. **One phase, one branch, one PR.**
4. **Write the phase doc while it is fresh**, then update `MEMORY.md`.
