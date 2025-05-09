import { OrganizationUser } from "@/services/userService";

// Type pour les actions possibles dans l'application
export type ActionType =
  | "read:invoice"
  | "create:invoice"
  | "update:invoice"
  | "delete:invoice"
  | "read:client"
  | "create:client"
  | "update:client"
  | "delete:client"
  | "read:template"
  | "create:template"
  | "update:template"
  | "delete:template"
  | "manage:users"
  | "manage:subscription"
  | "manage:settings";

// Vérifier si un utilisateur a la permission pour une action donnée
export const checkPermission = (
  user: OrganizationUser | null,
  action: ActionType
): boolean => {
  if (!user) return false;

  // Un utilisateur inactif n'a aucune permission
  if (!user.isActive) return false;

  // Convertir le rôle français en anglais pour le traitement
  let role = user.role;
  if (typeof role === "string") {
    if (role === "editor") role = "editor";
    if (role === "viewer") role = "viewer";
  }

  // Les permissions par défaut selon le rôle
  switch (role) {
    case "admin":
      // Les administrateurs ont toutes les permissions
      return true;

    case "editor":
      // Les éditeurs peuvent lire, créer et mettre à jour, mais pas supprimer ou gérer
      return !action.startsWith("delete:") && !action.startsWith("manage:");

    case "viewer":
      // Les visiteurs peuvent uniquement lire
      return action.startsWith("read:");

    default:
      // Par défaut, aucune permission
      return false;
  }
};

// Vérifier si un utilisateur a les permissions pour accéder à une page
export const canAccessPage = (
  user: OrganizationUser | null,
  page: string
): boolean => {
  if (!user) return false;
  if (!user.isActive) return false;

  // Mappez les pages aux actions nécessaires
  switch (page) {
    case "dashboard":
      return true; // Tous les utilisateurs peuvent voir le dashboard

    case "factures":
      return checkPermission(user, "read:invoice");

    case "clients":
      return checkPermission(user, "read:client");

    case "modeles":
      return checkPermission(user, "read:template");

    case "utilisateurs":
      return checkPermission(user, "manage:users");

    case "abonnement":
      return checkPermission(user, "manage:subscription");

    case "parametres":
      return checkPermission(user, "manage:settings");

    default:
      return false;
  }
};

// Obtenir les permissions d'un utilisateur
export const getUserPermissions = (
  user: OrganizationUser | null
): ActionType[] => {
  if (!user || !user.isActive) return [];

  const allActions: ActionType[] = [
    "read:invoice",
    "create:invoice",
    "update:invoice",
    "delete:invoice",
    "read:client",
    "create:client",
    "update:client",
    "delete:client",
    "read:template",
    "create:template",
    "update:template",
    "delete:template",
    "manage:users",
    "manage:subscription",
    "manage:settings",
  ];

  // Filtrer les actions selon le rôle
  return allActions.filter((action) => checkPermission(user, action));
};

// Vérifier si un utilisateur est le propriétaire principal (compte principal)
export const isAccountOwner = (
  user: OrganizationUser | null,
  organizationId: string
): boolean => {
  if (!user) return false;

  // Simulation: Dans un système réel, vous vérifieriez si l'utilisateur
  // est le propriétaire de l'organisation dans la base de données
  return user.role === "admin";
};

// Middleware pour simuler la vérification des permissions en mode développement
export const simulatePermissionCheck = async (
  userId: string,
  action: ActionType
): Promise<boolean> => {
  // Dans un environnement réel, cela vérifierait les permissions dans la base de données
  // Pour le moment, nous simulons en mode développement

  // Simuler un délai réseau
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Toujours autoriser en mode développement
  return true;
};
