"use client";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Entreprise } from "@/types/entreprise";
import { FiArrowLeft, FiSave, FiUpload } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import Image from "next/image";

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
          // Créer le document s'il n'existe pas
          await setDoc(docRef, entreprise);
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold">⚙️ Paramètres</h1>
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
        >
          <FiArrowLeft size={18} className="mr-2" /> Retour
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              Informations de l'entreprise
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo de l'entreprise
                </label>
                <div className="flex items-center gap-4">
                  {entreprise.logo && (
                    <div className="relative w-20 h-20 group">
                      <Image
                        src={entreprise.logo}
                        alt="Logo de l'entreprise"
                        fill
                        sizes="(max-width: 80px) 100vw, 80px"
                        className="object-contain rounded-lg"
                      />
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

                            // Créer une image et attendre son chargement
                            const loadImage = (
                              file: File
                            ): Promise<HTMLImageElement> => {
                              return new Promise((resolve, reject) => {
                                const img = document.createElement("img");
                                img.onload = () => resolve(img);
                                img.onerror = reject;
                                img.src = URL.createObjectURL(file);
                              });
                            };

                            // Redimensionner et sauvegarder en JPEG
                            const resizeAndSaveImage = async (
                              img: HTMLImageElement
                            ): Promise<string> => {
                              const canvas = document.createElement("canvas");
                              const MAX_SIZE = 200;
                              let width = img.width;
                              let height = img.height;

                              // Calculer les nouvelles dimensions en gardant le ratio
                              if (width > height) {
                                if (width > MAX_SIZE) {
                                  height = Math.round(
                                    (height * MAX_SIZE) / width
                                  );
                                  width = MAX_SIZE;
                                }
                              } else {
                                if (height > MAX_SIZE) {
                                  width = Math.round(
                                    (width * MAX_SIZE) / height
                                  );
                                  height = MAX_SIZE;
                                }
                              }

                              canvas.width = width;
                              canvas.height = height;

                              const ctx = canvas.getContext("2d");
                              if (!ctx) {
                                throw new Error(
                                  "Impossible de créer le contexte 2D"
                                );
                              }

                              // Remplir le canvas avec un fond blanc
                              ctx.fillStyle = "#FFFFFF";
                              ctx.fillRect(0, 0, width, height);

                              // Dessiner l'image
                              ctx.drawImage(img, 0, 0, width, height);

                              // Générer un nom de fichier unique
                              const fileName = `logo-${Date.now()}.jpg`;
                              const logoPath = `/logos/${fileName}`;

                              // Convertir le canvas en blob
                              const blob = await new Promise<Blob>(
                                (resolve) => {
                                  canvas.toBlob(
                                    (blob) => {
                                      resolve(blob as Blob);
                                    },
                                    "image/jpeg",
                                    0.95
                                  );
                                }
                              );

                              // Sauvegarder le fichier dans le dossier public/logos
                              const formData = new FormData();
                              formData.append("file", blob, fileName);

                              const response = await fetch("/api/upload", {
                                method: "POST",
                                body: formData,
                              });

                              if (!response.ok) {
                                throw new Error(
                                  "Erreur lors de l'upload du fichier"
                                );
                              }

                              const data = await response.json();
                              return data.path;
                            };

                            const img = await loadImage(file);
                            const logoPath = await resizeAndSaveImage(img);

                            // Mettre à jour l'entreprise avec le chemin du logo
                            setEntreprise((prev) => ({
                              ...prev,
                              logo: logoPath,
                            }));

                            setSaveMessage("✅ Logo uploadé avec succès");
                          } catch (error) {
                            console.error("Erreur lors de l'upload:", error);
                            setError("Erreur lors de l'upload du logo");
                          } finally {
                            setIsSaving(false);
                          }
                        }
                      }}
                    />
                    <FiUpload className="text-gray-600" />
                    <span className="text-gray-600">
                      {isSaving ? "Upload en cours..." : "Choisir un logo"}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  name="nom"
                  value={entreprise.nom}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rue
                </label>
                <input
                  type="text"
                  name="rue"
                  value={entreprise.rue}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Code postal
                </label>
                <input
                  type="text"
                  name="codePostal"
                  value={entreprise.codePostal}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ville
                </label>
                <input
                  type="text"
                  name="ville"
                  value={entreprise.ville}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="telephone"
                  value={entreprise.telephone}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={entreprise.email}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  SIRET
                </label>
                <input
                  type="text"
                  name="siret"
                  value={entreprise.siret}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  N° TVA Intracommunautaire
                </label>
                <input
                  type="text"
                  name="tvaIntracommunautaire"
                  value={entreprise.tvaIntracommunautaire}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              Coordonnées bancaires
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  IBAN
                </label>
                <input
                  type="text"
                  name="rib.iban"
                  value={entreprise.rib?.iban}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  BIC
                </label>
                <input
                  type="text"
                  name="rib.bic"
                  value={entreprise.rib?.bic}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Banque
                </label>
                <input
                  type="text"
                  name="rib.banque"
                  value={entreprise.rib?.banque}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Mentions légales</h2>
            <div className="space-y-4">
              {entreprise.mentionsLegales?.map((mention, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700">
                    Mention {index + 1}
                  </label>
                  <input
                    type="text"
                    value={mention}
                    onChange={(e) =>
                      handleMentionsLegalesChange(index, e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span
              className={`transition-opacity duration-300 ${
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
