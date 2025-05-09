# Configuration des règles de sécurité Firestore

Pour résoudre les problèmes de permission "Missing or insufficient permissions", vous devez mettre à jour les règles de sécurité de votre base de données Firestore.

## Comment mettre à jour les règles

1. Allez sur la [Console Firebase](https://console.firebase.google.com/)
2. Sélectionnez votre projet "facturation-saas"
3. Dans le menu de gauche, cliquez sur "Firestore Database"
4. Cliquez sur l'onglet "Règles"
5. Remplacez les règles existantes par celles ci-dessous
6. Cliquez sur "Publier"

## Règles de sécurité recommandées

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Fonction pour vérifier si l'utilisateur est authentifié
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Fonction pour vérifier si l'utilisateur est le propriétaire
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Règle générale - par défaut tout est refusé
    match /{document=**} {
      allow read, write: if false;
    }

    // Règles pour la collection users
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Règles pour la collection factures
    match /factures/{factureId} {
      allow read, update, delete: if isAuthenticated() && 
                                   request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() && 
                    request.auth.uid == request.resource.data.userId;
    }

    // Règles pour la collection clients
    match /clients/{clientId} {
      allow read, update, delete: if isAuthenticated() && 
                                  request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() && 
                    request.auth.uid == request.resource.data.userId;
    }

    // Règles pour la collection facturesRecurrentes
    match /facturesRecurrentes/{factureId} {
      allow read, update, delete: if isAuthenticated() && 
                                  request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() && 
                    request.auth.uid == request.resource.data.userId;
    }

    // Règles pour la collection modelesFacture
    match /modelesFacture/{modeleId} {
      allow read, update, delete: if isAuthenticated() && 
                                  request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() && 
                    request.auth.uid == request.resource.data.userId;
    }

    // Règles pour la collection notifications
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && 
                  request.auth.uid == resource.data.userId;
      allow create, update, delete: if isAuthenticated() &&
                                   (request.auth.uid == resource.data.userId ||
                                    (request.resource.data != null && 
                                     request.auth.uid == request.resource.data.userId));
    }

    // Règles pour la collection organizations ou organizations
    match /organizations/{orgId} {
      allow read, update, delete: if isAuthenticated() && 
                                 request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() && 
                    request.auth.uid == request.resource.data.userId;
    }
    
    // Alias pour éviter les erreurs de nom (organizations vs organisations)
    match /organisations/{orgId} {
      allow read, update, delete: if isAuthenticated() && 
                                 request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() && 
                    request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## Comment créer un fichier firestore.rules

Copiez les règles ci-dessus dans un fichier nommé `firestore.rules` à la racine de votre projet :

1. Ouvrez l'explorateur de fichiers
2. Créez un fichier nommé `firestore.rules` 
3. Collez tout le contenu des règles ci-dessus
4. Déployez les règles avec la commande:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Alternative temporaire dans le code

En attendant de mettre à jour les règles Firestore, nous avons mis en place un contournement temporaire dans le code avec `db._config.experimentalForceLongPolling = true` dans le fichier `src/lib/firebase.ts`.

Cette solution n'est pas idéale pour la production, alors assurez-vous de configurer correctement les règles de sécurité dès que possible.

## Comment vérifier si les règles fonctionnent

1. Ouvrez votre application
2. Essayez de supprimer une facture
3. Si aucune erreur "Missing or insufficient permissions" n'apparaît, c'est que les règles fonctionnent correctement
4. Alternativement, utilisez la page de débogage `/dashboard/debug` pour tester les opérations sur différentes collections
