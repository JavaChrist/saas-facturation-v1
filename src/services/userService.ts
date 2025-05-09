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
  setDoc,
} from "firebase/firestore";
import { checkPlanLimit, getUserPlan } from "@/services/subscriptionService";

// Interface pour un utilisateur de l'organisation
export interface OrganizationUser {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "editor" | "viewer";
  createdAt: Date;
  organizationId: string; // ID de l'organisation principale
  isActive: boolean;
}

/**
 * Récupère tous les utilisateurs de l'organisation
 * @param organizationId ID de l'organisation
 * @returns Liste des utilisateurs
 */
export const getOrganizationUsers = async (
  organizationId: string
): Promise<OrganizationUser[]> => {
  try {
    console.log("[DEBUG] getOrganizationUsers appelé avec ID:", organizationId);

    // Essayer d'abord de récupérer directement les membres de l'organisation
    try {
      console.log(
        "[DEBUG] Tentative de récupération des membres de l'organisation directement"
      );
      const membersCollection = collection(
        db,
        "organisations",
        organizationId,
        "membres"
      );
      const membersSnapshot = await getDocs(membersCollection);

      if (!membersSnapshot.empty) {
        console.log("[DEBUG] Membres trouvés:", membersSnapshot.size);
        const members = membersSnapshot.docs.map((doc) => ({
          id: doc.id,
          email: doc.data().email,
          displayName: doc.data().nomAffichage,
          role: mapRoleToEnglish(doc.data().role),
          createdAt: doc.data().dateAjout?.toDate
            ? doc.data().dateAjout.toDate()
            : new Date(doc.data().dateAjout || Date.now()),
          organizationId: organizationId,
          isActive: doc.data().actif !== undefined ? doc.data().actif : true,
        })) as OrganizationUser[];

        console.log("[DEBUG] Membres transformés:", members.length);
        return members;
      } else {
        console.log("[DEBUG] Aucun membre trouvé dans la sous-collection");
      }
    } catch (subErr) {
      console.error(
        "[DEBUG] Erreur lors de la récupération des membres:",
        subErr
      );
    }

    // Fallback: essayer la collection utilisateursOrganisation
    console.log(
      "[DEBUG] Tentative de récupération depuis utilisateursOrganisation"
    );
    const usersQuery = query(
      collection(db, "utilisateursOrganisation"),
      where("organisationId", "==", organizationId)
    );

    const snapshot = await getDocs(usersQuery);
    console.log(
      "[DEBUG] Résultats de utilisateursOrganisation:",
      snapshot.size
    );

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().dateCreation?.toDate
        ? doc.data().dateCreation.toDate()
        : new Date(doc.data().dateCreation || Date.now()),
    })) as OrganizationUser[];

    console.log("[DEBUG] Utilisateurs récupérés:", users.length);
    return users;
  } catch (error) {
    console.error(
      "[DEBUG] Erreur complète lors de la récupération des utilisateurs:",
      error
    );
    // En mode développement, retourner un utilisateur factice pour éviter l'erreur
    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG] Mode dev: création d'un utilisateur de test");
      return [
        {
          id: "test-user-id",
          email: "test@exemple.com",
          displayName: "Utilisateur Test",
          role: "admin",
          createdAt: new Date(),
          organizationId: organizationId,
          isActive: true,
        },
      ];
    }
    throw error;
  }
};

/**
 * Ajoute un nouvel utilisateur à l'organisation
 * @param userId ID de l'utilisateur principal (admin)
 * @param organizationId ID de l'organisation
 * @param newUser Nouvel utilisateur à ajouter
 * @returns ID de l'utilisateur créé
 */
export const addOrganizationUser = async (
  userId: string,
  organizationId: string,
  newUser: Omit<OrganizationUser, "id" | "createdAt" | "organizationId">
): Promise<string> => {
  try {
    console.log(
      "[DEBUG] addOrganizationUser appelé avec:",
      userId,
      organizationId,
      newUser
    );

    // Récupérer tous les utilisateurs existants
    const existingUsers = await getOrganizationUsers(organizationId);

    // Vérifier si l'utilisateur a atteint la limite de son plan
    const isLimitReached = await checkPlanLimit(
      userId,
      "utilisateurs",
      existingUsers.length
    );

    if (isLimitReached) {
      throw new Error(
        "Limite d'utilisateurs atteinte pour votre plan. Veuillez passer à un plan supérieur pour ajouter plus d'utilisateurs."
      );
    }

    // Ajouter le nouvel utilisateur à la collection utilisateursOrganisation
    const docRef = await addDoc(collection(db, "utilisateursOrganisation"), {
      email: newUser.email,
      nomAffichage: newUser.displayName,
      role: mapRoleToFrench(newUser.role),
      dateCreation: new Date(),
      organisationId: organizationId,
      actif: true,
    });

    console.log(
      "[DEBUG] Utilisateur ajouté à utilisateursOrganisation:",
      docRef.id
    );

    // Ajouter l'utilisateur comme membre de l'organisation
    const orgMemberRef = doc(
      db,
      "organisations",
      organizationId,
      "membres",
      docRef.id
    );
    await setDoc(orgMemberRef, {
      email: newUser.email,
      nomAffichage: newUser.displayName,
      role: mapRoleToFrench(newUser.role),
      dateAjout: new Date(),
      actif: true,
    });

    console.log("[DEBUG] Utilisateur ajouté comme membre de l'organisation");

    return docRef.id;
  } catch (error) {
    console.error(
      "[DEBUG] Erreur complète lors de l'ajout d'un utilisateur:",
      error
    );
    throw error;
  }
};

/**
 * Désactive un utilisateur de l'organisation
 * @param userId ID de l'utilisateur à désactiver
 * @returns true si la désactivation a réussi
 */
export const deactivateUser = async (userId: string): Promise<boolean> => {
  try {
    // Récupérer l'utilisateur pour obtenir son organisationId
    const userDoc = await getDoc(doc(db, "utilisateursOrganisation", userId));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const organizationId = userData.organisationId;

    // Mettre à jour dans la collection utilisateursOrganisation
    await updateDoc(doc(db, "utilisateursOrganisation", userId), {
      actif: false,
    });

    // Mettre à jour dans la sous-collection membres si l'utilisateur existe
    const memberRef = doc(
      db,
      "organisations",
      organizationId,
      "membres",
      userId
    );
    const memberDoc = await getDoc(memberRef);

    if (memberDoc.exists()) {
      await updateDoc(memberRef, {
        actif: false,
      });
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la désactivation de l'utilisateur:", error);
    return false;
  }
};

/**
 * Vérifie si un utilisateur peut être ajouté à l'organisation
 * @param adminId ID de l'administrateur de l'organisation
 * @returns true si un utilisateur peut être ajouté, false sinon
 */
export const canAddUser = async (adminId: string): Promise<boolean> => {
  try {
    // Récupérer le plan de l'utilisateur
    const userPlan = await getUserPlan(adminId);

    // Récupérer tous les utilisateurs de l'organisation
    const organizationId = await getOrganizationId(adminId);
    if (!organizationId) {
      console.error(
        "[DEBUG] ID d'organisation non trouvé pour l'utilisateur:",
        adminId
      );
      return false;
    }

    const users = await getOrganizationUsers(organizationId);

    // Vérifier si la limite est atteinte
    return !(await checkPlanLimit(adminId, "utilisateurs", users.length));
  } catch (error) {
    console.error(
      "Erreur lors de la vérification des limites d'utilisateurs:",
      error
    );
    return false;
  }
};

/**
 * Récupère l'ID de l'organisation d'un utilisateur
 * @param userId ID de l'utilisateur
 * @returns ID de l'organisation ou null si non trouvé
 */
export const getOrganizationId = async (
  userId: string
): Promise<string | null> => {
  try {
    console.log("[DEBUG] getOrganizationId appelé pour:", userId);

    // Vérifier d'abord si l'utilisateur est propriétaire d'une organisation
    const orgsQuery = query(
      collection(db, "organisations"),
      where("proprietaireId", "==", userId)
    );

    const orgsSnapshot = await getDocs(orgsQuery);
    console.log(
      "[DEBUG] Organisations trouvées comme propriétaire:",
      orgsSnapshot.size
    );

    if (!orgsSnapshot.empty) {
      const orgId = orgsSnapshot.docs[0].id;
      console.log(
        "[DEBUG] ID d'organisation trouvé comme propriétaire:",
        orgId
      );
      return orgId;
    }

    // Sinon, chercher dans les membres d'organisations
    // Parcourir toutes les organisations pour vérifier la sous-collection membres
    const allOrgsSnapshot = await getDocs(collection(db, "organisations"));
    console.log("[DEBUG] Nombre total d'organisations:", allOrgsSnapshot.size);

    for (const orgDoc of allOrgsSnapshot.docs) {
      const memberRef = doc(db, "organisations", orgDoc.id, "membres", userId);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        console.log(
          "[DEBUG] Utilisateur trouvé comme membre de l'organisation:",
          orgDoc.id
        );
        return orgDoc.id;
      }
    }

    // Enfin, essayer avec la collection utilisateursOrganisation
    const usersQuery = query(
      collection(db, "utilisateursOrganisation"),
      where("id", "==", userId)
    );

    const usersSnapshot = await getDocs(usersQuery);
    console.log(
      "[DEBUG] Utilisateurs trouvés dans utilisateursOrganisation:",
      usersSnapshot.size
    );

    if (!usersSnapshot.empty) {
      const orgId = usersSnapshot.docs[0].data().organisationId;
      console.log(
        "[DEBUG] ID d'organisation trouvé dans utilisateursOrganisation:",
        orgId
      );
      return orgId;
    }

    // Mode développement - retourner l'ID que vous avez spécifié lors de la création manuelle
    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG] Mode dev: retour de l'ID d'organisation par défaut");
      // Retourner l'ID exact de votre document d'organisation
      return "organisations"; // Utilisez l'ID que vous avez choisi lors de la création
    }

    console.log("[DEBUG] Aucune organisation trouvée pour cet utilisateur");
    return null;
  } catch (error) {
    console.error(
      "[DEBUG] Erreur lors de la récupération de l'ID de l'organisation:",
      error
    );

    // Mode développement - retourner l'ID que vous avez spécifié lors de la création manuelle
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[DEBUG] Mode dev après erreur: retour de l'ID d'organisation par défaut"
      );
      return "organisations"; // Utilisez l'ID que vous avez choisi lors de la création
    }

    return null;
  }
};

/**
 * Conversion des rôles en français
 */
const mapRoleToFrench = (role: string): string => {
  switch (role) {
    case "admin":
      return "admin";
    case "editor":
      return "editeur";
    case "viewer":
      return "lecteur";
    default:
      return "lecteur";
  }
};

/**
 * Conversion des rôles en anglais
 */
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
