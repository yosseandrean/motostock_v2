import { describe, expect, it } from "vitest";
import UnitDetailPage from "@/app/units/[id]/page";

async function renderPage(id: string): Promise<never> {
  return (await UnitDetailPage({
    params: Promise.resolve({ id }),
  })) as never;
}

describe("unit detail page", () => {
  it("redirects a valid id to the edit page", async () => {
    let thrown: unknown;
    try {
      await renderPage("42");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error & { digest?: string }).digest).toContain(
      "/units/42/edit",
    );
  });

  it("treats a non-integer id as not found", async () => {
    let thrown: unknown;
    try {
      await renderPage("abc");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error & { digest?: string }).digest).toBe(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });
});
