"use client";

import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider } from "@/lib/themeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </AuthProvider>
  );
}
