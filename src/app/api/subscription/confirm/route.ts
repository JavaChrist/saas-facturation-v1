import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase-admin";
import Stripe from "stripe";
import { auth } from "@/lib/firebase-admin";

// Initialiser l'app Firebase Admin
let app;
try {
  console.log(
    "API subscription/confirm - Tentative d'initialisation de Firebase Admin"
  );
  app = initAdmin();
  console.log(
    "API subscription/confirm - Firebase Admin initialisé avec succès"
  );
} catch (error) {
  console.error(
    "API subscription/confirm - Erreur lors de l'initialisation de Firebase Admin:",
    error
  );
}

const db = app ? getFirestore(app) : null;

// Récupération de la clé secrète Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialisation de l'instance Stripe
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-03-31.basil" })
  : null;

// Limites par défaut pour chaque plan
const PLAN_LIMITS = {
  premium: {
    clients: 50,
    factures: 500,
    modeles: 5,
    utilisateurs: 2,
  },
  entreprise: {
    clients: -1, // Illimité
    factures: -1, // Illimité
    modeles: -1, // Illimité
    utilisateurs: 10,
  },
};

/**
 * API route pour confirmer un abonnement après le paiement
 */
export async function POST(request: NextRequest) {
  console.log(
    "API subscription/confirm - Début du traitement de la requête POST"
  );

  // Vérifier si Stripe est configuré
  if (!stripe || !db) {
    console.error(
      "API subscription/confirm - Stripe ou Firestore non configuré"
    );
    return NextResponse.json(
      { error: "Configuration incomplète" },
      { status: 500 }
    );
  }

  try {
    // Récupérer les données de la requête
    const { paymentIntentId, planId, userId } = await request.json();

    // Validation des données
    if (!paymentIntentId || !planId || !userId) {
      console.error("API subscription/confirm - Données manquantes:", {
        paymentIntentId,
        planId,
        userId,
      });
      return NextResponse.json(
        { error: "Données incomplètes" },
        { status: 400 }
      );
    }

    // Mode développement - simulation pour le développement local
    if (
      process.env.NODE_ENV === "development" &&
      paymentIntentId.startsWith("pi_dev_")
    ) {
      console.log(
        "API subscription/confirm - Mode développement détecté, simulation d'abonnement"
      );

      // Générer un ID d'abonnement simulé
      const subscriptionId = `sub_sim_${Math.random()
        .toString(36)
        .substring(2, 15)}`;

      // Dates de début et fin pour l'abonnement
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // Abonnement d'un mois

      // Créer l'objet d'abonnement dans Firestore
      const userPlanRef = db.collection("userPlans").doc(userId);
      await userPlanRef.set({
        planId,
        isActive: true,
        dateStart: startDate,
        dateEnd: endDate,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: `cus_sim_${Math.random()
          .toString(36)
          .substring(2, 15)}`,
        limites: PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS],
        paymentIntentId: paymentIntentId,
        createdAt: startDate,
        updatedAt: startDate,
      });

      return NextResponse.json({
        success: true,
        subscriptionId,
        message: "Abonnement simulé créé avec succès",
      });
    }

    // Production - vérifier le paiement et créer un abonnement réel

    // 1. Vérifier le statut du PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      console.error(
        "API subscription/confirm - PaymentIntent non réussi:",
        paymentIntent.status
      );
      return NextResponse.json(
        { error: "Paiement non complété" },
        { status: 400 }
      );
    }

    // 2. Vérifier que les métadonnées du PaymentIntent correspondent
    if (
      paymentIntent.metadata.userId !== userId ||
      paymentIntent.metadata.planId !== planId
    ) {
      console.error("API subscription/confirm - Métadonnées non concordantes");
      return NextResponse.json(
        { error: "Informations de paiement non valides" },
        { status: 400 }
      );
    }

    // 3. Récupérer ou créer un client Stripe
    let customerId = "";

    // Vérifier si l'utilisateur a déjà un ID client Stripe
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
      customerId = userDoc.data()?.stripeCustomerId;
    } else {
      // Créer un nouveau client Stripe
      const userAuth = await auth.getUser(userId);
      const customer = await stripe.customers.create({
        email: userAuth.email || undefined,
        name: userAuth.displayName || undefined,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;

      // Sauvegarder l'ID client dans Firestore
      await db
        .collection("users")
        .doc(userId)
        .set({ stripeCustomerId: customerId }, { merge: true });
    }

    // 4. Créer un abonnement Stripe
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: process.env[`STRIPE_PRICE_${planId.toUpperCase()}_ID`] || "",
        },
      ],
      metadata: {
        userId,
        planId,
      },
      expand: ["latest_invoice.payment_intent"],
    });

    // 5. Calculer les dates de début et fin
    const startDate = new Date(subscription.current_period_start * 1000);
    const endDate = new Date(subscription.current_period_end * 1000);

    // 6. Enregistrer l'abonnement dans Firestore
    const userPlanRef = db.collection("userPlans").doc(userId);
    await userPlanRef.set({
      planId,
      isActive: subscription.status === "active",
      dateStart: startDate,
      dateEnd: endDate,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      limites: PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS],
      paymentIntentId: paymentIntentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      message: "Abonnement créé avec succès",
    });
  } catch (error) {
    console.error("API subscription/confirm - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la confirmation de l'abonnement" },
      { status: 500 }
    );
  }
}
