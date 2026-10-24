import Navbar from "./Navbar";
import Hero from "./Hero";
import "./App.css";

function App(){
  return(
    <div className="app-shell">
      <Navbar />
      <main>
        <Hero />
      </main>
      <footer className="site-footer">
        <span>Vigly</span>
        <span>Simple links, less clutter.</span>
      </footer>
    </div>
  );
}

export default App;