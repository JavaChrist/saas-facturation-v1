"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { useTheme } from "next-themes";
import { DateRange } from "./DateFilter";
import { FiClock, FiCheckCircle, FiXCircle, FiSend } from "react-icons/fi";
import { Facture } from "@/types/facture";

interface InvoiceStatusChartProps {
  dateRange: DateRange;
}

export default function InvoiceStatusChart({
  dateRange,
}: InvoiceStatusChartProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    paid: 0,
    pending: 0,
    sent: 0,
    overdue: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const facturesQuery = query(
          collection(db, "factures"),
          where("userId", "==", user.uid)
        );

        const querySnapshot = await getDocs(facturesQuery);
        const factures = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Facture[];

        // Filtrer par plage de dates si nécessaire
        // (Code simplifié pour l'exemple)

        // Compter par statut
        let paid = 0;
        let pending = 0;
        let sent = 0;
        let overdue = 0;

        factures.forEach((facture) => {
          switch (facture.statut) {
            case "Payée":
              paid++;
              break;
            case "En attente":
              pending++;
              break;
            case "Envoyée":
              sent++;
              break;
            case "À relancer":
              overdue++;
              break;
          }
        });

        setStats({
          paid,
          pending,
          sent,
          overdue,
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dateRange]);

  return (
    <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-text-light dark:text-text-dark">
        Statut des factures
      </h2>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-500 dark:text-green-400 text-sm font-medium">
                  Payées
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {stats.paid}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
                <FiCheckCircle className="text-green-500 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-500 dark:text-yellow-400 text-sm font-medium">
                  En attente
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {stats.pending}
                </p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-800 p-2 rounded-full">
                <FiClock className="text-yellow-500 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-500 dark:text-blue-400 text-sm font-medium">
                  Envoyées
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {stats.sent}
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full">
                <FiSend className="text-blue-500 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-500 dark:text-red-400 text-sm font-medium">
                  À relancer
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {stats.overdue}
                </p>
              </div>
              <div className="bg-red-100 dark:bg-red-800 p-2 rounded-full">
                <FiXCircle className="text-red-500 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
