import React from "react";
import { useTheme } from "../context/ThemeContext";
import { FaMoon, FaSun } from "react-icons/fa";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      className="theme-toggle"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? <FaMoon /> : <FaSun />}
      <span>{theme === "light" ? "Dark" : "Light"} Mode</span>
    </button>
  );
}
export default ThemeToggle;
