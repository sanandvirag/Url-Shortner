import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import api from "./api";
import "./Dashboard.css";

const PAGE_SIZE = 100;

function formatDate(value) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Dashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [page, setPage] = useState(0);

  async function loadAnalytics(requestedPage = page) {
    try {
      const response = await api.get(`/api/urls/analytics?limit=${PAGE_SIZE}&offset=${requestedPage * PAGE_SIZE}`);
      setAnalytics(response.data);
      setError("");
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        localStorage.removeItem("vigly_user");
        navigate("/login");
        return;
      }
      setError(requestError.response?.data?.message || "Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, [page]);

  async function updateExpiry(url, value) {
    setSavingId(url.id);
    try {
      await api.patch(`/api/urls/${url.id}/expiry`, { expiresAt: value ? new Date(value).toISOString() : null });
      await loadAnalytics(page);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update expiry.");
    } finally {
      setSavingId("");
    }
  }

  async function deleteUrl(url) {
    if (!window.confirm(`Delete ${url.shortCode}? This cannot be undone.`)) return;
    setSavingId(url.id);
    try {
      await api.delete(`/api/urls/${url.id}`);
      await loadAnalytics(page);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not delete this link.");
    } finally {
      setSavingId("");
    }
  }

  const urls = analytics?.urls || [];

  return <div className="dashboard-page"><Navbar /><main className="dashboard-shell">
    <header className="dashboard-header"><div><p className="dashboard-kicker">YOUR WORKSPACE / 02</p><h1>Link control room</h1><p>Keep an eye on what is moving, and retire links when they are done.</p></div><Link className="dashboard-create" to="/">Create a link <span aria-hidden="true">+</span></Link></header>
    {error && <p className="form-message form-message--error dashboard-error" role="alert">{error}</p>}
    <section className="dashboard-stats" aria-label="Link summary"><div><span>Total links</span><strong>{analytics?.pagination?.totalUrls ?? urls.length}</strong></div><div><span>Total clicks</span><strong>{analytics?.totalClicks ?? 0}</strong></div><div><span>Active links</span><strong>{analytics?.pagination?.activeUrls ?? urls.filter((url) => !url.expiresAt || new Date(url.expiresAt) > new Date()).length}</strong></div></section>
    <section className="links-section"><div className="links-section__heading"><div><p className="dashboard-kicker">LINKS / ALL</p><h2>Your short links</h2></div><span>{loading ? "Syncing..." : `${urls.length} ${urls.length === 1 ? "link" : "links"}`}</span></div>
      {loading ? <div className="dashboard-empty"><span className="loading-dot" /> Loading your links...</div> : urls.length === 0 ? <div className="dashboard-empty"><h3>No links yet.</h3><p>Your next useful link is one paste away.</p><Link to="/">Shorten a link <span aria-hidden="true">&#8594;</span></Link></div> : <div className="links-list">{urls.map((url) => <article className="link-row" key={url.id}>
        <div className="link-row__main"><a className="link-row__short" href={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/urls/${url.customAlias || url.shortCode}`} target="_blank" rel="noreferrer">/{url.customAlias || url.shortCode}</a><p title={url.originalUrl}>{url.originalUrl}</p></div>
        <div className="link-row__metric"><strong>{url.totalClicks}</strong><span>clicks</span></div>
        <div className="link-row__expiry"><span>Expires</span><strong className={url.expiresAt && new Date(url.expiresAt) < new Date() ? "is-expired" : ""}>{formatDate(url.expiresAt)}</strong><input aria-label={`Update expiry for ${url.shortCode}`} type="datetime-local" min={new Date().toISOString().slice(0, 16)} onChange={(event) => updateExpiry(url, event.target.value)} disabled={savingId === url.id} /></div>
        <button className="link-row__delete" type="button" onClick={() => deleteUrl(url)} disabled={savingId === url.id} aria-label={`Delete ${url.shortCode}`}>{savingId === url.id ? "..." : "Delete"}</button>
      </article>)}</div>}
      {analytics?.pagination?.totalUrls > PAGE_SIZE && <nav className="pagination" aria-label="Link pages"><button type="button" onClick={() => setPage((current) => current - 1)} disabled={page === 0 || loading} aria-label="Previous page">Previous</button><span>Page {page + 1} of {Math.ceil(analytics.pagination.totalUrls / PAGE_SIZE)}</span><button type="button" onClick={() => setPage((current) => current + 1)} disabled={!analytics.pagination.hasMore || loading} aria-label="Next page">Next</button></nav>}
    </section>
  </main></div>;
}

export default Dashboard;
