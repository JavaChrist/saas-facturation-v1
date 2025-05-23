// Clé publique utilisée pour le frontend
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Clé secrète utilisée uniquement sur le serveur (API routes)
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Devise utilisée pour les paiements
export const STRIPE_CURRENCY = "eur";

// URL de webhook (pour recevoir les événements de Stripe)
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// URL du site en production
export const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://facturation.javachrist.eu";

// URL de redirection après paiement
export const SUCCESS_URL = `${SITE_URL}/dashboard/abonnement?success=true`;

// URL de redirection après annulation
export const CANCEL_URL = `${SITE_URL}/dashboard/abonnement?canceled=true`;
