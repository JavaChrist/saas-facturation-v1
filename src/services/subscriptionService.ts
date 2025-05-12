import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Liste des utilisateurs administrateurs ayant accès gratuitement au plan Enterprise
export const ADMIN_USERS = [
  "oq10PAIePPXMVgFX82tlXu67oVx2",
  // Ajout de l'ID pour support@javachrist.fr
  // Remplacez ce commentaire par l'ID réel lorsque vous l'aurez obtenu
];

export interface UserPlan {
  planId: string;
  isActive: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  dateStart?: Date;
  dateEnd?: Date;
  paymentVerified?: boolean;  // Indique si le paiement a été vérifié
  limites: {
    clients: number;
    factures: number;
    modeles: number;
    utilisateurs: number;
  };
}

/**
 * Récupère les informations d'abonnement de l'utilisateur
 */
export const getUserPlan = async (userId: string): Promise<UserPlan> => {
  try {
    // Vérifier si nous sommes sur Vercel en production
    const isVercelProduction = process.env.VERCEL_ENV === "production";
    
    // Mode développement - retourner un plan factice si la collection users n'existe pas
    const isDevelopment = process.env.NODE_ENV === "development";

    // En mode client (navigateur), vérifier si un paiement est validé
    const isPaymentVerified = typeof window !== "undefined" ? 
      sessionStorage.getItem("paymentVerified") === "true" : false;
    
    // Vérifier si l'utilisateur est admin
    const isAdmin = ADMIN_USERS.includes(userId);
    
    // Vérifier s'il y a un changement de plan en attente (non validé)
    const hasPendingPlan = typeof window !== "undefined" ? 
      sessionStorage.getItem("pendingPlanChange") === "true" : false;
    
    // Si changement en attente sans vérification de paiement, et utilisateur non admin,
    // réinitialiser au plan gratuit par défaut
    if (hasPendingPlan && !isPaymentVerified && !isAdmin && typeof window !== "undefined") {
      // Restaurer le plan précédent ou remettre au plan gratuit
      const previousPlanId = localStorage.getItem("previousPlanId") || "gratuit";
      localStorage.setItem("lastUsedPlanId", previousPlanId);
      sessionStorage.setItem("lastUsedPlanId", previousPlanId);
      
      // Nettoyer les variables temporaires
      sessionStorage.removeItem("pendingPlanId");
      sessionStorage.removeItem("pendingPlanChange");
      
      console.log("Remise au plan précédent car paiement non vérifié:", previousPlanId);
    }

    if (isDevelopment || isVercelProduction) {
      // Vérification spéciale pour Vercel
      if (isVercelProduction && typeof window !== "undefined") {
        // ID du plan forcé pour les utilisateurs de Vercel qui ont déjà choisi le plan Entreprise
        const userId_plan_map: Record<string, string> = {
          "oq10PAIePPXMVgFX82tlXu67oVx2": "enterprise"
        };
        
        // Si l'utilisateur est dans la liste des utilisateurs avec plan forcé
        if (userId_plan_map[userId]) {          
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
          } catch (e) {
            console.error("Erreur lors de la sauvegarde du plan forcé:", e);
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
          } catch (e) {
            console.error("Erreur lors de la sauvegarde du plan frais:", e);
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
            const planId = sessionStorage.getItem("planId");

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
              );

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

              // Sauvegarder dans les deux types de stockage pour assurer la persistance
              const planJSON = JSON.stringify(forcedPlan);
              try {
                localStorage.setItem("devUserPlan", planJSON);
                sessionStorage.setItem("devUserPlan", planJSON);
                localStorage.setItem("lastUsedPlanId", planId);
                sessionStorage.setItem("lastUsedPlanId", planId);
              } catch (e) {
                console.error("Erreur lors de la sauvegarde forcée:", e);
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
                console.error("Le plan récupéré est invalide, propriétés manquantes:", storedPlan);
                storedPlan = null;
              } else {
                // S'assurer que le plan est sauvegardé dans les deux stockages
                try {
                  localStorage.setItem("devUserPlan", storedPlanData);
                  sessionStorage.setItem("devUserPlan", storedPlanData);
                } catch (e) {
                  console.warn("Erreur lors de la synchronisation des stockages:", e);
                }
              }
            } catch (e) {
              console.error("Erreur lors du parsing du stockage:", e);
              storedPlan = null;
            }
          }
        } catch (e) {
          console.error("Erreur lors de la lecture du stockage:", e);
        }
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
          localStorage.setItem("devUserPlan", JSON.stringify(defaultPlan));
        } catch (e) {
          console.error("Erreur lors de l'écriture dans localStorage", e);
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
        factures: -1,
        modeles: 5,
        utilisateurs: 2,
      };
    } else if (planId === "entreprise") {
      limites = {
        clients: -1,
        factures: -1,
        modeles: -1,
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
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'abonnement:", error);
    throw error;
  }
};

/**
 * Vérifie si l'utilisateur a déjà le plan spécifié
 */
export const hasUserPlan = async (userId: string, planId: string): Promise<boolean> => {
  try {
    // Récupérer les informations de l'utilisateur
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    // Si c'est un administrateur par ID ou un email admin demandant le plan Enterprise, toujours permettre l'accès
    if ((ADMIN_USERS.includes(userId) || (userData?.email && isAdminEmail(userData.email))) && 
        (planId === "enterprise" || planId === "entreprise")) {
      return false; // Retourne false pour permettre de "s'abonner" (même si c'est gratuit)
    }
    
    // Récupérer le plan actuel de l'utilisateur depuis Firebase
    if (userDoc.exists() && userDoc.data().subscription) {
      const subscription = userDoc.data().subscription;
      
      // Vérifier si le plan actuel correspond au plan demandé
      if (subscription.planId === planId) {
        return true;
      }
      
      // Standardiser les noms des plans enterprise/entreprise
      if ((subscription.planId === "enterprise" || subscription.planId === "entreprise") && 
          (planId === "enterprise" || planId === "entreprise")) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Erreur lors de la vérification du plan:", error);
    return false;
  }
};

/**
 * Change le plan de l'utilisateur (version développement)
 */
export const changePlanDev = async (userId: string, newPlanId: string, userEmail?: string): Promise<boolean> => {
  try {
    // Vérifier si l'utilisateur a déjà le plan demandé
    const alreadyHasPlan = await hasUserPlan(userId, newPlanId);
    if (alreadyHasPlan) {
      return false;
    }

    // Vérifier si l'utilisateur est administrateur
    const isUserAdmin = ADMIN_USERS.includes(userId) || (userEmail && isAdminEmail(userEmail));
    
    // Si l'utilisateur n'est pas admin et essaie d'accéder à un plan payant sans preuve de paiement,
    // ne pas autoriser le changement mais créer un abonnement temporaire
    if (!isUserAdmin && (newPlanId === "premium" || newPlanId === "enterprise" || newPlanId === "entreprise")) {
      // Enregistrer la tentative dans les variables de session (nécessaire pour la redirection Stripe)
      if (typeof window !== "undefined") {
        // Mémoriser la tentative mais sans confirmer l'activation
        sessionStorage.setItem("pendingPlanId", newPlanId);
        sessionStorage.setItem("pendingPlanChange", "true");
        
        // Ne pas définir lastUsedPlanId ou planId pour éviter la persistance du plan
        console.log(`Tentative de passage au plan ${newPlanId} en attente de validation de paiement`);
      }
      
      // Retourner true pour que l'UI continue le processus vers Stripe
      return true;
    }
    
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
        factures: -1,
        modeles: 5,
        utilisateurs: 2,
      };
    } else if (newPlanId === "enterprise" || newPlanId === "entreprise") {
      limites = {
        clients: -1,
        factures: -1,
        modeles: -1,
        utilisateurs: 10,
      };
      
      // Standardiser le nom du plan enterprise
      newPlanId = "enterprise";
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
      paymentVerified: isUserAdmin || newPlanId === "gratuit", // Seuls les plans gratuits et admins sont auto-vérifiés
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
        await updateDoc(userRef, {
          subscription: userSubscription,
          lastUpdated: new Date()
        });
      } else {
        // Créer un nouvel utilisateur
        
        // Utiliser l'email fourni ou une valeur par défaut
        const email = userEmail || "user@example.com";
        
        await setDoc(userRef, {
          subscription: userSubscription,
          email: email,
          uid: userId,
          createdAt: new Date(),
          lastUpdated: new Date()
        });
      }
    } catch (firebaseError) {
      console.error("Erreur lors de la mise à jour Firestore:", firebaseError);
      // Ne pas arrêter l'exécution, continuer avec le localStorage
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

    return true;
  } catch (error) {
    console.error("Erreur lors du changement de plan:", error);
    return false;
  }
};

/**
 * Définir un plan administrateur (gratuit, permanent) pour un utilisateur
 */
export const setAdminPlan = async (userId: string, userEmail?: string): Promise<boolean> => {
  try {
    // Vérifier si l'utilisateur est déjà dans la liste des administrateurs ou a un email administrateur
    const isAuthorizedAdmin = ADMIN_USERS.includes(userId) || (userEmail && isAdminEmail(userEmail));
    
    // En mode production, ne permettre l'élévation qu'aux utilisateurs déjà autorisés
    if (process.env.NODE_ENV !== "development" && !isAuthorizedAdmin) {
      console.error("Tentative non autorisée de définir un compte administrateur:", userId, userEmail);
      return false;
    }
    
    // En mode développement, n'autoriser que les emails d'administrateur
    if (process.env.NODE_ENV === "development" && userEmail && !isAdminEmail(userEmail)) {
      console.error("Email non autorisé pour devenir administrateur:", userEmail);
      return false;
    }
    
    // Création d'une date d'expiration lointaine (10 ans)
    const today = new Date();
    const farFuture = new Date(today.getFullYear() + 10, today.getMonth(), today.getDate());
    
    // Créer un objet de plan admin
    const adminSubscription = {
      planId: "enterprise",
      isActive: true,
      dateStart: today,
      dateEnd: farFuture,
      isAdmin: true,
      stripeSubscriptionId: "admin_free_plan",
      stripeCustomerId: "admin_user",
      limites: {
        clients: -1,
        factures: -1,
        modeles: -1,
        utilisateurs: -1,
      },
      lastUpdated: today
    };
    
    // Mettre à jour Firebase
    try {
      const userRef = doc(db, "users", userId);
      
      // Vérifier si l'utilisateur existe déjà
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Mettre à jour l'utilisateur existant
        await updateDoc(userRef, {
          subscription: adminSubscription,
          isAdmin: true,
          lastUpdated: new Date()
        });
      } else {
        // Créer un nouvel utilisateur admin
        
        // Utiliser l'email fourni ou une valeur par défaut
        const email = userEmail || "admin@example.com";
        
        await setDoc(userRef, {
          subscription: adminSubscription,
          email: email,
          uid: userId,
          isAdmin: true,
          createdAt: new Date(),
          lastUpdated: new Date()
        });
      }
    } catch (firebaseError) {
      console.error("Erreur lors de la mise à jour Firestore pour l'admin:", firebaseError);
      return false;
    }

    // Mettre à jour le localStorage pour refléter le changement immédiatement
    if (typeof window !== "undefined") {
      // Créer l'objet de plan complet pour le localStorage/sessionStorage
      const planObject = {
        planId: "enterprise",
        isActive: true,
        isAdmin: true,
        dateStart: today,
        dateEnd: farFuture,
        stripeSubscriptionId: "admin_free_plan",
        stripeCustomerId: "admin_user",
        limites: {
          clients: -1,
          factures: -1,
          modeles: -1,
          utilisateurs: -1,
        }
      };
      
      // Stocker l'objet complet et l'ID du plan
      const planJSON = JSON.stringify(planObject);
      localStorage.setItem("devUserPlan", planJSON);
      sessionStorage.setItem("devUserPlan", planJSON);
      localStorage.setItem("permanentUserPlan", planJSON);
      localStorage.setItem("lastUsedPlanId", "enterprise");
      sessionStorage.setItem("lastUsedPlanId", "enterprise");
      sessionStorage.setItem("planId", "enterprise");
      sessionStorage.setItem("planJustChanged", "true");
      localStorage.setItem("isAdmin", "true");
      sessionStorage.setItem("isAdmin", "true");
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la configuration du plan admin:", error);
    return false;
  }
};

/**
 * Annuler l'abonnement d'un utilisateur
 */
export const cancelSubscription = async (userId: string): Promise<boolean> => {
  try {
    // Si c'est un administrateur, ne pas permettre l'annulation
    if (ADMIN_USERS.includes(userId)) {
      return false;
    }
    
    // Récupérer les informations actuelles de l'utilisateur
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && userDoc.data().subscription) {
      const subscription = userDoc.data().subscription;
      
      // Si l'utilisateur a un abonnement Stripe réel, il faudrait l'annuler via l'API Stripe
      if (subscription.stripeSubscriptionId && 
          !subscription.stripeSubscriptionId.startsWith("sim_") &&
          subscription.stripeSubscriptionId !== "admin_free_plan") {
        try {
          // Cette partie devrait être implémentée avec l'API Stripe en production
          // Pour le développement, nous simulons simplement l'annulation
        } catch (stripeError) {
          console.error("Erreur lors de l'annulation Stripe:", stripeError);
          // Continuer malgré l'erreur pour mettre à jour Firebase
        }
      }
      
      // Mettre à jour le plan de l'utilisateur à "gratuit" dans Firebase
      const today = new Date();
      const planGratuit = {
        planId: "gratuit",
        isActive: true,
        dateStart: today,
        dateEnd: today,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        cancelled: true,
        cancelledAt: today,
        limites: {
          clients: 5,
          factures: 5,
          modeles: 1,
          utilisateurs: 1,
        },
        lastUpdated: today
      };
      
      await updateDoc(userRef, {
        subscription: planGratuit,
        lastUpdated: today
      });
      
      // Mettre à jour le localStorage
      if (typeof window !== "undefined") {
        const planJSON = JSON.stringify(planGratuit);
        localStorage.setItem("devUserPlan", planJSON);
        sessionStorage.setItem("devUserPlan", planJSON);
        localStorage.setItem("permanentUserPlan", planJSON);
        localStorage.setItem("lastUsedPlanId", "gratuit");
        sessionStorage.setItem("lastUsedPlanId", "gratuit");
        sessionStorage.setItem("planId", "gratuit");
        sessionStorage.setItem("planJustChanged", "true");
      }
      
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Erreur lors de l'annulation de l'abonnement:", error);
    return false;
  }
};

/**
 * Vérification spéciale pour l'email support@javachrist.fr
 */
export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  
  // Liste des emails d'administrateur autorisés
  const adminEmails = [
    "support@javachrist.fr", 
    "admin@javachrist.fr",
    "admin@facturation.javachrist.eu"
  ];
  
  const lowercaseEmail = email.toLowerCase();
  const isAdmin = adminEmails.includes(lowercaseEmail);
  
  // Journaliser les tentatives de vérification d'admin
  if (isAdmin) {
    console.log(`Email administrateur vérifié: ${lowercaseEmail}`);
  } else if (lowercaseEmail.includes("javachrist") || lowercaseEmail.includes("admin")) {
    console.warn(`Tentative de vérification avec un email non administrateur: ${lowercaseEmail}`);
  }
  
  return isAdmin;
};
