import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { stripe, isStripeConfigured, getStripeNotConfiguredResponse } from "@/lib/stripe-client";
import { SITE_URL } from "@/config/stripe";

let db: any;
try {
  db = getAdminFirestore();
} catch (error) {
  db = null;
}

// Configuration des prix Stripe pour chaque plan
const STRIPE_PRICE_IDS = {
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || "price_premium_id",
  entreprise: process.env.STRIPE_ENTREPRISE_PRICE_ID || "price_entreprise_id",
};

// Vérifier si nous sommes en mode développement
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * API route pour créer une session d'abonnement Stripe
 */
export async function POST(request: NextRequest) {
  // Vérifier que les services nécessaires sont disponibles
  if (!db) {
    return NextResponse.json(
      { error: "Service de base de données non disponible" },
      { status: 503 }
    );
  }

  if (!isStripeConfigured()) {
    const response = getStripeNotConfiguredResponse();
    return NextResponse.json(response, { status: 503 });
  }

  // Mode développement - simulation pour le développement local
  if (isDevelopment) {
    try {
      const requestData = await request.json();
      const { planId } = requestData;

      return NextResponse.json({
        url: `${SITE_URL}/dashboard/abonnement?success=true&plan=${planId}&simulated=true`,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Erreur lors de la simulation de paiement" },
        { status: 500 }
      );
    }
  }

  // Mode production - vérification de Stripe
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe non configuré" },
      { status: 500 }
    );
  }

  try {
    const { planId, userId } = await request.json();

    // Vérification du planId
    if (!planId || !["premium", "entreprise"].includes(planId)) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    // Récupérer l'ID du prix Stripe correspondant au plan
    const priceId = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];

    if (!priceId) {
      return NextResponse.json(
        { error: "Prix Stripe non configuré pour ce plan" },
        { status: 500 }
      );
    }

    // Créer une session de paiement Stripe Checkout
    const session = await stripe!.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${SITE_URL}/dashboard/abonnement?success=true&plan=${planId}`,
      cancel_url: `${SITE_URL}/dashboard/abonnement?canceled=true`,
      metadata: {
        userId,
        planId,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Erreur Stripe session:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session Stripe" },
      { status: 500 }
    );
  }
}
