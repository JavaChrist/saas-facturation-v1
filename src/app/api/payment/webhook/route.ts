import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent } from "@/services/stripeService";
import { STRIPE_WEBHOOK_SECRET } from "@/config/stripe";
import { updateFactureStatus } from "@/services/factureService";

/**
 * Route API pour gérer les webhooks Stripe
 * Cette route est appelée par Stripe pour nous notifier des événements (paiements, etc.)
 */

// Cette route ne nécessite pas de vérification CSRF pour les webhooks Stripe
export const dynamic = "force-dynamic";
export const runtime = "edge";
export const preferredRegion = "auto";

// Désactiver le parseur de body par défaut car nous avons besoin du body brut
export async function POST(req: NextRequest) {
  try {
    // Vérifier que le secret est configuré
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET n'est pas configuré");
      return NextResponse.json(
        { error: "Configuration manquante" },
        { status: 500 }
      );
    }

    // Récupérer la signature du webhook
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Signature manquante" },
        { status: 400 }
      );
    }

    // Récupérer le body brut de la requête
    const rawBody = await req.text();

    // Traiter l'événement
    const result = await handleWebhookEvent(rawBody, signature);

    // Si c'est un paiement réussi et qu'on a l'ID de la facture
    if (result.status === "success" && result.factureId) {
      // Mettre à jour le statut de la facture
      await updateFactureStatus(result.factureId, "Payée");

      return NextResponse.json({
        received: true,
        factureId: result.factureId,
        status: "Facture marquée comme payée",
      });
    }

    // Pour les autres événements, simplement accuser réception
    return NextResponse.json({
      received: true,
      event: result.event,
      status: result.status,
    });
  } catch (error) {
    console.error("Erreur lors du traitement du webhook:", error);
    return NextResponse.json(
      {
        error: "Erreur lors du traitement du webhook",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 400 }
    );
  }
}
