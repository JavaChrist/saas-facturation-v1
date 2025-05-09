"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  saveUserPlan: (planId: string) => void;
  preserveUserPlan: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour sauvegarder explicitement le plan de l'utilisateur
  const saveUserPlan = (planId: string) => {
    console.log("AuthProvider: Sauvegarde forcée du plan utilisateur", planId);
    try {
      if (typeof window !== "undefined") {
        // Créer un objet plan complet
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
              planId === "premium" ? 50 : (planId === "enterprise" || planId === "entreprise") ? -1 : 5,
            factures:
              planId === "premium" ? 500 : (planId === "enterprise" || planId === "entreprise") ? -1 : 20,
            modeles:
              planId === "premium" ? 5 : (planId === "enterprise" || planId === "entreprise") ? -1 : 1,
            utilisateurs:
              planId === "premium" ? 2 : (planId === "enterprise" || planId === "entreprise") ? 10 : 1,
          },
        };

        // Sauvegarder dans les deux types de stockage avec un préfixe permanent
        const planJSON = JSON.stringify(forcedPlan);

        // Stockage principal de développement (peut être effacé lors de la déconnexion)
        localStorage.setItem("devUserPlan", planJSON);
        sessionStorage.setItem("devUserPlan", planJSON);

        // Stockage permanent qui ne sera pas effacé lors de la déconnexion
        localStorage.setItem("permanentUserPlan", planJSON);

        // Marquer que nous avons un changement récent de plan
        sessionStorage.setItem("planJustChanged", "true");
        sessionStorage.setItem("planId", planId);

        console.log(
          "AuthProvider: Plan utilisateur sauvegardé avec succès:",
          forcedPlan
        );
      }
    } catch (e) {
      console.error("AuthProvider: Erreur lors de la sauvegarde du plan:", e);
    }
  };

  // Fonction pour préserver le plan utilisateur entre les déconnexions/connexions
  const preserveUserPlan = () => {
    console.log("AuthProvider: Tentative de restauration du plan permanent");
    try {
      if (typeof window !== "undefined") {
        console.log("[DEBUG-PRODUCTION-AUTH] Préservation du plan - Début");
        
        // Vérifier tous les plans stockés
        const permanentPlanData = localStorage.getItem("permanentUserPlan");
        const lastUsedPlanId = localStorage.getItem("lastUsedPlanId");
        const devUserPlan = localStorage.getItem("devUserPlan");
        
        console.log("[DEBUG-PRODUCTION-AUTH] Plans trouvés:");
        console.log(`[DEBUG-PRODUCTION-AUTH] permanentUserPlan: ${permanentPlanData ? "présent" : "absent"}`);
        console.log(`[DEBUG-PRODUCTION-AUTH] lastUsedPlanId: ${lastUsedPlanId}`);
        console.log(`[DEBUG-PRODUCTION-AUTH] devUserPlan: ${devUserPlan ? "présent" : "absent"}`);
        
        // Si nous avons un plan permanent ou lastUsedPlanId
        if (permanentPlanData) {
          // Restaurer le plan dans les stockages normaux
          localStorage.setItem("devUserPlan", permanentPlanData);
          sessionStorage.setItem("devUserPlan", permanentPlanData);

          // Marquer qu'un changement vient d'avoir lieu
          sessionStorage.setItem("planJustChanged", "true");

          try {
            const planObj = JSON.parse(permanentPlanData);
            sessionStorage.setItem("planId", planObj.planId || "gratuit");
            console.log(
              "AuthProvider: Plan restauré depuis le stockage permanent:",
              planObj
            );
            console.log("[DEBUG-PRODUCTION-AUTH] Plan restauré avec succès: ", planObj.planId);
          } catch (e) {
            console.error(
              "AuthProvider: Erreur lors du parsing du plan permanent:",
              e
            );
          }
        } else if (lastUsedPlanId) {
          // Si nous avons juste l'ID du plan, l'utiliser comme secours
          console.log("[DEBUG-PRODUCTION-AUTH] Pas de plan permanent mais lastUsedPlanId trouvé:", lastUsedPlanId);
          
          // Sauvegarder lastUsedPlanId dans sessionStorage
          sessionStorage.setItem("planId", lastUsedPlanId);
          sessionStorage.setItem("planJustChanged", "true");
          localStorage.setItem("lastUsedPlanId", lastUsedPlanId);
          sessionStorage.setItem("lastUsedPlanId", lastUsedPlanId);
          
          console.log("[DEBUG-PRODUCTION-AUTH] Plan forcé via lastUsedPlanId");
        } else {
          console.log("[DEBUG-PRODUCTION-AUTH] Aucun plan permanent trouvé à restaurer");
        }
        
        // S'assurer que enterprise et entreprise sont traités de la même façon
        if (lastUsedPlanId === "enterprise" || lastUsedPlanId === "entreprise") {
          console.log("[DEBUG-PRODUCTION-AUTH] Standardisation du plan Enterprise");
          localStorage.setItem("lastUsedPlanId", "enterprise");
          sessionStorage.setItem("lastUsedPlanId", "enterprise");
          sessionStorage.setItem("planId", "enterprise");
          sessionStorage.setItem("planJustChanged", "true");
        }
        
        console.log("[DEBUG-PRODUCTION-AUTH] Préservation du plan - Fin");
      }
    } catch (e) {
      console.error("AuthProvider: Erreur lors de la restauration du plan:", e);
    }
  };

  useEffect(() => {
    console.log("AuthProvider: Initialisation du listener d'authentification");

    // Restaurer le plan dès le chargement initial
    preserveUserPlan();

    // Vérifier si l'utilisateur est déjà connecté
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log("AuthProvider: Utilisateur déjà connecté", currentUser.email);
      setUser(currentUser);
      setLoading(false);
    } else {
      console.log("AuthProvider: Aucun utilisateur connecté");
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log(
          "AuthProvider: État d'authentification changé",
          user ? "Utilisateur connecté" : "Utilisateur déconnecté"
        );
        if (user) {
          console.log("AuthProvider: Détails de l'utilisateur", {
            email: user.email,
            uid: user.uid,
            emailVerified: user.emailVerified,
          });

          // Si l'utilisateur vient de se connecter, restaurer son plan
          preserveUserPlan();
        }
        setUser(user);
        setLoading(false);
      },
      (error) => {
        console.error(
          "AuthProvider: Erreur lors de l'écoute de l'état d'authentification",
          error
        );
      }
    );

    // Déconnexion automatique à la fermeture de l'onglet ou du navigateur
    const handleBeforeUnload = () => {
      signOut(auth);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      console.log("AuthProvider: Nettoyage du listener d'authentification");
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const loginWithGoogle = async () => {
    console.log("AuthProvider: Tentative de connexion avec Google");
    try {
      // Préserver le plan actuel avant la connexion
      preserveUserPlan();

      const provider = new GoogleAuthProvider();
      // Ajouter des scopes si nécessaire
      provider.addScope("profile");
      provider.addScope("email");

      const result = await signInWithPopup(auth, provider);
      console.log("AuthProvider: Connexion Google réussie", result.user.email);
    } catch (error: any) {
      console.error("AuthProvider: Erreur de connexion Google", error);
      console.error("AuthProvider: Code d'erreur", error.code);
      console.error("AuthProvider: Message d'erreur", error.message);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    console.log("AuthProvider: Tentative de connexion avec email", email);
    try {
      // Préserver le plan actuel avant la connexion
      preserveUserPlan();

      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("AuthProvider: Connexion email réussie", result.user.email);
    } catch (error: any) {
      console.error("AuthProvider: Erreur de connexion email", error);
      console.error("AuthProvider: Code d'erreur", error.code);
      console.error("AuthProvider: Message d'erreur", error.message);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    console.log("AuthProvider: Tentative d'inscription avec email", email);
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("AuthProvider: Inscription email réussie", result.user.email);
    } catch (error: any) {
      console.error("AuthProvider: Erreur d'inscription email", error);
      console.error("AuthProvider: Code d'erreur", error.code);
      console.error("AuthProvider: Message d'erreur", error.message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    console.log(
      "AuthProvider: Tentative de réinitialisation de mot de passe pour",
      email
    );
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("AuthProvider: Email de réinitialisation envoyé avec succès");
    } catch (error: any) {
      console.error(
        "AuthProvider: Erreur de réinitialisation de mot de passe",
        error
      );
      console.error("AuthProvider: Code d'erreur", error.code);
      console.error("AuthProvider: Message d'erreur", error.message);
      throw error;
    }
  };

  const logout = async () => {
    console.log("AuthProvider: Tentative de déconnexion");
    try {
      // Sauvegarder le plan actuel avant la déconnexion
      try {
        const currentPlan = localStorage.getItem("devUserPlan");
        if (currentPlan) {
          localStorage.setItem("permanentUserPlan", currentPlan);
          console.log(
            "AuthProvider: Plan utilisateur préservé avant déconnexion"
          );
        }
      } catch (e) {
        console.error(
          "AuthProvider: Erreur lors de la préservation du plan:",
          e
        );
      }

      await signOut(auth);
      console.log("AuthProvider: Déconnexion réussie");
    } catch (error: any) {
      console.error("AuthProvider: Erreur de déconnexion", error);
      console.error("AuthProvider: Code d'erreur", error.code);
      console.error("AuthProvider: Message d'erreur", error.message);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    logout,
    saveUserPlan,
    preserveUserPlan,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
