"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

export default function TestProfilPage() {
  const router = useRouter();
  const { user } = useAuth();

  console.log("[TEST-PROFIL] Rendu de la page test");
  console.log("[TEST-PROFIL] User:", user);

  if (!user) {
    return <div>Redirection vers login...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-semibold">
            👤 Test Profil
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800"
          >
            ← Retour
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl mb-4">Page de test</h2>
          <p>Cette page fonctionne-t-elle ?</p>
          <p>Utilisateur : {user.email}</p>
          <p>UID : {user.uid}</p>
        </div>
      </div>
    </div>
  );
} 