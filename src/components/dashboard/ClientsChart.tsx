"use client";
import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { DateRange } from "./DateFilter";
import { useTheme } from "next-themes";

// Enregistrement des composants nécessaires pour Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ClientsChartProps {
  dateRange?: DateRange;
}

interface ClientData {
  totalClients: number;
  newClients: number[];
  clientsPerMonth: number[];
  labels: string[];
}

// Définir une interface explicite pour le client
interface Client {
  id: string;
  dateCreation?: any; // Using any for flexibility with different date formats
  userId?: string;
  [key: string]: any; // Pour les autres propriétés
}

const ClientsChart: React.FC<ClientsChartProps> = ({ dateRange }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData>({
    totalClients: 0,
    newClients: [],
    clientsPerMonth: [],
    labels: [],
  });

  useEffect(() => {
    const fetchClientsData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Créer les labels pour les 12 derniers mois
        const months = [
          "Janvier",
          "Février",
          "Mars",
          "Avril",
          "Mai",
          "Juin",
          "Juillet",
          "Août",
          "Septembre",
          "Octobre",
          "Novembre",
          "Décembre",
        ];

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Créer un tableau des 12 derniers mois (commençant par le mois actuel et allant vers le passé)
        const labels = [];
        for (let i = 0; i < 12; i++) {
          const monthIndex = (currentMonth - i + 12) % 12;
          const year = currentYear - Math.floor((i - currentMonth) / 12);
          labels.unshift(`${months[monthIndex]} ${year}`);
        }

        // Récupérer tous les clients de l'utilisateur
        const clientsRef = collection(db, "clients");
        const userClientsQuery = query(
          clientsRef,
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(userClientsQuery);

        // Date de début et de fin filtrées
        const filteredStartDate = dateRange
          ? new Date(dateRange.startDate)
          : new Date(currentYear - 1, currentMonth, 1); // 1 an en arrière
        const filteredEndDate = dateRange
          ? new Date(dateRange.endDate)
          : new Date();

        // Initialiser les tableaux de données
        const newClientsPerMonth = Array(12).fill(0);
        const totalClientsPerMonth = Array(12).fill(0);
        let totalClients = 0;

        // Calculer les nouveaux clients par mois et le total cumulé
        const clients: Client[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filtrer les clients par date si une plage est spécifiée
        const filteredClients = clients.filter((client) => {
          // Si le client n'a pas de date de création, on l'inclut par défaut
          if (!client.dateCreation) return true;

          let clientDate;
          try {
            if (typeof client.dateCreation === "string") {
              clientDate = new Date(client.dateCreation);
            } else if (client.dateCreation instanceof Date) {
              clientDate = client.dateCreation;
            } else if (
              client.dateCreation.toDate &&
              typeof client.dateCreation.toDate === "function"
            ) {
              clientDate = client.dateCreation.toDate();
            } else if (
              client.dateCreation.seconds &&
              typeof client.dateCreation.seconds === "number"
            ) {
              clientDate = new Date(client.dateCreation.seconds * 1000);
            } else {
              return true; // Inclure par défaut si format inconnu
            }

            return (
              clientDate >= filteredStartDate && clientDate <= filteredEndDate
            );
          } catch (error) {
            console.error("Erreur lors de la conversion de date:", error);
            return true; // Inclure par défaut en cas d'erreur
          }
        });

        totalClients = filteredClients.length;

        // Calculer les nouveaux clients par mois
        filteredClients.forEach((client) => {
          if (!client.dateCreation) return;

          let clientDate;
          try {
            if (typeof client.dateCreation === "string") {
              clientDate = new Date(client.dateCreation);
            } else if (client.dateCreation instanceof Date) {
              clientDate = client.dateCreation;
            } else if (
              client.dateCreation.toDate &&
              typeof client.dateCreation.toDate === "function"
            ) {
              clientDate = client.dateCreation.toDate();
            } else if (
              client.dateCreation.seconds &&
              typeof client.dateCreation.seconds === "number"
            ) {
              clientDate = new Date(client.dateCreation.seconds * 1000);
            } else {
              return;
            }

            const clientYear = clientDate.getFullYear();
            const clientMonth = clientDate.getMonth();

            // Calculer l'index dans notre tableau des 12 derniers mois
            for (let i = 0; i < 12; i++) {
              const monthIndex = (currentMonth - i + 12) % 12;
              const year = currentYear - Math.floor((i - currentMonth) / 12);

              if (clientMonth === monthIndex && clientYear === year) {
                newClientsPerMonth[11 - i] += 1;
                break;
              }
            }
          } catch (error) {
            console.error(
              "Erreur lors du traitement de la date client:",
              error
            );
          }
        });

        // Calculer le total cumulé par mois (de gauche à droite)
        let runningTotal = 0;
        for (let i = 0; i < 12; i++) {
          runningTotal += newClientsPerMonth[i];
          totalClientsPerMonth[i] = runningTotal;
        }

        setClientData({
          totalClients,
          newClients: newClientsPerMonth,
          clientsPerMonth: totalClientsPerMonth,
          labels,
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientsData();
  }, [user, dateRange]);

  const barChartData = {
    labels: clientData.labels,
    datasets: [
      {
        label: "Nouveaux clients",
        data: clientData.newClients,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const lineChartData = {
    labels: clientData.labels,
    datasets: [
      {
        label: "Total clients cumulés",
        data: clientData.clientsPerMonth,
        backgroundColor: "rgba(53, 162, 235, 0.5)",
        borderColor: "rgba(53, 162, 235, 1)",
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Nouveaux clients par mois",
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Évolution du nombre total de clients",
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-text-light dark:text-text-dark">
        Évolution des clients
      </h2>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg inline-block">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Total clients
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {clientData.totalClients}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-64">
              <Bar
                data={barChartData}
                options={{
                  ...barOptions,
                  plugins: {
                    ...barOptions.plugins,
                    legend: {
                      ...barOptions.plugins?.legend,
                      labels: {
                        color: theme === "dark" ? "#F9FAFB" : "#1F2937",
                      },
                    },
                    title: {
                      ...barOptions.plugins?.title,
                      color: theme === "dark" ? "#F9FAFB" : "#1F2937",
                    },
                  },
                  scales: {
                    ...barOptions.scales,
                    x: {
                      ticks: {
                        color: theme === "dark" ? "#F9FAFB" : "#1F2937",
                      },
                      grid: {
                        color:
                          theme === "dark"
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                      },
                    },
                    y: {
                      ...barOptions.scales?.y,
                      ticks: {
                        ...barOptions.scales?.y?.ticks,
                        color: theme === "dark" ? "#F9FAFB" : "#1F2937",
                      },
                      grid: {
                        color:
                          theme === "dark"
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                      },
                    },
                  },
                }}
              />
            </div>
            <div className="h-64">
              <Line
                data={lineChartData}
                options={{
                  ...lineOptions,
                  plugins: {
                    ...lineOptions.plugins,
                    legend: {
                      ...lineOptions.plugins?.legend,
                      labels: {
                        color: theme === "dark" ? "#F9FAFB" : "#1F2937",
                      },
                    },
                    title: {
                      ...lineOptions.plugins?.title,
                      color: theme === "dark" ? "#F9FAFB" : "#1F2937",
                    },
                  },
                  scales: {
                    ...lineOptions.scales,
                    x: {
                      ticks: {
                        color: theme === "dark" ? "#F9FAFB" : "#1F2937",
                      },
                      grid: {
                        color:
                          theme === "dark"
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                      },
                    },
                    y: {
                      ...lineOptions.scales?.y,
                      ticks: {
                        ...lineOptions.scales?.y?.ticks,
                        color: theme === "dark" ? "#F9FAFB" : "#1F2937",
                      },
                      grid: {
                        color:
                          theme === "dark"
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientsChart;
