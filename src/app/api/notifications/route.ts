import { NextRequest, NextResponse } from "next/server";
import {
  verifierFacturesEnRetard,
  getNotificationsNonLues,
} from "@/services/notificationService";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Facture, FirestoreTimestamp } from "@/types/facture";

// Exporter une configuration pour définir cette route comme dynamique
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "UserId manquant" }, { status: 400 });
    }

    // 1. Récupérer toutes les factures non payées
    const facturesQuery = query(
      collection(db, "factures"),
      where("userId", "==", userId),
      where("statut", "in", ["Envoyée", "En attente", "À relancer"])
    );

    const facturesSnapshot = await getDocs(facturesQuery);
    const factures = facturesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Facture[];

    // 2. Pour chaque facture, calculer la date d'échéance
    const aujourdhui = new Date();
    const facturesDetails = factures.map((facture) => {
      // Convertir la date de création en objet Date
      let dateCreation: Date;
      if (facture.dateCreation instanceof Date) {
        dateCreation = facture.dateCreation;
      } else if (typeof facture.dateCreation === "string") {
        dateCreation = new Date(facture.dateCreation);
      } else if (
        facture.dateCreation &&
        typeof (facture.dateCreation as FirestoreTimestamp).toDate ===
          "function"
      ) {
        dateCreation = (facture.dateCreation as FirestoreTimestamp).toDate();
      } else {
        dateCreation = new Date(); // Fallback
      }

      // Calculer la date d'échéance
      let dateEcheance = new Date(dateCreation);
      switch (facture.client.delaisPaiement) {
        case "À réception":
          dateEcheance.setDate(dateCreation.getDate() + 0);
          break;
        case "8 jours":
          dateEcheance.setDate(dateCreation.getDate() + 8);
          break;
        case "30 jours":
          dateEcheance.setDate(dateCreation.getDate() + 30);
          break;
        case "60 jours":
          dateEcheance.setDate(dateCreation.getDate() + 60);
          break;
        default:
          dateEcheance.setDate(dateCreation.getDate() + 30);
      }

      const estEnRetard = aujourdhui > dateEcheance;
      const diffJours = Math.floor(
        (dateEcheance.getTime() - aujourdhui.getTime()) / (1000 * 3600 * 24)
      );
      const echeanceProche = diffJours <= 3 && diffJours >= 0;

      return {
        id: facture.id,
        numero: facture.numero,
        client: facture.client.nom,
        statut: facture.statut,
        montantTTC: facture.totalTTC,
        dateCreation: dateCreation.toISOString(),
        dateEcheance: dateEcheance.toISOString(),
        estEnRetard,
        joursRestants: diffJours,
        echeanceProche,
        delaisPaiement: facture.client.delaisPaiement,
      };
    });

    // 3. Forcer la vérification des factures en retard
    await verifierFacturesEnRetard(userId);

    // 4. Récupérer les notifications après la vérification
    const notifications = await getNotificationsNonLues(userId);

    return NextResponse.json({
      factures: facturesDetails,
      facturesEnRetard: facturesDetails.filter((f) => f.estEnRetard),
      facturesEcheanceProche: facturesDetails.filter((f) => f.echeanceProche),
      notifications,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification des notifications:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification des notifications" },
      { status: 500 }
    );
  }
}
