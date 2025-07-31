import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import SidebarToggle from "./components/SidebarToggle";
import Menu from "./pages/Menu";
import About from "./pages/About";
import Settings from "./pages/Settings";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-container${sidebarOpen ? " sidebar-open" : ""}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarToggle open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
