import { jsPDF } from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";
import { Facture } from "@/types/facture";
import { Entreprise } from "@/types/entreprise";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Déclaration du type augmenté
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: UserOptions) => void;
  }
}

export const generateInvoicePDF = async (facture: Facture) => {
  try {
    console.log("Début de la génération du PDF", { facture });

    // Vérification des données requises
    if (!facture || !facture.numero || !facture.client) {
      console.error("Données manquantes:", {
        hasFacture: !!facture,
        hasNumero: !!facture?.numero,
        hasClient: !!facture?.client,
      });
      throw new Error("Données de facture invalides");
    }

    // Vérifier l'authentification
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error("Utilisateur non authentifié");
    }

    // Récupération des informations de l'entreprise
    const entrepriseDoc = await getDoc(
      doc(db, "parametres", auth.currentUser.uid, "entreprise", "default")
    );
    if (!entrepriseDoc.exists()) {
      throw new Error(
        "Les informations de l'entreprise n'ont pas été configurées"
      );
    }
    const entreprise = entrepriseDoc.data() as Entreprise;

    // Création du document PDF
    console.log("Création du document PDF");
    const pdfDoc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdfDoc.internal.pageSize.width;
    const pageHeight = pdfDoc.internal.pageSize.height;

    // Titre "FACTURE"
    console.log("Ajout du titre");
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.setFontSize(20);
    pdfDoc.setTextColor(41, 128, 185); // Bleu moderne
    pdfDoc.text("FACTURE", 15, 25);

    // Informations de l'entreprise (à gauche)
    console.log("Ajout des informations de l'entreprise");
    pdfDoc.setTextColor(0, 0, 0); // Retour au noir
    pdfDoc.setFontSize(10);
    let yPos = 30;

    // Nom de l'entreprise en gras
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(entreprise.nom.toUpperCase(), 15, yPos);

    // Reste des informations en normal avec espacement augmenté
    pdfDoc.setFont("helvetica", "normal");
    const entrepriseInfos = [
      entreprise.rue,
      `${entreprise.codePostal} ${entreprise.ville}`,
      `Tél: ${entreprise.telephone}`,
      `Email: ${entreprise.email}`,
      `SIRET: ${entreprise.siret}`,
    ];
    entrepriseInfos.forEach((info, index) => {
      pdfDoc.text(info, 15, yPos + 5 + index * 4.5); // Augmentation de l'espacement de 4 à 4.5
    });

    // Numéro de facture et date (en haut à droite)
    console.log("Ajout du numéro de facture et de la date");
    const dateStr = facture.dateCreation
      ? new Date(facture.dateCreation).toLocaleDateString("fr-FR")
      : new Date().toLocaleDateString("fr-FR");

    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(`Facture N° ${facture.numero}`, pageWidth - 60, 30);
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.text(`Date: ${dateStr}`, pageWidth - 60, 35); // Augmenté de 34 à 35

    // Informations du client (à droite)
    console.log("Ajout des informations client");
    pdfDoc.text("FACTURER À:", pageWidth - 60, 65);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(facture.client.nom.toUpperCase(), pageWidth - 60, 70);
    pdfDoc.setFont("helvetica", "normal");
    const clientInfos = [
      facture.client.rue,
      `${facture.client.codePostal} ${facture.client.ville}`,
    ];
    clientInfos.forEach((info, index) => {
      pdfDoc.text(info, pageWidth - 60, 75 + index * 4.5); // Augmentation de l'espacement et ajustement de la position de départ
    });

    // Tableau des articles avec TVA
    console.log("Création du tableau des articles");
    const tableColumn = [
      "Description",
      "Quantité",
      "Prix HT",
      "TVA %",
      "Total TTC",
    ];
    const tableRows = (facture.articles || []).map((article) => {
      if (article.isComment) {
        return [
          {
            content: article.description || "",
            colSpan: 5,
            styles: {
              fillColor: [245, 245, 245],
              textColor: [100, 100, 100],
              fontStyle: "italic",
            },
          },
        ];
      }
      return [
        article.description || "",
        article.quantite?.toString() || "0",
        `${(article.prixUnitaireHT || 0).toFixed(2)} €`,
        `${article.tva || 0}%`,
        `${(article.totalTTC || 0).toFixed(2)} €`,
      ];
    });

    console.log("Configuration du tableau");
    autoTable(pdfDoc, {
      startY: 95,
      head: [tableColumn],
      body: tableRows,
      theme: "plain",
      headStyles: {
        fillColor: [244, 83, 12],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left",
      },
      styles: {
        fontSize: 9,
        cellPadding: 5,
        lineColor: [200, 200, 200],
        lineWidth: 0,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: "auto", minCellWidth: 60 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 25, halign: "right" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 25, halign: "right" },
      },
      margin: { left: 15, right: 15 },
      didDrawCell: function (data) {
        if (data.row.index === 0 && data.section === "head") {
          const x = data.cell.x;
          const y = data.cell.y + data.cell.height;
          const w = data.cell.width;

          data.doc.setDrawColor(244, 83, 12);
          data.doc.setLineWidth(0.5);
          data.doc.line(x, y, x + w, y);
        }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
    } as UserOptions);

    // Position pour les totaux et coordonnées bancaires
    const bottomSection = pageHeight - 50;

    // Coordonnées bancaires (en bas à gauche)
    console.log("Ajout des coordonnées bancaires");
    pdfDoc.setFontSize(9);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text("Coordonnées bancaires:", 15, bottomSection);
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.text(
      [
        `IBAN: ${entreprise.rib?.iban || ""}`,
        `BIC: ${entreprise.rib?.bic || ""}`,
        `Banque: ${entreprise.rib?.banque || ""}`,
      ],
      15,
      bottomSection + 4
    );

    // Totaux (en bas à droite)
    console.log("Calcul et affichage des totaux");
    const totalHT = facture.totalHT || 0;
    const totalTTC = facture.totalTTC || 0;
    const tva = totalTTC - totalHT;

    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.text(
      [`Total HT: ${totalHT.toFixed(2)} €`, `TVA: ${tva.toFixed(2)} €`],
      pageWidth - 60,
      bottomSection
    );

    // Total TTC en plus gros et en gras
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.setFontSize(12);
    pdfDoc.text(
      `Total TTC: ${totalTTC.toFixed(2)} €`,
      pageWidth - 60,
      bottomSection + 8
    );

    // Mentions légales
    console.log("Ajout des mentions légales");
    if (entreprise.mentionsLegales && entreprise.mentionsLegales.length > 0) {
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(8);
      entreprise.mentionsLegales.forEach((mention, index) => {
        pdfDoc.text(mention, 15, pageHeight - 22 + index * 4);
      });
    }

    // Sauvegarde du PDF avec gestion d'erreur séparée
    try {
      // D'abord sauvegarder localement
      pdfDoc.save(`${facture.numero}.pdf`);

      // Ensuite essayer de sauvegarder sur Firebase Storage
      try {
        const pdfBlob = new Blob([pdfDoc.output("blob")], {
          type: "application/pdf",
        });

        // Création du chemin avec l'ID de l'utilisateur
        const userId = auth.currentUser.uid;
        const storageRef = ref(
          storage,
          `factures/${userId}/${facture.numero}.pdf`
        );

        // Ajout des métadonnées
        const metadata = {
          contentType: "application/pdf",
          customMetadata: {
            fileName: `${facture.numero}.pdf`,
            createdAt: new Date().toISOString(),
            createdBy: userId,
          },
        };

        // Upload avec les métadonnées
        await uploadBytes(storageRef, pdfBlob, metadata);
        console.log("PDF sauvegardé avec succès sur Firebase Storage");
      } catch (firebaseError) {
        console.error(
          "Erreur lors de la sauvegarde sur Firebase:",
          firebaseError
        );
        const errorMessage =
          firebaseError instanceof Error
            ? firebaseError.message
            : "Erreur inconnue lors de la sauvegarde sur Firebase";
        throw new Error(`Erreur Firebase Storage: ${errorMessage}`);
      }

      return true;
    } catch (saveError) {
      console.error("Erreur lors de la sauvegarde du PDF:", saveError);
      throw new Error("Impossible de sauvegarder le PDF");
    }
  } catch (error: unknown) {
    console.error("Erreur détaillée lors de la génération du PDF:", error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
      throw new Error(`Erreur lors de la génération du PDF: ${error.message}`);
    } else {
      throw new Error("Erreur inconnue lors de la génération du PDF");
    }
  }
};
