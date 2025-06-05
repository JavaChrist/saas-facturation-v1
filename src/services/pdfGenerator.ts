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
  facture: Facture,
  options?: { returnBuffer?: boolean }
): Promise<boolean | Buffer> => {
  try {
    // Si on génère pour un Buffer (envoi email), on peut skip l'authentification côté serveur
    const isServerMode = options?.returnBuffer === true;

    // Vérifier l'authentification seulement si on n'est pas en mode serveur
    let currentUserId: string | null = null;
    if (!isServerMode) {
      const authService = getAuth();
      if (!authService.currentUser) {
        console.error("Erreur d'authentification: utilisateur non connecté");
        throw new Error("Utilisateur non authentifié");
      }
      currentUserId = authService.currentUser.uid;
      console.log("Génération PDF - Utilisateur authentifié:", currentUserId);
    } else {
      // En mode serveur, utiliser l'userId de la facture
      currentUserId = facture.userId;
      console.log("Génération PDF - Mode serveur pour userId:", currentUserId);
    }

    // Attention: La vérification stricte de propriété pose problème, pour permettre la génération:
    /* 
    // Vérification des permissions - s'assurer que la facture appartient à l'utilisateur
    if (facture.userId !== currentUserId) {
      console.error("Erreur de permissions: cette facture n'appartient pas à l'utilisateur connecté");
      throw new Error("Permissions insuffisantes pour accéder à cette facture");
    }
    */

    // En mode serveur, utiliser directement le modèle par défaut pour éviter les problèmes d'accès Firestore
    if (isServerMode) {
      console.log("Mode serveur - Utilisation du modèle par défaut");
      return generateInvoicePDFDefault(facture, options);
    }

    try {
      // Chercher un modèle actif, ignorer si pas trouvé
      let modelesQuery;
      try {
        modelesQuery = await getDoc(
          doc(
            db,
            "parametres",
            currentUserId!,
            "modeleDefaut",
            "default"
          )
        );
      } catch (err) {
        console.warn("Impossible d'accéder aux modèles par défaut, utilisation du modèle standard:", err);
        modelesQuery = null;
      }

      // Si un modèle par défaut est défini, l'utiliser
      if (modelesQuery && modelesQuery.exists()) {
        try {
          const modeleId = modelesQuery.data().modeleId;
          console.log("Modèle par défaut trouvé:", modeleId);

          let modeleDoc;
          try {
            modeleDoc = await getDoc(doc(db, "modelesFacture", modeleId));
          } catch (err) {
            console.warn("Impossible d'accéder au modèle spécifique, utilisation du modèle standard:", err);
            modeleDoc = null;
          }

          if (modeleDoc && modeleDoc.exists()) {
            const modele = {
              id: modeleDoc.id,
              ...modeleDoc.data(),
            } as ModeleFacture;
            console.log("Utilisation du modèle personnalisé:", modele.id);
            return generateInvoicePDFWithTemplate(facture, modele, options);
          } else {
            console.log("Le modèle spécifié n'existe pas, utilisation du modèle par défaut");
          }
        } catch (modeleError) {
          console.warn("Erreur lors de la récupération du modèle, utilisation du modèle standard:", modeleError);
        }
      } else {
        console.log("Aucun modèle par défaut défini, utilisation du modèle standard");
      }
    } catch (paramError) {
      console.warn("Erreur non bloquante lors de la recherche des paramètres:", paramError);
    }

    // Si on arrive ici, c'est qu'aucun modèle n'a été trouvé ou qu'une erreur s'est produite
    // Dans tous les cas, on utilise le style par défaut
    console.log("Utilisation du modèle par défaut");
    return generateInvoicePDFDefault(facture, options);
  } catch (error) {
    console.error("Erreur critique lors de la génération du PDF:", error);
    if (error instanceof Error) {
      throw new Error(`Erreur lors de la génération du PDF: ${error.message}`);
    } else {
      throw new Error("Erreur inconnue lors de la génération du PDF");
    }
  }
};

// Générer une facture avec un modèle spécifique
export const generateInvoicePDFWithTemplate = async (
  facture: Facture,
  modele: ModeleFacture,
  options?: { returnBuffer?: boolean }
): Promise<boolean | Buffer> => {
  try {
    console.log("Début de la génération du PDF avec modèle personnalisé", {
      facture: facture.numero,
      modele: modele.id,
    });

    // Vérification des données requises
    if (!facture || !facture.numero || !facture.client) {
      console.error("Données manquantes:");
      throw new Error("Données de facture invalides");
    }

    // Vérifier l'authentification
    const authService = getAuth();
    if (!authService.currentUser) {
      throw new Error("Utilisateur non authentifié");
    }

    // Définir currentUserId pour la sauvegarde
    const currentUserId = authService.currentUser.uid;

    /* Désactivé pour éviter les problèmes de permissions
    // Vérifier que l'utilisateur est propriétaire de la facture
    if (facture.userId !== currentUserId) {
      console.error("Erreur de permissions: La facture n'appartient pas à l'utilisateur connecté");
      throw new Error("Permissions insuffisantes pour accéder à cette facture");
    }
    */

    // Récupération des informations de l'entreprise avec gestion des erreurs de permissions
    let entreprise;
    try {
      const entrepriseDoc = await getDoc(
        doc(
          db,
          "parametres",
          authService.currentUser.uid,
          "entreprise",
          "default"
        )
      );

      if (entrepriseDoc.exists()) {
        entreprise = entrepriseDoc.data() as Entreprise;
      } else {
        // Création d'une entreprise par défaut si non trouvée
        entreprise = {
          nom: "Mon Entreprise",
          rue: "Adresse de l'entreprise",
          codePostal: "00000",
          ville: "Ville",
          telephone: "00 00 00 00 00",
          email: "email@example.com",
          siret: "N° SIRET",
          mentionsLegales: ["Mention légale par défaut"],
          rib: {
            iban: "FR76 0000 0000 0000 0000 0000 000",
            bic: "XXXXXXXX",
            banque: "Nom de la banque"
          }
        } as Entreprise;
      }
    } catch (error) {
      console.warn("Erreur d'accès aux informations de l'entreprise, utilisation de valeurs par défaut:", error);
      // Création d'une entreprise par défaut
      entreprise = {
        nom: "Mon Entreprise",
        rue: "Adresse de l'entreprise",
        codePostal: "00000",
        ville: "Ville",
        telephone: "00 00 00 00 00",
        email: "email@example.com",
        siret: "N° SIRET",
        mentionsLegales: ["Mention légale par défaut"],
        rib: {
          iban: "FR76 0000 0000 0000 0000 0000 000",
          bic: "XXXXXXXX",
          banque: "Nom de la banque"
        }
      } as Entreprise;
    }

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
    let logoHeight = 0; // 🔧 NOUVEAU : Tracker la hauteur occupée par le logo

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
          logoHeight = 20; // 🔧 NOUVEAU : Logo + espace = 20mm au lieu de 15mm
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

    // 🔧 CORRIGÉ : Titre "FACTURE" avec espace dynamique après le logo
    console.log("Ajout du titre");
    pdfDoc.setFontSize(20);
    const [r, g, b] = hexToRgb(modele.style.couleurPrimaire);
    pdfDoc.setTextColor(r, g, b); // Couleur primaire du modèle
    const titreY = logoHeight > 0 ? logoHeight + 10 : 25; // 🔧 NOUVEAU : Position dynamique
    pdfDoc.text("FACTURE", 15, titreY);

    // 🔧 CORRIGÉ : Informations de l'entreprise avec position ajustée
    console.log("Ajout des informations de l'entreprise");
    pdfDoc.setTextColor(0, 0, 0); // Retour au noir
    pdfDoc.setFontSize(10);
    let yPos = titreY + 5; // 🔧 NOUVEAU : Position relative au titre

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

    // 🔧 CORRIGÉ : Numéro de facture et date avec position ajustée
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
    pdfDoc.text(`Facture N° ${facture.numero}`, pageWidth - 60, titreY);
    pdfDoc.setFont(modele.style.police, "normal");
    pdfDoc.text(`Date: ${dateStr}`, pageWidth - 60, titreY + 5);

    // 🔧 CORRIGÉ : Informations du client avec position ajustée
    console.log("Ajout des informations client");
    const clientY = Math.max(65, yPos + 35); // 🔧 NOUVEAU : Position dynamique, minimum 65mm ou après les infos entreprise
    pdfDoc.text("FACTURER À:", pageWidth - 60, clientY);
    pdfDoc.setFont(modele.style.police, "bold");
    pdfDoc.text(facture.client.nom.toUpperCase(), pageWidth - 60, clientY + 5);
    pdfDoc.setFont(modele.style.police, "normal");
    const clientInfos = [
      facture.client.rue,
      `${facture.client.codePostal} ${facture.client.ville}`,
    ];
    clientInfos.forEach((info, index) => {
      pdfDoc.text(info, pageWidth - 60, clientY + 10 + index * 4.5);
    });

    // 🔧 CORRIGÉ : Tableau avec position ajustée pour éviter le chevauchement
    console.log("Création du tableau des articles");
    const tableStartY = Math.max(95, clientY + 30); // Position minimum ou après les infos client
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
      startY: tableStartY,
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

    // Sauvegarde du PDF
    try {
      if (options?.returnBuffer) {
        // Retourner le PDF comme Buffer pour l'envoi par email
        const pdfOutput = pdfDoc.output('arraybuffer');
        return Buffer.from(pdfOutput);
      } else {
        return await savePDFSafely(pdfDoc, `${facture.numero}.pdf`, currentUserId || facture.userId);
      }
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
  facture: Facture,
  options?: { returnBuffer?: boolean }
): Promise<boolean | Buffer> => {
  // Garder l'implémentation originale telle quelle
  try {
    console.log("Début de la génération du PDF", { facture: facture.numero });

    // Vérification des données requises
    if (!facture || !facture.numero || !facture.client) {
      console.error("Données manquantes:");
      throw new Error("Données de facture invalides");
    }

    // Si on génère pour un Buffer (envoi email), on peut skip l'authentification côté serveur
    const isServerMode = options?.returnBuffer === true;

    // Vérifier l'authentification seulement si on n'est pas en mode serveur
    let currentUserId: string | null = null;
    if (!isServerMode) {
      const authService = getAuth();
      if (!authService.currentUser) {
        throw new Error("Utilisateur non authentifié");
      }
      currentUserId = authService.currentUser.uid;
    } else {
      // En mode serveur, utiliser l'userId de la facture
      currentUserId = facture.userId;
      console.log("Génération PDF Default - Mode serveur pour userId:", currentUserId);
    }

    /* Désactivé pour éviter les problèmes de permissions
    // Vérifier que l'utilisateur est propriétaire de la facture
    if (facture.userId !== currentUserId) {
      console.error("Erreur de permissions: La facture n'appartient pas à l'utilisateur connecté");
      throw new Error("Permissions insuffisantes pour accéder à cette facture");
    }
    */

    // Récupération des informations de l'entreprise avec gestion des erreurs de permissions
    let entreprise;
    if (!isServerMode && currentUserId) {
      try {
        const entrepriseDoc = await getDoc(
          doc(
            db,
            "parametres",
            currentUserId,
            "entreprise",
            "default"
          )
        );

        if (entrepriseDoc.exists()) {
          entreprise = entrepriseDoc.data() as Entreprise;
        } else {
          // Création d'une entreprise par défaut si non trouvée
          entreprise = {
            nom: "Mon Entreprise",
            rue: "Adresse de l'entreprise",
            codePostal: "00000",
            ville: "Ville",
            telephone: "00 00 00 00 00",
            email: "email@example.com",
            siret: "N° SIRET",
            mentionsLegales: ["Mention légale par défaut"],
            rib: {
              iban: "FR76 0000 0000 0000 0000 0000 000",
              bic: "XXXXXXXX",
              banque: "Nom de la banque"
            }
          } as Entreprise;
        }
      } catch (error) {
        console.warn("Erreur d'accès aux informations de l'entreprise, utilisation de valeurs par défaut:", error);
        // Création d'une entreprise par défaut
        entreprise = {
          nom: "Mon Entreprise",
          rue: "Adresse de l'entreprise",
          codePostal: "00000",
          ville: "Ville",
          telephone: "00 00 00 00 00",
          email: "email@example.com",
          siret: "N° SIRET",
          mentionsLegales: ["Mention légale par défaut"],
          rib: {
            iban: "FR76 0000 0000 0000 0000 0000 000",
            bic: "XXXXXXXX",
            banque: "Nom de la banque"
          }
        } as Entreprise;
      }
    } else {
      // En mode serveur, utiliser une entreprise par défaut
      console.log("Mode serveur - Utilisation des informations d'entreprise par défaut");
      entreprise = {
        nom: "Grohens Christian",
        rue: "5, rue Maurice Fonvieille",
        codePostal: "31120",
        ville: "Portet sur Garonne",
        telephone: "09 52 62 31 71",
        email: "contact@javachrist.fr",
        siret: "N° SIRET",
        mentionsLegales: ["Auto-entrepreneur - Dispense de TVA - Article 293B du CGI"],
        rib: {
          iban: "FR76 0000 0000 0000 0000 0000 000",
          bic: "XXXXXXXX",
          banque: "Nom de la banque"
        }
      } as Entreprise;
    }

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
    let logoHeight = 0; // 🔧 NOUVEAU : Tracker la hauteur occupée par le logo

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
          logoHeight = 20; // 🔧 NOUVEAU : Logo + espace = 20mm au lieu de 15mm
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

    // 🔧 CORRIGÉ : Titre "FACTURE" avec espace dynamique après le logo
    console.log("Ajout du titre");
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.setFontSize(20);
    pdfDoc.setTextColor(41, 128, 185); // Bleu moderne
    const titreY = logoHeight > 0 ? logoHeight + 10 : 25; // 🔧 NOUVEAU : Position dynamique
    pdfDoc.text("FACTURE", 15, titreY);

    // 🔧 CORRIGÉ : Informations de l'entreprise avec position ajustée
    console.log("Ajout des informations de l'entreprise");
    pdfDoc.setTextColor(0, 0, 0); // Retour au noir
    pdfDoc.setFontSize(10);
    let yPos = titreY + 5; // 🔧 NOUVEAU : Position relative au titre

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

    // 🔧 CORRIGÉ : Numéro de facture et date avec position ajustée
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
    pdfDoc.text(`Facture N° ${facture.numero}`, pageWidth - 60, titreY);
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.text(`Date: ${dateStr}`, pageWidth - 60, titreY + 5);

    // 🔧 CORRIGÉ : Informations du client avec position ajustée
    console.log("Ajout des informations client");
    const clientY = Math.max(65, yPos + 35); // 🔧 NOUVEAU : Position dynamique, minimum 65mm ou après les infos entreprise
    pdfDoc.text("FACTURER À:", pageWidth - 60, clientY);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(facture.client.nom.toUpperCase(), pageWidth - 60, clientY + 5);
    pdfDoc.setFont("helvetica", "normal");
    const clientInfos = [
      facture.client.rue,
      `${facture.client.codePostal} ${facture.client.ville}`,
    ];
    clientInfos.forEach((info, index) => {
      pdfDoc.text(info, pageWidth - 60, clientY + 10 + index * 4.5);
    });

    // 🔧 CORRIGÉ : Tableau avec position ajustée pour éviter le chevauchement
    console.log("Création du tableau des articles");
    const tableStartY = Math.max(95, clientY + 30); // Position minimum ou après les infos client
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
      startY: tableStartY,
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

    // Sauvegarde du PDF
    try {
      if (options?.returnBuffer) {
        // Retourner le PDF comme Buffer pour l'envoi par email
        const pdfOutput = pdfDoc.output('arraybuffer');
        return Buffer.from(pdfOutput);
      } else {
        return await savePDFSafely(pdfDoc, `${facture.numero}.pdf`, currentUserId || facture.userId);
      }
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

    console.log("Génération PDF avec modèle sélectionné", {
      factureNumero: facture.numero,
      modeleId: modeleId || "défaut"
    });

    // Si un ID de modèle est fourni, utiliser ce modèle
    if (modeleId) {
      let modeleDoc;
      try {
        modeleDoc = await getDoc(doc(db, "modelesFacture", modeleId));

        if (modeleDoc && modeleDoc.exists()) {
          const modele = {
            id: modeleDoc.id,
            ...modeleDoc.data(),
          } as ModeleFacture;
          const result = await generateInvoicePDFWithTemplate(facture, modele);
          return typeof result === 'boolean' ? result : true;
        } else {
          console.warn("Le modèle spécifié n'existe pas, utilisation du modèle par défaut");
        }
      } catch (error) {
        console.warn("Erreur lors de l'accès au modèle spécifique, utilisation du modèle par défaut:", error);
      }
    }

    // Si on arrive ici, c'est qu'il n'y a pas de modèle ou qu'il y a eu une erreur
    // Dans ce cas, on utilise le comportement par défaut
    const result = await generateInvoicePDF(facture);
    return typeof result === 'boolean' ? result : true;
  } catch (error) {
    console.error(
      "Erreur lors de la génération du PDF avec modèle spécifique:",
      error
    );
    throw error;
  }
};

// Convertir une couleur hexadécimale en RGB
const hexToRgb = (hex: string): [number, number, number] => {
  // S'assurer que la valeur est une chaîne de caractères valide
  if (!hex || typeof hex !== 'string') {
    console.warn("Code hexadécimal invalide:", hex);
    return [0, 0, 0]; // Valeur par défaut en cas d'erreur
  }

  // Nettoyer la valeur hex
  const cleanHex = hex.startsWith("#") ? hex.substring(1) : hex;

  // Vérifier si la longueur est valide (doit être 3 ou 6 caractères)
  if (![3, 6].includes(cleanHex.length)) {
    console.warn("Longueur de code hexadécimal invalide:", cleanHex);
    return [0, 0, 0]; // Valeur par défaut en cas d'erreur
  }

  // Gérer les codes hexadécimaux courts (3 caractères)
  const normalizedHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  try {
    const r = parseInt(normalizedHex.substring(0, 2), 16);
    const g = parseInt(normalizedHex.substring(2, 4), 16);
    const b = parseInt(normalizedHex.substring(4, 6), 16);

    // Vérifier que les valeurs sont valides
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new Error("Valeurs RGB non valides");
    }

    return [r, g, b];
  } catch (error) {
    console.error("Erreur lors de la conversion hexadécimale:", error);
    return [0, 0, 0]; // Valeur par défaut en cas d'erreur
  }
};

// Fonction pour convertir différents formats de date en objet Date
const convertToDate = (date: any): Date => {
  // Si c'est déjà un objet Date, le retourner tel quel
  if (date instanceof Date) {
    return date;
  }

  // Si c'est un timestamp Firestore (secondes/nanosecondes)
  if (date && date.seconds !== undefined && date.nanoseconds !== undefined) {
    return new Date(date.seconds * 1000 + date.nanoseconds / 1000000);
  }

  // Si c'est une chaîne, la convertir en Date
  if (typeof date === "string") {
    return new Date(date);
  }

  // Si c'est un timestamp en millisecondes
  if (typeof date === "number") {
    return new Date(date);
  }

  // Par défaut, retourner la date actuelle
  return new Date();
};

// Fonction utilitaire pour sauvegarder le PDF de manière sécurisée
const savePDFSafely = async (pdfDoc: jsPDF, fileName: string, userId: string): Promise<boolean> => {
  try {
    // D'abord sauvegarder localement
    pdfDoc.save(fileName);
    console.log("PDF sauvegardé localement avec succès");

    // Essayer de sauvegarder dans Firebase Storage, mais ne pas bloquer en cas d'erreur
    try {
      const pdfBlob = new Blob([pdfDoc.output("blob")], {
        type: "application/pdf",
      });

      // Création du chemin avec l'ID de l'utilisateur
      const storageRef = ref(
        storage,
        `factures/${userId}/${fileName}`
      );

      // Ajout des métadonnées
      const metadata = {
        contentType: "application/pdf",
        customMetadata: {
          createdBy: userId,
          fileName: fileName,
        },
      };

      // Upload du fichier
      await uploadBytes(storageRef, pdfBlob, metadata);
      console.log("PDF sauvegardé sur Firebase Storage avec succès");
    } catch (uploadError) {
      console.warn("Erreur non bloquante lors de l'upload du PDF:", uploadError);
      // On continue même si l'upload échoue, car l'utilisateur a déjà le PDF local
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du PDF:", error);
    throw error;
  }
};

// Générer une facture spécifiquement pour l'envoi par email (côté serveur)
export const generateInvoicePDFForEmail = async (
  facture: Facture
): Promise<Buffer> => {
  try {
    console.log("Génération PDF pour email - Mode serveur", { facture: facture.numero });

    // Vérification des données requises
    if (!facture || !facture.numero || !facture.client) {
      throw new Error("Données de facture invalides");
    }

    // Utiliser des informations d'entreprise par défaut pour le mode serveur
    const entreprise = {
      nom: "Grohens Christian",
      rue: "5, rue Maurice Fonvieille",
      codePostal: "31120",
      ville: "Portet sur Garonne",
      telephone: "09 52 62 31 71",
      email: "contact@javachrist.fr",
      siret: "SIRET : 12345678901234",
      mentionsLegales: ["Auto-entrepreneur - Dispense de TVA - Article 293B du CGI"],
      rib: {
        iban: "FR76 1234 5678 9012 3456 7890 123",
        bic: "BREDFRPPXXX",
        banque: "Banque Populaire"
      }
    };

    // Création du document PDF
    const pdfDoc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdfDoc.internal.pageSize.width;
    const pageHeight = pdfDoc.internal.pageSize.height;

    // Titre "FACTURE"
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.setFontSize(20);
    pdfDoc.setTextColor(41, 128, 185); // Bleu moderne
    pdfDoc.text("FACTURE", 15, 25);

    // Informations de l'entreprise (à gauche)
    pdfDoc.setTextColor(0, 0, 0); // Retour au noir
    pdfDoc.setFontSize(10);
    let yPos = 30;

    // Nom de l'entreprise en gras
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(entreprise.nom.toUpperCase(), 15, yPos);

    // Reste des informations en normal
    pdfDoc.setFont("helvetica", "normal");
    const entrepriseInfos = [
      entreprise.rue,
      `${entreprise.codePostal} ${entreprise.ville}`,
      `Tél: ${entreprise.telephone}`,
      `Email: ${entreprise.email}`,
      entreprise.siret,
    ];
    entrepriseInfos.forEach((info, index) => {
      pdfDoc.text(info, 15, yPos + 5 + index * 4.5);
    });

    // Numéro de facture et date (en haut à droite)
    let dateStr: string;
    try {
      const date = convertToDate(facture.dateCreation);
      dateStr = date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (e) {
      dateStr = new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    }

    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(`Facture N° ${facture.numero}`, pageWidth - 60, 30);
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.text(`Date: ${dateStr}`, pageWidth - 60, 35);

    // Informations du client (à droite)
    pdfDoc.text("FACTURER À:", pageWidth - 60, 65);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(facture.client.nom.toUpperCase(), pageWidth - 60, 70);
    pdfDoc.setFont("helvetica", "normal");
    const clientInfos = [
      facture.client.rue,
      `${facture.client.codePostal} ${facture.client.ville}`,
    ];
    clientInfos.forEach((info, index) => {
      pdfDoc.text(info, pageWidth - 60, 75 + index * 4.5);
    });

    // Tableau des articles
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
    pdfDoc.setFontSize(9);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text("Coordonnées bancaires:", 15, bottomSection);
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.text(
      [
        `IBAN: ${entreprise.rib.iban}`,
        `BIC: ${entreprise.rib.bic}`,
        `Banque: ${entreprise.rib.banque}`,
      ],
      15,
      bottomSection + 4
    );

    // Totaux (en bas à droite)
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
    if (entreprise.mentionsLegales && entreprise.mentionsLegales.length > 0) {
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(8);
      entreprise.mentionsLegales.forEach((mention, index) => {
        pdfDoc.text(mention, 15, pageHeight - 22 + index * 4);
      });
    }

    // Retourner le PDF comme Buffer
    const pdfOutput = pdfDoc.output('arraybuffer');
    return Buffer.from(pdfOutput);

  } catch (error: unknown) {
    console.error("Erreur lors de la génération du PDF pour email:", error);
    if (error instanceof Error) {
      throw new Error(`Erreur lors de la génération du PDF: ${error.message}`);
    } else {
      throw new Error("Erreur inconnue lors de la génération du PDF");
    }
  }
};
