import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateUserSubscription } from "@/services/subscriptionService";

// Récupération de la clé secrète Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialisation de l'instance Stripe
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-03-31.basil" })
  : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    console.error("Stripe n'est pas configuré correctement");
    return NextResponse.json(
      { error: "Stripe non configuré" },
      { status: 500 }
    );
  }

  try {
    // Récupérer la signature de la requête
    const signature = request.headers.get("stripe-signature");

    if (!signature || !endpointSecret) {
      console.error("La signature ou le secret du webhook est manquant");
      return NextResponse.json(
        { error: "Configuration incomplète" },
        { status: 400 }
      );
    }

    // Récupérer le corps de la requête
    const body = await request.text();

    // Vérifier la signature et construire l'événement
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      endpointSecret
    );

    // Traiter les différents événements
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Vérifier que c'est bien un paiement pour un abonnement
        if (
          session.mode === "subscription" &&
          session.subscription &&
          session.customer &&
          session.metadata?.userId &&
          session.metadata.planId
        ) {
          const userId = session.metadata.userId;
          const planId = session.metadata.planId;

          // Récupérer les détails de l'abonnement
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          if (subscription) {
            // Calculer les dates
            const dateStart = new Date(Date.now());
            const dateEnd = new Date();
            dateEnd.setMonth(dateEnd.getMonth() + 1); // Date de fin dans un mois

            // Mettre à jour l'abonnement de l'utilisateur
            await updateUserSubscription(
              userId,
              session.subscription as string,
              planId,
              dateStart,
              dateEnd
            );

            console.log(
              `Abonnement mis à jour pour l'utilisateur ${userId} avec le plan ${planId}`
            );
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Récupérer les métadonnées (client, plan)
        if (subscription.metadata?.userId && subscription.metadata.planId) {
          const userId = subscription.metadata.userId;
          const planId = subscription.metadata.planId;

          // Calculer les dates
          const dateStart = new Date(Date.now());
          const dateEnd = new Date();
          dateEnd.setMonth(dateEnd.getMonth() + 1); // Date de fin dans un mois

          // Mettre à jour l'abonnement
          await updateUserSubscription(
            userId,
            subscription.id,
            planId,
            dateStart,
            dateEnd
          );

          console.log(`Abonnement mis à jour pour l'utilisateur ${userId}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Gérer la fin de l'abonnement si nécessaire
        if (subscription.metadata?.userId) {
          const userId = subscription.metadata.userId;

          // Ici, vous pourriez rétrograder l'utilisateur vers un plan gratuit
          // ou effectuer d'autres opérations nécessaires

          console.log(`Abonnement terminé pour l'utilisateur ${userId}`);
        }
        break;
      }

      // Vous pouvez ajouter d'autres événements selon vos besoins

      default:
        console.log(`Événement non traité: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Erreur lors du traitement du webhook:", err);
    return NextResponse.json(
      { error: "Erreur lors du traitement du webhook" },
      { status: 400 }
    );
  }
}
