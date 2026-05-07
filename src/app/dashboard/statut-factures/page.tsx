"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiPieChart } from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import dynamic from "next/dynamic";
import type { DateRange } from "@/components/dashboard/DateFilter";

const InvoiceStatusChart = dynamic(
  () => import("@/components/dashboard/InvoiceStatusChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 md:h-80 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
    ),
  }
);

const DateFilter = dynamic(() => import("@/components/dashboard/DateFilter"), {
  ssr: false,
  loading: () => (
    <div className="hidden sm:block w-32 md:w-56 h-10 bg-gray-100 dark:bg-gray-800 rounded-md" />
  ),
});

export default function StatutFacturesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date(),
    label: "Cette année",
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) {
    return (
      <p className="text-center text-gray-600 dark:text-gray-400 mt-10">
        Redirection...
      </p>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-label="Retour au tableau de bord"
          >
            <FiArrowLeft className="text-gray-700 dark:text-gray-300" size={24} />
          </button>
          <div className="flex items-center gap-2">
            <FiPieChart className="text-amber-500 dark:text-amber-400" size={28} />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Statut des factures
            </h1>
          </div>
        </div>
        <div className="hidden sm:block">
          <DateFilter
            onDateChange={(range: DateRange) => setDateRange(range)}
            className="w-32 md:w-56"
          />
        </div>
      </div>

      <div className="mb-4 sm:hidden">
        <DateFilter
          onDateChange={(range: DateRange) => setDateRange(range)}
          className="w-full"
        />
      </div>

      <div className="min-h-[20rem]">
        <InvoiceStatusChart dateRange={dateRange} />
      </div>
    </div>
  );
}
