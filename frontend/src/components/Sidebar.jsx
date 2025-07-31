import React from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaUserFriends, FaCog } from "react-icons/fa";
import ProfileCard from "./ProfileCard";
import ThemeToggle from "./ThemeToggle";
function Sidebar({ open, onClose }) {
  // 'open' prop controls mobile collapse/expand
  return (
    <nav className={`sidebar${open ? " open" : ""}`}>
      <ProfileCard />
      <ThemeToggle />
      <div className="sidebar-links">
        <NavLink to="/" end className="nav-link">
          <FaHome className="icon" />
          Menu
        </NavLink>
        <NavLink to="/about" className="nav-link">
          <FaUserFriends className="icon" />
          Server
        </NavLink>
        <NavLink to="/settings" className="nav-link">
          <FaCog className="icon" />
          Groups
        </NavLink>
      </div>
      <button className="sidebar-close" onClick={onClose} aria-label="Close Sidebar">
        &times;
      </button>
    </nav>
  );
}
export default Sidebar;
