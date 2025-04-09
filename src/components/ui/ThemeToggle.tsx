"use client";

import { useTheme } from "@/lib/themeContext";
import { FiSun, FiMoon } from "react-icons/fi";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-colors duration-200 ${
        theme === "dark"
          ? "bg-gray-700 hover:bg-gray-600 text-white"
          : "bg-gray-200 hover:bg-gray-300 text-gray-800"
      } ${className}`}
      aria-label={
        theme === "dark" ? "Passer au mode clair" : "Passer au mode sombre"
      }
    >
      {theme === "dark" ? (
        <>
          <FiSun className="w-5 h-5 text-yellow-300" />
          <span>Mode Clair</span>
        </>
      ) : (
        <>
          <FiMoon className="w-5 h-5" />
          <span>Mode Sombre</span>
        </>
      )}
    </button>
  );
}
