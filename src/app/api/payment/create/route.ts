import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase-admin";
import Stripe from "stripe";

// Initialiser l'app Firebase Admin
const app = initAdmin();
// Obtenir les références Firestore et Auth en mode sécurisé
let db;
let auth;

try {
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error(
    "Erreur lors de l'initialisation des services Firebase Admin:",
    error
  );
}

// Initialiser Stripe avec la clé API secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil", // Version de l'API compatible avec Stripe
});

/**
 * API route pour créer une session de paiement Stripe
 * Cette route vérifie l'authentification via le token Firebase
 */
export async function POST(request: NextRequest) {
  console.log("API - /api/payment/create - Début de la requête");
  try {
    // Vérifier si nous sommes en environnement de développement sans Firebase configuré
    const isDevelopment = process.env.NODE_ENV === "development";
    const isFirebaseConfigured = !!app && !!db && !!auth;

    if (!isFirebaseConfigured && !isDevelopment) {
      console.error("API - Firebase Admin n'est pas correctement configuré");
      return NextResponse.json(
        {
          error: "Configuration du serveur incomplète",
          detail: "Firebase Admin n'est pas initialisé",
        },
        { status: 500 }
      );
    }

    // Vérifier l'authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("API - Pas de token d'authentification valide");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // En développement, accepter un token simplifier si Firebase n'est pas configuré
    const token = authHeader.split("Bearer ")[1];
    let userId;

    if (isFirebaseConfigured) {
      try {
        console.log("API - Vérification du token Firebase");
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        console.error("API - Erreur de vérification du token:", error);
        return NextResponse.json({ error: "Token invalide" }, { status: 401 });
      }
    } else if (isDevelopment) {
      // En développement, extraire l'userId directement du token pour les tests
      try {
        console.log("API - Mode développement: simulation d'authentification");
        userId = token;
      } catch (error) {
        return NextResponse.json(
          { error: "Token de test invalide" },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Service d'authentification non disponible" },
        { status: 503 }
      );
    }

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

    // Si Firebase n'est pas configuré en développement, simuler une réponse
    if (!isFirebaseConfigured && isDevelopment) {
      console.log(
        "API - Mode développement: simulation de réponse pour la facture",
        factureId
      );
      return NextResponse.json({
        url: `http://localhost:3000/dashboard/factures/success?factureId=${factureId}`,
        simulation: true,
      });
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
