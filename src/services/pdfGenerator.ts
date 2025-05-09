import { jsPDF } from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";
import { Facture } from "@/types/facture";
import { Entreprise } from "@/types/entreprise";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { ModeleFacture } from "@/types/modeleFacture";

// Déclaration du type augmenté
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: UserOptions) => void;
  }
}

// Générer une facture avec le modèle par défaut
export const generateInvoicePDF = async (
  facture: Facture
): Promise<boolean> => {
  try {
    // Vérifier l'authentification
    const authService = getAuth();
    if (!authService.currentUser) {
      throw new Error("Utilisateur non authentifié");
    }

    // Chercher un modèle actif
    const modelesQuery = await getDoc(
      doc(
        db,
        "parametres",
        authService.currentUser.uid,
        "modeleDefaut",
        "default"
      )
    );

    // Si un modèle par défaut est défini, l'utiliser
    if (modelesQuery.exists()) {
      const modeleId = modelesQuery.data().modeleId;
      const modeleDoc = await getDoc(doc(db, "modelesFacture", modeleId));

      if (modeleDoc.exists()) {
        const modele = {
          id: modeleDoc.id,
          ...modeleDoc.data(),
        } as ModeleFacture;
        return generateInvoicePDFWithTemplate(facture, modele);
      }
    }

    // Sinon, utiliser le style par défaut
    return generateInvoicePDFDefault(facture);
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    throw error;
  }
};

// Générer une facture avec un modèle spécifique
export const generateInvoicePDFWithTemplate = async (
  facture: Facture,
  modele: ModeleFacture
): Promise<boolean> => {
  try {
    console.log("Début de la génération du PDF avec modèle personnalisé", {
      facture,
      modele,
    });

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
    const authService = getAuth();
    if (!authService.currentUser) {
      throw new Error("Utilisateur non authentifié");
    }

    // Récupération des informations de l'entreprise
    const entrepriseDoc = await getDoc(
      doc(
        db,
        "parametres",
        authService.currentUser.uid,
        "entreprise",
        "default"
      )
    );
    if (!entrepriseDoc.exists()) {
      throw new Error(
        "Les informations de l'entreprise n'ont pas été configurées"
      );
    }
    const entreprise = entrepriseDoc.data() as Entreprise;

    // Création du document PDF
    console.log("Création du document PDF avec modèle personnalisé");
    const pdfDoc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdfDoc.internal.pageSize.width;
    const pageHeight = pdfDoc.internal.pageSize.height;

    // Ajout du logo si disponible et selon la position définie dans le modèle
    if (entreprise.logo && modele.style.logoPosition !== "aucun") {
      try {
        console.log("Ajout du logo de l'entreprise");
        // Pour les logos au format Data URL (base64)
        if (entreprise.logo.startsWith("data:image")) {
          // Placer le logo en haut à gauche ou à droite selon la configuration
          const logoX =
            modele.style.logoPosition === "haut" ? 15 : pageWidth - 45;
          pdfDoc.addImage(
            entreprise.logo,
            "AUTO",
            logoX,
            5,
            30,
            15,
            "logo",
            "FAST"
          );
          console.log(
            "Logo ajouté depuis Data URL à la position:",
            modele.style.logoPosition
          );
        }
        // Pour les logos avec URL
        else if (entreprise.logo.startsWith("http")) {
          // Note: jsPDF ne supporte pas directement le chargement d'URL externes
          // Une solution serait d'implémenter un chargement via fetch, mais cela nécessiterait
          // un traitement asynchrone plus complexe
          console.log(
            "URL de logo détectée mais non supportée directement:",
            entreprise.logo
          );
        }
      } catch (logoError) {
        console.error("Erreur lors de l'ajout du logo:", logoError);
        // Continuer sans le logo en cas d'erreur
      }
    }

    // Appliquer la police du modèle
    pdfDoc.setFont(modele.style.police, "bold");

    // Titre "FACTURE"
    console.log("Ajout du titre");
    pdfDoc.setFontSize(20);
    const [r, g, b] = hexToRgb(modele.style.couleurPrimaire);
    pdfDoc.setTextColor(r, g, b); // Couleur primaire du modèle
    pdfDoc.text("FACTURE", 15, 25);

    // Informations de l'entreprise (à gauche)
    console.log("Ajout des informations de l'entreprise");
    pdfDoc.setTextColor(0, 0, 0); // Retour au noir
    pdfDoc.setFontSize(10);
    let yPos = 30;

    // Nom de l'entreprise en gras
    pdfDoc.setFont(modele.style.police, "bold");
    pdfDoc.text(entreprise.nom.toUpperCase(), 15, yPos);

    // Reste des informations en normal avec espacement augmenté
    pdfDoc.setFont(modele.style.police, "normal");
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
    let dateStr: string;

    try {
      const date = convertToDate(facture.dateCreation);
      dateStr = date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (e) {
      console.error("Erreur de conversion de date:", e);
      dateStr = new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    }

    pdfDoc.setFont(modele.style.police, "bold");
    pdfDoc.text(`Facture N° ${facture.numero}`, pageWidth - 60, 30);
    pdfDoc.setFont(modele.style.police, "normal");
    pdfDoc.text(`Date: ${dateStr}`, pageWidth - 60, 35); // Augmenté de 34 à 35

    // Informations du client (à droite)
    console.log("Ajout des informations client");
    pdfDoc.text("FACTURER À:", pageWidth - 60, 65);
    pdfDoc.setFont(modele.style.police, "bold");
    pdfDoc.text(facture.client.nom.toUpperCase(), pageWidth - 60, 70);
    pdfDoc.setFont(modele.style.police, "normal");
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
              font: modele.style.police,
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

    // Convertir la couleur secondaire en RGB pour le tableau
    const rgbSecondary = hexToRgb(modele.style.couleurSecondaire);

    console.log("Configuration du tableau");
    autoTable(pdfDoc, {
      startY: 95,
      head: [tableColumn],
      body: tableRows,
      theme: "plain",
      headStyles: {
        fillColor: rgbSecondary,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left",
        font: modele.style.police,
      },
      styles: {
        fontSize: 9,
        cellPadding: 5,
        lineColor: [200, 200, 200],
        lineWidth: 0,
        overflow: "linebreak",
        font: modele.style.police,
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

          data.doc.setDrawColor(...rgbSecondary);
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
    pdfDoc.setFont(modele.style.police, "bold");
    pdfDoc.text("Coordonnées bancaires:", 15, bottomSection);
    pdfDoc.setFont(modele.style.police, "normal");
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

    pdfDoc.setFont(modele.style.police, "normal");
    pdfDoc.text(
      [`Total HT: ${totalHT.toFixed(2)} €`, `TVA: ${tva.toFixed(2)} €`],
      pageWidth - 60,
      bottomSection
    );

    // Total TTC en plus gros et en gras
    pdfDoc.setFont(modele.style.police, "bold");
    pdfDoc.setFontSize(12);
    pdfDoc.text(
      `Total TTC: ${totalTTC.toFixed(2)} €`,
      pageWidth - 60,
      bottomSection + 8
    );

    // Ajouter les mentions spéciales du modèle
    if (modele.mentionsSpeciales && modele.mentionsSpeciales.length > 0) {
      pdfDoc.setFont(modele.style.police, "normal");
      pdfDoc.setFontSize(8);
      modele.mentionsSpeciales.forEach((mention, index) => {
        pdfDoc.text(mention, 15, pageHeight - 22 + index * 4);
      });
    }
    // Si pas de mentions spéciales dans le modèle, utiliser celles de l'entreprise
    else if (
      entreprise.mentionsLegales &&
      entreprise.mentionsLegales.length > 0
    ) {
      pdfDoc.setFont(modele.style.police, "normal");
      pdfDoc.setFontSize(8);
      entreprise.mentionsLegales.forEach((mention, index) => {
        pdfDoc.text(mention, 15, pageHeight - 22 + index * 4);
      });
    }

    // Ajouter le pied de page du modèle, s'il existe
    if (modele.piedDePage) {
      pdfDoc.setFont(modele.style.police, "italic");
      pdfDoc.setFontSize(8);
      pdfDoc.text(modele.piedDePage, pageWidth / 2, pageHeight - 10, {
        align: "center",
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
        const userId = authService.currentUser.uid;
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

// L'ancienne fonction generateInvoicePDF renommée
export const generateInvoicePDFDefault = async (
  facture: Facture
): Promise<boolean> => {
  // Garder l'implémentation originale telle quelle
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
    const authService = getAuth();
    if (!authService.currentUser) {
      throw new Error("Utilisateur non authentifié");
    }

    // Récupération des informations de l'entreprise
    const entrepriseDoc = await getDoc(
      doc(
        db,
        "parametres",
        authService.currentUser.uid,
        "entreprise",
        "default"
      )
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

    // Ajout du logo si disponible
    if (entreprise.logo) {
      try {
        console.log("Ajout du logo de l'entreprise");
        // Pour les logos au format Data URL (base64)
        if (entreprise.logo.startsWith("data:image")) {
          pdfDoc.addImage(
            entreprise.logo,
            "AUTO",
            15,
            5,
            30,
            15,
            "logo",
            "FAST"
          );
          console.log("Logo ajouté depuis Data URL");
        }
        // Pour les logos avec URL
        else if (entreprise.logo.startsWith("http")) {
          // Note: jsPDF ne supporte pas directement le chargement d'URL externes
          console.log(
            "URL de logo détectée mais non supportée directement:",
            entreprise.logo
          );
        }
      } catch (logoError) {
        console.error("Erreur lors de l'ajout du logo:", logoError);
        // Continuer sans le logo en cas d'erreur
      }
    }

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
    let dateStr: string;

    try {
      const date = convertToDate(facture.dateCreation);
      dateStr = date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (e) {
      console.error("Erreur de conversion de date:", e);
      dateStr = new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    }

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
        const userId = authService.currentUser.uid;
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

// Nouvelle fonction pour générer avec modèle spécifique choisi par l'utilisateur
export const generateInvoicePDFWithSelectedTemplate = async (
  facture: Facture,
  modeleId?: string
): Promise<boolean> => {
  try {
    // Vérifier l'authentification
    const authService = getAuth();
    if (!authService.currentUser) {
      throw new Error("Utilisateur non authentifié");
    }

    // Si un ID de modèle est fourni, utiliser ce modèle
    if (modeleId) {
      const modeleDoc = await getDoc(doc(db, "modelesFacture", modeleId));

      if (modeleDoc.exists()) {
        const modele = {
          id: modeleDoc.id,
          ...modeleDoc.data(),
        } as ModeleFacture;
        return generateInvoicePDFWithTemplate(facture, modele);
      } else {
        throw new Error("Le modèle sélectionné n'existe pas");
      }
    }

    // Si aucun modèle n'est spécifié, revenir au comportement par défaut
    return generateInvoicePDF(facture);
  } catch (error) {
    console.error(
      "Erreur lors de la génération du PDF avec modèle spécifique:",
      error
    );
    throw error;
  }
};

// Fonction utilitaire pour convertir une couleur hexadécimale en RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const cleanHex = hex.startsWith("#") ? hex.substring(1) : hex;

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return [r, g, b];
};

// Fonction utilitaire pour convertir une date en format standard
const convertToDate = (date: any): Date => {
  if (!date) return new Date();
  
  if (date instanceof Date) {
    return date;
  }
  
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  }
  
  if (date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  
  return new Date();
};
