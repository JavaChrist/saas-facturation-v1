import React, { useState, useEffect, useRef } from "react";
import { FiBell, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import { Notification } from "@/types/notification";
import {
  getNotificationsNonLues,
  marquerCommeLue,
  marquerToutesCommeLues,
  verifierFacturesEnRetard,
} from "@/services/notificationService";
import Link from "next/link";

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Récupérer les notifications non lues et vérifier les factures en retard
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("NotificationBell: Vérification des factures en retard");

        // Vérifier les factures en retard
        await verifierFacturesEnRetard(user.uid);

        console.log(
          "NotificationBell: Récupération des notifications non lues"
        );
        // Récupérer les notifications non lues
        const notifs = await getNotificationsNonLues(user.uid);
        console.log(
          `NotificationBell: ${notifs.length} notifications récupérées`
        );

        setNotifications(notifs);
      } catch (error) {
        console.error(
          "NotificationBell: Erreur lors de la récupération des notifications:",
          error
        );
        setError(
          "Impossible d'accéder aux notifications. Vérifiez les permissions Firestore."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Rafraîchir les notifications toutes les 5 minutes
    const intervalId = setInterval(() => {
      console.log(
        "NotificationBell: Rafraîchissement automatique des notifications"
      );
      fetchNotifications();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      console.log(
        `NotificationBell: Marquer notification ${notification.id} comme lue`
      );
      // Marquer la notification comme lue
      await marquerCommeLue(notification.id);

      // Mettre à jour l'état local
      setNotifications(notifications.filter((n) => n.id !== notification.id));
    } catch (error) {
      console.error(
        "NotificationBell: Erreur lors du marquage de la notification comme lue:",
        error
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      console.log(
        "NotificationBell: Marquer toutes les notifications comme lues"
      );
      await marquerToutesCommeLues(user.uid);
      setNotifications([]);
      setIsOpen(false);
    } catch (error) {
      console.error(
        "NotificationBell: Erreur lors du marquage de toutes les notifications comme lues:",
        error
      );
    }
  };

  // Fonction de débogage pour forcer la vérification des factures en retard
  const forceCheckOverdueInvoices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      console.log(
        "NotificationBell: Vérification forcée des factures en retard"
      );

      await verifierFacturesEnRetard(user.uid);

      console.log(
        "NotificationBell: Récupération des notifications après vérification forcée"
      );
      const notifs = await getNotificationsNonLues(user.uid);
      setNotifications(notifs);

      console.log(
        `NotificationBell: ${notifs.length} notifications après vérification forcée`
      );
    } catch (error) {
      console.error(
        "NotificationBell: Erreur lors de la vérification forcée:",
        error
      );
      setError(
        "Impossible d'accéder aux notifications. Vérifiez les permissions Firestore."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="cursor-pointer p-2 rounded-full hover:bg-gray-200 relative"
        onClick={toggleDropdown}
      >
        {loading ? (
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700"></div>
        ) : error ? (
          <div className="relative group">
            <FiAlertTriangle size={24} className="text-amber-500" />
            <div className="absolute right-0 top-0 w-2 h-2 bg-amber-500 rounded-full"></div>
            <div className="hidden group-hover:block absolute right-0 top-8 w-64 p-2 bg-white shadow-lg rounded-md text-xs z-20">
              <div className="text-amber-800 font-semibold mb-1">
                Configuration requise
              </div>
              <div className="text-gray-600">
                Consultez le fichier README-NOTIFICATIONS.md pour activer les
                notifications.
              </div>
            </div>
          </div>
        ) : (
          <>
            <FiBell size={24} className="text-gray-700" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 inline-block w-5 h-5 text-xs text-center text-white bg-red-500 rounded-full">
                {notifications.length > 9 ? "9+" : notifications.length}
              </span>
            )}
          </>
        )}
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-10">
          <div className="flex justify-between items-center px-4 py-2 border-b">
            <h3 className="font-semibold text-gray-700">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Tout marquer comme lu
                </button>
              )}
              <button
                onClick={forceCheckOverdueInvoices}
                className="text-xs text-gray-500 hover:underline flex items-center gap-1"
                title="Vérifier les factures en retard"
              >
                <FiRefreshCw
                  size={12}
                  className={loading ? "animate-spin" : ""}
                />
                Actualiser
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-8 h-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700"></div>
              </div>
            ) : error ? (
              <div className="py-4 px-4 text-center">
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
                  <div className="flex items-center">
                    <FiAlertTriangle
                      className="text-amber-500 mr-2"
                      size={18}
                    />
                    <p className="text-sm text-amber-700">
                      Configuration requise
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Les notifications nécessitent une configuration des règles
                    Firestore.
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Consultez le fichier{" "}
                    <span className="font-mono bg-amber-100 px-1">
                      README-NOTIFICATIONS.md
                    </span>{" "}
                    pour les instructions.
                  </p>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-4 px-4 text-center text-gray-500">
                Aucune nouvelle notification
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  href={`/dashboard/factures?id=${notification.factureId}`}
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer ${
                      notification.type === "paiement_retard"
                        ? "border-l-4 border-l-red-500"
                        : notification.type === "paiement_proche"
                        ? "border-l-4 border-l-orange-400"
                        : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {notification.clientNom}
                    </p>
                    <p className="text-xs text-gray-600">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {notification.dateCreation instanceof Date
                        ? notification.dateCreation.toLocaleDateString(
                            "fr-FR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : new Date(
                            notification.dateCreation
                          ).toLocaleDateString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="border-t px-4 py-2 flex justify-between items-center">
            <Link
              href="/dashboard/notifications"
              className="text-center text-sm text-blue-500 hover:underline"
              onClick={() => setIsOpen(false)}
            >
              Voir toutes les notifications
            </Link>
            <Link
              href="/dashboard/debug"
              className="text-xs text-gray-400 hover:underline"
              onClick={() => setIsOpen(false)}
            >
              Débogage
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
