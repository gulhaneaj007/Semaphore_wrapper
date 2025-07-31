import React from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaUserFriends, FaCog } from "react-icons/fa";
import ProfileCard from "./ProfileCard";

function Sidebar({ open, onClose }) {
  // 'open' prop controls mobile collapse/expand
  return (
    <nav className={`sidebar${open ? " open" : ""}`}>
      <ProfileCard />
      <div className="sidebar-links">
        <NavLink to="/" end className="nav-link">
          <FaHome className="icon" />
          Home
        </NavLink>
        <NavLink to="/about" className="nav-link">
          <FaUserFriends className="icon" />
          About
        </NavLink>
        <NavLink to="/settings" className="nav-link">
          <FaCog className="icon" />
          Settings
        </NavLink>
      </div>
      <button className="sidebar-close" onClick={onClose} aria-label="Close Sidebar">
        &times;
      </button>
    </nav>
  );
}
export default Sidebar;
