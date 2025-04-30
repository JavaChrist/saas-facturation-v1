import { loadStripe } from "@stripe/stripe-js";

// Assurez-vous que cette clé est publique (pk_test ou pk_live)
// Vous pouvez la mettre dans les variables d'environnement
const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_votreclépublique";

export const stripePromise = loadStripe(stripePublishableKey);
