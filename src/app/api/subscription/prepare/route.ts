import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase-admin";
import Stripe from "stripe";
import { auth } from "@/lib/firebase-admin";

// Initialiser l'app Firebase Admin
let app;
try {
  console.log(
    "API subscription/prepare - Tentative d'initialisation de Firebase Admin"
  );
  app = initAdmin();
  console.log(
    "API subscription/prepare - Firebase Admin initialisé avec succès"
  );
} catch (error) {
  console.error(
    "API subscription/prepare - Erreur lors de l'initialisation de Firebase Admin:",
    error
  );
}

const db = app ? getFirestore(app) : null;

// Récupération de la clé secrète Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
console.log(
  "API subscription/prepare - Stripe clé secrète présente:",
  !!stripeSecretKey
);

// Initialisation de l'instance Stripe
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" })
  : null;

// Configuration des prix Stripe pour chaque plan
const STRIPE_PRICE_IDS = {
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || "price_premium_id",
  entreprise: process.env.STRIPE_ENTREPRISE_PRICE_ID || "price_entreprise_id",
};

// Montants correspondants aux plans (en centimes)
const PLAN_AMOUNTS = {
  premium: 999, // 9.99€
  entreprise: 2999, // 29.99€
};

/**
 * API route pour préparer une session de paiement Stripe (obtenir le client_secret)
 */
export async function POST(request: NextRequest) {
  console.log(
    "API subscription/prepare - Début du traitement de la requête POST"
  );

  // Mode développement - simulation pour éviter les erreurs
  if (process.env.NODE_ENV === "development") {
    console.log(
      "API subscription/prepare - Mode développement détecté, simulant une réponse"
    );
    return NextResponse.json({
      clientSecret:
        "pi_dev_" +
        Math.random().toString(36).substring(2, 15) +
        "_secret_" +
        Math.random().toString(36).substring(2, 15),
      amount: 9.99,
    });
  }

  // Vérifier si Stripe est configuré
  if (!stripe) {
    console.error(
      "API subscription/prepare - Stripe n'est pas configuré correctement"
    );
    return NextResponse.json(
      { error: "Stripe non configuré" },
      { status: 500 }
    );
  }

  try {
    // Récupérer les données de la requête
    const body = await request.json();
    console.log("API subscription/prepare - Corps de la requête:", body);
    const { planId, userId, email } = body;

    // Validation des données
    if (!planId || !userId || !email) {
      console.error("API subscription/prepare - Données manquantes:", {
        planId,
        userId,
        email,
      });
      return NextResponse.json(
        { error: "Données incomplètes" },
        { status: 400 }
      );
    }

    // Vérifier que le plan est valide
    if (!["premium", "entreprise"].includes(planId)) {
      console.error("API subscription/prepare - Plan invalide:", planId);
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    // En mode développement, on saute la vérification d'authentification
    if (process.env.NODE_ENV !== "development") {
      try {
        // Vérifier l'authentification (optionnel si vous avez déjà vérifié l'utilisateur)
        console.log(
          "API subscription/prepare - Vérification du token:",
          userId
        );
        const decodedToken = await auth.verifyIdToken(userId);
        if (decodedToken.uid !== userId) {
          console.error(
            "API subscription/prepare - Token non valide pour l'utilisateur"
          );
          return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }
      } catch (authError) {
        console.error(
          "API subscription/prepare - Erreur d'authentification:",
          authError
        );
        return NextResponse.json(
          { error: "Authentification invalide" },
          { status: 401 }
        );
      }
    } else {
      console.log(
        "API subscription/prepare - Mode développement: authentification ignorée"
      );
    }

    // Montant pour le plan sélectionné
    const amount = PLAN_AMOUNTS[planId as keyof typeof PLAN_AMOUNTS];
    console.log("API subscription/prepare - Montant:", amount);

    try {
      // Créer un PaymentIntent pour la carte
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "eur",
        metadata: {
          userId,
          planId,
        },
        receipt_email: email,
        // Ajouter une description
        description: `Abonnement au plan ${planId}`,
      });
      console.log(
        "API subscription/prepare - PaymentIntent créé:",
        paymentIntent.id
      );

      // Retourner le client_secret au frontend
      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        amount: amount / 100, // convertir en euros pour l'affichage
      });
    } catch (stripeError) {
      console.error("API subscription/prepare - Erreur Stripe:", stripeError);
      return NextResponse.json(
        { error: "Erreur lors de la création du paiement Stripe" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API subscription/prepare - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la préparation du paiement" },
      { status: 500 }
    );
  }
}
