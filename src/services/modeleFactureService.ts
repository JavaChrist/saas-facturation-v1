import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ModeleFacture, StyleModele } from "@/types/modeleFacture";
import { checkPlanLimit } from "@/services/subscriptionService";

// Valeurs par défaut pour un nouveau modèle
export const getStyleParDefaut = (): StyleModele => ({
  couleurPrimaire: "#2980b9",
  couleurSecondaire: "#f4530c",
  police: "helvetica",
  avecEnTete: true,
  avecSignature: false,
  logoPosition: "haut",
});

// Récupérer tous les modèles de facture de l'utilisateur
export const getModelesFacture = async (
  userId: string
): Promise<ModeleFacture[]> => {
  try {
    console.log("Récupération des modèles pour l'utilisateur:", userId);
    const modelesQuery = query(
      collection(db, "modelesFacture"),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(modelesQuery);
    console.log("Nombre de modèles trouvés:", snapshot.docs.length);

    const modeles = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dateCreation: doc.data().dateCreation?.toDate
        ? doc.data().dateCreation.toDate()
        : new Date(doc.data().dateCreation || Date.now()),
    })) as ModeleFacture[];

    return modeles;
  } catch (error) {
    console.error("Erreur lors de la récupération des modèles:", error);
    throw error;
  }
};

// Récupérer un modèle spécifique
export const getModeleFacture = async (
  modeleId: string
): Promise<ModeleFacture | null> => {
  try {
    const docRef = doc(db, "modelesFacture", modeleId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        dateCreation: data.dateCreation?.toDate
          ? data.dateCreation.toDate()
          : new Date(data.dateCreation || Date.now()),
      } as ModeleFacture;
    }
    return null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du modèle ${modeleId}:`,
      error
    );
    throw error;
  }
};

// Créer un nouveau modèle
export const createModeleFacture = async (
  modele: Omit<ModeleFacture, "id">
): Promise<string> => {
  try {
    // Vérifier si l'utilisateur a atteint sa limite de modèles
    const models = await getModelesFacture(modele.userId);
    const modelCount = models.length;

    // Vérifier la limite de modèles selon le plan de l'utilisateur
    const limitReached = await checkPlanLimit(
      modele.userId,
      "modeles",
      modelCount
    );

    if (limitReached) {
      throw new Error(
        "Limite de modèles atteinte pour votre plan. Veuillez passer à un plan supérieur pour créer plus de modèles."
      );
    }

    // Si la limite n'est pas atteinte, créer le modèle
    const docRef = await addDoc(collection(db, "modelesFacture"), {
      ...modele,
      dateCreation: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Erreur lors de la création du modèle:", error);
    throw error;
  }
};

// Mettre à jour un modèle existant
export const updateModeleFacture = async (
  modeleId: string,
  updates: Partial<ModeleFacture>
): Promise<void> => {
  try {
    await updateDoc(doc(db, "modelesFacture", modeleId), updates);
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour du modèle ${modeleId}:`,
      error
    );
    throw error;
  }
};

// Supprimer un modèle
export const deleteModeleFacture = async (modeleId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "modelesFacture", modeleId));
  } catch (error) {
    console.error(
      `Erreur lors de la suppression du modèle ${modeleId}:`,
      error
    );
    throw error;
  }
};

// Définir un modèle comme modèle par défaut
export const setModeleParDefaut = async (
  userId: string,
  modeleId: string
): Promise<void> => {
  try {
    // Récupérer tous les modèles de l'utilisateur
    const modeles = await getModelesFacture(userId);

    // Mettre à jour chaque modèle
    for (const modele of modeles) {
      await updateDoc(doc(db, "modelesFacture", modele.id), {
        actif: modele.id === modeleId,
      });
    }
  } catch (error) {
    console.error("Erreur lors de la définition du modèle par défaut:", error);
    throw error;
  }
};
