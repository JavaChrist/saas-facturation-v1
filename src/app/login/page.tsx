"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import React from "react";

// Composant pour le contenu de la page qui utilise useSearchParams
function LoginContent() {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    loading,
    user,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  // État unique pour forcer le remontage des formulaires
  const [formKey, setFormKey] = useState(Date.now());

  // États pour contrôler l'affichage du mot de passe
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Lors de la connexion, utiliser des références aux formulaires plutôt que des états
  const loginFormRef = React.useRef<HTMLFormElement>(null);
  const registerFormRef = React.useRef<HTMLFormElement>(null);
  const resetFormRef = React.useRef<HTMLFormElement>(null);

  // Fonction pour réinitialiser tous les formulaires
  const resetAllForms = () => {
    setTimeout(() => {
      // Réinitialiser les formulaires via les références
      if (loginFormRef.current) loginFormRef.current.reset();
      if (registerFormRef.current) registerFormRef.current.reset();
      if (resetFormRef.current) resetFormRef.current.reset();

      // Mettre à jour la clé pour forcer le remontage
      setFormKey(Date.now());
    }, 0);
  };

  // Fonction de connexion Google simplifiée
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      await loginWithGoogle();
      setSuccess("Connexion Google réussie ! Redirection...");
    } catch (err: any) {
      console.error("Erreur de connexion Google:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("La fenêtre de connexion a été fermée. Veuillez réessayer.");
      } else if (err.code === "auth/cancelled-popup-request") {
        setError("La demande de connexion a été annulée. Veuillez réessayer.");
      } else {
        setError("Erreur de connexion avec Google. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion de la connexion par email en utilisant les valeurs du formulaire directement
  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      await loginWithEmail(email, password);

      form.reset();
      setSuccess(`Connexion réussie ! Redirection...`);
    } catch (err: any) {
      console.error("Erreur de connexion email:", err);

      if (err.code === "auth/invalid-credential") {
        setError(
          "Email ou mot de passe incorrect. Veuillez vérifier vos identifiants."
        );
      } else if (err.code === "auth/user-not-found") {
        setError(
          "Aucun compte n'existe avec cet email. Veuillez créer un compte."
        );
      } else if (err.code === "auth/wrong-password") {
        setError("Mot de passe incorrect. Veuillez réessayer.");
      } else if (err.code === "auth/too-many-requests") {
        setError(
          "Trop de tentatives de connexion. Veuillez réessayer plus tard."
        );
      } else {
        setError("Erreur de connexion. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion de l'inscription avec la même approche
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      await registerWithEmail(email, password);

      form.reset();
      setSuccess(
        `Compte créé avec succès ! Vous pouvez maintenant vous connecter.`
      );
    } catch (err: any) {
      console.error("Erreur d'inscription:", err);

      if (err.code === "auth/email-already-in-use") {
        setError(
          "Cette adresse email est déjà utilisée. Veuillez vous connecter ou utiliser une autre adresse."
        );
      } else if (err.code === "auth/invalid-email") {
        setError(
          "Adresse email invalide. Veuillez entrer une adresse email valide."
        );
      } else if (err.code === "auth/weak-password") {
        setError(
          "Le mot de passe est trop faible. Utilisez au moins 6 caractères."
        );
      } else if (err.code === "auth/operation-not-allowed") {
        setError(
          "L'inscription par email est désactivée. Veuillez contacter l'administrateur."
        );
      } else {
        setError("Erreur lors de l'inscription. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion du formulaire de réinitialisation de mot de passe
  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;

    if (!email) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      await resetPassword(email);

      form.reset();
      setSuccess(`Un email de réinitialisation a été envoyé à ${email}.`);

      setTimeout(() => {
        setShowResetForm(false);
      }, 3000);
    } catch (err: any) {
      console.error("Erreur de réinitialisation:", err);

      if (err.code === "auth/user-not-found") {
        setError("Aucun compte n'existe avec cet email.");
      } else if (err.code === "auth/invalid-email") {
        setError(
          "Adresse email invalide. Veuillez entrer une adresse email valide."
        );
      } else if (err.code === "auth/missing-email") {
        setError("Veuillez entrer votre adresse email.");
      } else {
        setError("Erreur lors de la réinitialisation. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Effet pour rediriger l'utilisateur connecté
  useEffect(() => {
    if (user && !loading) {
      // Vérifier s'il y a une URL stockée dans localStorage
      const storedRedirectUrl = localStorage.getItem("authRedirectUrl");

      // Si un chemin de redirection est présent dans l'URL, l'utiliser
      if (redirectPath) {
        router.push(redirectPath);
        // Nettoyer le localStorage après utilisation
        localStorage.removeItem("authRedirectUrl");
      }
      // Sinon utiliser l'URL stockée dans localStorage si disponible
      else if (storedRedirectUrl) {
        router.push(storedRedirectUrl);
        // Nettoyer le localStorage après utilisation
        localStorage.removeItem("authRedirectUrl");
      }
      // Redirection par défaut au dashboard
      else {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router, redirectPath]);

  // Effet pour détecter une déconnexion récente
  useEffect(() => {
    const justLoggedOut = sessionStorage.getItem("just_logged_out");
    if (justLoggedOut) {
      sessionStorage.removeItem("just_logged_out");
      resetAllForms();
      setError(null);
      setSuccess(null);
    }
  }, []);

  // Créer un marqueur lors de la déconnexion
  useEffect(() => {
    return () => {
      if (!user) {
        sessionStorage.setItem("just_logged_out", "true");
      }
    };
  }, [user]);

  // Effet pour purger les formulaires au montage
  useEffect(() => {
    resetAllForms();
  }, []);

  // Affichage de la redirection si l'utilisateur est connecté
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 light">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
            Connexion
          </h1>
          {success && (
            <div className="mb-4 rounded-md bg-green-100 p-3 text-green-700">
              {success}
            </div>
          )}
          <div className="mt-4 text-center text-gray-600">
            Connexion réussie, redirection en cours...
          </div>
          <div className="mt-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 light">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Connexion
        </h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-100 p-3 text-green-700">
            {success}
          </div>
        )}

        {isLoading && (
          <div className="mb-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          </div>
        )}

        {showResetForm ? (
          <div>
            <form
              key={`reset-${formKey}`}
              ref={resetFormRef}
              id="reset-form"
              onSubmit={handlePasswordReset}
              className="mb-6"
              autoComplete="new-password"
            >
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:outline-none"
                  required
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                disabled={isLoading}
              >
                Réinitialiser mon mot de passe
              </button>
              <button
                type="button"
                onClick={() => setShowResetForm(false)}
                className="mt-2 w-full rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
              >
                Retour
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <button
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center rounded-md bg-white px-4 py-2 text-gray-800 shadow-md hover:bg-gray-50 border border-gray-300"
                disabled={isLoading}
              >
                <svg
                  className="mr-2 h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Se connecter avec Google
              </button>
            </div>

            <div className="mb-6 flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="mx-4 text-gray-500">ou</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <form
              key={`login-${formKey}`}
              ref={loginFormRef}
              id="login-form"
              onSubmit={handleEmailLogin}
              className="mb-6"
              autoComplete="on"
            >
              <div className="mb-4">
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:outline-none"
                  required
                  autoComplete="username email"
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    id="login-password"
                    name="password"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:outline-none"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowLoginPassword(!showLoginPassword);
                    }}
                  >
                    {showLoginPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.007 9.963 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="text-sm text-blue-800 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                disabled={isLoading}
              >
                Se connecter
              </button>
            </form>

            <div className="mb-6 flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="mx-4 text-gray-500">ou</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <form
              key={`register-${formKey}`}
              ref={registerFormRef}
              id="register-form"
              onSubmit={handleRegister}
              autoComplete="new-password"
            >
              {/* Champs cachés pour tromper le remplissage automatique */}
              <div style={{ display: "none" }}>
                <input type="text" name="username" autoComplete="username" />
                <input
                  type="password"
                  name="current-password"
                  autoComplete="current-password"
                />
              </div>

              <h2 className="mb-4 text-center text-xl font-semibold text-gray-800">
                Créer un compte
              </h2>
              <div className="mb-4">
                <label
                  htmlFor="register-email"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="register-email"
                  name="email"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:outline-none"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="register-password"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    id="register-password"
                    name="password"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:outline-none"
                    required
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowRegisterPassword(!showRegisterPassword);
                    }}
                  >
                    {showRegisterPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-800">
                  Le mot de passe doit contenir au moins 6 caractères.
                </p>
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                disabled={isLoading}
              >
                S'inscrire
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Composant principal exporté avec Suspense
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100 light">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
            <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
              Connexion
            </h1>
            <div className="mt-4 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
