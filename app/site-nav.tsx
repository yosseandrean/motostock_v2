export type SiteNavSection =
  | "inventori"
  | "dashboard"
  | "penjualan"
  | "ceklis"
  | "import"
  | "ekspor";

type NavItem = {
  href: string;
  label: string;
  key: SiteNavSection;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inventori", key: "inventori" },
  { href: "/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/sales", label: "Penjualan", key: "penjualan" },
  { href: "/checklist", label: "Data Bermasalah", key: "ceklis" },
  { href: "/import", label: "Impor CSV", key: "import" },
  { href: "/api/export", label: "Ekspor CSV", key: "ekspor" },
];

/**
 * The shared sticky top navigation, rendered on every authenticated screen.
 * `active` names the current section; only that link gets `aria-current="page"`.
 */
export function SiteNav({ active }: { active?: SiteNavSection }) {
  return (
    <header className="site-nav">
      <nav className="site-nav-inner" aria-label="Navigasi utama">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            className="site-nav-link"
            href={item.href}
            aria-current={active === item.key ? "page" : undefined}
          >
            {item.label}
          </a>
        ))}
        <form action="/api/logout" method="post">
          <button type="submit" className="site-nav-logout">
            Keluar
          </button>
        </form>
      </nav>
    </header>
  );
}
