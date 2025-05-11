"use client";

import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider } from "@/lib/themeContext";
import { useEffect } from "react";
import emailjs from '@emailjs/browser';

// La clé publique pour EmailJS
const EMAILJS_PUBLIC_KEY = "YCx1G77Q033P704UD";

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialiser EmailJS
  useEffect(() => {
    try {
      // Initialiser EmailJS avec votre clé publique
      emailjs.init(EMAILJS_PUBLIC_KEY);
      console.log("EmailJS initialisé avec succès avec la clé:", EMAILJS_PUBLIC_KEY);
    } catch (error) {
      console.error("Erreur lors de l'initialisation d'EmailJS:", error);
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
