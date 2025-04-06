import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configurations Firebase hardcodées pour éviter les problèmes de variables d'environnement
const firebaseConfig = {
  apiKey: "AIzaSyDiKehag7ucBVJ404NOweX4wvWw2a3TiLs",
  authDomain: "facturation-saas.firebaseapp.com",
  projectId: "facturation-saas",
  storageBucket: "facturation-saas.firebasestorage.app",
  messagingSenderId: "678867733244",
  appId: "1:678867733244:web:cabf8b28d8a22147756579",
  measurementId: "G-5EQPHVHPT8",
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);

// Exportation des services Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
