"use client";
import { useState, useEffect } from "react";
import { FiEdit, FiTrash2, FiArrowLeft, FiPlusCircle } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { getUserPlan, checkPlanLimit } from "@/services/subscriptionService";

interface Client {
  id: string;
  refClient: string;
  nom: string;
  rue: string;
  codePostal: string;
  ville: string;
  email: string;
  delaisPaiement: "À réception" | "8 jours" | "30 jours" | "60 jours";
}

export default function ClientsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [planInfo, setPlanInfo] = useState<{
    planId: string;
    maxClients: number;
    currentClients: number;
  }>({ planId: "", maxClients: 0, currentClients: 0 });

  // Définir fetchClients en dehors du useEffect
  const fetchClients = async () => {
    const querySnapshot = await getDocs(collection(db, "clients"));
    const clientsData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Client[];

    console.log("Clients récupérés:", clientsData);
    setClients(clientsData);
  };

  // Charger les clients depuis Firestore
  useEffect(() => {
    if (!user) return;

    const clientsQuery = query(
      collection(db, "clients"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(clientsQuery, async (snapshot) => {
      const clientsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];
      setClients(clientsData);

      // Vérifier les limites du plan
      try {
        const userPlan = await getUserPlan(user.uid);
        const isLimitReached = await checkPlanLimit(
          user.uid,
          "clients",
          clientsData.length
        );
        setLimitReached(isLimitReached);

        setPlanInfo({
          planId: userPlan.planId,
          maxClients:
            userPlan.limites.clients === -1
              ? Infinity
              : userPlan.limites.clients,
          currentClients: clientsData.length,
        });
      } catch (err) {
        console.error("Erreur lors de la vérification des limites:", err);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // ✅ Ouvrir le modal avec un client vide (Ajout)
  const openNewClientModal = async () => {
    // Vérifier si l'utilisateur a atteint sa limite de clients
    if (limitReached) {
      alert(
        `Vous avez atteint la limite de ${planInfo.currentClients} client(s) pour votre plan ${planInfo.planId}. Veuillez passer à un forfait supérieur pour ajouter plus de clients.`
      );
      return;
    }

    setSelectedClient({
      id: "",
      refClient: "C00" + (clients.length + 1), // Génère une réf automatique
      nom: "",
      rue: "",
      codePostal: "",
      ville: "",
      email: "",
      delaisPaiement: "30 jours",
    });
    setIsModalOpen(true);
  };

  // ✅ Ouvrir le modal pour modifier un client
  const openEditClientModal = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  // ✅ Fermer le modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  // ✅ Ajouter ou modifier un client
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      alert("Vous devez être connecté pour effectuer cette action");
      return;
    }

    try {
      if (selectedClient && selectedClient.id) {
        // Modification d'un client existant
        const clientData = {
          refClient: selectedClient.refClient,
          nom: selectedClient.nom,
          rue: selectedClient.rue,
          codePostal: selectedClient.codePostal,
          ville: selectedClient.ville,
          email: selectedClient.email,
          delaisPaiement: selectedClient.delaisPaiement,
          userId: user.uid, // Ajout de l'ID utilisateur
        };

        await updateDoc(doc(db, "clients", selectedClient.id), clientData);
      } else {
        // Vérifier à nouveau les limites avant la création
        const isLimitReached = await checkPlanLimit(
          user.uid,
          "clients",
          clients.length
        );

        if (isLimitReached) {
          alert(
            `Vous avez atteint la limite de ${planInfo.currentClients} client(s) pour votre plan ${planInfo.planId}. Veuillez passer à un forfait supérieur pour ajouter plus de clients.`
          );
          return;
        }

        // Création d'un nouveau client
        const newClient: Omit<Client, "id"> = {
          refClient: selectedClient?.refClient || "C00" + (clients.length + 1),
          nom: selectedClient?.nom || "",
          rue: selectedClient?.rue || "",
          codePostal: selectedClient?.codePostal || "",
          ville: selectedClient?.ville || "",
          email: selectedClient?.email || "",
          delaisPaiement: selectedClient?.delaisPaiement || "30 jours",
        };

        await addDoc(collection(db, "clients"), {
          ...newClient,
          userId: user.uid, // Ajout de l'ID utilisateur
        });
      }
      closeModal();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du client:", error);
      alert("Erreur lors de la sauvegarde du client");
    }
  };

  // ✅ Supprimer un client
  const deleteClient = async (id: string) => {
    await deleteDoc(doc(db, "clients", id));
    fetchClients();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
        >
          <FiArrowLeft size={18} className="mr-2" /> Retour
        </button>
        <button
          onClick={openNewClientModal}
          disabled={limitReached}
          className={`${
            limitReached
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-700 transform hover:scale-105"
          } text-white py-2 px-4 rounded-md flex items-center transition-transform duration-300`}
        >
          <FiPlusCircle size={18} className="mr-2" /> Ajouter un client
        </button>
      </div>
      <h1 className="text-2xl font-semibold mb-6">👥 Clients</h1>

      {/* Information sur les limites du plan */}
      {planInfo.planId && (
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300">
                Clients
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {planInfo.maxClients === Infinity
                  ? `Vous utilisez ${planInfo.currentClients} client(s) (illimité avec le plan ${planInfo.planId})`
                  : `Vous utilisez ${planInfo.currentClients} client(s) sur ${planInfo.maxClients} disponible(s) avec votre plan ${planInfo.planId}`}
              </p>
            </div>
            {limitReached && (
              <div className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-3 py-1 rounded-full text-sm">
                Limite atteinte
              </div>
            )}
          </div>
          {limitReached && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <a
                href="/dashboard/abonnement"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Passez à un plan supérieur
              </a>{" "}
              pour créer plus de clients.
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full bg-white dark:bg-gray-700 shadow-md rounded-lg">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="py-3 px-4 text-left">Réf Client</th>
              <th className="py-3 px-4 text-left">Nom</th>
              <th className="py-3 px-4 text-left">Rue</th>
              <th className="py-3 px-4 text-left">Code Postal</th>
              <th className="py-3 px-4 text-left">Ville</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Délai de Paiement</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients
              .filter((client) => client.id) // ✅ Ignore les clients sans ID
              .map((client) => (
                <tr key={client.id} className="border-b hover:bg-gray-100 dark:hover:bg-gray-600">
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {client.refClient}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {client.nom}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {client.rue}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {client.codePostal}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {client.ville}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {client.email}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {client.delaisPaiement}
                  </td>
                  <td className="py-3 px-4 text-center flex justify-center space-x-2">
                    <button
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      onClick={() => openEditClientModal(client)}
                    >
                      <FiEdit size={18} />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => deleteClient(client.id)}
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal de création / modification client */}
      {isModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-[400px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              {selectedClient.id ? "Modifier Client" : "Ajouter un Client"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Réf Client
                </label>
                <input
                  type="text"
                  placeholder="Réf Client"
                  value={selectedClient.refClient}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      refClient: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full p-2 border rounded-md uppercase bg-white text-black"
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  placeholder="Nom"
                  value={selectedClient.nom}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      nom: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full p-2 border rounded-md uppercase bg-white text-black"
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rue
                </label>
                <input
                  type="text"
                  placeholder="Rue"
                  value={selectedClient.rue}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      rue: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md bg-white text-black"
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code Postal
                </label>
                <input
                  type="text"
                  placeholder="Code Postal"
                  value={selectedClient.codePostal}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      codePostal: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md bg-white text-black"
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  placeholder="Ville"
                  value={selectedClient.ville}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      ville: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md bg-white text-black"
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  value={selectedClient.email}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      email: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md bg-white text-black"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Délai de paiement
                </label>
                <select
                  value={selectedClient.delaisPaiement}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      delaisPaiement: e.target
                        .value as Client["delaisPaiement"],
                    })
                  }
                  className="w-full p-2 border rounded-md bg-white text-black"
                >
                  <option value="À réception">À réception</option>
                  <option value="8 jours">8 jours</option>
                  <option value="30 jours">30 jours</option>
                  <option value="60 jours">60 jours</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
