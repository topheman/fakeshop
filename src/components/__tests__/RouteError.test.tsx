import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { RouteError } from "../RouteError";

describe("RouteError", () => {
  beforeEach(() => {
    // The component logs the digest on mount; keep it out of the test output.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // Vitest runs without globals, so React Testing Library never finds an
  // `afterEach` to register its automatic cleanup on and rendered trees pile
  // up in the same document between tests.
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("renders the title and description it is given", () => {
    render(
      <RouteError
        error={new Error("boom")}
        retry={vi.fn()}
        title="This page could not be loaded"
        description="Try again in a moment."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "This page could not be loaded" }),
    ).toBeDefined();
    expect(screen.getByText("Try again in a moment.")).toBeDefined();
  });

  test("calls retry, not reset, when the button is clicked", () => {
    const retry = vi.fn();
    render(
      <RouteError
        error={new Error("boom")}
        retry={retry}
        title="t"
        description="d"
      />,
    );

    screen.getByRole("button", { name: "Try again" }).click();

    expect(retry).toHaveBeenCalledOnce();
  });

  test("shows the digest so a production report can be matched to a server log", () => {
    const error = Object.assign(new Error("boom"), { digest: "2377060459" });
    render(
      <RouteError error={error} retry={vi.fn()} title="t" description="d" />,
    );

    expect(screen.getByText("Reference: 2377060459")).toBeDefined();
  });

  test("omits the reference line when there is no digest", () => {
    render(
      <RouteError
        error={new Error("boom")}
        retry={vi.fn()}
        title="t"
        description="d"
      />,
    );

    expect(screen.queryByText(/^Reference:/)).toBeNull();
  });
});
