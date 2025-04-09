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

  if (!user) {
    return <p className="text-center text-gray-600 mt-10">Redirection...</p>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-50 bg-gray-800 text-white min-h-screen p-5">
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
            className="block py-2 px-4 rounded-md bg-gray-700 hover:bg-gray-600"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/factures"
            className="block py-2 px-4 rounded-md hover:bg-gray-600"
          >
            Factures
          </Link>
          <Link
            href="/dashboard/clients"
            className="block py-2 px-4 rounded-md hover:bg-gray-600"
          >
            Clients
          </Link>
          <Link
            href="/dashboard/parametres"
            className="block py-2 px-4 rounded-md hover:bg-gray-600"
          >
            Paramètres
          </Link>
        </nav>
        <button
          onClick={logout}
          className="mt-6 w-full bg-red-500 py-2 rounded-md hover:bg-red-600 transition"
        >
          Déconnexion
        </button>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-6">
        {/* Topbar */}
        <div className="flex justify-between items-center bg-white p-4 shadow-md rounded-md mb-8">
          <h1 className="text-2xl font-semibold flex items-center">
            Bienvenue, {user.email || "Utilisateur"}
            <img src="/favicon.ico" alt="Logo" className="ml-2 h-6 w-6" />
          </h1>
          <DateFilter onDateChange={handleDateChange} className="w-56" />
        </div>

        {/* Statistiques */}
        <div className="mb-8">
          <DashboardStats user={user} dateRange={dateRange} />
        </div>

        {/* Graphique de chiffre d'affaires */}
        <div className="mb-8">
          <RevenueChart dateRange={dateRange} />
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/dashboard/clients"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <FiUsers className="text-green-500 text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Clients</h3>
                  <p className="text-gray-500">Gérer vos clients</p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/factures"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <FiFileText className="text-blue-500 text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Factures</h3>
                  <p className="text-gray-500">Gérer vos factures</p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/parametres"
            className="transform hover:scale-105 transition-transform duration-300"
          >
            <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer h-[100px] flex items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <FiSettings className="text-purple-500 text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Paramètres</h3>
                  <p className="text-gray-500">Configurer votre compte</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
