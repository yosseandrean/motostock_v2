import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import type { SearchParams } from "@/app/import/page";

let ImportPage: (props: {
  searchParams: Promise<SearchParams>;
}) => Promise<ReactElement>;

async function renderPage(
  searchParams: SearchParams = {},
): Promise<string> {
  const element = await ImportPage({
    searchParams: Promise.resolve(searchParams),
  });
  return renderToString(element);
}

/** React renderToString joins text and interpolations with `<!-- -->`. */
function withoutComments(html: string): string {
  return html.replace(/<!-- -->/g, "");
}

beforeAll(async () => {
  ImportPage = (await import("@/app/import/page")).default;
});

describe("import page", () => {
  it("renders the CSV import form", async () => {
    const html = await renderPage();

    expect(html).toContain("Impor CSV");
    expect(html).toContain('action="/api/import"');
    expect(html).toContain('method="post"');
    expect(html).toContain('encType="multipart/form-data"');
    expect(html).toContain('name="file"');
    expect(html).toContain('type="file"');
    expect(html).toContain("File CSV (16 kolom)");
    expect(html).toContain(">Impor<");
    expect(html).toContain("inventory_example.csv");
  });

  it("marks Impor CSV as the active nav section", async () => {
    const html = await renderPage();

    expect(
      new RegExp(
        `<a[^>]*href="/import"[^>]*aria-current="page"` +
          `|<a[^>]*aria-current="page"[^>]*href="/import"`,
      ).test(html),
    ).toBe(true);
  });

  it("renders the import result with counts and rejection reasons", async () => {
    const html = await renderPage({
      imported: "3",
      skipped: "1",
      rejected: "2",
      rejections: JSON.stringify([
        { line: 2, reason: "missing Brand" },
        { line: 5, reason: "invalid Buy Price" },
      ]),
    });

    expect(html).toContain("Hasil impor");
    expect(withoutComments(html)).toContain("Diimpor: 3");
    expect(withoutComments(html)).toContain("Dilewati (duplikat): 1");
    expect(withoutComments(html)).toContain("Ditolak: 2");
    expect(html).toContain("Baris");
    expect(html).toContain("Alasan");
    expect(html).toContain("missing Brand");
    expect(html).toContain("invalid Buy Price");
  });

  it("shows the missing-file error and no result on a failed submit", async () => {
    const html = await renderPage({ error: "missing" });

    expect(html).toContain("Pilih file CSV terlebih dahulu.");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("Hasil impor");
  });
});
