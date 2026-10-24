import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import api from "./api";
import "./Auth.css";

function Login(){
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/api/auth/login", form);
      localStorage.setItem("vigly_user", JSON.stringify(response.data.user));
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page"><Navbar /><main className="auth-layout">
      <section className="auth-intro"><span className="auth-intro__index">VIGLY / ACCESS</span><h1>Your links,<br /><em>in one place.</em></h1><p>Sign in to watch your links work, tune their expiry, and remove them when they have done their job.</p></section>
      <form className="auth-card" onSubmit={handleSubmit}><div><p className="auth-card__kicker">Welcome back</p><h2>Log in</h2><p className="auth-card__hint">Use the account behind your links.</p></div>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" /></label>
        <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete="current-password" /></label>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        <button className="auth-card__submit" type="submit" disabled={loading}>{loading ? "Signing in..." : "Enter dashboard"}<span aria-hidden="true">&#8594;</span></button>
        <p className="auth-card__switch">New here? <Link to="/signup">Create an account</Link></p>
      </form>
    </main></div>
  );
}
export default Login;