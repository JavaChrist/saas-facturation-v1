import Stripe from "stripe";

// Initialisation conditionnelle de Stripe
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-03-31.basil",
    })
  : null;

// Fonction pour vérifier si Stripe est configuré
export const isStripeConfigured = (): boolean => {
  return !!process.env.STRIPE_SECRET_KEY;
};

// Fonction pour obtenir une réponse standard quand Stripe n'est pas configuré
export const getStripeNotConfiguredResponse = () => {
  console.warn("STRIPE_SECRET_KEY non configurée - fonctionnalités de paiement désactivées");
  return {
    error: "Les fonctionnalités de paiement ne sont pas configurées",
    message: "Mode démo: Stripe n'est pas configuré (STRIPE_SECRET_KEY manquante)",
    isDemo: true
  };
};