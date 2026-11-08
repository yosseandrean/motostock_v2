import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk — Motostock",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const failed = error === "1";

  return (
    <main className="login-shell">
      <form className="login-card" action="/api/login" method="post">
        <h1 className="login-title">Motostock</h1>
        <p className="login-subtitle">Masuk untuk mengelola inventori</p>

        <label className="field-label" htmlFor="password">
          Kata sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className="field-input"
          aria-describedby={failed ? "login-error" : undefined}
        />

        {failed ? (
          <p id="login-error" className="login-error" role="alert">
            Kata sandi salah.
          </p>
        ) : null}

        <button type="submit" className="login-button">
          Masuk
        </button>
      </form>
    </main>
  );
}
