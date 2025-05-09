/**
 * Configuration des prix Stripe
 * 
 * Ces IDs doivent correspondre aux prix créés dans votre tableau de bord Stripe
 */

export const STRIPE_PRICE_IDS = {
  gratuit: process.env.STRIPE_PRICE_ID_FREE || "price_1RMcsLPJTzEOGEuFXRgbQnDS",
  premium: process.env.STRIPE_PRICE_ID_PREMIUM || "price_1RMcryPJTzEOGEuFaqklm3aC",
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || "price_1RMcr5PJTzEOGEuFDI7yKdbb",
} as const;

export type PlanId = keyof typeof STRIPE_PRICE_IDS;

export const PLAN_FEATURES = {
  free: {
    name: "Gratuit",
    price: "0€",
    features: [
      "5 factures par mois",
      "Stockage de base",
      "Support par email",
    ],
  },
  premium: {
    name: "Premium",
    price: "9.99€",
    features: [
      "Factures illimitées",
      "Stockage avancé",
      "Support prioritaire",
      "Modèles personnalisés",
    ],
  },
  enterprise: {
    name: "Entreprise",
    price: "29.99€",
    features: [
      "Tout ce qui est inclus dans Premium",
      "API d'intégration",
      "Support dédié",
      "Facturation automatisée",
    ],
  },
} as const; 