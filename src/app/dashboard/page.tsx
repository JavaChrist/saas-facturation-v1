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
  FiMail,
  FiUser,
  FiGrid,
  FiMenu,
  FiX,
  FiTrendingUp,
  FiActivity,
  FiPieChart,
  FiPlus,
  FiSliders,
} from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { DateRange } from "@/components/dashboard/DateFilter";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { getUserPlan } from "@/services/subscriptionService";
import {
  getDashboardPreferences,
  setDashboardPreferences,
  type DashboardPreferences,
} from "@/lib/dashboardPreferences";

// Imports dynamiques pour réduire le JS initial et éviter le CLS avec des placeholders
const DashboardStats = dynamic(() => import("@/components/dashboard/DashboardStats"), {
  ssr: false,
  loading: () => (
    <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
  ),
});

const DateFilter = dynamic(() => import("@/components/dashboard/DateFilter"), {
  ssr: false,
  loading: () => (
    <div className="hidden sm:block w-32 md:w-56 h-10 bg-gray-100 dark:bg-gray-800 rounded-md" />
  ),
});

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1),
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    showStats: true,
    showQuickActions: true,
  });
  const [showPrefsPanel, setShowPrefsPanel] = useState(false);

  // Charger les préférences au montage
  useEffect(() => {
    setPreferences(getDashboardPreferences());
  }, []);

  const updatePreference = (key: keyof DashboardPreferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setDashboardPreferences(next);
  };

  // Redirection vers /login si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  // Récupération du plan utilisateur
  useEffect(() => {
    if (!user) return;

    const fetchUserPlan = async () => {
      try {
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
      } catch (error) {
        console.error("Erreur récupération plan:", error);
      }
    };

    fetchUserPlan();
  }, [user]);

  const handleDateChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  const handleLogout = async () => {
    try {
      sessionStorage.setItem("just_logged_out", "true");
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    }
  };

  if (!user) {
    return <p className="text-center text-gray-600 mt-10">Redirection...</p>;
  }

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark relative">
      {/* Overlay pour mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative
        inset-y-0 left-0
        w-64
        bg-gray-800 dark:bg-gray-900 text-white
        min-h-screen p-5
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        z-50 lg:z-0
      `}>
        {/* Bouton fermer sur mobile */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 lg:hidden"
        >
          <FiX className="text-white" size={24} />
        </button>

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
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiGrid className="mr-3 text-white" size={18} />
            Dashboard
          </Link>
          <Link
            href="/dashboard/clients"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiUsers className="mr-3 text-white" size={18} />
            Clients
          </Link>
          <Link
            href="/dashboard/factures"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiFileText className="mr-3 text-white" size={18} />
            Factures
          </Link>
          <Link
            href="/dashboard/chiffre-affaires"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiTrendingUp className="mr-3 text-white" size={18} />
            Chiffre
          </Link>
          <Link
            href="/dashboard/evolution-clients"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiActivity className="mr-3 text-white" size={18} />
            Évolution clients
          </Link>
          <Link
            href="/dashboard/statut-factures"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiPieChart className="mr-3 text-white" size={18} />
            Statut factures
          </Link>
          <Link
            href="/dashboard/notifications"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiMail className="mr-3 text-white" size={18} />
            Notifications
          </Link>
          <Link
            href="/dashboard/utilisateurs"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiUserPlus className="mr-3 text-white" size={18} />
            Utilisateurs
          </Link>
          <Link
            href="/dashboard/profil"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiUser className="mr-3 text-white" size={18} />
            Mon Profil
          </Link>
          <Link
            href="/dashboard/parametres"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiSettings className="mr-3 text-white" size={18} />
            Paramètres
          </Link>
          <Link
            href="/dashboard/abonnement"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiCreditCard className="mr-3 text-white" size={18} />
            Abonnement
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
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Topbar */}
        <div className="flex justify-between items-center mb-6 min-h-[56px]">
          <div className="flex items-center gap-4">
            {/* Bouton hamburger pour mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FiMenu className="text-gray-900 dark:text-white" size={24} />
            </button>
            <div className="min-h-[40px] flex flex-col justify-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                Tableau de bord
              </h1>
              <p className="text-gray-600 dark:text-gray-400 leading-snug">
                Bienvenue, {user?.displayName || user?.email || "Utilisateur"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="hidden sm:block">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Plan actif
              </div>
              <div className="flex items-center">
                {userPlanInfo.planIcon}
                <span
                  className={`ml-1 font-medium text-${userPlanInfo.planColor}-600 dark:text-${userPlanInfo.planColor}-400`}
                >
                  {userPlanInfo.planName}
                </span>
              </div>
            </div>
            <DateFilter
              onDateChange={(range: DateRange) => setDateRange(range)}
              className="hidden sm:block w-32 md:w-56"
            />
            <div className="relative">
              <button
                onClick={() => setShowPrefsPanel(!showPrefsPanel)}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Personnaliser le tableau de bord"
              >
                <FiSliders className="text-gray-600 dark:text-gray-300" size={20} />
              </button>
              {showPrefsPanel && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowPrefsPanel(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-20">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Widgets affichés
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={preferences.showStats}
                        onChange={(e) =>
                          updatePreference("showStats", e.target.checked)
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Statistiques
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.showQuickActions}
                        onChange={(e) =>
                          updatePreference("showQuickActions", e.target.checked)
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Actions rapides
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>
            <NotificationBell />
          </div>
        </div>

        {preferences.showStats && (
        <div className="mb-8 min-h-[7rem]">
          <DashboardStats user={user} dateRange={dateRange} />
        </div>
        )}

        {preferences.showQuickActions && (
        <div className="mb-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard/factures?action=new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition shadow-md"
          >
            <FiPlus size={20} />
            Nouvelle facture
          </Link>
          <Link
            href="/dashboard/clients?action=new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition shadow-md"
          >
            <FiPlus size={20} />
            Nouveau client
          </Link>
        </div>
        )}

        {/* Navigation cards */}
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
            href="/dashboard/chiffre-affaires"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-cyan-100 dark:bg-cyan-900 p-3 rounded-full">
                  <FiTrendingUp className="text-cyan-500 dark:text-cyan-400 text-xl" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                    Chiffre
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Résultats et évolution du CA
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/evolution-clients"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-emerald-100 dark:bg-emerald-900 p-3 rounded-full">
                  <FiActivity className="text-emerald-500 dark:text-emerald-400 text-xl" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                    Évolution clients
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Graphiques et statistiques clients
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/statut-factures"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-amber-100 dark:bg-amber-900 p-3 rounded-full">
                  <FiPieChart className="text-amber-500 dark:text-amber-400 text-xl" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                    Statut factures
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Répartition par statut
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/notifications"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full">
                  <FiMail className="text-indigo-500 dark:text-indigo-400 text-xl" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                    Notifications
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Centre de notifications
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
            href="/dashboard/profil"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                  <FiUser className="text-orange-500 dark:text-orange-400 text-xl" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                    Mon Profil
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Signature & informations
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

          <Link
            href="/dashboard/abonnement"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-pink-100 dark:bg-pink-900 p-3 rounded-full">
                  <FiCreditCard className="text-pink-500 dark:text-pink-400 text-xl" />
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
        </div>
      </main>
    </div>
  );
}
