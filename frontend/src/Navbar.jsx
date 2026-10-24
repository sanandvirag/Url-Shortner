import "./Navbar.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "./api";

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("vigly_user") || "null"));

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Clear the local session even if the API is unavailable.
    }
    localStorage.removeItem("vigly_user");
    setUser(null);
    navigate("/");
  }

  return (
    <nav className="site-navbar" aria-label="Main navigation">
      <Link className="site-navbar__brand" to="/" aria-label="Vigly home">
        <img src="/vigly_logo.svg" alt="Vigly" />
      </Link>
      <ul className="site-navbar__links">
        {user ? <>
          <li><Link to="/dashboard">Dashboard</Link></li>
          <li><button className="site-navbar__logout" type="button" onClick={handleLogout}>Log out</button></li>
        </> : <>
          <li><Link to="/login">Login</Link></li>
          <li><Link className="site-navbar__signup" to="/signup">Sign Up</Link></li>
        </>}
      </ul>
    </nav>
  );
}

export default Navbar;