"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/authContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
          {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
