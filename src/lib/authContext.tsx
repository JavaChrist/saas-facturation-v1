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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: Initialisation du listener d'authentification");

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

    return () => {
      console.log("AuthProvider: Nettoyage du listener d'authentification");
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    console.log("AuthProvider: Tentative de connexion avec Google");
    try {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
