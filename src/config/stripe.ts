/**
 * Configuration Stripe
 *
 * Remplacez ces valeurs par vos propres clés Stripe.
 * Dans un environnement de production, ces clés doivent être stockées
 * dans des variables d'environnement.
 */

// Clé publique utilisée pour le frontend
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_test_votreCleDeTestPublique";

// Clé secrète utilisée uniquement sur le serveur (API routes)
export const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_votreCleDeTestSecrete";

// Devise par défaut
export const STRIPE_CURRENCY = "eur";

// URL de webhook (pour recevoir les événements de Stripe)
export const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || "whsec_votreSecretDeWebhook";

// URL de redirection après paiement
export const SUCCESS_URL = process.env.NEXT_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_URL}/dashboard/factures?paiement=success`
  : "http://localhost:3000/dashboard/factures?paiement=success";

// URL de redirection après annulation
export const CANCEL_URL = process.env.NEXT_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_URL}/dashboard/factures?paiement=cancel`
  : "http://localhost:3000/dashboard/factures?paiement=cancel";
