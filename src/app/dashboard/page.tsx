"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { FiUsers, FiFileText, FiSettings } from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import RevenueChart from "@/components/dashboard/RevenueChart";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DateFilter, { DateRange } from "@/components/dashboard/DateFilter";
import ClientsChart from "@/components/dashboard/ClientsChart";
import InvoiceStatusChart from "@/components/dashboard/InvoiceStatusChart";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1), // 1er janvier de l'année en cours
    endDate: new Date(),
    label: "Cette année",
  });

  // Redirection vers /login si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

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
          <h1 className="text-2xl font-semibold flex items-center text-text-light dark:text-text-dark">
            Bienvenue, {user.email || "Utilisateur"}
            <Image
              src="/favicon.ico"
              alt="Logo"
              width={24}
              height={24}
              style={{ width: "auto", height: "auto" }}
              className="ml-2"
              priority
            />
          </h1>
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
                <div>
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
                <div>
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
