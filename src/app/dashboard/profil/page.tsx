"use client";

import { db, auth, waitForAuth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDoc, getDocs, query, where, collection, doc, setDoc } from "firebase/firestore";
import { User } from "firebase/auth";

// Interfaces pour le typage
interface UserData {
  nom?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  logo?: string | null;
  [key: string]: any;
}

interface OrganizationData {
  id?: string;
  nom?: string;
  membres?: string[];
  createdBy?: string;
  [key: string]: any;
}

export default function ProfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData>({});
  const [formData, setFormData] = useState<UserData>({
    nom: "",
    adresse: "",
    telephone: "",
    email: "",
    siteWeb: "",
    logo: null
  });
  const [organization, setOrganization] = useState<OrganizationData>({});
  const [orgId, setOrgId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // S'assurer que l'utilisateur est authentifié avant d'interagir avec Firestore
        const currentUser = await waitForAuth() as User | null;
        
        if (!currentUser) {
          console.warn("Utilisateur non connecté, redirection vers /login");
          router.push("/login");
          return;
        }
        
        // Charger le profil utilisateur avec gestion d'erreur
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            setUserData(userData);
            
            // Mettre à jour les informations du formulaire
            setFormData({
              nom: userData.nom || "",
              adresse: userData.adresse || "",
              telephone: userData.telephone || "",
              email: userData.email || currentUser.email || "",
              siteWeb: userData.siteWeb || "",
              logo: userData.logo || null
            });
          } else {
            console.log("Profil utilisateur non trouvé, création d'un nouveau profil");
            // Créer un profil vide
            setFormData({
              nom: "",
              adresse: "",
              telephone: "",
              email: currentUser.email || "",
              siteWeb: "",
              logo: null
            });
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du profil:", error);
          setError("Erreur lors du chargement du profil. Veuillez réessayer.");
        }
        
        // Charger l'organisation de l'utilisateur si elle existe
        try {
          // Rechercher si l'utilisateur est déjà dans une organisation
          console.log("Recherche de l'organisation...");
          const orgQuerySnapshot = await getDocs(
            query(
              collection(db, "organizations"),
              where("membres", "array-contains", currentUser.uid)
            )
          );
          
          if (!orgQuerySnapshot.empty) {
            const orgData = orgQuerySnapshot.docs[0].data() as OrganizationData;
            const orgId = orgQuerySnapshot.docs[0].id;
            setOrganization({
              id: orgId,
              ...orgData
            });
            setOrgId(orgId);
            console.log("Organisation trouvée:", orgId);
          } else {
            console.log("Aucune organisation trouvée pour cet utilisateur");
          }
        } catch (error) {
          console.error("Erreur lors de la récupération de l'organisation:", error);
          // Erreur non-bloquante, continuer sans organisation
        }
        
        // Fin du chargement
        setLoading(false);
      } catch (error) {
        console.error("Erreur globale:", error);
        setError("Une erreur est survenue lors du chargement des données. Veuillez réessayer.");
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      setSaveSuccess(false);
      
      // Vérifier l'authentification
      const currentUser = await waitForAuth() as User | null;
      
      if (!currentUser) {
        setError("Vous devez être connecté pour enregistrer votre profil");
        return;
      }
      
      // Préparer les données à enregistrer
      const userDocRef = doc(db, "users", currentUser.uid);
      const dataToSave = {
        ...formData,
        lastUpdated: new Date()
      };
      
      // Enregistrer les données
      await setDoc(userDocRef, dataToSave, { merge: true });
      
      // Afficher un message de succès
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du profil:", error);
      setError("Erreur lors de l'enregistrement du profil. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  // UI minimal pour la page
  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <h1 className="text-3xl font-semibold mb-6">Profil Utilisateur</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          {error}
        </div>
      )}
      
      {saveSuccess && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
          Profil enregistré avec succès!
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Informations personnelles</h2>

          {/* Formulaire à compléter avec les champs définis dans formData */}
          <div>
            <button 
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Enregistrement..." : "Enregistrer le profil"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
} 