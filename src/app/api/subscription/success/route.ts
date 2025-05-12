import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "@/config/stripe";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// S'assurer que la clé est bien une chaîne
const stripeSecretKey = STRIPE_SECRET_KEY || "";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-03-31.basil",
});

/**
 * API route pour confirmer un paiement réussi
 * Cette route est appelée après qu'un utilisateur a complété un paiement sur Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, planId } = await request.json();

    if (!sessionId || !userId || !planId) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    // Vérifier la session Stripe pour confirmer le paiement
    let stripeSession;
    
    try {
      // En environnement de développement, on simule une session réussie
      if (process.env.NODE_ENV === "development") {
        stripeSession = {
          payment_status: "paid",
          customer: `cus_dev_${Math.random().toString(36).substring(2, 11)}`,
          subscription: `sub_dev_${Math.random().toString(36).substring(2, 11)}`,
        };
      } else {
        // En production, vérifier avec Stripe
        stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
      }
    } catch (stripeError) {
      console.error("Erreur lors de la récupération de la session Stripe:", stripeError);
      return NextResponse.json(
        { error: "Session de paiement invalide" },
        { status: 400 }
      );
    }

    // Vérifier que le paiement est bien réussi
    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Le paiement n'a pas été complété" },
        { status: 400 }
      );
    }

    // Définir les limites en fonction du plan
    let limites = {
      clients: 5,
      factures: 5,
      modeles: 1,
      utilisateurs: 1,
    };

    if (planId === "premium") {
      limites = {
        clients: 50,
        factures: -1,
        modeles: 5,
        utilisateurs: 2,
      };
    } else if (planId === "enterprise" || planId === "entreprise") {
      limites = {
        clients: -1,
        factures: -1,
        modeles: -1,
        utilisateurs: 10,
      };
    }

    // Créer ou mettre à jour le plan de l'utilisateur dans Firestore
    const today = new Date();
    const dateEnd = new Date();
    dateEnd.setMonth(dateEnd.getMonth() + 1); // Abonnement d'un mois

    // Créer l'objet subscription
    const subscription = {
      planId: planId === "entreprise" ? "enterprise" : planId,
      isActive: true,
      dateStart: today,
      dateEnd: dateEnd,
      stripeCustomerId: stripeSession.customer,
      stripeSubscriptionId: stripeSession.subscription,
      paymentVerified: true, // Marquer comme vérifié par Stripe
      limites: limites,
      lastUpdated: today,
    };

    // Mettre à jour Firestore
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        await updateDoc(userRef, {
          subscription: subscription,
          lastUpdated: today,
        });
      } else {
        await setDoc(userRef, {
          uid: userId,
          subscription: subscription,
          createdAt: today,
          lastUpdated: today,
        });
      }
    } catch (firestoreError) {
      console.error("Erreur lors de la mise à jour Firestore:", firestoreError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement de l'abonnement" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Abonnement activé avec succès",
      subscription,
    });
  } catch (error) {
    console.error("Erreur lors de la confirmation de l'abonnement:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement de la demande" },
      { status: 500 }
    );
  }
} 