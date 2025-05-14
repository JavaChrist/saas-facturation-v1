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

    // Date du jour pour les comparaisons
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0); // On compare les dates sans tenir compte de l'heure
    console.log("Date du jour (début journée):", aujourdhui.toISOString());

    // Récupérer toutes les notifications existantes pour les factures en retard et échéances proches
    const existingNotificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("type", "in", ["paiement_retard", "paiement_proche"])
    );
    
    const existingNotificationsSnapshot = await getDocs(existingNotificationsQuery);
    console.log(`Nombre de notifications existantes: ${existingNotificationsSnapshot.size}`);
    
    // Créer un mapping des notifications par factureId pour faciliter la vérification
    const notificationsByFactureId = new Map<string, any[]>();
    existingNotificationsSnapshot.docs.forEach(doc => {
      const notification = { id: doc.id, ...doc.data() };
      if (!notificationsByFactureId.has(notification.factureId)) {
        notificationsByFactureId.set(notification.factureId, []);
      }
      notificationsByFactureId.get(notification.factureId)?.push(notification);
      console.log(`Notification existante trouvée pour facture ${notification.factureId}:`, notification);
    });

    // 1. Récupérer toutes les factures non payées ET les factures "À relancer"
    // Il est important d'inclure explicitement les factures avec le statut "À relancer"
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
        
        // Supprimer toutes les notifications pour les factures qui n'existent plus
        // ou qui ont été payées
        if (existingNotificationsSnapshot.size > 0) {
          console.log("Suppression des notifications pour les factures qui n'existent plus");
          const batch = writeBatch(db);
          existingNotificationsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`${existingNotificationsSnapshot.size} notifications supprimées`);
        }
        
        return;
      }

      // Liste des factures à traiter
      console.log("Factures trouvées:", facturesSnapshot.docs.map(doc => ({
        id: doc.id,
        numero: doc.data().numero,
        statut: doc.data().statut
      })));

      // Récupérer les IDs de toutes les factures actives
      const activeFactureIds = new Set(facturesSnapshot.docs.map(doc => doc.id));
      
      // Supprimer les notifications pour les factures qui n'existent plus
      const notificationsToDelete: any[] = [];
      existingNotificationsSnapshot.docs.forEach(doc => {
        const factureId = doc.data().factureId;
        if (!activeFactureIds.has(factureId)) {
          notificationsToDelete.push(doc.ref);
          console.log(`Notification ${doc.id} marquée pour suppression (facture ${factureId} n'existe plus)`);
        }
      });
      
      if (notificationsToDelete.length > 0) {
        const batch = writeBatch(db);
        notificationsToDelete.forEach(ref => {
          batch.delete(ref);
        });
        await batch.commit();
        console.log(`${notificationsToDelete.length} notifications supprimées pour factures inexistantes`);
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
      
      // Vérifier les factures qui ont déjà le statut "À relancer" mais pas de notification
      const facturesARelancer = factures.filter(f => f.statut === "À relancer");
      console.log(`Nombre de factures avec statut "À relancer": ${facturesARelancer.length}`);
      
      // Créer un batch pour toutes les opérations de création de notifications
      const batch = writeBatch(db);
      let createdNotificationsCount = 0;

      // Traiter toutes les factures - Approche unifiée
      for (const facture of factures) {
        console.log(`Traitement de la facture ${facture.id} (${facture.numero}) - Statut: ${facture.statut}`);
        
        // Convertir la date de création en objet Date pour calculer l'échéance
        let dateCreation: Date;
        if (facture.dateCreation instanceof Date) {
          dateCreation = facture.dateCreation;
        } else if (typeof facture.dateCreation === "string") {
          dateCreation = new Date(facture.dateCreation);
        } else if (
          facture.dateCreation &&
          facture.dateCreation.toDate &&
          typeof facture.dateCreation.toDate === "function"
        ) {
          dateCreation = facture.dateCreation.toDate();
        } else {
          console.error(`Format de date inconnu pour la facture ${facture.id}`);
          continue; // Passer à la facture suivante
        }
        
        // Normaliser la date de création
        dateCreation.setHours(0, 0, 0, 0);
        console.log("Date de création normalisée:", dateCreation.toISOString(), "pour facture", facture.numero);
        
        // Calculer la date d'échéance
        let dateEcheance = new Date(dateCreation);
        switch (facture.client.delaisPaiement) {
          case "À réception":
            dateEcheance = dateCreation; // Même jour
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
        
        console.log("Date d'échéance calculée:", dateEcheance.toISOString(), "pour facture", facture.numero);
        console.log("Date du jour pour comparaison:", aujourdhui.toISOString());
        
        // Récupérer les notifications existantes pour cette facture
        const existingNotifications = notificationsByFactureId.get(facture.id) || [];
        const existingRetardNotification = existingNotifications.find(n => n.type === "paiement_retard");
        const existingProcheNotification = existingNotifications.find(n => n.type === "paiement_proche");
        
        // Pour les factures "À relancer", on s'assure qu'elles ont une notification de retard
        if (facture.statut === "À relancer" && !existingRetardNotification) {
          console.log(`Facture ${facture.id} (${facture.numero}) marquée comme "À relancer" mais sans notification de retard`);
          
          // Calculer le nombre de jours de retard
          const nbJoursRetard = Math.floor(
            (aujourdhui.getTime() - dateEcheance.getTime()) / (1000 * 3600 * 24)
          );
          
          // Créer une nouvelle notification pour cette facture
          const newNotificationRef = doc(collection(db, "notifications"));
          batch.set(newNotificationRef, {
            userId: userId,
            factureId: facture.id,
            factureNumero: facture.numero,
            clientNom: facture.client.nom,
            message: `La facture ${facture.numero} pour ${
              facture.client.nom
            } est en retard de ${Math.max(0, nbJoursRetard)} jour(s). Montant: ${facture.totalTTC.toFixed(
              2
            )} €`,
            type: "paiement_retard",
            dateCreation: new Date(),
            lue: false,
            montant: facture.totalTTC,
          });
          
          createdNotificationsCount++;
          console.log(`Notification de retard créée pour facture ${facture.id} (${facture.numero})`);
          continue; // Passer à la facture suivante car elle est déjà "À relancer"
        }

        // Pour les autres factures, on vérifie leur statut d'échéance
        // Vérifier si la facture est en retard
        const estEnRetard = aujourdhui.getTime() > dateEcheance.getTime();
        
        console.log(`Facture ${facture.id} (${facture.numero}) - Comparaison des dates:`, {
          dateEcheance: dateEcheance.toISOString(),
          aujourdhui: aujourdhui.toISOString(),
          estEnRetard,
          diffMs: aujourdhui.getTime() - dateEcheance.getTime(),
          diffJours: Math.floor((aujourdhui.getTime() - dateEcheance.getTime()) / (1000 * 3600 * 24))
        });
        
        console.log(`Facture ${facture.id} (${facture.numero}) en retard: ${estEnRetard}, notification existante: ${!!existingRetardNotification}`);

        // Si la facture est en retard
        if (estEnRetard) {
          console.log("Facture en retard détectée");
          
          // Si aucune notification de retard n'existe, en créer une nouvelle
          if (!existingRetardNotification) {
            const nbJoursRetard = Math.floor(
              (aujourdhui.getTime() - dateEcheance.getTime()) / (1000 * 3600 * 24)
            );

            // Créer la notification
            const newNotificationRef = doc(collection(db, "notifications"));
            batch.set(newNotificationRef, {
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
            
            createdNotificationsCount++;
            console.log(`Notification de retard créée pour facture ${facture.id} (${facture.numero})`);

            // Mettre à jour le statut de la facture en À relancer
            batch.update(doc(db, "factures", facture.id), {
              statut: "À relancer",
            });
            console.log(`Statut de la facture ${facture.id} (${facture.numero}) mis à jour en "À relancer"`);
          }
          
          // S'il y a une notification d'échéance proche, la supprimer
          if (existingProcheNotification) {
            batch.delete(doc(db, "notifications", existingProcheNotification.id));
            console.log(`Notification d'échéance proche supprimée pour facture ${facture.id} (${facture.numero})`);
          }
        } else {
          // La facture n'est pas en retard
          
          // Vérifier si l'échéance est proche (à moins de 3 jours)
          const diffJours = Math.floor(
            (dateEcheance.getTime() - aujourdhui.getTime()) / (1000 * 3600 * 24)
          );

          const echeanceProche = diffJours <= 3 && diffJours >= 0;
          console.log(`Facture ${facture.id} échéance proche (${diffJours} jours): ${echeanceProche}`);

          if (echeanceProche) {
            console.log("Échéance proche détectée:", diffJours, "jours");
            
            // Si aucune notification d'échéance proche n'existe, en créer une nouvelle
            if (!existingProcheNotification) {
              const newNotificationRef = doc(collection(db, "notifications"));
              batch.set(newNotificationRef, {
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
              
              createdNotificationsCount++;
              console.log(`Notification d'échéance proche créée pour facture ${facture.id} (${facture.numero})`);
            }
          } else {
            // L'échéance n'est pas proche et la facture n'est pas en retard
            
            // S'il y a une notification d'échéance proche, la supprimer
            if (existingProcheNotification) {
              batch.delete(doc(db, "notifications", existingProcheNotification.id));
              console.log(`Notification d'échéance proche supprimée pour facture ${facture.id} (${facture.numero})`);
            }
          }
        }
      }

      // Exécuter le batch si nécessaire
      if (createdNotificationsCount > 0) {
        await batch.commit();
        console.log(`${createdNotificationsCount} notifications créées ou mises à jour avec succès`);
      } else {
        console.log("Aucune modification nécessaire pour les notifications");
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
    
    // Avant de vérifier les factures, nettoyons les notifications en double
    await supprimerNotificationsDupliquees(userId);
    
    // Vérifier les factures en retard
    await verifierFacturesEnRetardDirectement(userId);
  } catch (error) {
    console.error("Erreur lors de la vérification des factures en retard:", error);
  }
};

// Fonction pour supprimer les notifications en double
const supprimerNotificationsDupliquees = async (userId: string): Promise<void> => {
  try {
    console.log("Recherche de notifications dupliquées pour l'utilisateur:", userId);
    
    // Récupérer toutes les notifications existantes
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId)
    );
    
    const notificationsSnapshot = await getDocs(notificationsQuery);
    
    if (notificationsSnapshot.empty) {
      console.log("Aucune notification trouvée pour vérifier les doublons");
      return;
    }
    
    console.log(`${notificationsSnapshot.size} notifications trouvées, vérification des doublons...`);
    
    // Créer une map pour détecter les doublons (clé = factureId + type)
    const notificationsMap = new Map<string, any[]>();
    
    // Regrouper les notifications par factureId et type
    notificationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const key = `${data.factureId}_${data.type}`;
      
      if (!notificationsMap.has(key)) {
        notificationsMap.set(key, []);
      }
      
      notificationsMap.get(key)?.push({
        id: doc.id,
        ref: doc.ref,
        ...data
      });
    });
    
    // Vérifier s'il y a des doublons et les supprimer
    const batch = writeBatch(db);
    let doublonsCount = 0;
    
    for (const [key, notifications] of notificationsMap.entries()) {
      // S'il y a plus d'une notification pour la même facture et le même type
      if (notifications.length > 1) {
        console.log(`Doublons trouvés pour ${key}: ${notifications.length} notifications`);
        
        // Trier par date de création (plus récente en premier)
        notifications.sort((a, b) => {
          const dateA = a.dateCreation instanceof Date 
            ? a.dateCreation 
            : a.dateCreation?.toDate?.() || new Date(a.dateCreation || Date.now());
          
          const dateB = b.dateCreation instanceof Date 
            ? b.dateCreation 
            : b.dateCreation?.toDate?.() || new Date(b.dateCreation || Date.now());
          
          return dateB.getTime() - dateA.getTime();
        });
        
        // Garder la plus récente et supprimer les autres
        for (let i = 1; i < notifications.length; i++) {
          batch.delete(notifications[i].ref);
          doublonsCount++;
        }
      }
    }
    
    // Exécuter le batch s'il y a des doublons à supprimer
    if (doublonsCount > 0) {
      await batch.commit();
      console.log(`${doublonsCount} notifications dupliquées supprimées avec succès`);
    } else {
      console.log("Aucune notification dupliquée trouvée");
    }
  } catch (error) {
    console.error("Erreur lors de la suppression des notifications dupliquées:", error);
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
