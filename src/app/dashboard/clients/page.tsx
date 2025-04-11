"use client";
import { useState, useEffect } from "react";
import { FiEdit, FiTrash2, FiArrowLeft, FiPlusCircle } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";

interface Client {
  id: string;
  refClient: string;
  nom: string;
  rue: string;
  codePostal: string;
  ville: string;
  email: string;
  delaisPaiement: "Comptant" | "8 jours" | "30 jours" | "60 jours";
}

export default function ClientsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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

    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      const clientsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];
      setClients(clientsData);
    });

    return () => unsubscribe();
  }, [user]);

  // ✅ Ouvrir le modal avec un client vide (Ajout)
  const openNewClientModal = () => {
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
          className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center transform hover:scale-105 transition-transform duration-300"
        >
          <FiPlusCircle size={18} className="mr-2" /> Ajouter un client
        </button>
      </div>
      <h1 className="text-2xl font-semibold mb-6">👥 Clients</h1>
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
                <tr key={client.id} className="border-b hover:bg-gray-100">
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
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => openEditClientModal(client)}
                    >
                      <FiEdit size={18} />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
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
                  className="w-full p-2 border rounded-md bg-white text-black"
                  value={selectedClient.delaisPaiement}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      delaisPaiement: e.target
                        .value as Client["delaisPaiement"],
                    })
                  }
                >
                  <option value="Comptant">Comptant</option>
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
