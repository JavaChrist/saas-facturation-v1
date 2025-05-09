"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import {
  FiUsers,
  FiFileText,
  FiSettings,
  FiCreditCard,
  FiStar,
  FiAward,
  FiShield,
  FiUserPlus,
} from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import RevenueChart from "@/components/dashboard/RevenueChart";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DateFilter, { DateRange } from "@/components/dashboard/DateFilter";
import ClientsChart from "@/components/dashboard/ClientsChart";
import InvoiceStatusChart from "@/components/dashboard/InvoiceStatusChart";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { getUserPlan } from "@/services/subscriptionService";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1), // 1er janvier de l'année en cours
    endDate: new Date(),
    label: "Cette année",
  });
  const [userPlanInfo, setUserPlanInfo] = useState<{
    planId: string;
    planName: string;
    planColor: string;
    planIcon: React.ReactNode;
  }>({
    planId: "gratuit",
    planName: "Gratuit",
    planColor: "gray",
    planIcon: <FiStar className="text-gray-400" />,
  });

  // Redirection vers /login si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  // Récupérer le plan de l'utilisateur
  useEffect(() => {
    if (user) {
      const fetchUserPlan = async () => {
        try {
          console.log(
            "[DEBUG-DASHBOARD] Début de fetchUserPlan pour",
            user.uid
          );

          // Vérifier si nous sommes en mode développement
          if (
            process.env.NODE_ENV === "development" &&
            typeof window !== "undefined"
          ) {
            // Vérifier si un changement de plan vient d'avoir lieu
            const planJustChanged = sessionStorage.getItem("planJustChanged");
            if (planJustChanged === "true") {
              console.log(
                "[DEBUG-DASHBOARD] Détection d'un changement de plan récent"
              );
              const planId = sessionStorage.getItem("planId");
              console.log(
                "[DEBUG-DASHBOARD] Plan ID récemment changé:",
                planId
              );

              // Réinitialiser le drapeau pour ne pas entrer dans cette condition à chaque fois
              sessionStorage.removeItem("planJustChanged");

              if (planId) {
                // Construction du plan correspondant
                let planName = "Gratuit";
                let planColor = "gray";
                let planIcon = <FiStar className="text-gray-400" />;

                if (planId === "premium") {
                  planName = "Premium";
                  planColor = "blue";
                  planIcon = <FiAward className="text-blue-400" />;
                } else if (planId === "enterprise" || planId === "entreprise") {
                  planName = "Entreprise";
                  planColor = "purple";
                  planIcon = <FiShield className="text-purple-400" />;
                }

                // Application immédiate du plan
                setUserPlanInfo({
                  planId: planId,
                  planName,
                  planColor,
                  planIcon,
                });

                console.log(
                  "[DEBUG-DASHBOARD] Plan appliqué suite au changement:",
                  {
                    planId,
                    planName,
                    planColor,
                  }
                );

                return;
              }
            }

            // Vérifier en priorité le dernier plan utilisé (marqueur fiable introduit récemment)
            const lastUsedPlanId =
              localStorage.getItem("lastUsedPlanId") ||
              sessionStorage.getItem("lastUsedPlanId");

            if (lastUsedPlanId) {
              console.log(
                "[DEBUG-DASHBOARD] Dernier plan utilisé détecté:",
                lastUsedPlanId
              );

              // Construction d'un plan correspondant à l'identifiant directement
              let planName = "Gratuit";
              let planColor = "gray";
              let planIcon = <FiStar className="text-gray-400" />;

              if (lastUsedPlanId === "premium") {
                console.log(
                  "[DEBUG-DASHBOARD] Utilisation forcée du plan Premium"
                );
                planName = "Premium";
                planColor = "blue";
                planIcon = <FiAward className="text-blue-400" />;
              } else if (lastUsedPlanId === "enterprise" || lastUsedPlanId === "entreprise") {
                console.log(
                  "[DEBUG-DASHBOARD] Utilisation forcée du plan Entreprise"
                );
                planName = "Entreprise";
                planColor = "purple";
                planIcon = <FiShield className="text-purple-400" />;
              }

              // Application immédiate du plan
              setUserPlanInfo({
                planId: lastUsedPlanId,
                planName,
                planColor,
                planIcon,
              });

              console.log("[DEBUG-DASHBOARD] Plan appliqué directement:", {
                planId: lastUsedPlanId,
                planName,
                planColor,
              });

              // Ne pas continuer le traitement
              return;
            }
          }

          // Si aucun plan n'a été trouvé dans le localStorage, utiliser le service normal
          console.log(
            "[DEBUG-DASHBOARD] Aucun plan trouvé dans localStorage, utilisation du service standard"
          );
          const plan = await getUserPlan(user.uid);

          let planName = "Gratuit";
          let planColor = "gray";
          let planIcon = <FiStar className="text-gray-400" />;

          if (plan.planId === "premium") {
            planName = "Premium";
            planColor = "blue";
            planIcon = <FiAward className="text-blue-400" />;
          } else if (plan.planId === "enterprise" || plan.planId === "entreprise") {
            planName = "Entreprise";
            planColor = "purple";
            planIcon = <FiShield className="text-purple-400" />;
          }

          setUserPlanInfo({
            planId: plan.planId,
            planName,
            planColor,
            planIcon,
          });

          console.log("[DEBUG-DASHBOARD] Plan récupéré via le service:", plan);
        } catch (error) {
          console.error(
            "[DEBUG-DASHBOARD] Erreur lors de la récupération du plan:",
            error
          );
        }
      };

      fetchUserPlan();
    }
  }, [user]);

  // Optimiser la vérification forcée du plan pour qu'elle n'ait lieu qu'au montage initial
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      console.log(
        "[DEBUG-DASHBOARD] Vérification forcée du plan au chargement"
      );

      // Ajouter des logs pour le débogage en production
      console.log('[DEBUG-PRODUCTION] ---- DÉBUT INFO PLANS ----');
      console.log('[DEBUG-PRODUCTION] localStorage items:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const value = localStorage.getItem(key);
            console.log(`[DEBUG-PRODUCTION] ${key}: ${value}`);
          } catch (e) {
            console.log(`[DEBUG-PRODUCTION] ${key}: <erreur de lecture>`);
          }
        }
      }
      
      console.log('[DEBUG-PRODUCTION] sessionStorage items:');
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          try {
            const value = sessionStorage.getItem(key);
            console.log(`[DEBUG-PRODUCTION] ${key}: ${value}`);
          } catch (e) {
            console.log(`[DEBUG-PRODUCTION] ${key}: <erreur de lecture>`);
          }
        }
      }
      
      console.log('[DEBUG-PRODUCTION] Plan actuel: ', userPlanInfo);
      console.log('[DEBUG-PRODUCTION] ---- FIN INFO PLANS ----');

      // Vérifier si l'URL contient un paramètre forceUpdate
      const hasForceUpdate = window.location.href.includes("forceUpdate");

      if (hasForceUpdate) {
        console.log(
          "[DEBUG-DASHBOARD] Paramètre forceUpdate détecté, nettoyage du paramètre"
        );
        // Nettoyer l'URL des paramètres temporaires
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      // Vérifier le plan dans les différents stockages
      const storageKeys = ["lastUsedPlanId", "currentPlanId", "planId"];
      let detectedPlanId = null;

      // Chercher dans les différentes clés possibles
      for (const key of storageKeys) {
        const value = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (value) {
          detectedPlanId = value;
          console.log(`[DEBUG-DASHBOARD] Plan détecté via ${key}:`, value);
          break;
        }
      }

      if (detectedPlanId && detectedPlanId !== userPlanInfo.planId) {
        // Mettre à jour immédiatement le plan affiché
        let planName = "Gratuit";
        let planColor = "gray";
        let planIcon = <FiStar className="text-gray-400" />;

        if (detectedPlanId === "premium") {
          planName = "Premium";
          planColor = "blue";
          planIcon = <FiAward className="text-blue-400" />;
        } else if (detectedPlanId === "enterprise" || detectedPlanId === "entreprise") {
          planName = "Entreprise";
          planColor = "purple";
          planIcon = <FiShield className="text-purple-400" />;
        }

        setUserPlanInfo({
          planId: detectedPlanId,
          planName,
          planColor,
          planIcon,
        });

        console.log(
          "[DEBUG-DASHBOARD] Plan mis à jour lors du chargement forcé:",
          {
            planId: detectedPlanId,
            planName,
            planColor,
          }
        );
      }
    }
  }, [user]);

  const handleDateChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  // Fonction de déconnexion améliorée
  const handleLogout = async () => {
    try {
      // Marquer qu'une déconnexion vient de se produire
      sessionStorage.setItem("just_logged_out", "true");

      // Exécuter la déconnexion
      await logout();

      // Rediriger vers la page de connexion
      router.push("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  if (!user) {
    return <p className="text-center text-gray-600 mt-10">Redirection...</p>;
  }

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      {/* Sidebar */}
      <aside className="w-50 bg-gray-800 dark:bg-gray-900 text-white min-h-screen p-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative w-12 h-12 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Logo"
              fill
              sizes="(max-width: 48px) 100vw, 48px"
              className="object-contain rounded-full"
              priority
            />
          </div>
          <h2 className="text-xl font-bold">Facturation SaaS</h2>
        </div>
        <nav className="space-y-2">
          <Link
            href="/dashboard"
            className="block py-2 px-4 rounded-md bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/factures"
            className="block py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            Factures
          </Link>
          <Link
            href="/dashboard/clients"
            className="block py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            Clients
          </Link>
          <Link
            href="/dashboard/abonnement"
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiCreditCard className="mr-2" /> Abonnement
          </Link>
          <Link
            href="/dashboard/utilisateurs"
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiUserPlus className="mr-2" /> Utilisateurs
          </Link>
          <Link
            href="/dashboard/parametres"
            className="block py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            Paramètres
          </Link>
          <Link
            href="/dashboard/notifications"
            className="block py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            Notifications
          </Link>
        </nav>

        <div className="mt-6 space-y-3">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 py-2 rounded-md hover:bg-red-600 transition"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Topbar */}
        <div className="flex justify-between items-center bg-card-light dark:bg-card-dark p-4 shadow-md rounded-md mb-8">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-text-light dark:text-text-dark flex items-center">
              Bienvenue, {user.email || "Utilisateur"}
              <Image
                src="/favicon.ico"
                alt="Logo"
                width={48}
                height={48}
                className="ml-2"
                style={{ height: "auto" }}
                priority
              />
            </h1>
            <Link href="/dashboard/abonnement" className="ml-4">
              <div
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm border font-medium transition-all duration-300 shadow-sm hover:shadow ${
                  userPlanInfo.planId === "premium"
                    ? "border-blue-300 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800/70"
                    : userPlanInfo.planId === "enterprise"
                    ? "border-purple-300 bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800/70"
                    : "border-gray-300 bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800/70"
                }`}
              >
                <span className="flex items-center">
                  {userPlanInfo.planIcon}
                  <span className="ml-1.5">Plan {userPlanInfo.planName}</span>
                </span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <DateFilter onDateChange={handleDateChange} className="w-56" />
          </div>
        </div>

        {/* Statistiques */}
        <div className="mb-8">
          <DashboardStats user={user} dateRange={dateRange} />
        </div>

        {/* Graphiques de statut des factures */}
        <div className="mb-8">
          <InvoiceStatusChart dateRange={dateRange} />
        </div>

        {/* Graphique de chiffre d'affaires */}
        <div className="mb-8">
          <RevenueChart dateRange={dateRange} />
        </div>

        {/* Graphique d'évolution des clients */}
        <div className="mb-8">
          <ClientsChart dateRange={dateRange} />
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/dashboard/clients"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                  <FiUsers className="text-green-500 dark:text-green-400 text-xl" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                    Clients
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Gérer vos clients
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/factures"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <FiFileText className="text-blue-500 dark:text-blue-400 text-xl" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                    Factures
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Gérer vos factures
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/abonnement"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
                  <FiCreditCard className="text-purple-500 dark:text-purple-400 text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                    Abonnement
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Gérer votre plan SaaS
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/utilisateurs"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-teal-100 dark:bg-teal-900 p-3 rounded-full">
                  <FiUserPlus className="text-teal-500 dark:text-teal-400 text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                    Utilisateurs
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Gérer les accès
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/parametres"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
                  <FiSettings className="text-purple-500 dark:text-purple-400 text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                    Paramètres
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Configurer votre compte
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
