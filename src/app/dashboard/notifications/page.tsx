"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiTrash2, FiCheck, FiRefreshCw } from "react-icons/fi";
import { Notification } from "@/types/notification";
import {
  getAllNotifications,
  marquerCommeLue,
  marquerToutesCommeLues,
  supprimerNotification,
  verifierFacturesEnRetard,
} from "@/services/notificationService";
import Link from "next/link";

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const unreadCount = notifications.filter(n => !n.lue).length;

  // Fonction pour rafraîchir manuellement les notifications
  const refreshNotifications = async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      console.log("Rafraîchissement manuel des notifications pour l'utilisateur:", user.uid);

      // Vérifier d'abord les factures en retard pour générer les notifications nécessaires
      await verifierFacturesEnRetard(user.uid);

      // Puis récupérer toutes les notifications
      const notifs = await getAllNotifications(user.uid);
      console.log("Notifications récupérées après rafraîchissement:", notifs.map(n => ({
        id: n.id,
        factureId: n.factureId,
        factureNumero: n.factureNumero,
        type: n.type
      })));
      setNotifications(notifs);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des notifications:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchNotifications = async () => {
      try {
        setLoading(true);

        // Vérifier d'abord les factures en retard pour générer les notifications nécessaires
        await verifierFacturesEnRetard(user.uid);

        // Puis récupérer toutes les notifications
        const notifs = await getAllNotifications(user.uid);
        setNotifications(notifs);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des notifications:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user, router]);

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await marquerCommeLue(notification.id);
      setNotifications(
        notifications.map((n) =>
          n.id === notification.id ? { ...n, lue: true } : n
        )
      );
    } catch (error) {
      console.error(
        "Erreur lors du marquage de la notification comme lue:",
        error
      );
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await supprimerNotification(notificationId);
      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification:", error);
    }
  };

  // Fonction pour formater la date
  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Grouper les notifications par date
  const groupNotificationsByDate = () => {
    const grouped: { [key: string]: Notification[] } = {};

    notifications.forEach((notification) => {
      const date =
        notification.dateCreation instanceof Date
          ? notification.dateCreation
          : new Date(notification.dateCreation);

      const dateKey = date.toISOString().split("T")[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(notification);
    });

    // Trier par date décroissante
    return Object.entries(grouped)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([date, notifs]) => ({
        date: new Date(date),
        notifications: notifs,
      }));
  };

  const groupedNotifications = groupNotificationsByDate();

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark min-h-screen flex flex-col items-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-3 sm:mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-gray-800 dark:text-white">🔔 Notifications</h1>
            <span className="inline-flex items-center justify-center text-xs font-medium rounded-full px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:flex sm:space-x-3 gap-2 mt-3">
            <button
              onClick={refreshNotifications}
              disabled={refreshing || loading}
              className={`${refreshing || loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                } text-white py-2 px-4 rounded-md flex items-center justify-center`}
            >
              <FiRefreshCw size={18} className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </button>
            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  if (!user) return;
                  try {
                    await marquerToutesCommeLues(user.uid);
                    await refreshNotifications();
                  } catch (e) {
                    console.error("Erreur marquer toutes comme lues:", e);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
              >
                Tout lu
              </button>
            )}
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center justify-center"
            >
              <FiArrowLeft size={18} className="mr-2" /> Retour
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 dark:text-gray-300 text-lg">
              Aucune notification disponible
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedNotifications.map((group) => (
              <div
                key={group.date.toISOString()}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
              >
                <div className="bg-gray-100 dark:bg-gray-700 px-6 py-3 border-b dark:border-gray-600">
                  <h2 className="font-medium text-gray-800 dark:text-white">
                    {group.date.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                </div>

                <div className="divide-y dark:divide-gray-700">
                  {group.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-6 py-4 flex justify-between items-start hover:bg-gray-50 dark:hover:bg-gray-700 ${!notification.lue ? "border-l-4 border-l-blue-500" : ""
                        }`}
                    >
                      <Link
                        href={`/dashboard/factures?id=${notification.factureId}`}
                        className="flex-1"
                      >
                        <div
                          className={`${notification.lue ? "opacity-70" : ""}`}
                        >
                          <div className="flex items-center">
                            <span
                              className={`w-3 h-3 rounded-full mr-2 ${notification.type === "paiement_retard"
                                  ? "bg-red-500"
                                  : notification.type === "paiement_proche"
                                    ? "bg-orange-400"
                                    : "bg-blue-500"
                                }`}
                            />
                            <h3 className="font-medium text-gray-800 dark:text-white">
                              {notification.clientNom} -{" "}
                              {notification.factureNumero}
                            </h3>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatDate(notification.dateCreation)}
                          </p>
                        </div>
                      </Link>

                      <div className="flex space-x-2 ml-4">
                        {!notification.lue && (
                          <button
                            onClick={() => handleMarkAsRead(notification)}
                            className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded"
                            title="Marquer comme lu"
                          >
                            <FiCheck size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"
                          title="Supprimer"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
