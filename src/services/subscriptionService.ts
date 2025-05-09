import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export interface UserPlan {
  planId: string;
  isActive: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  dateStart?: Date;
  dateEnd?: Date;
  limites: {
    clients: number;
    factures: number;
    modeles: number;
    utilisateurs: number;
  };
}

/**
 * Récupère les informations d'abonnement de l'utilisateur
 * @param userId ID de l'utilisateur
 * @returns Informations sur le plan de l'utilisateur
 */
export const getUserPlan = async (userId: string): Promise<UserPlan> => {
  try {
    console.log("[DEBUG-VERCEL] Démarrage de getUserPlan pour", userId);
    console.log("[DEBUG-VERCEL] NODE_ENV =", process.env.NODE_ENV);
    
    // Vérifier si nous sommes sur Vercel en production
    const isVercelProduction = process.env.VERCEL_ENV === "production";
    if (isVercelProduction) {
      console.log("[DEBUG-VERCEL] Environnement Vercel production détecté");
    }
    
    // Mode développement - retourner un plan factice si la collection users n'existe pas
    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment || isVercelProduction) {
      console.log(
        "[DEBUG-SERVICE] Mode développement ou Vercel détecté, utilisation d'un plan factice"
      );

      // Vérification spéciale pour Vercel
      if (isVercelProduction && typeof window !== "undefined") {
        // ID du plan forcé pour les utilisateurs de Vercel qui ont déjà choisi le plan Entreprise
        const userId_plan_map: Record<string, string> = {
          "oq10PAIePPXMVgFX82tlXu67oVx2": "enterprise" // Remplace avec l'ID de ton utilisateur
        };
        
        // Si l'utilisateur est dans la liste des utilisateurs avec plan forcé
        if (userId_plan_map[userId]) {
          console.log(`[DEBUG-VERCEL] Utilisateur ${userId} avec plan forcé trouvé: ${userId_plan_map[userId]}`);
          
          const forcedPlanId = userId_plan_map[userId];
          
          // Forcer la création d'un plan Entreprise
          const dateStart = new Date();
          const dateEnd = new Date(dateStart.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          const vercelForcedPlan = {
            planId: forcedPlanId,
            isActive: true,
            dateStart: dateStart,
            dateEnd: dateEnd,
            stripeSubscriptionId: "vercel_sim_" + Math.random().toString(36).substring(2, 11),
            stripeCustomerId: "vercel_cus_" + Math.random().toString(36).substring(2, 11),
            limites: {
              clients: -1,
              factures: -1,  
              modeles: -1,
              utilisateurs: 10,
            },
          };
          
          // Sauvegarder le plan forcé dans tous les stockages disponibles
          try {
            const planJSON = JSON.stringify(vercelForcedPlan);
            localStorage.setItem("devUserPlan", planJSON);
            sessionStorage.setItem("devUserPlan", planJSON);
            localStorage.setItem("permanentUserPlan", planJSON);
            localStorage.setItem("lastUsedPlanId", forcedPlanId);
            sessionStorage.setItem("lastUsedPlanId", forcedPlanId);
            sessionStorage.setItem("planId", forcedPlanId);
            sessionStorage.setItem("planJustChanged", "true");
            
            console.log("[DEBUG-VERCEL] Plan forcé sauvegardé:", vercelForcedPlan);
          } catch (e) {
            console.error("[DEBUG-VERCEL] Erreur lors de la sauvegarde du plan forcé:", e);
          }
          
          return vercelForcedPlan;
        }
      }

      // Vérifier d'abord si lastUsedPlanId est défini (le plus fiable et récent)
      if (typeof window !== "undefined") {
        const lastUsedPlanId =
          localStorage.getItem("lastUsedPlanId") ||
          sessionStorage.getItem("lastUsedPlanId");

        if (lastUsedPlanId) {
          console.log("[DEBUG-SERVICE] lastUsedPlanId trouvé:", lastUsedPlanId);

          // Forcer la création d'un plan à partir de lastUsedPlanId
          const dateStart = new Date();
          const dateEnd = new Date(
            dateStart.getTime() + 30 * 24 * 60 * 60 * 1000
          );

          const freshPlan = {
            planId: lastUsedPlanId,
            isActive: true,
            dateStart: dateStart,
            dateEnd: dateEnd,
            stripeSubscriptionId:
              "sim_" + Math.random().toString(36).substring(2, 11),
            stripeCustomerId:
              "cus_sim_" + Math.random().toString(36).substring(2, 11),
            limites: {
              clients:
                lastUsedPlanId === "premium"
                  ? 50
                  : lastUsedPlanId === "enterprise" || lastUsedPlanId === "entreprise"
                  ? -1
                  : 5,
              factures:
                lastUsedPlanId === "premium"
                  ? -1
                  : lastUsedPlanId === "enterprise" || lastUsedPlanId === "entreprise"
                  ? -1
                  : 5,
              modeles:
                lastUsedPlanId === "premium"
                  ? 5
                  : lastUsedPlanId === "enterprise" || lastUsedPlanId === "entreprise"
                  ? -1
                  : 1,
              utilisateurs:
                lastUsedPlanId === "premium"
                  ? 2
                  : lastUsedPlanId === "enterprise" || lastUsedPlanId === "entreprise"
                  ? 10
                  : 1,
            },
          };

          // Sauvegarder le plan frais
          try {
            const planJSON = JSON.stringify(freshPlan);
            localStorage.setItem("devUserPlan", planJSON);
            sessionStorage.setItem("devUserPlan", planJSON);
            console.log(
              "[DEBUG-SERVICE] Plan frais créé et sauvegardé:",
              freshPlan
            );
          } catch (e) {
            console.error(
              "[DEBUG-SERVICE] Erreur lors de la sauvegarde du plan frais:",
              e
            );
          }

          return freshPlan;
        }
      }

      // Vérifier si localStorage/sessionStorage est disponible (côté client uniquement)
      let storedPlan = null;
      if (typeof window !== "undefined") {
        try {
          // Vérifier d'abord si un changement de plan vient d'avoir lieu
          const planJustChanged = sessionStorage.getItem("planJustChanged");

          if (planJustChanged === "true") {
            console.log(
              "[DEBUG-SERVICE] Détection d'un changement de plan récent"
            );
            const planId = sessionStorage.getItem("planId");
            console.log("[DEBUG-SERVICE] Plan ID récemment changé:", planId);

            // Ne pas réinitialiser le drapeau ici pour permettre à toutes les pages de le détecter
            // La réinitialisation sera faite par chaque composant après détection

            // Forcer la création d'un nouveau plan en fonction du planId stocké
            if (
              planId === "premium" ||
              planId === "enterprise" ||
              planId === "entreprise" ||
              planId === "gratuit"
            ) {
              const dateStart = new Date();
              const dateEnd = new Date(
                dateStart.getTime() + 30 * 24 * 60 * 60 * 1000
              ); // +30 jours

              const forcedPlan = {
                planId: planId,
                isActive: true,
                dateStart: dateStart,
                dateEnd: dateEnd,
                stripeSubscriptionId:
                  "sim_" + Math.random().toString(36).substring(2, 11),
                stripeCustomerId:
                  "cus_sim_" + Math.random().toString(36).substring(2, 11),
                limites: {
                  clients:
                    planId === "premium"
                      ? 50
                      : planId === "enterprise" || planId === "entreprise"
                      ? -1
                      : 5,
                  factures:
                    planId === "premium"
                      ? -1
                      : planId === "enterprise" || planId === "entreprise"
                      ? -1
                      : 5,
                  modeles:
                    planId === "premium" 
                      ? 5 
                      : planId === "enterprise" || planId === "entreprise" 
                      ? -1 
                      : 1,
                  utilisateurs:
                    planId === "premium" 
                      ? 2 
                      : planId === "enterprise" || planId === "entreprise" 
                      ? 10 
                      : 1,
                },
              };

              console.log(
                "[DEBUG-SERVICE] Création forcée d'un plan:",
                forcedPlan
              );

              // Sauvegarder dans les deux types de stockage pour assurer la persistance
              const planJSON = JSON.stringify(forcedPlan);
              try {
                localStorage.setItem("devUserPlan", planJSON);
                sessionStorage.setItem("devUserPlan", planJSON);
                localStorage.setItem("lastUsedPlanId", planId);
                sessionStorage.setItem("lastUsedPlanId", planId);
                console.log(
                  "[DEBUG-SERVICE] Plan forcé sauvegardé avec succès"
                );
              } catch (e) {
                console.error(
                  "[DEBUG-SERVICE] Erreur lors de la sauvegarde forcée:",
                  e
                );
              }

              return forcedPlan;
            }
          }

          // Essayer d'abord sessionStorage qui est plus fiable pour les sessions courtes
          let storedPlanData = sessionStorage.getItem("devUserPlan");
          let storageSource = "sessionStorage";

          // Si rien dans sessionStorage, essayer localStorage
          if (!storedPlanData) {
            storedPlanData = localStorage.getItem("devUserPlan");
            storageSource = "localStorage";
          }

          console.log(
            `[DEBUG-SERVICE] Plan brut récupéré de ${storageSource}:`,
            storedPlanData
          );

          if (storedPlanData) {
            try {
              storedPlan = JSON.parse(storedPlanData);

              // S'assurer que les dates sont des objets Date valides
              if (storedPlan.dateStart) {
                storedPlan.dateStart = new Date(storedPlan.dateStart);
              }
              if (storedPlan.dateEnd) {
                storedPlan.dateEnd = new Date(storedPlan.dateEnd);
              }

              // Vérifier que le plan contient les propriétés requises
              if (!storedPlan.planId || !storedPlan.limites) {
                console.error(
                  "[DEBUG-SERVICE] Le plan récupéré est invalide, propriétés manquantes:",
                  storedPlan
                );
                storedPlan = null;
              } else {
                console.log(
                  `[DEBUG-SERVICE] Plan valide récupéré de ${storageSource}:`,
                  storedPlan
                );

                // S'assurer que le plan est sauvegardé dans les deux stockages
                try {
                  localStorage.setItem("devUserPlan", storedPlanData);
                  sessionStorage.setItem("devUserPlan", storedPlanData);
                } catch (e) {
                  console.warn(
                    "[DEBUG-SERVICE] Erreur lors de la synchronisation des stockages:",
                    e
                  );
                }
              }
            } catch (e) {
              console.error(
                "[DEBUG-SERVICE] Erreur lors du parsing du stockage:",
                e
              );
              storedPlan = null;
            }
          } else {
            console.log("[DEBUG-SERVICE] Aucun plan trouvé dans les stockages");
          }
        } catch (e) {
          console.error(
            "[DEBUG-SERVICE] Erreur lors de la lecture du stockage:",
            e
          );
        }
      } else {
        console.log(
          "[DEBUG-SERVICE] Window n'est pas défini, localStorage indisponible"
        );
      }

      // Utiliser le plan stocké ou un plan gratuit par défaut
      if (storedPlan) {
        return storedPlan;
      }

      // Plan gratuit par défaut
      const defaultPlan = {
        planId: "gratuit",
        isActive: true,
        dateStart: new Date(),
        limites: {
          clients: 5,
          factures: 5,
          modeles: 1,
          utilisateurs: 1,
        },
      };

      // Sauvegarder le plan par défaut dans localStorage
      if (typeof window !== "undefined") {
        try {
          console.log(
            "[DEBUG-SERVICE] Sauvegarde du plan par défaut dans localStorage:",
            defaultPlan
          );
          localStorage.setItem("devUserPlan", JSON.stringify(defaultPlan));

          // Vérifier que la sauvegarde a fonctionné
          const savedData = localStorage.getItem("devUserPlan");
          console.log(
            "[DEBUG-SERVICE] Vérification après sauvegarde:",
            savedData
          );
        } catch (e) {
          console.error(
            "[DEBUG-SERVICE] Erreur lors de l'écriture dans localStorage",
            e
          );
        }
      }

      return defaultPlan;
    }

    // Mode production - requête normale à Firestore
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists() && userDocSnap.data().subscription) {
      const userData = userDocSnap.data().subscription;

      // Convertir les dates Firestore en objets Date
      let dateStart = null;
      let dateEnd = null;

      if (userData.dateStart) {
        dateStart = userData.dateStart.toDate
          ? userData.dateStart.toDate()
          : new Date(userData.dateStart);
      }

      if (userData.dateEnd) {
        dateEnd = userData.dateEnd.toDate
          ? userData.dateEnd.toDate()
          : new Date(userData.dateEnd);
      }

      return {
        ...userData,
        dateStart,
        dateEnd,
      } as UserPlan;
    }

    // Retourner un plan gratuit par défaut
    return {
      planId: "gratuit",
      isActive: true,
      limites: {
        clients: 5,
        factures: 5,
        modeles: 1,
        utilisateurs: 1,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la récupération du plan utilisateur:", error);
    // En cas d'erreur, retourner un plan gratuit par défaut
    return {
      planId: "gratuit",
      isActive: true,
      limites: {
        clients: 5,
        factures: 5,
        modeles: 1,
        utilisateurs: 1,
      },
    };
  }
};

/**
 * Vérifie si l'utilisateur a atteint une limite de son plan
 * @param userId ID de l'utilisateur
 * @param ressource Type de ressource à vérifier (clients, factures, modeles, utilisateurs)
 * @param valeurActuelle Valeur actuelle de la ressource
 * @returns true si la limite est atteinte, false sinon
 */
export const checkPlanLimit = async (
  userId: string,
  ressource: keyof UserPlan["limites"],
  valeurActuelle: number
): Promise<boolean> => {
  try {
    const plan = await getUserPlan(userId);

    // Si la limite est -1, c'est illimité
    if (plan.limites[ressource] === -1) {
      return false;
    }

    // Vérifier si la valeur actuelle dépasse la limite
    return valeurActuelle >= plan.limites[ressource];
  } catch (error) {
    console.error("Erreur lors de la vérification des limites du plan:", error);
    // En cas d'erreur, supposer que la limite est atteinte pour éviter de dépasser
    return true;
  }
};

/**
 * Met à jour l'abonnement d'un utilisateur après un paiement réussi
 * @param userId ID de l'utilisateur
 * @param stripeSubscriptionId ID de l'abonnement Stripe
 * @param planId ID du plan
 * @param dateStart Date de début
 * @param dateEnd Date de fin
 */
export const updateUserSubscription = async (
  userId: string,
  stripeSubscriptionId: string,
  planId: string,
  dateStart: Date,
  dateEnd: Date
): Promise<void> => {
  try {
    const userDocRef = doc(db, "users", userId);

    // Définir les limites en fonction du plan
    let limites = {
      clients: 5,
      factures: 5,
      modeles: 1,
      utilisateurs: 1,
    };

    if (planId === "premium") {
      limites = {
        clients: 50,
        factures: -1, // Illimité
        modeles: 5,
        utilisateurs: 2,
      };
    } else if (planId === "entreprise") {
      limites = {
        clients: -1, // Illimité
        factures: -1, // Illimité
        modeles: -1, // Illimité
        utilisateurs: 10,
      };
    }

    await setDoc(
      userDocRef,
      {
        subscription: {
          planId,
          isActive: true,
          stripeSubscriptionId,
          dateStart,
          dateEnd,
          limites,
        },
      },
      { merge: true }
    );

    console.log(
      `Abonnement au plan ${planId} mis à jour pour l'utilisateur ${userId}`
    );
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'abonnement:", error);
    throw error;
  }
};

/**
 * Change le plan de l'utilisateur (version développement)
 * Cette fonction ne doit être utilisée qu'en mode développement
 */
export const changePlanDev = async (userId: string, newPlanId: string): Promise<boolean> => {
  try {
    console.log(`[DEBUG-FIREBASE] Changement de plan: ${newPlanId} pour l'utilisateur: ${userId}`);
    
    // Définir les limites en fonction du plan
    let limites = {
      clients: 5,
      factures: 5,
      modeles: 1,
      utilisateurs: 1,
    };

    if (newPlanId === "premium") {
      limites = {
        clients: 50,
        factures: -1, // Illimité
        modeles: 5,
        utilisateurs: 2,
      };
    } else if (newPlanId === "enterprise" || newPlanId === "entreprise") {
      limites = {
        clients: -1, // Illimité
        factures: -1, // Illimité
        modeles: -1, // Illimité
        utilisateurs: 10,
      };
    }
    
    // Créer un objet de plan complet
    const dateStart = new Date();
    const dateEnd = new Date(dateStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const userSubscription = {
      planId: newPlanId,
      isActive: true,
      dateStart: dateStart,
      dateEnd: dateEnd,
      stripeSubscriptionId: "sim_" + Math.random().toString(36).substring(2, 11),
      stripeCustomerId: "cus_sim_" + Math.random().toString(36).substring(2, 11),
      limites: limites,
      lastUpdated: new Date()
    };
    
    // Toujours mettre à jour Firebase, même en développement
    try {
      const userRef = doc(db, "users", userId);
      
      // Vérifier si l'utilisateur existe déjà
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Mettre à jour l'utilisateur existant
        console.log("[DEBUG-FIREBASE] Mise à jour de l'utilisateur existant dans Firestore");
        await updateDoc(userRef, {
          subscription: userSubscription
        });
      } else {
        // Créer un nouvel utilisateur
        console.log("[DEBUG-FIREBASE] Création d'un nouvel utilisateur dans Firestore");
        await setDoc(userRef, {
          subscription: userSubscription,
          email: "user@example.com", // Remplacer par email réel si disponible
          createdAt: new Date()
        });
      }
      
      console.log("[DEBUG-FIREBASE] Mise à jour Firestore réussie");
    } catch (firebaseError) {
      console.error("[DEBUG-FIREBASE] Erreur lors de la mise à jour Firestore:", firebaseError);
    }

    // Mettre à jour le localStorage pour refléter le changement immédiatement
    if (typeof window !== "undefined") {
      // Créer l'objet de plan complet pour le localStorage/sessionStorage
      const planObject = {
        planId: newPlanId,
        isActive: true,
        dateStart: dateStart,
        dateEnd: dateEnd,
        stripeSubscriptionId: "sim_" + Math.random().toString(36).substring(2, 11),
        stripeCustomerId: "cus_sim_" + Math.random().toString(36).substring(2, 11),
        limites: limites
      };
      
      // Stocker l'objet complet et l'ID du plan
      const planJSON = JSON.stringify(planObject);
      localStorage.setItem("devUserPlan", planJSON);
      sessionStorage.setItem("devUserPlan", planJSON);
      localStorage.setItem("permanentUserPlan", planJSON);
      localStorage.setItem("lastUsedPlanId", newPlanId);
      sessionStorage.setItem("lastUsedPlanId", newPlanId);
      sessionStorage.setItem("planId", newPlanId);
      sessionStorage.setItem("planJustChanged", "true");
    }

    console.log(`[DEBUG-FIREBASE] Plan changé avec succès pour l'utilisateur ${userId}: ${newPlanId}`);
    return true;
  } catch (error) {
    console.error("[DEBUG-FIREBASE] Erreur lors du changement de plan:", error);
    return false;
  }
};
