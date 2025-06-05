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
  deleteDoc,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { checkPlanLimit, getUserPlan } from "@/services/subscriptionService";
import { User } from 'firebase/auth';

// Interface pour un utilisateur de l'organisation
export interface OrganizationUser {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "editor" | "viewer";
  createdAt: Date;
  organizationId: string;
  isActive: boolean;
  isDeleted?: boolean;
}

export interface Member {
  id: string;
  email: string;
  nomAffichage: string;
  role: string;
  dateAjout: any;
  actif: boolean;
}

export interface NewUser {
  email: string;
  role: string;
}

/**
 * Récupère tous les utilisateurs de l'organisation
 */
export const getOrganizationUsers = async (
  organizationId: string
): Promise<OrganizationUser[]> => {
  try {
    // Essayer d'abord de récupérer directement les membres de l'organisation
    try {
      const membersCollection = collection(
        db,
        "organizations",
        organizationId,
        "membres"
      );
      const membersSnapshot = await getDocs(membersCollection);

      if (!membersSnapshot.empty) {
        const members = membersSnapshot.docs
          .map((doc) => ({
          id: doc.id,
          email: doc.data().email,
          displayName: doc.data().nomAffichage,
          role: mapRoleToEnglish(doc.data().role),
          createdAt: doc.data().dateAjout?.toDate
            ? doc.data().dateAjout.toDate()
            : new Date(doc.data().dateAjout || Date.now()),
          organizationId: organizationId,
          isActive: doc.data().actif !== undefined ? doc.data().actif : true,
            isDeleted: doc.data().supprime === true,
          }))
          .filter((member) => !member.isDeleted) as OrganizationUser[]; // Exclure les utilisateurs supprimés

        return members;
      }
    } catch (subErr) {
      console.error("Erreur lors de la récupération des membres:", subErr);
    }

    // Fallback: essayer la collection utilisateursOrganisation
    const usersQuery = query(
      collection(db, "utilisateursOrganisation"),
      where("organisationId", "==", organizationId)
    );

    const snapshot = await getDocs(usersQuery);

    const users = snapshot.docs
      .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().dateCreation?.toDate
        ? doc.data().dateCreation.toDate()
        : new Date(doc.data().dateCreation || Date.now()),
        isDeleted: doc.data().supprime === true,
      }))
      .filter((user) => !user.isDeleted) as OrganizationUser[]; // Exclure les utilisateurs supprimés

    return users;
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    // En mode développement, retourner un utilisateur factice pour éviter l'erreur
    if (process.env.NODE_ENV === "development") {
      return [
        {
          id: "test-user-id",
          email: "test@exemple.com",
          displayName: "Utilisateur Test",
          role: "admin",
          createdAt: new Date(),
          organizationId: organizationId,
          isActive: true,
          isDeleted: false,
        },
      ];
    }
    throw error;
  }
};

/**
 * Ajoute un nouvel utilisateur à l'organisation
 */
export const addOrganizationUser = async (
  userId: string,
  organizationId: string,
  newUser: Omit<OrganizationUser, "id" | "createdAt" | "organizationId">
): Promise<string> => {
  try {
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

    // Ajouter l'utilisateur comme membre de l'organisation
    const orgMemberRef = doc(
      db,
      "organizations",
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

    return docRef.id;
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un utilisateur:", error);
    throw error;
  }
};

/**
 * Désactive un utilisateur de l'organisation
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
      "organizations",
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
 * Réactive un utilisateur de l'organisation
 */
export const activateUser = async (userId: string): Promise<boolean> => {
  try {
    // Récupérer l'utilisateur pour obtenir son organisationId
    const userDoc = await getDoc(doc(db, "utilisateursOrganisation", userId));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const organizationId = userData.organisationId;

    // Mettre à jour dans la collection utilisateursOrganisation
    await updateDoc(doc(db, "utilisateursOrganisation", userId), {
      actif: true,
    });

    // Mettre à jour dans la sous-collection membres si l'utilisateur existe
    const memberRef = doc(
      db,
      "organizations",
      organizationId,
      "membres",
      userId
    );
    const memberDoc = await getDoc(memberRef);

    if (memberDoc.exists()) {
      await updateDoc(memberRef, {
        actif: true,
      });
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la réactivation de l'utilisateur:", error);
    return false;
  }
};

/**
 * Supprime définitivement un utilisateur de l'organisation
 */
export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    // Récupérer l'utilisateur pour obtenir son organisationId
    const userDoc = await getDoc(doc(db, "utilisateursOrganisation", userId));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const organizationId = userData.organisationId;

    // Supprimer de la collection utilisateursOrganisation
    await updateDoc(doc(db, "utilisateursOrganisation", userId), {
      actif: false,
      supprime: true,
      dateSuppression: new Date(),
    });

    // Supprimer de la sous-collection membres si l'utilisateur existe
    const memberRef = doc(
      db,
      "organizations",
      organizationId,
      "membres",
      userId
    );
    const memberDoc = await getDoc(memberRef);

    if (memberDoc.exists()) {
      await updateDoc(memberRef, {
        actif: false,
        supprime: true,
        dateSuppression: new Date(),
      });
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return false;
  }
};

/**
 * Vérifie si un utilisateur peut être ajouté à l'organisation
 */
export const canAddUser = async (adminId: string): Promise<boolean> => {
  try {
    // Récupérer le plan de l'utilisateur
    const userPlan = await getUserPlan(adminId);

    // Récupérer tous les utilisateurs de l'organisation
    const organizationId = await getOrganizationId(adminId);
    if (!organizationId) {
      console.error("ID d'organisation non trouvé pour l'utilisateur:", adminId);
      return false;
    }

    const users = await getOrganizationUsers(organizationId);

    // Vérifier si la limite est atteinte
    return !(await checkPlanLimit(adminId, "utilisateurs", users.length));
  } catch (error) {
    console.error("Erreur lors de la vérification des limites d'utilisateurs:", error);
    return false;
  }
};

/**
 * Récupère l'ID de l'organisation d'un utilisateur
 */
export const getOrganizationId = async (
  userId: string
): Promise<string | null> => {
  try {
    // Vérifier d'abord si l'utilisateur est propriétaire d'une organisation
    const orgsQuery = query(
      collection(db, "organizations"),
      where("proprietaireId", "==", userId)
    );

    const orgsSnapshot = await getDocs(orgsQuery);

    if (!orgsSnapshot.empty) {
      const orgId = orgsSnapshot.docs[0].id;
      return orgId;
    }

    // Sinon, chercher dans les membres d'organisations
    const allOrgsSnapshot = await getDocs(collection(db, "organizations"));

    for (const orgDoc of allOrgsSnapshot.docs) {
      const memberRef = doc(db, "organizations", orgDoc.id, "membres", userId);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        return orgDoc.id;
      }
    }

    // Enfin, essayer avec la collection utilisateursOrganisation
    const usersQuery = query(
      collection(db, "utilisateursOrganisation"),
      where("id", "==", userId)
    );

    const usersSnapshot = await getDocs(usersQuery);

    if (!usersSnapshot.empty) {
      const orgId = usersSnapshot.docs[0].data().organisationId;
      return orgId;
    }

    // Mode développement - retourner l'ID par défaut
    if (process.env.NODE_ENV === "development") {
      return "organizations";
    }

    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'ID de l'organisation:", error);

    // Mode développement - retourner l'ID par défaut
    if (process.env.NODE_ENV === "development") {
      return "organizations";
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

// Fonction pour récupérer la liste des membres en temps réel
export const getMembers = (organizationId: string, callback: (members: Member[]) => void) => {
  const membersCollection = collection(db, "organizations", organizationId, "membres");
  const membersQuery = query(membersCollection, orderBy("dateAjout", "desc"));

  return onSnapshot(membersQuery, (snapshot) => {
    const members: Member[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        id: doc.id,
        email: data.email,
        nomAffichage: data.nomAffichage,
        role: data.role,
        dateAjout: data.dateAjout,
        actif: data.actif ?? true,
      });
    });
    callback(members);
  }, (error) => {
    console.error("Erreur récupération membres:", error);
    callback([]);
  });
};

// Fonction pour récupérer les utilisateurs d'une organisation
export const getUsers = async (organizationId: string): Promise<Member[]> => {
  try {
    const membersCollection = collection(db, "organizations", organizationId, "membres");
    const membersQuery = query(membersCollection, orderBy("dateAjout", "desc"));
    const snapshot = await getDocs(membersQuery);

    const users: Member[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        email: data.email,
        nomAffichage: data.nomAffichage,
        role: data.role,
        dateAjout: data.dateAjout,
        actif: data.actif ?? true,
      });
    });

    return users;
  } catch (error) {
    console.error("Erreur récupération utilisateurs:", error);
    throw error;
  }
};
