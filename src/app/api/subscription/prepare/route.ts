import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured, getStripeNotConfiguredResponse } from "@/lib/stripe-client";
import { SITE_URL } from "@/config/stripe";
import { STRIPE_PRICE_IDS } from "@/config/prices";

// Log détaillé des variables d'environnement
console.log("=== Vérification des variables d'environnement ===");
console.log("Toutes les variables d'environnement:", {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "Présent" : "Manquant",
  STRIPE_PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID,
  STRIPE_ENTREPRISE_PRICE_ID: process.env.STRIPE_ENTREPRISE_PRICE_ID,
  STRIPE_FREE_PRICE_ID: process.env.STRIPE_FREE_PRICE_ID,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL
});
console.log("Configuration des prix Stripe:", STRIPE_PRICE_IDS);
console.log("=============================================");



// Route simplifiée pour le déploiement Vercel
export async function POST(request: NextRequest) {
  console.log("API subscription/prepare - Mode simplifié pour déploiement");
  
  if (!isStripeConfigured()) {
    const response = getStripeNotConfiguredResponse();
    return NextResponse.json(response, { status: 503 });
  }

  try {
    const { planId, userId, email } = await request.json();
    console.log("Données reçues:", { planId, userId, email });

    // Normalisation du planId
    const normalizedPlanId = planId === 'enterprise' ? 'entreprise' : planId;
    console.log("PlanId normalisé:", normalizedPlanId);

    // Vérification du planId
    if (!normalizedPlanId || !["premium", "entreprise", "gratuit"].includes(normalizedPlanId)) {
      console.error("Plan invalide:", normalizedPlanId);
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    console.log("Plan valide:", normalizedPlanId);
    console.log("STRIPE_PRICE_IDS disponibles:", Object.keys(STRIPE_PRICE_IDS));
    
    const priceId = STRIPE_PRICE_IDS[normalizedPlanId as keyof typeof STRIPE_PRICE_IDS];
    console.log("Price ID utilisé pour le plan", normalizedPlanId, ":", priceId);

    if (!priceId) {
      console.error("Prix non trouvé pour le plan:", normalizedPlanId);
      console.error("STRIPE_PRICE_IDS:", STRIPE_PRICE_IDS);
      return NextResponse.json({ error: "Prix Stripe non configuré pour ce plan" }, { status: 500 });
    }

    try {
      console.log("Tentative de création de session Stripe avec:", {
        priceId,
        email,
        userId,
        planId: normalizedPlanId
      });

      // Créer une session Checkout
      const session = await stripe!.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer_email: email,
        metadata: {
          userId,
          planId: normalizedPlanId,
        },
        success_url: `${SITE_URL}/dashboard/abonnement?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/dashboard/abonnement?canceled=true`,
      });

      console.log("Session créée avec succès:", session.id);
      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (stripeError) {
      console.error("Erreur détaillée Stripe:", stripeError);
      throw stripeError;
    }
  } catch (error) {
    console.error("API - Erreur complète:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session Stripe" },
      { status: 500 }
    );
  }
}
