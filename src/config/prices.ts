import { env } from './env';

// Configuration des prix Stripe pour chaque plan
export const STRIPE_PRICE_IDS = {
  premium: env.STRIPE_PREMIUM_PRICE_ID,
  entreprise: env.STRIPE_ENTREPRISE_PRICE_ID,
  gratuit: env.STRIPE_FREE_PRICE_ID
};

// Vérification des prix configurés
console.log("=== Configuration des prix Stripe ===");
console.log("Configuration finale:", STRIPE_PRICE_IDS);
console.log("===================================");

// Configuration des limites pour chaque plan
export const PLAN_LIMITS = {
  premium: {
    clients: 50,
    factures: -1, // -1 signifie illimité
    modeles: 5,
    utilisateurs: 2,
  },
  entreprise: {
    clients: -1,
    factures: -1,
    modeles: -1,
    utilisateurs: 10,
  },
  gratuit: {
    clients: 5,
    factures: 5,
    modeles: 1,
    utilisateurs: 1,
  },
};

// Configuration des prix affichés pour chaque plan
export const PLAN_PRICES = {
  premium: {
    prix: 9.99,
    frequence: "/mois",
  },
  entreprise: {
    prix: 29.99,
    frequence: "/mois",
  },
  gratuit: {
    prix: 0,
    frequence: "",
  },
}; 