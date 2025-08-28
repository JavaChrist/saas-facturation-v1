import "./globals.css";
import { Providers } from "./providers";
import type { Metadata } from "next";
import Image from "next/image";

// Si vous rencontrez des erreurs "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT",
// c'est probablement à cause d'un bloqueur de publicités (comme uBlock Origin) qui bloque Firebase.
// Solution: Désactivez temporairement votre bloqueur de publicités ou ajoutez une exception
// pour les domaines suivants:
// - firestore.googleapis.com
// - firebase.googleapis.com
// - identitytoolkit.googleapis.com

export const metadata: Metadata = {
  title: "Facturation SaaS",
  description: "Application de facturation professionnelle",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-touch-icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Facturation",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://facturation.javachrist.eu",
    siteName: "Facturation SaaS",
    title: "Facturation SaaS - Gestion professionnelle",
    description: "Application de facturation professionnelle pour entrepreneurs et PME",
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
        <meta name="theme-color" content="#f4530c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Facturation" />
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firebase.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png" />
        {/* Script pour injecter des variables d'environnement */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = { 
              NODE_ENV: "${process.env.NODE_ENV || "development"}", 
              IS_DEV: ${process.env.NODE_ENV === "development" ? "true" : "false"
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
