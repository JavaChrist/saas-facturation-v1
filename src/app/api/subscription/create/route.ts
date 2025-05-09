import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase-admin";
import Stripe from "stripe";

// Initialiser l'app Firebase Admin
let app;
try {
  console.log(
    "API subscription/create - Tentative d'initialisation de Firebase Admin"
  );
  app = initAdmin();
  console.log(
    "API subscription/create - Firebase Admin initialisé avec succès"
  );
} catch (error) {
  console.error(
    "API subscription/create - Erreur lors de l'initialisation de Firebase Admin:",
    error
  );
}

const db = app ? getFirestore(app) : null;

// Récupération de la clé secrète Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const frontendUrl =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

console.log("API subscription/create - Variables d'environnement:");
console.log("- STRIPE_SECRET_KEY présente:", !!stripeSecretKey);
console.log("- STRIPE_PRICE_PREMIUM:", process.env.STRIPE_PREMIUM_PRICE_ID);
console.log(
  "- STRIPE_PRICE_ENTREPRISE:",
  process.env.STRIPE_ENTREPRISE_PRICE_ID
);
console.log("- NEXT_PUBLIC_FRONTEND_URL:", frontendUrl);

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
        url: `/dashboard/abonnement?success=true&plan=${planId}&simulated=true`,
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
    // Vérification de l'authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error(
        "API subscription/create - Pas de token d'authentification"
      );
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let userId;

    try {
      console.log("API subscription/create - Vérification du token Firebase");
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(token);
      userId = decodedToken.uid;
      console.log(
        "API subscription/create - Token valide pour l'utilisateur:",
        userId
      );
    } catch (error) {
      console.error(
        "API subscription/create - Erreur de vérification du token:",
        error
      );
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // Récupération des données de la requête
    const requestData = await request.json();
    const { planId } = requestData;
    console.log("API subscription/create - Plan demandé:", planId);

    // Vérification du planId
    if (!planId || (planId !== "premium" && planId !== "entreprise")) {
      console.error("API subscription/create - Plan invalide:", planId);
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    // Récupération de l'ID de prix Stripe correspondant au plan
    const priceId = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];
    if (!priceId) {
      console.error(
        "API subscription/create - Prix non configuré pour le plan:",
        planId
      );
      return NextResponse.json(
        { error: "Prix non configuré pour ce plan" },
        { status: 500 }
      );
    }
    console.log("API subscription/create - Prix Stripe:", priceId);

    // Création de la session de paiement
    console.log("API subscription/create - Création de la session Stripe");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Passage des informations sur l'utilisateur et le plan dans les métadonnées
      metadata: {
        userId,
        planId,
      },
      customer_email: requestData.email,
      // Utiliser une URL absolue complète pour éviter les problèmes de redirection
      success_url: `/dashboard/abonnement?success=true&plan=${planId}`,
      cancel_url: `/dashboard/abonnement?canceled=true`,
    });

    console.log("API subscription/create - Session créée, URL:", session.url);
    // Retour de l'URL de paiement
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("API subscription/create - Erreur détaillée:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session de paiement" },
      { status: 500 }
    );
  }
}
