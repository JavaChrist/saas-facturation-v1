import Stripe from "stripe";
import { Facture } from "@/types/facture";
import {
  STRIPE_CURRENCY,
  SUCCESS_URL,
  CANCEL_URL,
} from "@/config/stripe";

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil", // Version de l'API compatible
});

/**
 * Crée une session de paiement Stripe pour une facture
 * @param facture Facture à payer
 * @param userId ID de l'utilisateur
 * @returns URL de la session de paiement Stripe
 */
export const createPaymentSession = async (
  facture: Facture,
  userId: string
): Promise<string> => {
  if (!facture || !facture.id) {
    throw new Error("Facture invalide");
  }

  try {
    // Formatage du montant pour Stripe (en centimes)
    const amount = Math.round(facture.totalTTC * 100);

    // Création des métadonnées pour la facture
    const metadata = {
      factureId: facture.id,
      userId: userId,
      factureNumero: facture.numero,
      clientName: facture.client.nom,
    };

    // Création de la session de paiement
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: STRIPE_CURRENCY,
            product_data: {
              name: `Facture ${facture.numero}`,
              description: `Paiement pour ${facture.client.nom}`,
              metadata,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      client_reference_id: facture.id,
      customer_email: facture.client.email,
      metadata,
    });

    // Retourner l'URL de la session de paiement
    return session.url || "";
  } catch (error) {
    console.error(
      "Erreur lors de la création de la session de paiement:",
      error
    );
    throw new Error(
      `Erreur lors de la création de la session de paiement: ${
        error instanceof Error ? error.message : "Erreur inconnue"
      }`
    );
  }
};

/**
 * Vérifie si une facture a été payée
 * @param factureId ID de la facture
 * @returns true si la facture a été payée, false sinon
 */
export const checkPaymentStatus = async (
  factureId: string
): Promise<boolean> => {
  try {
    // Rechercher les paiements associés à cette facture
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    // Filtrer les sessions pour trouver celles associées à cette facture
    const factureSession = sessions.data.find(
      (session) =>
        session.metadata?.factureId === factureId ||
        session.client_reference_id === factureId
    );

    // Vérifier si une session existe et si elle a le statut 'complete'
    return !!factureSession && factureSession.payment_status === "paid";
  } catch (error) {
    console.error(
      "Erreur lors de la vérification du statut de paiement:",
      error
    );
    return false;
  }
};

/**
 * Traite un événement webhook de Stripe
 * @param body Corps de la requête du webhook
 * @param signature Signature du webhook
 * @returns Objet contenant les informations sur l'événement traité
 */
export const handleWebhookEvent = async (
  body: string,
  signature: string
): Promise<{ factureId?: string; status: string; event: string }> => {
  try {
    // Vérifier la signature du webhook
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );

    // Traiter l'événement
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const factureId =
        session.metadata?.factureId || session.client_reference_id || "";

      return {
        factureId,
        status: "success",
        event: event.type,
      };
    }

    return {
      status: "ignored",
      event: event.type,
    };
  } catch (error) {
    console.error("Erreur lors du traitement du webhook:", error);
    return {
      status: "error",
      event: "error",
    };
  }
};
