import { loginAction } from "@/app/actions";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;
  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <section className="card">
        <span className="pill">Personal Finance Management</span>
        <h1>Login PFMS</h1>
        {q.error && <p className="negative">Email atau password salah.</p>}
        <form className="form" action={loginAction}>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" required />
          </label>
          <button>Masuk</button>
        </form>
        <hr />
        <p className="muted">
          Akun demo tersedia:
          <br />
          user@pfms.local | admin@pfms.local | auditor@pfms.local
        </p>
      </section>
    </main>
  );
}
