"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Évite les problèmes d'hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-full p-2 rounded-md bg-gray-700 hover:bg-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
      aria-label="Basculer le thème"
    >
      {theme === "dark" ? (
        <FiSun className="text-yellow-400" size={18} />
      ) : (
        <FiMoon className="text-blue-400" size={18} />
      )}
      <span className="ml-2 text-white">
        {theme === "dark" ? "Mode Clair" : "Mode Sombre"}
      </span>
    </button>
  );
}
