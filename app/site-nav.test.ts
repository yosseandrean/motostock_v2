import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteNav } from "@/app/site-nav";
import type { SiteNavSection } from "@/app/site-nav";

const SECTIONS: { href: string; label: string; active: SiteNavSection }[] = [
  { href: "/", label: "Inventori", active: "inventori" },
  { href: "/dashboard", label: "Dashboard", active: "dashboard" },
  { href: "/sales", label: "Penjualan", active: "penjualan" },
  { href: "/checklist", label: "Ceklis Data", active: "ceklis" },
  { href: "/import", label: "Impor CSV", active: "import" },
  { href: "/units/new", label: "Tambah Unit", active: "tambah" },
  { href: "/api/export", label: "Ekspor CSV", active: "ekspor" },
];

function render(active?: SiteNavSection): string {
  return renderToString(SiteNav({ active }));
}

function anchorMarked(html: string, href: string): boolean {
  return new RegExp(
    `<a[^>]*href="${href}"[^>]*aria-current="page"` +
      `|<a[^>]*aria-current="page"[^>]*href="${href}"`,
  ).test(html);
}

describe("SiteNav", () => {
  it("renders every destination and Keluar", () => {
    const html = render();

    for (const { href, label } of SECTIONS) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(label);
    }
    expect(html).toContain('action="/api/logout"');
    expect(html).toContain("Keluar");
  });

  it("marks no section when none is active", () => {
    expect(render()).not.toContain("aria-current");
  });

  it("drives aria-current=page from the active prop", () => {
    for (const section of SECTIONS) {
      const html = render(section.active);

      expect(html.split('aria-current="page"').length - 1).toBe(1);
      expect(anchorMarked(html, section.href)).toBe(true);

      for (const other of SECTIONS) {
        if (other.href !== section.href) {
          expect(anchorMarked(html, other.href)).toBe(false);
        }
      }
    }
  });
});
