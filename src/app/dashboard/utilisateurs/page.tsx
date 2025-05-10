"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import {
  FiArrowLeft,
  FiUserPlus,
  FiTrash2,
  FiEdit,
  FiMail,
  FiUserCheck,
  FiUserX,
} from "react-icons/fi";
import {
  getOrganizationUsers,
  addOrganizationUser,
  deactivateUser,
  canAddUser,
  OrganizationUser,
  getOrganizationId
} from "@/services/userService";
import { getUserPlan } from "@/services/subscriptionService";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { emailService } from "@/services/emailService";

export default function UtilisateursPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [canAddMoreUsers, setCanAddMoreUsers] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<{
    planId: string;
    maxUsers: number;
    currentUsers: number;
  }>({ planId: "", maxUsers: 0, currentUsers: 0 });

  const [newUser, setNewUser] = useState({
    email: "",
    displayName: "",
    role: "viewer" as OrganizationUser["role"],
    isActive: true,
  });

  // Simuler l'ID de l'organisation
  useEffect(() => {
    if (user) {
      // En mode développement, utiliser directement l'ID de l'organisation que vous avez créée
      // C'est l'ID du document, pas le nom de la collection
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[DEBUG] Initialisation de l'ID d'organisation en mode développement"
        );
        // Si vous avez créé manuellement un document avec l'ID 'organizations'
        setOrganizationId("organizations");

        // Vous pouvez aussi créer une organisation automatiquement pour le test
        // (commentez cette partie si vous préférez utiliser l'organisation créée manuellement)
        const createTestOrganization = async () => {
          try {
            const db = getFirestore();
            console.log(
              "[DEBUG] Tentative de création/récupération d'organisation de test"
            );

            // Vérifier si une organisation existe déjà
            // D'abord, vérifier l'organisation avec l'ID spécifique "organizations"
            const orgDoc = await getDoc(
              doc(db, "organizations", "organizations")
            );

            if (orgDoc.exists()) {
              console.log("[DEBUG] Document 'organizations' existant trouvé");
              setOrganizationId("organizations");

              // Vérifier si l'utilisateur est déjà membre
              const memberRef = doc(
                db,
                "organizations",
                "organizations",
                "membres",
                user.uid
              );
              const memberDoc = await getDoc(memberRef);

              if (!memberDoc.exists()) {
                console.log("[DEBUG] Ajout de l'utilisateur comme membre");
                // Ajouter l'utilisateur comme admin s'il n'est pas encore membre
                await setDoc(memberRef, {
                  email: user.email || "admin@exemple.com",
                  nomAffichage: "Administrateur",
                  role: "admin",
                  dateAjout: new Date(),
                  actif: true,
                });
              } else {
                console.log("[DEBUG] L'utilisateur est déjà membre");
              }
            } else {
              console.log(
                "[DEBUG] Document 'organizations' non trouvé, vérification des autres organisations"
              );

              // Vérifier si une organisation existe déjà pour cet utilisateur
              const orgsQuery = query(
                collection(db, "organizations"),
                where("proprietaireId", "==", user.uid)
              );

              const existingOrgs = await getDocs(orgsQuery);

              if (existingOrgs.empty) {
                console.log("[DEBUG] Création d'une nouvelle organisation");
                // Créer une nouvelle organisation avec l'ID spécifique
                await setDoc(doc(db, "organizations", "organizations"), {
                  nom: "Mon Organisation",
                  proprietaireId: user.uid,
                  dateCreation: new Date(),
                  plan: "premium", // Vous pouvez ajuster selon le plan de l'utilisateur
                });

                console.log(
                  "[DEBUG] Organisation créée avec ID: organizations"
                );

                // Ajouter l'utilisateur actuel comme admin
                await setDoc(
                  doc(
                    db,
                    "organizations",
                    "organizations",
                    "membres",
                    user.uid
                  ),
                  {
                    email: user.email || "admin@exemple.com",
                    nomAffichage: "Administrateur",
                    role: "admin",
                    dateAjout: new Date(),
                    actif: true,
                  }
                );

                console.log("[DEBUG] Utilisateur ajouté comme membre");

                // Mettre à jour l'ID de l'organisation
                setOrganizationId("organizations");
              } else {
                // Utiliser l'organisation existante
                const orgId = existingOrgs.docs[0].id;
                console.log(
                  "[DEBUG] Utilisation de l'organisation existante:",
                  orgId
                );
                setOrganizationId(orgId);
              }
            }
          } catch (error) {
            console.error(
              "[DEBUG] Erreur lors de la création de l'organisation de test:",
              error
            );
          }
        };

        createTestOrganization();
      } else {
        // En production, récupérer l'ID d'organisation normalement
        getOrganizationId(user.uid)
          .then((orgId) => {
            if (orgId) setOrganizationId(orgId);
          })
          .catch((err) => {
            console.error(
              "Erreur lors de la récupération de l'ID d'organisation:",
              err
            );
          });
      }
    }
  }, [user]);

  // Adapter le mapping des données pour les traductions
  const mapUserDataForDisplay = (user: any): OrganizationUser => {
    return {
      id: user.id,
      email: user.email,
      displayName: user.nomAffichage || user.displayName,
      role: mapRoleToEnglish(user.role),
      createdAt: user.dateCreation || user.createdAt,
      organizationId: user.organisationId || user.organizationId,
      isActive: user.actif !== undefined ? user.actif : user.isActive,
    };
  };

  // Fonction pour mapper les rôles de français à anglais
  const mapRoleToEnglish = (role: string): "admin" | "editor" | "viewer" => {
    switch (role) {
      case "admin":
        return "admin";
      case "editeur":
        return "editor";
      case "lecteur":
        return "viewer";
      default:
        return "viewer";
    }
  };

  // Fonction pour mapper les rôles d'anglais à français pour l'affichage
  const getRoleFrenchName = (role: string): string => {
    switch (role) {
      case "admin":
        return "Administrateur";
      case "editor":
      case "editeur":
        return "Éditeur";
      case "viewer":
      case "lecteur":
        return "Visiteur";
      default:
        return "Visiteur";
    }
  };

  // Charger les utilisateurs et les informations du plan
  useEffect(() => {
    if (!user || !organizationId) return;

    const fetchUsersAndPlanInfo = async () => {
      try {
        setLoading(true);

        // Récupérer les utilisateurs de l'organisation
        const organizationUsers = await getOrganizationUsers(organizationId);

        // Adapter les données pour l'affichage
        const mappedUsers = organizationUsers.map(mapUserDataForDisplay);
        setUsers(mappedUsers);

        // Vérifier si l'utilisateur peut ajouter plus d'utilisateurs
        const canAdd = await canAddUser(user.uid);
        setCanAddMoreUsers(canAdd);

        // Récupérer les informations du plan
        const userPlan = await getUserPlan(user.uid);
        setPlanInfo({
          planId: userPlan.planId,
          maxUsers:
            userPlan.limites.utilisateurs === -1
              ? Infinity
              : userPlan.limites.utilisateurs,
          currentUsers: mappedUsers.length,
        });
      } catch (err) {
        console.error("Erreur lors du chargement des utilisateurs:", err);
        setError("Impossible de charger les utilisateurs. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndPlanInfo();
  }, [user, organizationId]);

  // Ouvrir le modal pour ajouter un utilisateur
  const openAddUserModal = () => {
    if (!canAddMoreUsers) {
      alert(
        `Vous avez atteint la limite de ${planInfo.currentUsers} utilisateur(s) pour votre plan ${planInfo.planId}. Veuillez passer à un forfait supérieur pour ajouter plus d'utilisateurs.`
      );
      return;
    }

    setNewUser({
      email: "",
      displayName: "",
      role: "viewer",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Ajouter un nouvel utilisateur
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !organizationId) {
      alert("Vous devez être connecté pour effectuer cette action");
      return;
    }

    try {
      // Vérifier une dernière fois si l'utilisateur peut ajouter d'autres utilisateurs
      const canAdd = await canAddUser(user.uid);
      if (!canAdd) {
        alert(
          `Vous avez atteint la limite de ${planInfo.currentUsers} utilisateur(s) pour votre plan ${planInfo.planId}. Veuillez passer à un forfait supérieur pour ajouter plus d'utilisateurs.`
        );
        return;
      }

      // Ajouter le nouvel utilisateur avec sa traduction en français
      const userId = await addOrganizationUser(user.uid, organizationId, {
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        isActive: true,
      });

      // Envoyer l'invitation par email
      const invitationResult = await emailService.sendUserInvitation(
        newUser.email,
        organizationId,
        newUser.role
      );

      if (invitationResult.success) {
        console.log(`Invitation envoyée à ${newUser.email} (ID: ${userId})`);
        alert(`Utilisateur ajouté et invitation envoyée à ${newUser.email}`);
      } else {
        // L'utilisateur a été ajouté mais l'email n'a pas été envoyé
        console.warn(
          "Utilisateur ajouté mais erreur lors de l'envoi de l'email:",
          invitationResult.message
        );
        alert(
          `Utilisateur ajouté, mais l'email n'a pas pu être envoyé: ${invitationResult.message}`
        );
      }

      // Mettre à jour la liste des utilisateurs
      const updatedUsers = await getOrganizationUsers(organizationId);
      const mappedUsers = updatedUsers.map(mapUserDataForDisplay);
      setUsers(mappedUsers);

      // Fermer le modal
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erreur lors de l'ajout de l'utilisateur:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'ajout de l'utilisateur"
      );
    }
  };

  // Désactiver un utilisateur
  const handleDeactivateUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir désactiver cet utilisateur ?")) {
      return;
    }

    try {
      await deactivateUser(userId);

      // Mettre à jour la liste des utilisateurs
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, isActive: false } : u))
      );

      alert("Utilisateur désactivé avec succès");
    } catch (err) {
      console.error("Erreur lors de la désactivation de l'utilisateur:", err);
      alert("Erreur lors de la désactivation de l'utilisateur");
    }
  };

  // Envoyer une invitation par email
  const handleSendInvitation = async (email: string) => {
    if (!organizationId) {
      alert(
        "ID de l'organisation non disponible. Impossible d'envoyer l'invitation."
      );
      return;
    }

    // Afficher un indicateur de chargement
    setLoading(true);

    try {
      // Appeler le service d'email pour envoyer l'invitation
      const result = await emailService.sendUserInvitation(
        email,
        organizationId,
        "viewer" // Rôle par défaut pour les invitations par email
      );

      if (result.success) {
        alert("Invitation envoyée avec succès à " + email);
      } else {
        alert("Erreur lors de l'envoi : " + result.message);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'invitation:", error);
      alert("Une erreur est survenue lors de l'envoi de l'invitation.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
          👥 Gestion des Utilisateurs
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
          <button
            onClick={openAddUserModal}
            disabled={!canAddMoreUsers}
            className={`${
              canAddMoreUsers
                ? "bg-green-600 hover:bg-green-700 transform hover:scale-105"
                : "bg-gray-400 cursor-not-allowed"
            } text-white py-2 px-4 rounded-md flex items-center transition-transform duration-300`}
          >
            <FiUserPlus size={18} className="mr-2" /> Ajouter un utilisateur
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {/* Information sur les limites du plan */}
      {planInfo.planId && (
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300">
                Utilisateurs
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {planInfo.maxUsers === Infinity
                  ? `Vous utilisez ${planInfo.currentUsers} utilisateur(s) (illimité avec le plan ${planInfo.planId})`
                  : `Vous utilisez ${planInfo.currentUsers} utilisateur(s) sur ${planInfo.maxUsers} disponible(s) avec votre plan ${planInfo.planId}`}
              </p>
            </div>
            {!canAddMoreUsers && (
              <div className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-3 py-1 rounded-full text-sm">
                Limite atteinte
              </div>
            )}
          </div>
          {!canAddMoreUsers && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <a
                href="/dashboard/abonnement"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Passez à un plan supérieur
              </a>{" "}
              pour ajouter plus d'utilisateurs.
            </div>
          )}
        </div>
      )}

      {/* Liste des utilisateurs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="py-3 px-4 text-left">Nom</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Rôle</th>
              <th className="py-3 px-4 text-left">Statut</th>
              <th className="py-3 px-4 text-left">Ajouté le</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Aucun utilisateur trouvé. Ajoutez des utilisateurs pour qu'ils
                  puissent accéder à votre compte.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {user.displayName}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {user.email}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {getRoleFrenchName(user.role)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {user.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {user.createdAt instanceof Date
                      ? user.createdAt.toLocaleDateString()
                      : new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleSendInvitation(user.email)}
                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Renvoyer l'invitation"
                      >
                        <FiMail size={18} />
                      </button>
                      {user.isActive ? (
                        <button
                          onClick={() => handleDeactivateUser(user.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Désactiver"
                        >
                          <FiUserX size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            alert("Fonctionnalité non implémentée")
                          }
                          className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          title="Réactiver"
                        >
                          <FiUserCheck size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'ajout d'utilisateur */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-[500px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Ajouter un utilisateur
            </h2>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="w-full p-2 border rounded-md bg-white text-gray-800"
                  required
                  placeholder="exemple@domaine.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Une invitation sera envoyée à cette adresse email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom d'affichage
                </label>
                <input
                  type="text"
                  value={newUser.displayName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, displayName: e.target.value })
                  }
                  className="w-full p-2 border rounded-md bg-white text-gray-800"
                  required
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rôle
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      role: e.target.value as OrganizationUser["role"],
                    })
                  }
                  className="w-full p-2 border rounded-md bg-white text-gray-800"
                  required
                >
                  <option value="admin">Administrateur (accès complet)</option>
                  <option value="editor">
                    Éditeur (peut modifier, pas supprimer)
                  </option>
                  <option value="viewer">Visiteur (lecture seule)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Inviter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
