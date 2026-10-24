import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import api from "./api";
import "./Auth.css";

function SignUp(){
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/register", form);
      const response = await api.post("/api/auth/login", form);
      localStorage.setItem("vigly_user", JSON.stringify(response.data.user));
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not create the account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page"><Navbar /><main className="auth-layout">
      <section className="auth-intro"><span className="auth-intro__index">VIGLY / START</span><h1>Make every<br /><em>link count.</em></h1><p>Your account keeps the useful parts close: links, clicks, expiry controls, and a clean exit.</p></section>
      <form className="auth-card" onSubmit={handleSubmit}><div><p className="auth-card__kicker">Start your workspace</p><h2>Create account</h2><p className="auth-card__hint">At least 8 characters for your password.</p></div>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" /></label>
        <label>Password<input type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete="new-password" /></label>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        <button className="auth-card__submit" type="submit" disabled={loading}>{loading ? "Creating..." : "Create workspace"}<span aria-hidden="true">&#8594;</span></button>
        <p className="auth-card__switch">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </main></div>
  );
}

export default SignUp;