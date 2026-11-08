import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impor CSV — Motostock",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  imported?: string;
  skipped?: string;
  rejected?: string;
  rejections?: string;
  error?: string;
};

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const hasResult = params.imported !== undefined;
  const imported = Number(params.imported ?? 0);
  const skipped = Number(params.skipped ?? 0);
  const rejected = Number(params.rejected ?? 0);

  let rejections: { line: number; reason: string }[] = [];
  if (params.rejections) {
    try {
      rejections = JSON.parse(params.rejections);
    } catch {
      rejections = [];
    }
  }

  return (
    <main className="inventory-shell">
      <header className="inventory-header">
        <h1 className="inventory-title">Impor CSV</h1>
        <nav className="nav-links">
          <a className="nav-link" href="/">
            Inventori
          </a>
          <a className="nav-link" href="/checklist">
            Ceklis Data
          </a>
          <a className="nav-link" href="/api/export">
            Ekspor CSV
          </a>
          <form action="/api/logout" method="post">
            <button type="submit" className="logout-button">
              Keluar
            </button>
          </form>
        </nav>
      </header>

      <form
        action="/api/import"
        method="post"
        encType="multipart/form-data"
        className="import-card"
      >
        <label className="field-label" htmlFor="file">
          File CSV (16 kolom)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="field-input"
        />
        <button type="submit" className="login-button">
          Impor
        </button>
        <p className="import-hint">
          Kolom dan urutannya harus sama dengan <code>inventory_example.csv</code>. Baris
          dengan Chassis Serial Number yang sudah ada dilewati.
        </p>
      </form>

      {params.error === "missing" ? (
        <p className="import-error" role="alert">
          Pilih file CSV terlebih dahulu.
        </p>
      ) : null}

      {hasResult ? (
        <section className="import-result" aria-live="polite">
          <h2 className="import-result-title">Hasil impor</h2>
          <ul className="import-summary">
            <li>Diimpor: {imported}</li>
            <li>Dilewati (duplikat): {skipped}</li>
            <li>Ditolak: {rejected}</li>
          </ul>
          {rejections.length > 0 ? (
            <table className="unit-table">
              <thead>
                <tr>
                  <th scope="col">Baris</th>
                  <th scope="col">Alasan</th>
                </tr>
              </thead>
              <tbody>
                {rejections.map((rejection) => (
                  <tr key={rejection.line}>
                    <td>{rejection.line}</td>
                    <td>{rejection.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
