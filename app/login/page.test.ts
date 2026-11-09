import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

let LoginPage: (props: {
  searchParams: Promise<{ error?: string }>;
}) => Promise<ReactElement>;

async function renderPage(error?: string): Promise<string> {
  const element = await LoginPage({
    searchParams: Promise.resolve(error ? { error } : {}),
  });
  return renderToString(element);
}

beforeAll(async () => {
  LoginPage = (await import("@/app/login/page")).default;
});

describe("login page", () => {
  it("renders a dark login form with a password field", async () => {
    const html = await renderPage();

    expect(html).toContain('action="/api/login"');
    expect(html).toContain('method="post"');
    expect(html).toContain('name="password"');
    expect(html).toContain('type="password"');
    expect(html).toContain("Kata sandi");
    expect(html).toContain("Masuk");
  });

  it("shows the wrong-password message on error", async () => {
    const html = await renderPage("1");

    expect(html).toContain("Kata sandi salah.");
    expect(html).toContain('role="alert"');
  });

  it("does not show the error message on a clean load", async () => {
    const html = await renderPage();

    expect(html).not.toContain("Kata sandi salah.");
  });
});
