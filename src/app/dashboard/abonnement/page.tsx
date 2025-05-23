"use client";
import { useState, useEffect, Suspense } from "react";
import { FiArrowLeft, FiCheck, FiX, FiCreditCard } from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { getUserPlan, UserPlan, hasUserPlan, setAdminPlan, cancelSubscription, ADMIN_USERS, isAdminEmail } from "@/services/subscriptionService";
import StripePaymentForm from "@/components/StripePaymentForm";
import { MdOutlineContactSupport } from "react-icons/md";
import { changePlanDev } from "@/services/subscriptionService";
import { emailService } from "@/services/emailService";

interface Plan {
  id: string;
  nom: string;
  prix: number;
  frequence: string;
  limites: {
    clients: number;
    factures: number;
    modeles: number;
    utilisateurs: number;
  };
  fonctionnalites: string[];
  couleur: string;
  recommande?: boolean;
}

// Composant pour le contenu de la page qui utilise useSearchParams
function AbonnementContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [planActuel, setPlanActuel] = useState<string>("gratuit");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const searchParams = useSearchParams();
  const [isPaymentFormVisible, setIsPaymentFormVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [stripeComponentLoaded, setStripeComponentLoaded] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showManagementOptions, setShowManagementOptions] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminButton, setShowAdminButton] = useState<boolean>(false);
  const [showCancelButton, setShowCancelButton] = useState<boolean>(false);
  const [confirmCancel, setConfirmCancel] = useState<boolean>(false);

  // Vérifier si nous venons d'une redirection après paiement
  const successParam = searchParams.get("success");
  const canceledParam = searchParams.get("canceled");
  const planParam = searchParams.get("plan");
  const modeParam = searchParams.get("mode");

  // Si le mode est "change", montrer les options de gestion d'abonnement
  useEffect(() => {
    if (modeParam === "change") {
      setShowManagementOptions(true);

      // Nettoyer l'URL
      const cleanUrl = window.location.pathname;
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, [modeParam]);

  // Plans disponibles
  const plans: Plan[] = [
    {
      id: "gratuit",
      nom: "Gratuit",
      prix: 0,
      frequence: "pour toujours",
      limites: {
        clients: 5,
        factures: 5,
        modeles: 1,
        utilisateurs: 1,
      },
      fonctionnalites: [
        "Création de factures",
        "Gestion de clients",
        "Exportation PDF",
      ],
      couleur: "gray",
    },
    {
      id: "premium",
      nom: "Premium",
      prix: 9.99,
      frequence: "par mois",
      limites: {
        clients: 50,
        factures: -1,
        modeles: 5,
        utilisateurs: 2,
      },
      fonctionnalites: [
        "Création de factures",
        "Gestion de clients",
        "Exportation PDF",
        "Factures récurrentes",
        "Paiement en ligne pour vos clients",
        "Support prioritaire",
      ],
      couleur: "blue",
      recommande: true,
    },
    {
      id: "enterprise",
      nom: "Entreprise",
      prix: 29.99,
      frequence: "par mois",
      limites: {
        clients: -1,
        factures: -1,
        modeles: -1,
        utilisateurs: 10,
      },
      fonctionnalites: [
        "Création de factures",
        "Gestion de clients",
        "Exportation PDF",
        "Factures récurrentes",
        "Paiement en ligne pour vos clients",
        "Support prioritaire",
        "Clients & factures illimités",
        "Utilisateurs multiples",
        "API d'intégration",
        "Personnalisation avancée",
      ],
      couleur: "purple",
    },
  ];

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchUserPlan = async () => {
      try {
        setIsLoading(true);

        const plan = await getUserPlan(user.uid);

        // S'assurer que les dates sont des objets Date
        if (plan.dateStart) {
          plan.dateStart =
            plan.dateStart instanceof Date
              ? plan.dateStart
              : new Date(plan.dateStart);
        }

        if (plan.dateEnd) {
          plan.dateEnd =
            plan.dateEnd instanceof Date
              ? plan.dateEnd
              : new Date(plan.dateEnd);
        }

        setUserPlan(plan);
        setPlanActuel(plan.planId);

        // Afficher un message de succès ou d'erreur selon les paramètres d'URL
        if (successParam === "true" && planParam) {
          setSuccess(`Abonnement au plan ${planParam} activé avec succès !`);
          setTimeout(() => setSuccess(null), 5000);
        } else if (canceledParam === "true") {
          setError("Paiement annulé. Votre abonnement n'a pas été modifié.");
          setTimeout(() => setError(null), 5000);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du plan:", err);
        // En cas d'erreur, utiliser un plan par défaut
        const defaultPlan: UserPlan = {
          planId: "gratuit",
          isActive: true,
          limites: {
            clients: 5,
            factures: 20,
            modeles: 1,
            utilisateurs: 1,
          },
        };
        setUserPlan(defaultPlan);
        setPlanActuel("gratuit");
        setError("Mode développement: Plan gratuit par défaut utilisé");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPlan();
  }, [user, router, successParam, canceledParam, planParam, searchParams]);

  useEffect(() => {
    try {
      // Tenter de charger la dépendance Stripe
      import("@stripe/react-stripe-js")
        .then(() => {
          setStripeComponentLoaded(true);
        })
        .catch((error) => {
          console.error("Erreur lors du chargement de Stripe:", error);
          setStripeComponentLoaded(false);
        });
    } catch (e) {
      console.error("Erreur lors de la vérification de Stripe:", e);
      setStripeComponentLoaded(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setShowAdminButton(process.env.NODE_ENV === "development");
      
      // Si c'est un utilisateur admin par UID ou par email, définir isAdmin et forcer le plan Enterprise
      const isUserAdmin = ADMIN_USERS.includes(user.uid) || isAdminEmail(user.email);
      setIsAdmin(isUserAdmin);
      
      // Si c'est un admin, forcer le plan enterprise
      if (isUserAdmin && planActuel !== "enterprise") {
        // Forcer immédiatement le changement de plan pour l'affichage
        setPlanActuel("enterprise");
        
        // Sauvegarder le plan dans le stockage local
        if (typeof window !== "undefined") {
          localStorage.setItem("lastUsedPlanId", "enterprise");
          sessionStorage.setItem("lastUsedPlanId", "enterprise");
          sessionStorage.setItem("planId", "enterprise");
          sessionStorage.setItem("planJustChanged", "true");
        }
      }
      
      // Précharger l'email de l'utilisateur dans le formulaire de contact
      if (user.email) {
        setContactFormData(prev => ({
          ...prev,
          email: user.email || ""
        }));
      }
      
      // Vérifier si on doit afficher le bouton d'annulation
      // (uniquement pour les utilisateurs non-admin avec un plan payant)
      if (planActuel !== "gratuit" && !isUserAdmin) {
        setShowCancelButton(true);
      } else {
        setShowCancelButton(false);
      }
    }
  }, [user, planActuel]);

  // Force showAdminButton à true en développement
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setShowAdminButton(true);
      console.log("Mode développement détecté, bouton administrateur activé");
    }
  }, []);

  const handleSubscribe = async (planId: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Vérifier si l'utilisateur est connecté
    if (!user) {
      setError("Vous devez être connecté pour vous abonner");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Début du processus d'abonnement au plan:", planId);

      // Vérifier si l'utilisateur a déjà le plan demandé
      const hasCurrentPlan = await hasUserPlan(user.uid, planId);
      if (hasCurrentPlan) {
        setError(`Vous êtes déjà abonné au plan ${planId}. Impossible de souscrire deux fois au même plan.`);
        setIsLoading(false);
        return;
      }

      // Sauvegarder le plan actuel avant de changer
      if (typeof window !== "undefined") {
        // Enregistrer le plan actuel pour pouvoir le restaurer en cas d'annulation
        localStorage.setItem("previousPlanId", planActuel);
      }

      // Mettre à jour immédiatement les marqueurs de plan
      if (typeof window !== "undefined") {
        // Définir le flag de changement de plan
        sessionStorage.setItem("planJustChanged", "true");
        sessionStorage.setItem("planId", planId);
        localStorage.setItem("lastUsedPlanId", planId);
        sessionStorage.setItem("lastUsedPlanId", planId);

        console.log("Marqueurs de plan définis:", planId);
      }

      // Mettre à jour le plan dans Firebase en premier
      console.log("[DEBUG-ABONNEMENT] Mise à jour du plan dans Firebase:", planId);
      const planUpdateResult = await changePlanDev(user.uid, planId, user.email || undefined);
      
      if (!planUpdateResult) {
        console.error("[DEBUG-ABONNEMENT] Échec de la mise à jour du plan dans Firebase");
        throw new Error("La mise à jour du plan a échoué. Veuillez réessayer.");
      }
      
      console.log("[DEBUG-ABONNEMENT] Plan correctement mis à jour dans Firebase");

      // Si nous sommes en développement local et que Stripe n'est pas configuré
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      ) {
        console.log("Simulation de l'abonnement en mode développement");
        // Simuler un abonnement réussi
        await simulateSubscription(user.uid, planId);
        setSuccess(
          `Abonnement (simulé) au plan ${planId} activé avec succès !`
        );
        setIsLoading(false);

        // Rafraîchir la page après 2 secondes
        setTimeout(() => {
          router.refresh();
        }, 2000);
        return;
      }

      // Sélectionner le plan et afficher le formulaire de paiement
      const planToSubscribe = plans.find((p) => p.id === planId);
      if (!planToSubscribe) {
        throw new Error("Plan introuvable");
      }

      setSelectedPlan(planToSubscribe);
      setIsPaymentFormVisible(true);
      setIsLoading(false);
    } catch (error: any) {
      console.error("Erreur lors de la souscription:", error);
      setError(
        `Une erreur est survenue: ${error.message || "Veuillez réessayer."}`
      );
      setIsLoading(false);
    }
  };

  // Fonction appelée lorsque le paiement est réussi
  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      setIsLoading(true);
      
      // Fermer la fenêtre de paiement
      setIsPaymentFormVisible(false);
      setSelectedPlan(null);
      
      // Appeler l'API pour confirmer le paiement et activer l'abonnement
      const response = await fetch("/api/subscription/success", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          userId: user?.uid,
          planId: selectedPlan?.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Mettre à jour le stockage local
      if (typeof window !== "undefined") {
        // Définir les flags de plan correctement vérifié
        localStorage.setItem("lastUsedPlanId", data.subscription.planId);
        sessionStorage.setItem("lastUsedPlanId", data.subscription.planId);
        sessionStorage.setItem("planId", data.subscription.planId);
        sessionStorage.setItem("planJustChanged", "true");
        sessionStorage.setItem("paymentVerified", "true");
        
        // Supprimer le plan en attente
        sessionStorage.removeItem("pendingPlanId");
        sessionStorage.removeItem("pendingPlanChange");
      }
      
      // Afficher un message de succès
      setSuccess(`Abonnement activé avec succès! (ID: ${sessionId})`);
      
      // Mettre à jour l'état local
      setPlanActuel(data.subscription.planId);
      
      // Rafraîchir la page après un délai
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Erreur lors de la confirmation du paiement:", error);
      setError(`Erreur lors de l'activation de l'abonnement: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
      setIsLoading(false);
    }
  };

  // Fonction appelée lorsque l'utilisateur annule le paiement
  const handlePaymentCancel = () => {
    // Fermer la vue du formulaire de paiement
    setIsPaymentFormVisible(false);
    setSelectedPlan(null);
    
    // Réinitialiser les valeurs de stockage local pour éviter la persistance du plan payant
    if (typeof window !== "undefined") {
      // Supprimer les marques de changement de plan
      sessionStorage.removeItem("planJustChanged");
      sessionStorage.removeItem("planId");
      
      // Si l'utilisateur avait un plan précédent, le restaurer
      const previousPlan = localStorage.getItem("previousPlanId");
      if (previousPlan) {
        // Restaurer le plan précédent
        localStorage.setItem("lastUsedPlanId", previousPlan);
        sessionStorage.setItem("lastUsedPlanId", previousPlan);
      } else {
        // Sinon revenir au plan gratuit
        localStorage.setItem("lastUsedPlanId", "gratuit");
        sessionStorage.setItem("lastUsedPlanId", "gratuit");
      }
    }
    
    // Afficher un message à l'utilisateur
    setError("Paiement annulé. Votre abonnement n'a pas été modifié.");
    
    // Rafraîchir la page pour s'assurer que les changements prennent effet
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // Fonction pour simuler un abonnement en mode développement
  const simulateSubscription = async (userId: string, planId: string) => {
    console.log(
      "[DEBUG] Début de simulateSubscription pour",
      userId,
      "au plan",
      planId
    );

    try {
      // Enregistrer le changement de plan dans sessionStorage
      sessionStorage.setItem("planJustChanged", "true");
      sessionStorage.setItem("planId", planId);
      localStorage.setItem("lastUsedPlanId", planId);
      sessionStorage.setItem("lastUsedPlanId", planId);

      // Créer le plan simulé
      const dateStart = new Date();
      const dateEnd = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);

      const simulatedPlan = {
        planId: planId,
        isActive: true,
        dateStart: dateStart,
        dateEnd: dateEnd,
        stripeSubscriptionId:
          "sim_" + Math.random().toString(36).substring(2, 11),
        stripeCustomerId:
          "cus_sim_" + Math.random().toString(36).substring(2, 11),
        limites: {
          clients: planId === "premium" ? 50 : planId === "enterprise" ? -1 : 5,
          factures:
            planId === "premium" ? 500 : planId === "enterprise" ? -1 : 20,
          modeles: planId === "premium" ? 5 : planId === "enterprise" ? -1 : 1,
          utilisateurs:
            planId === "premium" ? 2 : planId === "enterprise" ? 10 : 1,
        },
      };

      // Enregistrer le plan dans localStorage et sessionStorage
      const planJSON = JSON.stringify(simulatedPlan);
      localStorage.setItem("devUserPlan", planJSON);
      sessionStorage.setItem("devUserPlan", planJSON);

      console.log(
        "[DEBUG] Plan simulé enregistré dans le stockage:",
        simulatedPlan
      );

      // Afficher un message de succès
      setSuccess(
        `Plan ${planId} activé avec succès! Redirection vers le dashboard...`
      );

      // Au lieu de rediriger immédiatement, rediriger vers la page bridge qui s'occupera de tout
      setTimeout(() => {
        // Utiliser la page bridge pour garantir la persistance du plan
        window.location.href = `/bridge?plan=${planId}`;
      }, 1000);

      return simulatedPlan;
    } catch (e) {
      console.error("[DEBUG] Erreur critique lors de la simulation:", e);
      setError(
        `Erreur de simulation: ${
          e instanceof Error ? e.message : "Erreur inconnue"
        }`
      );
      setIsLoading(false);
      return null;
    }
  };

  // Gérer la soumission du formulaire de contact
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setContactSuccess(null);

    try {
      // Vérifier que le téléphone est renseigné
      if (!contactFormData.name || !contactFormData.email || !contactFormData.message || !contactFormData.phone) {
        setError("Tous les champs sont requis");
        setIsSubmitting(false);
        return;
      }

      // Envoyer la demande via le service d'emails
      // Inclure le numéro de téléphone dans le message
      const messageWithPhone = `Téléphone: ${contactFormData.phone}\n\n${contactFormData.message}`;
      
      const result = await emailService.sendContactRequest(
        contactFormData.name,
        contactFormData.email,
        messageWithPhone
      );

      if (result.success) {
        setContactSuccess(
          "Votre demande a été envoyée avec succès ! Notre équipe commerciale vous contactera sous peu."
        );
        
        // Réinitialiser le formulaire après 3 secondes
        setTimeout(() => {
          setContactFormData({ name: "", email: "", phone: "", message: "" });
          setShowContactForm(false);
          setContactSuccess(null);
        }, 3000);
      } else {
        setError(result.message || "Une erreur est survenue lors de l'envoi de votre demande.");
      }
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de la demande:", error);
      setError(error.message || "Une erreur est survenue lors de l'envoi de votre demande.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction pour définir l'utilisateur courant comme administrateur
  const handleSetAdminPlan = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const result = await setAdminPlan(user.uid, user.email || undefined);
      if (result) {
        setSuccess("Compte administrateur configuré avec succès!");
        setPlanActuel("enterprise");
        setIsAdmin(true);
        
        // Rafraîchir la page après 2 secondes
        setTimeout(() => {
          router.refresh();
        }, 2000);
      } else {
        setError("Échec de la configuration du compte administrateur.");
      }
    } catch (error) {
      console.error("Erreur lors de la configuration admin:", error);
      setError("Une erreur est survenue lors de la configuration admin.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour annuler l'abonnement
  const handleCancelSubscription = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const result = await cancelSubscription(user.uid);
      if (result) {
        setSuccess("Votre abonnement a été annulé avec succès. Vous êtes maintenant sur le plan Gratuit.");
        setPlanActuel("gratuit");
        setShowCancelButton(false);
        setConfirmCancel(false);
        
        // Rafraîchir la page après 2 secondes
        setTimeout(() => {
          router.refresh();
        }, 2000);
      } else {
        setError("Échec de l'annulation de l'abonnement.");
      }
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
      setError("Une erreur est survenue lors de l'annulation.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
          💳 Abonnement
        </h1>
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
        >
          <FiArrowLeft size={18} className="mr-2" /> Retour
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
          <p>{success}</p>
        </div>
      )}

      {/* Options de gestion d'abonnement */}
      {showManagementOptions && userPlan && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Gestion de votre abonnement
          </h2>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md mb-6">
            <p className="text-gray-700 dark:text-gray-200 mb-4">
              Votre abonnement actuel :{" "}
              <span className="font-semibold">
                {plans.find((p) => p.id === planActuel)?.nom}
              </span>
            </p>
            <p className="text-gray-700 dark:text-gray-200 mb-4">
              En mode développement, vous pouvez facilement changer de plan en
              sélectionnant l'un des plans ci-dessous.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handleSubscribe(plan.id)}
                className={`p-4 rounded-lg text-center transition-all duration-300 ${
                  plan.id === planActuel
                    ? "bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600"
                    : plan.id === "premium"
                    ? "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                    : plan.id === "enterprise"
                    ? "bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-800/50"
                    : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <span className="font-medium text-lg">
                  {plan.id === planActuel
                    ? `Plan actuel (${plan.nom})`
                    : `Passer au plan ${plan.nom}`}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowManagementOptions(false)}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors duration-300"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Formulaire de paiement Stripe */}
      {isPaymentFormVisible && selectedPlan && stripeComponentLoaded ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <StripePaymentForm
              planId={selectedPlan.id}
              planName={selectedPlan.nom}
              amount={selectedPlan.prix}
              userId={user?.uid || ""}
              userEmail={user?.email || ""}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      ) : isPaymentFormVisible && selectedPlan && !stripeComponentLoaded ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                Composant de paiement non disponible
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Les bibliothèques Stripe ne sont pas disponibles. Veuillez
                installer @stripe/react-stripe-js et @stripe/stripe-js.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded mb-6 text-left">
                <p>
                  <strong>Installation requise:</strong>
                  <br />
                  npm install @stripe/react-stripe-js @stripe/stripe-js
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handlePaymentCancel}
                  className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
          Votre plan actuel
        </h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div
                className={`p-4 rounded-full bg-${
                  plans.find((p) => p.id === planActuel)?.couleur
                }-100 dark:bg-${
                  plans.find((p) => p.id === planActuel)?.couleur
                }-900 mr-4`}
              >
                <FiCreditCard
                  className={`text-${
                    plans.find((p) => p.id === planActuel)?.couleur
                  }-500 dark:text-${
                    plans.find((p) => p.id === planActuel)?.couleur
                  }-400 text-2xl`}
                />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                  Plan {plans.find((p) => p.id === planActuel)?.nom}
                </h3>
                {userPlan && userPlan.dateEnd && planActuel !== "gratuit" ? (
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    Prochain renouvellement:{" "}
                    {new Date(userPlan.dateEnd).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    {planActuel === "gratuit"
                      ? "Plan sans renouvellement"
                      : "Aucune date de renouvellement"}
                  </p>
                )}
              </div>
            </div>

            {userPlan && (
              <div className="mt-6 grid grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Clients
                  </p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {userPlan.limites.clients === -1
                      ? "Illimité"
                      : userPlan.limites.clients}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Factures
                  </p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {userPlan.limites.factures === -1
                      ? "Illimité"
                      : userPlan.limites.factures}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Modèles
                  </p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {userPlan.limites.modeles === -1
                      ? "Illimité"
                      : userPlan.limites.modeles}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Utilisateurs
                  </p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {userPlan.limites.utilisateurs === -1
                      ? "Illimité"
                      : userPlan.limites.utilisateurs}
                  </p>
                </div>
              </div>
            )}
            
          </div>
        </div>
        
        {/* Boutons d'administration et de gestion d'abonnement */}
        <div className="mt-6">
          {/* Message de debug pour support@javachrist.fr */}
          {user?.email && (
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md mb-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Email connecté: {user.email}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Est admin email: {isAdminEmail(user.email) ? "Oui" : "Non"}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Est admin UID: {ADMIN_USERS.includes(user.uid) ? "Oui" : "Non"}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                UID: {user.uid}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Mode: {process.env.NODE_ENV}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Plan actuel: {planActuel}
              </p>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 mt-4">
            {/* Bouton pour définir un administrateur (visible pour les emails autorisés) */}
            {(isAdminEmail(user?.email || "") || ADMIN_USERS.includes(user?.uid || "")) && (
              <button
                onClick={handleSetAdminPlan}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-300"
                disabled={isLoading || isAdmin}
              >
                {isLoading ? "Configuration..." : isAdmin ? "Déjà administrateur" : "Définir comme administrateur"}
              </button>
            )}
            
            {/* Bouton pour forcer le plan Enterprise */}
            {planActuel !== "enterprise" && (
              <button
                onClick={() => handleSubscribe("enterprise")}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center"
              >
                Passer au plan Enterprise
              </button>
            )}
            
            {/* Bouton pour annuler l'abonnement (visible pour tout plan non gratuit) */}
            {planActuel !== "gratuit" && (
              <div>
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-300 flex items-center"
                  disabled={isAdmin}
                >
                  <FiX className="mr-2" /> Annuler mon abonnement
                </button>
                {isAdmin && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Les administrateurs ne peuvent pas annuler leur abonnement
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Dialog de confirmation d'annulation */}
          {confirmCancel && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <p className="text-red-700 dark:text-red-300 mb-3">
                Êtes-vous sûr de vouloir annuler votre abonnement ? Vous perdrez l'accès aux fonctionnalités premium.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? "Annulation..." : "Confirmer l'annulation"}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors duration-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
        Choisir un plan
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-gradient-to-br ${
              plan.id === "gratuit"
                ? "from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-900"
                : plan.id === "premium"
                ? "from-blue-50 to-blue-200 dark:from-blue-900/50 dark:to-blue-800"
                : "from-purple-50 to-purple-200 dark:from-purple-900/50 dark:to-purple-800"
            } rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${
              plan.recommande ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
            }`}
          >
            {plan.recommande && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 rounded-bl-lg font-medium shadow-md">
                RECOMMANDÉ
              </div>
            )}

            <div className="p-8 flex flex-col h-full">
              <div className="mb-8">
                <div
                  className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center bg-${plan.couleur}-100 dark:bg-${plan.couleur}-800`}
                >
                  <FiCreditCard
                    className={`text-${plan.couleur}-500 dark:text-${plan.couleur}-300 text-3xl`}
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  {plan.nom}
                </h3>
                <div className="flex items-baseline">
                  <span
                    className={`text-5xl font-extrabold ${
                      plan.id === "premium"
                        ? "text-blue-600 dark:text-blue-400"
                        : plan.id === "enterprise"
                        ? "text-purple-600 dark:text-purple-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {plan.prix === 0 ? "Gratuit" : `${plan.prix.toFixed(2)} €`}
                  </span>
                  {plan.prix > 0 && (
                    <span className="ml-2 text-lg font-medium text-gray-500 dark:text-gray-400">
                      {plan.frequence}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-6 flex-grow">
                {/* Limites sous forme de grille moderne */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-white/60 dark:bg-gray-800/40 shadow-sm">
                  <div className="text-center p-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Clients
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        plan.limites.clients === -1
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-800 dark:text-white"
                      }`}
                    >
                      {plan.limites.clients === -1
                        ? "Illimité"
                        : plan.limites.clients}
                    </p>
                  </div>
                  <div className="text-center p-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Factures
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        plan.limites.factures === -1
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-800 dark:text-white"
                      }`}
                    >
                      {plan.limites.factures === -1
                        ? "Illimité"
                        : plan.limites.factures}
                    </p>
                  </div>
                  <div className="text-center p-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Modèles
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        plan.limites.modeles === -1
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-800 dark:text-white"
                      }`}
                    >
                      {plan.limites.modeles === -1
                        ? "Illimité"
                        : plan.limites.modeles}
                    </p>
                  </div>
                  <div className="text-center p-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Utilisateurs
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        plan.limites.utilisateurs === -1
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-800 dark:text-white"
                      }`}
                    >
                      {plan.limites.utilisateurs === -1
                        ? "Illimité"
                        : plan.limites.utilisateurs}
                    </p>
                  </div>
                </div>

                {/* Fonctionnalités */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Fonctionnalités incluses
                  </h4>
                  <ul className="space-y-2">
                    {plan.fonctionnalites.map((fonctionnalite, index) => (
                      <li key={index} className="flex items-start">
                        <div
                          className={`flex-shrink-0 w-5 h-5 rounded-full ${
                            plan.id === "premium"
                              ? "bg-blue-100 dark:bg-blue-900/50"
                              : plan.id === "enterprise"
                              ? "bg-purple-100 dark:bg-purple-900/50"
                              : "bg-gray-100 dark:bg-gray-800"
                          } flex items-center justify-center mr-3`}
                        >
                          <FiCheck
                            className={`h-3 w-3 ${
                              plan.id === "premium"
                                ? "text-blue-600 dark:text-blue-400"
                                : plan.id === "enterprise"
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {fonctionnalite}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full px-6 py-3 text-white rounded-full font-medium transition-all duration-300 ${
                    plan.id === planActuel
                      ? plan.id === "premium"
                        ? "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-blue-500/20"
                        : plan.id === "enterprise"
                        ? "bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-purple-500/20"
                        : "bg-gray-600 hover:bg-gray-700 shadow-md hover:shadow-gray-500/20"
                      : plan.id === "premium"
                      ? "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-blue-500/20"
                      : plan.id === "enterprise"
                      ? "bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-purple-500/20"
                      : "bg-gray-600 hover:bg-gray-700 shadow-md hover:shadow-gray-500/20"
                  }`}
                >
                  {plan.id === planActuel
                    ? "Réactiver ce plan"
                    : `S'abonner au plan ${plan.nom}`}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0 md:mr-6">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Besoin d'un plan personnalisé ?
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Si vous avez besoin d'un plan sur mesure pour votre entreprise,
              contactez-nous pour discuter de vos besoins spécifiques.
            </p>
          </div>
          <button
            className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-6 py-3 rounded-full hover:from-indigo-700 hover:to-indigo-900 transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-indigo-500/20 font-medium flex items-center justify-center"
            onClick={() => setShowContactForm(true)}
          >
            <MdOutlineContactSupport className="mr-2" size={20} />
            Contacter le service commercial
          </button>
        </div>
      </div>

      {/* Modal de formulaire de contact */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowContactForm(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <FiX size={24} />
            </button>

            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Contacter notre service commercial
            </h3>

            {contactSuccess ? (
              <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
                {contactSuccess}
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                    {error}
                  </div>
                )}
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Complétez ce formulaire pour recevoir une proposition commerciale personnalisée ou pour discuter de vos besoins spécifiques.
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="text-red-500">*</span> Champ obligatoire
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactFormData.name}
                    onChange={(e) =>
                      setContactFormData({
                        ...contactFormData,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={contactFormData.email}
                    onChange={(e) =>
                      setContactFormData({
                        ...contactFormData,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={contactFormData.phone}
                    onChange={(e) =>
                      setContactFormData({
                        ...contactFormData,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Votre numéro de téléphone"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={contactFormData.message}
                    onChange={(e) =>
                      setContactFormData({
                        ...contactFormData,
                        message: e.target.value,
                      })
                    }
                    placeholder="Décrivez vos besoins spécifiques pour que nous puissions vous proposer une solution adaptée..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                    disabled={isSubmitting}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center justify-center transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer ma demande"
                  )}
                </button>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                  En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe commerciale.
                  <br />Nous ne partagerons jamais vos informations avec des tiers.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Composant principal exporté avec Suspense
export default function AbonnementPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      }
    >
      <AbonnementContent />
    </Suspense>
  );
}
