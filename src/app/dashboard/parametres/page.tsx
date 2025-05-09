"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FiArrowLeft, FiSave, FiUpload, FiDatabase } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import Image from "next/image";
import { Entreprise } from "@/types/entreprise";

export default function ParametresPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise>({
    nom: "",
    rue: "",
    codePostal: "",
    ville: "",
    telephone: "",
    email: "",
    siret: "",
    tvaIntracommunautaire: "",
    logo: "",
    rib: {
      iban: "",
      bic: "",
      banque: "",
    },
    mentionsLegales: [
      "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.",
      "Une indemnité forfaitaire de 40€ pour frais de recouvrement sera due.",
    ],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      if (!user) {
        router.push("/login");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const docRef = doc(db, "parametres", user.uid, "entreprise", "default");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEntreprise(docSnap.data() as Entreprise);
        } else {
          // Créer le document s'il n'existe pas avec les valeurs par défaut
          const defaultEntreprise: Entreprise = {
            nom: "",
            rue: "",
            codePostal: "",
            ville: "",
            telephone: "",
            email: "",
            siret: "",
            tvaIntracommunautaire: "",
            logo: "",
            rib: {
              iban: "",
              bic: "",
              banque: "",
            },
            mentionsLegales: [
              "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.",
              "Une indemnité forfaitaire de 40€ pour frais de recouvrement sera due.",
            ],
          };
          await setDoc(docRef, defaultEntreprise);
          setEntreprise(defaultEntreprise);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        setError(
          "Erreur lors de la récupération des données. Veuillez réessayer."
        );
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      router.push("/login");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    setError(null);

    try {
      await setDoc(
        doc(db, "parametres", user.uid, "entreprise", "default"),
        entreprise
      );
      setSaveMessage("✅ Paramètres sauvegardés avec succès");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      setError("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("rib.")) {
      const ribField = name.split(".")[1];
      setEntreprise((prev) => ({
        ...prev,
        rib: {
          ...prev.rib,
          [ribField]: value,
        },
      }));
    } else {
      setEntreprise((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleMentionsLegalesChange = (index: number, value: string) => {
    setEntreprise((prev) => ({
      ...prev,
      mentionsLegales: prev.mentionsLegales?.map((mention, i) =>
        i === index ? value : mention
      ),
    }));
  };

  return (
    <div className="p-6 flex flex-col items-center">
      <div className="flex justify-between items-center mb-6 w-full max-w-3xl">
        <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
          ⚙️ Paramètres
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push("/dashboard/parametres/sauvegardes")}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiDatabase size={18} className="mr-2" /> Sauvegardes
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 max-w-3xl w-full">
          {error}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl w-full">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Informations de l'entreprise
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo de l'entreprise
                </label>
                <div className="flex items-center gap-4">
                  {entreprise.logo && (
                    <div className="relative w-20 h-20 group">
                      {entreprise.logo.startsWith("http") ? (
                        <Image
                          src={entreprise.logo}
                          alt="Logo de l'entreprise"
                          fill
                          sizes="(max-width: 80px) 100vw, 80px"
                          className="object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                          <span className="text-xs text-gray-500 text-center p-1">
                            Logo sélectionné
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEntreprise((prev) => ({
                            ...prev,
                            logo: "",
                          }));
                          setSaveMessage("Logo supprimé");
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors duration-200 p-4 rounded-lg flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setIsSaving(true);

                            // Vérifier si le fichier est une image valide
                            if (!file.type.startsWith("image/")) {
                              throw new Error(
                                "Le fichier sélectionné doit être une image"
                              );
                            }

                            // Vérifier que l'image ne dépasse pas 1MB
                            if (file.size > 1024 * 1024) {
                              throw new Error(
                                "L'image est trop volumineuse (max 1MB)"
                              );
                            }

                            // Dans cette version simplifiée, nous stockons simplement une chaîne
                            // indiquant qu'une image a été sélectionnée, plutôt qu'une URL Blob
                            // qui peut causer des erreurs de référence.
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              if (e.target?.result) {
                                // Stocker l'URL de données temporaire
                                setEntreprise((prev) => ({
                                  ...prev,
                                  logo: e.target?.result as string,
                                }));
                                setSaveMessage(
                                  "✅ Logo chargé (prévisualisation uniquement)"
                                );
                              }
                            };
                            reader.readAsDataURL(file);
                          } catch (error) {
                            console.error("Erreur lors du chargement:", error);
                            setError(
                              `Erreur lors du chargement du logo: ${
                                error instanceof Error
                                  ? error.message
                                  : "Erreur inconnue"
                              }`
                            );
                          } finally {
                            setIsSaving(false);
                          }
                        }
                      }}
                    />
                    <FiUpload className="text-gray-600 dark:text-gray-300" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {isSaving ? "Upload en cours..." : "Choisir un logo"}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  name="nom"
                  value={entreprise.nom}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rue
                </label>
                <input
                  type="text"
                  name="rue"
                  value={entreprise.rue}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Code postal
                </label>
                <input
                  type="text"
                  name="codePostal"
                  value={entreprise.codePostal}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ville
                </label>
                <input
                  type="text"
                  name="ville"
                  value={entreprise.ville}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="telephone"
                  value={entreprise.telephone}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={entreprise.email}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  SIRET
                </label>
                <input
                  type="text"
                  name="siret"
                  value={entreprise.siret}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  N° TVA Intracommunautaire
                </label>
                <input
                  type="text"
                  name="tvaIntracommunautaire"
                  value={entreprise.tvaIntracommunautaire}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Coordonnées bancaires
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  IBAN
                </label>
                <input
                  type="text"
                  name="rib.iban"
                  value={entreprise.rib?.iban}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  BIC
                </label>
                <input
                  type="text"
                  name="rib.bic"
                  value={entreprise.rib?.bic}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Banque
                </label>
                <input
                  type="text"
                  name="rib.banque"
                  value={entreprise.rib?.banque}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Mentions légales
            </h2>
            <div className="space-y-4">
              {entreprise.mentionsLegales?.map((mention, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mention {index + 1}
                  </label>
                  <input
                    type="text"
                    value={mention}
                    onChange={(e) =>
                      handleMentionsLegalesChange(index, e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white text-black"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span
              className={`transition-opacity duration-300 text-gray-800 dark:text-gray-300 ${
                saveMessage ? "opacity-100" : "opacity-0"
              }`}
            >
              {saveMessage}
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-600 flex items-center transform hover:scale-105 transition-transform duration-300"
            >
              <FiSave size={18} className="mr-2" />
              {isSaving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
