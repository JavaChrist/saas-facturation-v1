import { Notification } from "@/types/notification";
import { Facture, FirestoreTimestamp } from "@/types/facture";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  limit,
} from "firebase/firestore";

// Fonction pour vérifier les factures en retard de manière directe (sans API)
export const verifierFacturesEnRetardDirectement = async (
  userId: string
): Promise<void> => {
  try {
    console.log("Vérification directe des factures en retard");

    // 1. Récupérer toutes les factures non payées
    const facturesQuery = query(
      collection(db, "factures"),
      where("userId", "==", userId),
      where("statut", "in", ["Envoyée", "En attente", "À relancer"])
    );

    const facturesSnapshot = await getDocs(facturesQuery);
    console.log(`Nombre de factures à vérifier: ${facturesSnapshot.size}`);

    const aujourdhui = new Date();

    // 2. Pour chaque facture, vérifier si elle est en retard
    for (const factureDoc of facturesSnapshot.docs) {
      const facture = { id: factureDoc.id, ...factureDoc.data() } as Facture;

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
        console.error("Format de date non reconnu pour la facture", facture.id);
        continue;
      }

      // Calculer la date d'échéance en fonction du délai de paiement
      let dateEcheance = new Date(dateCreation);
      switch (facture.client.delaisPaiement) {
        case "Comptant":
          // Pas de délai supplémentaire
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
          dateEcheance.setDate(dateCreation.getDate() + 30); // Par défaut 30 jours
      }

      // Vérifier si la facture est en retard
      if (aujourdhui > dateEcheance) {
        // Vérifier si une notification existe déjà pour cette facture
        const notifExisteQuery = query(
          collection(db, "notifications"),
          where("factureId", "==", facture.id),
          where("type", "==", "paiement_retard"),
          limit(1)
        );

        const notifExisteSnapshot = await getDocs(notifExisteQuery);

        // Si aucune notification n'existe, en créer une nouvelle
        if (notifExisteSnapshot.empty) {
          const nbJoursRetard = Math.floor(
            (aujourdhui.getTime() - dateEcheance.getTime()) / (1000 * 3600 * 24)
          );

          try {
            // Créer la notification
            await addDoc(collection(db, "notifications"), {
              userId: userId,
              factureId: facture.id,
              factureNumero: facture.numero,
              clientNom: facture.client.nom,
              message: `La facture ${facture.numero} pour ${
                facture.client.nom
              } est en retard de ${nbJoursRetard} jour(s). Montant: ${facture.totalTTC.toFixed(
                2
              )} €`,
              type: "paiement_retard",
              dateCreation: new Date(),
              lue: false,
              montant: facture.totalTTC,
            });

            // Mettre à jour le statut de la facture si ce n'est pas déjà "À relancer"
            if (facture.statut !== "À relancer") {
              await updateDoc(doc(db, "factures", facture.id), {
                statut: "À relancer",
              });
            }
          } catch (err) {
            console.error(
              "Erreur lors de la création de la notification:",
              err
            );
          }
        }
      } else {
        // Si l'échéance est proche (à moins de 3 jours)
        const diffJours = Math.floor(
          (dateEcheance.getTime() - aujourdhui.getTime()) / (1000 * 3600 * 24)
        );

        if (diffJours <= 3 && diffJours >= 0) {
          // Vérifier si une notification existe déjà pour cette facture
          const notifExisteQuery = query(
            collection(db, "notifications"),
            where("factureId", "==", facture.id),
            where("type", "==", "paiement_proche"),
            limit(1)
          );

          const notifExisteSnapshot = await getDocs(notifExisteQuery);

          // Si aucune notification n'existe, en créer une nouvelle
          if (notifExisteSnapshot.empty) {
            try {
              await addDoc(collection(db, "notifications"), {
                userId: userId,
                factureId: facture.id,
                factureNumero: facture.numero,
                clientNom: facture.client.nom,
                message: `La facture ${facture.numero} pour ${
                  facture.client.nom
                } arrive à échéance dans ${diffJours} jour(s). Montant: ${facture.totalTTC.toFixed(
                  2
                )} €`,
                type: "paiement_proche",
                dateCreation: new Date(),
                lue: false,
                montant: facture.totalTTC,
              });
            } catch (err) {
              console.error(
                "Erreur lors de la création de la notification:",
                err
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(
      "Erreur lors de la vérification des factures en retard:",
      error
    );
    throw error;
  }
};

// Fonction pour vérifier les factures en retard via l'API
export const verifierFacturesEnRetard = async (
  userId: string
): Promise<void> => {
  try {
    console.log(
      "Vérification des factures en retard désactivée temporairement"
    );
    // Ne rien faire pour éviter les erreurs de permission
    return;

    // Le code ci-dessous est commenté car il cause des erreurs de permission
    /*
    await verifierFacturesEnRetardDirectement(userId);
    */
  } catch (error) {
    console.error(
      "Erreur lors de la vérification des factures en retard:",
      error
    );
  }
};

// Récupérer les notifications non lues pour un utilisateur
export const getNotificationsNonLues = async (
  userId: string
): Promise<Notification[]> => {
  try {
    console.log("Récupération directe des notifications non lues");

    // Temporairement retourner un tableau vide à cause des problèmes de permission
    console.log(
      "Contournement temporaire des problèmes de permission Firestore"
    );
    return [];

    // Le code ci-dessous est commenté car il cause des erreurs de permission
    /*
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("lue", "==", false),
      orderBy("dateCreation", "desc")
    );

    const snapshot = await getDocs(notificationsQuery);
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dateCreation: doc.data().dateCreation instanceof Date 
        ? doc.data().dateCreation 
        : doc.data().dateCreation?.toDate?.() 
          ? doc.data().dateCreation.toDate()
          : new Date(doc.data().dateCreation || Date.now())
    })) as Notification[];

    console.log(`${notifications.length} notifications récupérées`);
    return notifications;
    */
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    return [];
  }
};

// Récupérer toutes les notifications pour un utilisateur
export const getAllNotifications = async (
  userId: string
): Promise<Notification[]> => {
  try {
    console.log("Récupération directe de toutes les notifications");

    // Temporairement retourner un tableau vide à cause des problèmes de permission
    console.log(
      "Contournement temporaire des problèmes de permission Firestore"
    );
    return [];

    // Le code ci-dessous est commenté car il cause des erreurs de permission
    /*
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("dateCreation", "desc")
    );

    const snapshot = await getDocs(notificationsQuery);
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dateCreation: doc.data().dateCreation instanceof Date 
        ? doc.data().dateCreation 
        : doc.data().dateCreation?.toDate?.() 
          ? doc.data().dateCreation.toDate()
          : new Date(doc.data().dateCreation || Date.now())
    })) as Notification[];

    console.log(`${notifications.length} notifications récupérées (total)`);
    return notifications;
    */
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    return [];
  }
};

// Marquer une notification comme lue
export const marquerCommeLue = async (
  notificationId: string
): Promise<void> => {
  try {
    console.log(
      `Marquage direct de la notification ${notificationId} comme lue`
    );
    await updateDoc(doc(db, "notifications", notificationId), {
      lue: true,
    });
  } catch (error) {
    console.error(
      "Erreur lors du marquage de la notification comme lue:",
      error
    );
    throw error;
  }
};

// Marquer toutes les notifications comme lues
export const marquerToutesCommeLues = async (userId: string): Promise<void> => {
  try {
    console.log(`Marquage direct de toutes les notifications comme lues`);

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("lue", "==", false)
    );

    const snapshot = await getDocs(notificationsQuery);

    if (snapshot.empty) {
      console.log("Aucune notification à marquer comme lue");
      return;
    }

    // Utiliser batch pour mise à jour groupée
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { lue: true });
    });

    await batch.commit();
    console.log(`${snapshot.size} notifications marquées comme lues`);
  } catch (error) {
    console.error(
      "Erreur lors du marquage de toutes les notifications comme lues:",
      error
    );
    throw error;
  }
};

// Supprimer une notification
export const supprimerNotification = async (
  notificationId: string
): Promise<void> => {
  try {
    console.log(`Suppression directe de la notification ${notificationId}`);
    await deleteDoc(doc(db, "notifications", notificationId));
  } catch (error) {
    console.error("Erreur lors de la suppression de la notification:", error);
    throw error;
  }
};
