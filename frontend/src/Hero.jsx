import { useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";
import "./Hero.css";

function Hero() {
  const [url, setUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await api.post("/api/urls", {
        originalUrl: url.trim(),
        ...(customAlias.trim() ? { customAlias: customAlias.trim() } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      });
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not shorten that link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__frame">
        <div className="hero__tabs">
          <span className="hero__tab hero__tab--active">
            <span className="hero__tab-icon hero__tab-icon--link" aria-hidden="true">&#8734;</span>
            Short Link
          </span>
        </div>

        <div className="hero__panel">
          <div className="hero__copy">
            <p className="hero__eyebrow">VIGLY LINK TOOL / 01</p>
            <h1 id="hero-title">Turn a long link into a clean one.</h1>
            <p className="hero__subtitle">Paste once. Share anywhere. Track every click when you create an account.</p>
          </div>

          <form className="hero__form" onSubmit={handleSubmit}>
            <label htmlFor="long-link">Paste your long link here</label>
            <input
              id="long-link"
              type="url"
              placeholder="https://example.com/my-long-url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setResult(null);
                setError("");
              }}
              required
            />
            <label className="hero__expiry-label" htmlFor="custom-alias">Optional custom alias</label>
            <input
              id="custom-alias"
              className="hero__alias"
              type="text"
              placeholder="my-link"
              value={customAlias}
              maxLength={32}
              pattern="[A-Za-z0-9_-]{3,32}"
              onChange={(event) => {
                setCustomAlias(event.target.value);
                setResult(null);
                setError("");
              }}
            />
            <p className="hero__field-note">3-32 letters, numbers, hyphens, or underscores.</p>
            <label className="hero__expiry-label" htmlFor="guest-expiry">Optional expiry date</label>
            <input
              id="guest-expiry"
              className="hero__expiry"
              type="datetime-local"
              value={expiresAt}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
            <div className="hero__actions">
              <button className="hero__submit" type="submit" disabled={loading}>
                {loading ? "Creating link..." : "Get your link"}
                <span aria-hidden="true">&#8594;</span>
              </button>
            </div>
            {error && <p className="form-message form-message--error" role="alert">{error}</p>}
            {result && (
              <div className="hero__result" role="status">
                <span>Your short link is ready</span>
                <a href={result.shortUrl} target="_blank" rel="noreferrer">{result.shortUrl}</a>
                <button type="button" onClick={() => navigator.clipboard?.writeText(result.shortUrl)}>Copy link</button>
              </div>
            )}
          </form>
          <p className="hero__note">Want click history, expiry controls, and delete access? <Link to="/signup">Create your workspace</Link>.</p>
        </div>
      </div>
    </section>
  );
}

export default Hero;