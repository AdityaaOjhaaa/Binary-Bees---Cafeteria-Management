import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Handles redirect from w3 SSO callback: reads token and employee from query,
 * stores in auth context, redirects to dashboard.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const employeeParam = searchParams.get("employee");

    if (!token || !employeeParam) {
      setError("Missing token or employee. Login may have failed.");
      return;
    }

    try {
      const employee = JSON.parse(decodeURIComponent(employeeParam)) as {
        id: string;
        email: string;
        name: string;
      };
      if (!employee.id || !employee.email || !employee.name) {
        setError("Invalid employee data.");
        return;
      }
      setAuth(token, employee);
      navigate("/", { replace: true });
    } catch {
      setError("Invalid callback data.");
    }
  }, [searchParams, setAuth, navigate]);

  if (error) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: 400, marginTop: "3rem" }}>
          <h1 style={{ marginTop: 0 }}>Login failed</h1>
          <div className="alert alert-error">{error}</div>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/login", { replace: true })}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ marginTop: "3rem", textAlign: "center" }}>
      <p>Signing you in…</p>
    </div>
  );
}
