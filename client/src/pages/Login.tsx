import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../api/client";

type LoginMode = "choose" | "demo" | "ibm";

export default function Login() {
  const [mode, setMode] = useState<LoginMode>("choose");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  // HARDCODED URL to fix the 404 in your screenshot
  const API_BASE_URL = "https://cafeteria-api-t06o.onrender.com";

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email.trim(), name.trim());
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.data?.token && res.data?.employee) {
        setAuth(res.data.token, res.data.employee);
        navigate("/", { replace: true });
      }
    } catch (_e) {
      setError(`Cannot reach server at ${API_BASE_URL}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleIbmLogin = () => {
    setError("");
    // This now explicitly points to Render, bypassing GitHub's 404
    window.location.href = `${API_BASE_URL}/api/auth/w3/login`;
  };

  if (mode === "choose") {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: 420, marginTop: "3rem" }}>
          <h1 style={{ marginTop: 0 }}>Cafeteria Seat Reservation</h1>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
            Choose how you want to sign in.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "1rem", textAlign: "left" }}
              onClick={() => setMode("demo")}
            >
              <strong>Demo user</strong>
              <br />
              <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                Sign in with email and name (for testing / local dev)
              </span>
            </button>
            <button
              type="button"
              className="btn"
              style={{ padding: "1rem", textAlign: "left" }}
              onClick={() => setMode("ibm")}
            >
              <strong>IBM employee</strong>
              <br />
              <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                Sign in with w3 SSO (company credentials)
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "ibm") {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: 400, marginTop: "3rem" }}>
          <h1 style={{ marginTop: 0 }}>IBM w3 SSO</h1>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
            You will be redirected to the company login page.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", marginBottom: "0.5rem" }}
            onClick={handleIbmLogin}
          >
            Continue with w3 SSO
          </button>
          <button type="button" className="btn" style={{ width: "100%" }} onClick={() => { setMode("choose"); setError(""); }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 400, marginTop: "3rem" }}>
        <h1 style={{ marginTop: 0 }}>Demo user</h1>
        <form onSubmit={handleDemoSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              autoComplete="name"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginBottom: "0.5rem" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <button type="button" className="btn" style={{ width: "100%" }} onClick={() => { setMode("choose"); setError(""); }}>
            Back
          </button>
        </form>
      </div>
    </div>
  );
}
