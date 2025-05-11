import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";
import { initAdmin } from "@/lib/firebase-admin";
import { SITE_URL } from "@/config/stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialiser Firebase Admin si ce n'est pas déjà fait
// Cela nous permet d'accéder à Firestore avec des privilèges admin
try {
  const app = initAdmin();
} catch (error) {
  console.error("Erreur lors de l'initialisation de Firebase Admin:", error);
}

// Initialisation de Firestore
let db;
try {
  db = getFirestore();
} catch (error) {
  console.error("Erreur lors de l'initialisation de Firestore:", error);
}

// Initialisation de l'instance Stripe
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-03-31.basil" })
  : null;

// Configuration des prix Stripe pour chaque plan
const STRIPE_PRICE_IDS = {
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || "price_premium_id",
  entreprise: process.env.STRIPE_ENTREPRISE_PRICE_ID || "price_entreprise_id",
};

// Vérifier si nous sommes en mode développement
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * API route pour créer une session d'abonnement Stripe
 * Cette route vérifie l'authentification via le token Firebase
 */
export async function POST(request: NextRequest) {
  console.log(
    "API subscription/create - Début du traitement de la requête POST"
  );

  // Mode développement - simulation pour le développement local
  if (isDevelopment) {
    console.log("API subscription/create - Mode développement détecté");

    try {
      // En mode dev, on peut simuler une session de paiement
      const requestData = await request.json();
      const { planId } = requestData;

      console.log("API subscription/create - Simulation pour le plan:", planId);

      // Retourner une URL simulée avec protocole http:// explicite pour éviter la redirection relative
      return NextResponse.json({
        url: `${SITE_URL}/dashboard/abonnement?success=true&plan=${planId}&simulated=true`,
      });
    } catch (error) {
      console.error("API subscription/create - Erreur en mode dev:", error);
      return NextResponse.json(
        { error: "Erreur lors de la simulation de paiement" },
        { status: 500 }
      );
    }
  }

  // Mode production - vérification de Stripe
  if (!stripe) {
    console.error(
      "API subscription/create - Stripe n'est pas configuré correctement"
    );
    return NextResponse.json(
      { error: "Stripe non configuré" },
      { status: 500 }
    );
  }

  try {
    const { planId, userId } = await request.json();

    console.log("API subscription/create - Données reçues:", {
      planId,
      userId,
    });

    // Vérification du planId
    if (!planId || !["premium", "entreprise"].includes(planId)) {
      console.error("API subscription/create - Plan invalide:", planId);
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    // Récupérer l'ID du prix Stripe correspondant au plan
    const priceId = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];

    if (!priceId) {
      console.error(
        "API subscription/create - Prix non trouvé pour le plan:",
        planId
      );
      return NextResponse.json(
        { error: "Prix Stripe non configuré pour ce plan" },
        { status: 500 }
      );
    }

    console.log("API subscription/create - Prix Stripe trouvé:", priceId);

    // Créer une session de paiement Stripe Checkout
    const session = await stripe.checkout.sessions.create({
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

    console.log("API subscription/create - Session créée:", session.id);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("API subscription/create - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session Stripe" },
      { status: 500 }
    );
  }
}
