"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import Link from "next/link";

export default function DebugPage() {
  const { user, loading } = useAuth();
  const [storageData, setStorageData] = useState<any>({});
  const [cookieData, setCookieData] = useState<string>("");

  // Fonction pour nettoyer le stockage local
  const clearStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      alert('Stockage local effacé. Rafraîchissez la page.');
    }
  };

  // Fonction pour définir un token de test
  const setTestToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('firebase:authUser', JSON.stringify({
        uid: 'test-user',
        email: 'test@example.com'
      }));
      alert('Token de test défini. Rafraîchissez la page.');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Récupération du localStorage
        const lsData: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            lsData[key] = value;
          }
        }
        setStorageData(lsData);

        // Récupération des cookies
        setCookieData(document.cookie);
      } catch (e) {
        console.error("Erreur lors de la récupération des données:", e);
      }
    }
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Page de débogage</h1>
      
      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Navigation</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Page d'accueil
          </Link>
          <Link href="/login" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Page de connexion
          </Link>
          <Link href="/dashboard" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Dashboard
          </Link>
          <Link href="/dashboard/factures" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Factures
          </Link>
        </div>
      </div>
      
      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">État d'authentification</h2>
        <div className="mb-2">
          <strong>Chargement:</strong> {loading ? "En cours" : "Terminé"}
        </div>
        <div className="mb-2">
          <strong>Authentifié:</strong> {user ? "Oui" : "Non"}
        </div>
        {user && (
          <div>
            <p><strong>UID:</strong> {user.uid}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        )}
      </div>

      <div className="flex space-x-4 mb-6">
        <button 
          onClick={clearStorage}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Nettoyer le stockage local
        </button>
        <button 
          onClick={setTestToken}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Définir un token de test
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Rafraîchir la page
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-4">LocalStorage</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(storageData, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-4">Cookies</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            {cookieData || "Aucun cookie"}
          </pre>
        </div>
      </div>
    </div>
  );
} 