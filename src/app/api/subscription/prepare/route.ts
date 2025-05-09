import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "@/config/stripe";
import { STRIPE_PRICE_IDS } from "@/config/prices";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
});

// Route simplifiée pour le déploiement Vercel
export async function POST(request: NextRequest) {
  console.log("API subscription/prepare - Mode simplifié pour déploiement");

  try {
    const { planId, userId, email } = await request.json();
    console.log("Données reçues:", { planId, userId, email });

    // Vérification du planId
    if (!planId || !["premium", "enterprise", "gratuit"].includes(planId)) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const priceId = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];
    if (!priceId) {
      return NextResponse.json({ error: "Prix Stripe non configuré pour ce plan" }, { status: 500 });
    }

    // Définir l'URL de base
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    // Créer une session Checkout
    const session = await stripe.checkout.sessions.create({
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
        planId,
      },
      success_url: `${baseUrl}/dashboard/abonnement?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/abonnement?canceled=true`,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("API - Erreur Stripe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session Stripe" },
      { status: 500 }
    );
  }
}
