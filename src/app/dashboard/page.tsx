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
  FiGrid
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
            className="flex items-center py-2 px-4 rounded-md bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiGrid className="mr-3 text-white" size={18} />
            Dashboard
          </Link>
          <Link
            href="/dashboard/clients"
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiUsers className="mr-3 text-white" size={18} />
            Clients
          </Link>
          <Link
            href="/dashboard/factures"
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiFileText className="mr-3 text-white" size={18} />
            Factures
          </Link>
          <Link
            href="/dashboard/notifications"
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiMail className="mr-3 text-white" size={18} />
            Notifications
          </Link>
          <Link
            href="/dashboard/utilisateurs"
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiUserPlus className="mr-3 text-white" size={18} />
            Utilisateurs
          </Link>
          <Link
            href="/dashboard/profil"
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiUser className="mr-3 text-white" size={18} />
            Mon Profil
          </Link>
          <Link
            href="/dashboard/parametres"
            className="flex items-center py-2 px-4 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            <FiSettings className="mr-3 text-white" size={18} />
            Paramètres
          </Link>
          <Link
            href="/dashboard/abonnement"
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
      <main className="flex-1 p-6 overflow-auto">
        {/* Topbar */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tableau de bord
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Bienvenue, {user?.displayName || user?.email || "Utilisateur"}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div>
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
              className="w-56"
            />
            <NotificationBell />
          </div>
        </div>

        <div className="mb-8">
          <DashboardStats user={user} dateRange={dateRange} />
        </div>

        <div className="mb-8">
          <InvoiceStatusChart dateRange={dateRange} />
        </div>

        <div className="mb-8">
          <RevenueChart dateRange={dateRange} />
        </div>

        <div className="mb-8">
          <ClientsChart dateRange={dateRange} />
        </div>

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
