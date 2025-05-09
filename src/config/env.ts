// Configuration des variables d'environnement
export const env = {
  STRIPE_PREMIUM_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
  STRIPE_ENTREPRISE_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_ENTREPRISE_PRICE_ID,
  STRIPE_FREE_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_FREE_PRICE_ID,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
};

// Vérification des variables d'environnement
console.log("=== Variables d'environnement ===");
console.log(env);
console.log("==============================="); 