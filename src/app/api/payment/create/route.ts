import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase-admin";
import Stripe from "stripe";

// Initialiser l'app Firebase Admin
const app = initAdmin();
const db = getFirestore(app);

// Initialiser Stripe avec la clé API secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16", // Utiliser la dernière version de l'API
});

/**
 * API route pour créer une session de paiement Stripe
 * Cette route vérifie l'authentification via le token Firebase
 */
export async function POST(request: NextRequest) {
  console.log("API - /api/payment/create - Début de la requête");
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("API - Pas de token d'authentification valide");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      console.log("API - Vérification du token Firebase");
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (error) {
      console.error("API - Erreur de vérification du token:", error);
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const userId = decodedToken.uid;
    console.log("API - Utilisateur authentifié:", userId);

    // Récupérer les données de la requête
    const { factureId } = await request.json();
    if (!factureId) {
      console.error("API - ID de facture manquant");
      return NextResponse.json(
        { error: "ID de facture manquant" },
        { status: 400 }
      );
    }

    console.log("API - Récupération de la facture:", factureId);
    // Récupérer les informations de la facture depuis Firestore
    const factureDoc = await db.collection("factures").doc(factureId).get();
    if (!factureDoc.exists) {
      console.error("API - Facture non trouvée");
      return NextResponse.json(
        { error: "Facture non trouvée" },
        { status: 404 }
      );
    }

    const factureData = factureDoc.data();
    if (!factureData) {
      console.error("API - Données de facture invalides");
      return NextResponse.json(
        { error: "Données de facture invalides" },
        { status: 400 }
      );
    }

    // Vérifier si la facture appartient à l'utilisateur
    if (factureData.userId !== userId) {
      console.error("API - La facture n'appartient pas à cet utilisateur");
      return NextResponse.json(
        { error: "Non autorisé à accéder à cette facture" },
        { status: 403 }
      );
    }

    // Vérifier si la facture est déjà payée
    if (factureData.statut === "Payée") {
      console.error("API - La facture est déjà payée");
      return NextResponse.json(
        { error: "Cette facture est déjà payée" },
        { status: 400 }
      );
    }

    console.log("API - Création de la session de paiement Stripe");
    // Créer une session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Facture ${factureData.numero || factureId}`,
              description: `Paiement de la facture ${
                factureData.numero || factureId
              }`,
            },
            unit_amount: Math.round(factureData.totalTTC * 100), // Stripe utilise les centimes
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/factures/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/factures/${factureId}`,
      client_reference_id: factureId, // Pour identifier la facture lors du webhook
      metadata: {
        factureId,
        userId,
      },
    });

    console.log("API - Session de paiement créée:", session.id);
    console.log("API - URL de redirection:", session.url);

    // Renvoyer l'URL de redirection
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("API - Erreur lors de la création du paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
}
