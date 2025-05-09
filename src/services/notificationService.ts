import { Notification } from "@/types/notification";
import { Facture, FirestoreTimestamp } from "@/types/facture";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
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
  orderBy,
} from "firebase/firestore";

// Fonction pour vérifier les factures en retard de manière directe (sans API)
export const verifierFacturesEnRetardDirectement = async (
  userId: string
): Promise<void> => {
  try {
    // Vérifier l'état de l'authentification
    const auth = getAuth();
    const currentUser = auth.currentUser;
    console.log("État de l'authentification:", {
      userId,
      currentUserId: currentUser?.uid,
      isAuthenticated: !!currentUser,
      email: currentUser?.email
    });

    if (!currentUser) {
      console.error("Utilisateur non authentifié");
      return;
    }

    if (currentUser.uid !== userId) {
      console.error("ID utilisateur ne correspond pas à l'utilisateur authentifié");
      return;
    }

    console.log("Vérification directe des factures en retard pour l'utilisateur:", userId);

    // 1. Récupérer toutes les factures non payées
    const facturesQuery = query(
      collection(db, "factures"),
      where("userId", "==", userId),
      where("statut", "in", ["Envoyée", "En attente", "À relancer"])
    );

    console.log("Requête Firestore créée pour les factures:", {
      userId,
      statuts: ["Envoyée", "En attente", "À relancer"]
    });

    try {
      const facturesSnapshot = await getDocs(facturesQuery);
      console.log(`Nombre de factures à vérifier: ${facturesSnapshot.size}`);

      if (facturesSnapshot.empty) {
        console.log("Aucune facture à vérifier");
        return;
      }

      // Trier les factures par date de création (descendant)
      const factures = facturesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          console.log("Données de la facture:", {
            id: doc.id,
            numero: data.numero,
            dateCreation: data.dateCreation,
            statut: data.statut,
            totalTTC: data.totalTTC,
            client: data.client,
            userId: data.userId
          });
          return { id: doc.id, ...data } as Facture;
        })
        .filter(facture => {
          if (!facture.dateCreation) {
            console.error(`Facture ${facture.id} ignorée: dateCreation manquant`);
            return false;
          }
          if (!facture.totalTTC) {
            console.error(`Facture ${facture.id} ignorée: totalTTC manquant`);
            return false;
          }
          if (!facture.client) {
            console.error(`Facture ${facture.id} ignorée: client manquant`);
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          const dateA = a.dateCreation instanceof Date 
            ? a.dateCreation 
            : typeof a.dateCreation === 'string' 
              ? new Date(a.dateCreation)
              : a.dateCreation?.toDate?.() || new Date();
          const dateB = b.dateCreation instanceof Date 
            ? b.dateCreation 
            : typeof b.dateCreation === 'string' 
              ? new Date(b.dateCreation)
              : b.dateCreation?.toDate?.() || new Date();
          return dateB.getTime() - dateA.getTime();
        });

      console.log(`Nombre de factures valides après filtrage: ${factures.length}`);

      const aujourdhui = new Date();
      console.log("Date d'aujourd'hui:", aujourdhui.toISOString());

      // 2. Pour chaque facture, vérifier si elle est en retard
      for (const facture of factures) {
        console.log(`Vérification de la facture ${facture.numero} (ID: ${facture.id})`, {
          dateCreation: facture.dateCreation,
          statut: facture.statut,
          totalTTC: facture.totalTTC,
          client: facture.client.nom,
          delaisPaiement: facture.client.delaisPaiement
        });

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

        console.log("Date de création:", dateCreation.toISOString());
        console.log("Délai de paiement:", facture.client.delaisPaiement);

        // Calculer la date d'échéance en fonction du délai de paiement
        let dateEcheance = new Date(dateCreation);
        switch (facture.client.delaisPaiement) {
          case "À réception":
            dateEcheance = dateCreation;
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

        console.log("Date d'échéance:", dateEcheance.toISOString());

        // Vérifier si la facture est en retard
        if (aujourdhui > dateEcheance) {
          console.log("Facture en retard détectée");
          // Vérifier si une notification existe déjà pour cette facture
          const notifExisteQuery = query(
            collection(db, "notifications"),
            where("factureId", "==", facture.id),
            where("type", "==", "paiement_retard"),
            limit(1)
          );

          console.log("Vérification de l'existence d'une notification");
          const notifExisteSnapshot = await getDocs(notifExisteQuery);
          console.log("Notification existante:", !notifExisteSnapshot.empty);

          // Si aucune notification n'existe, en créer une nouvelle
          if (notifExisteSnapshot.empty) {
            const nbJoursRetard = Math.floor(
              (aujourdhui.getTime() - dateEcheance.getTime()) / (1000 * 3600 * 24)
            );

            try {
              console.log("Création d'une nouvelle notification");
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
              console.log("Notification créée avec succès");

              // Mettre à jour le statut de la facture si ce n'est pas déjà "À relancer"
              if (facture.statut !== "À relancer") {
                console.log("Mise à jour du statut de la facture");
                await updateDoc(doc(db, "factures", facture.id), {
                  statut: "À relancer",
                });
                console.log("Statut de la facture mis à jour");
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
            console.log("Échéance proche détectée:", diffJours, "jours");
            // Vérifier si une notification existe déjà pour cette facture
            const notifExisteQuery = query(
              collection(db, "notifications"),
              where("factureId", "==", facture.id),
              where("type", "==", "paiement_proche"),
              limit(1)
            );

            console.log("Vérification de l'existence d'une notification d'échéance proche");
            const notifExisteSnapshot = await getDocs(notifExisteQuery);
            console.log("Notification existante:", !notifExisteSnapshot.empty);

            // Si aucune notification n'existe, en créer une nouvelle
            if (notifExisteSnapshot.empty) {
              try {
                console.log("Création d'une nouvelle notification d'échéance proche");
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
                console.log("Notification d'échéance proche créée avec succès");
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
        "Erreur lors de la récupération des factures:",
        error
      );
      throw error;
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
export const verifierFacturesEnRetard = async (userId: string): Promise<void> => {
  try {
    console.log("Vérification des factures en retard");
    await verifierFacturesEnRetardDirectement(userId);
  } catch (error) {
    console.error("Erreur lors de la vérification des factures en retard:", error);
  }
};

// Récupérer les notifications non lues pour un utilisateur
export const getNotificationsNonLues = async (userId: string): Promise<Notification[]> => {
  try {
    // Vérifier l'état de l'authentification
    const auth = getAuth();
    const currentUser = auth.currentUser;
    console.log("État de l'authentification pour les notifications:", {
      userId,
      currentUserId: currentUser?.uid,
      isAuthenticated: !!currentUser,
      email: currentUser?.email
    });

    if (!currentUser) {
      console.error("Utilisateur non authentifié");
      return [];
    }

    if (currentUser.uid !== userId) {
      console.error("ID utilisateur ne correspond pas à l'utilisateur authentifié");
      return [];
    }

    console.log("Récupération des notifications non lues pour l'utilisateur:", userId);

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("lue", "==", false)
    );

    console.log("Requête Firestore créée pour les notifications:", {
      userId,
      lue: false
    });

    const snapshot = await getDocs(notificationsQuery);
    console.log(`Nombre de notifications trouvées: ${snapshot.size}`);

    const notifications = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        console.log("Données de la notification:", {
          id: doc.id,
          type: data.type,
          message: data.message,
          dateCreation: data.dateCreation,
          userId: data.userId,
          factureId: data.factureId,
          lue: data.lue
        });

        // Vérifier que toutes les données requises sont présentes
        if (!data.dateCreation) {
          console.error(`Notification ${doc.id} ignorée: dateCreation manquant`);
          return null;
        }
        if (!data.message) {
          console.error(`Notification ${doc.id} ignorée: message manquant`);
          return null;
        }
        if (!data.type) {
          console.error(`Notification ${doc.id} ignorée: type manquant`);
          return null;
        }

        return {
          id: doc.id,
          ...data,
          dateCreation: data.dateCreation instanceof Date 
            ? data.dateCreation 
            : data.dateCreation?.toDate?.() 
              ? data.dateCreation.toDate()
              : new Date(data.dateCreation || Date.now())
        };
      })
      .filter((notification): notification is Notification => notification !== null);

    // Trier les notifications par date de création (descendant)
    notifications.sort((a, b) => b.dateCreation.getTime() - a.dateCreation.getTime());

    console.log(`${notifications.length} notifications valides récupérées`);
    return notifications;
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    return [];
  }
};

// Récupérer toutes les notifications pour un utilisateur
export const getAllNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    console.log("Récupération de toutes les notifications pour l'utilisateur:", userId);
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId)
    );

    console.log("Requête Firestore créée");
    const snapshot = await getDocs(notificationsQuery);
    console.log(`Nombre de notifications trouvées: ${snapshot.size}`);

    const notifications = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log("Notification trouvée:", {
        id: doc.id,
        type: data.type,
        message: data.message,
        dateCreation: data.dateCreation
      });
      return {
        id: doc.id,
        ...data,
        dateCreation: data.dateCreation instanceof Date 
          ? data.dateCreation 
          : data.dateCreation?.toDate?.() 
            ? data.dateCreation.toDate()
            : new Date(data.dateCreation || Date.now())
      };
    }) as Notification[];

    // Trier les notifications par date de création (descendant)
    notifications.sort((a, b) => b.dateCreation.getTime() - a.dateCreation.getTime());

    console.log(`${notifications.length} notifications récupérées (total)`);
    return notifications;
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
