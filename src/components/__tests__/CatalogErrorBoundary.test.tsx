import { cleanup, render, screen } from "@testing-library/react";
import { notFound, redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CatalogErrorBoundary } from "@/components/CatalogErrorBoundary";

function Thrower(): React.ReactNode {
  throw new Error("catalog is down");
}

describe("CatalogErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("renders the label when a child throws", () => {
    render(
      <CatalogErrorBoundary label="These products could not be loaded.">
        <Thrower />
      </CatalogErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeDefined();
    expect(
      screen.getByText("These products could not be loaded."),
    ).toBeDefined();
  });

  test("renders children when nothing throws", () => {
    render(
      <CatalogErrorBoundary label="nope">
        <p>the grid</p>
      </CatalogErrorBoundary>,
    );
    expect(screen.getByText("the grid")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  /**
   * `notFound()` and `redirect()` are implemented as thrown sentinel errors
   * that Next catches above the boundary. A hand-written `componentDidCatch`
   * would swallow them and render this fallback, turning a 404 or a redirect
   * into "something went wrong". `catchError` re-throws them, which outside a
   * Next render surfaces as the error escaping `render()`.
   */
  test.each([
    ["notFound", notFound],
    ["redirect", () => redirect("/")],
  ])("does not swallow %s()", (_name, signal) => {
    function Signaller(): React.ReactNode {
      signal();
      return null;
    }

    expect(() =>
      render(
        <CatalogErrorBoundary label="should not appear">
          <Signaller />
        </CatalogErrorBoundary>,
      ),
    ).toThrow();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
