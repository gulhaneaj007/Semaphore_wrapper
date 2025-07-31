import React from "react";

function SidebarToggle({ open, setOpen }) {
  return (
    <button
      className={`sidebar-toggle${open ? " open" : ""}`}
      onClick={() => setOpen((o) => !o)}
      aria-label="Toggle Sidebar"
    >
      <span />
      <span />
      <span />
    </button>
  );
}

export default SidebarToggle;
