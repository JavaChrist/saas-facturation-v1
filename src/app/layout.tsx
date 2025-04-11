import "./globals.css";
import { Providers } from "./providers";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Facturation SaaS",
  description: "Application de facturation SaaS",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* Script pour injecter des variables d'environnement */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = { 
              NODE_ENV: "${process.env.NODE_ENV || "development"}", 
              IS_DEV: ${
                process.env.NODE_ENV === "development" ? "true" : "false"
              }
            };`,
          }}
        />
      </head>
      <body className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
        {/* Préchargement du favicon avec priorité pour résoudre l'avertissement LCP */}
        <div
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            overflow: "hidden",
          }}
        >
          <Image
            src="/favicon.ico"
            alt="Favicon"
            width={32}
            height={32}
            style={{ height: "auto" }}
            priority
          />
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
