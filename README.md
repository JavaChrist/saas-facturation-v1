# SaaS Facturation

Application SaaS de facturation complète avec gestion des clients, factures, abonnements et paiements en ligne.

## Fonctionnalités

### Gestion des factures
- Création et édition de factures avec calcul automatique des totaux
- Génération de PDF des factures
- Suivi des paiements et des échéances
- Factures récurrentes/abonnements 
- Saisie des prix TTC et calcul automatique HT/TVA

### Gestion des clients
- Base de données clients complète
- Historique des factures par client
- Informations de contact et adresses de facturation

### Abonnements et plans
- Plans tarifaires différents (Gratuit, Premium, Entreprise)
- Gestion des limites selon le plan (nombre de factures, clients, etc.)
- Interface de changement de plan/abonnement
- Paiement par carte bancaire via Stripe
- Système de désabonnement

### Authentification et utilisateurs
- Connexion/inscription
- Gestion des profils utilisateurs
- Multi-utilisateurs (selon le plan)
- Invitations pour rejoindre une organisation

### Communication
- Formulaire de contact avec le service commercial
- Système d'emails automatisés (notifications, service client)
- Intégration EmailJS pour une délivrabilité optimale

## Pages et structure

### Authentification
- `/login` - Page de connexion
- `/register` - Inscription
- `/reset-password` - Réinitialisation du mot de passe

### Dashboard
- `/dashboard` - Tableau de bord principal avec statistiques et aperçu
- `/dashboard/clients` - Gestion des clients
  - `/dashboard/clients/[id]` - Détail d'un client
  - `/dashboard/clients/ajouter` - Ajout d'un client
  - `/dashboard/clients/editer/[id]` - Modification d'un client
- `/dashboard/factures` - Gestion des factures
  - `/dashboard/factures/[id]` - Détail d'une facture
  - `/dashboard/factures/creer` - Création d'une facture
  - `/dashboard/factures/editer/[id]` - Modification d'une facture
- `/dashboard/factures/recurrentes` - Gestion des factures récurrentes
  - `/dashboard/factures/recurrentes/creer` - Création d'une facture récurrente
  - `/dashboard/factures/recurrentes/editer/[id]` - Modification d'une facture récurrente
- `/dashboard/abonnement` - Gestion de l'abonnement et plan tarifaire
- `/dashboard/parametres` - Configuration du compte et de l'application
- `/dashboard/utilisateurs` - Gestion des utilisateurs (plans Entreprise)
- `/dashboard/notifications` - Centre de notifications

### Public 
- `/` - Page d'accueil/landing page
- `/pricing` - Plans et tarifs
- `/contact` - Formulaire de contact
- `/invoice/[token]` - Vue publique d'une facture partagée

## Configuration technique

### Prérequis
- Node.js 18+ et npm/yarn
- Compte Firebase (Firestore, Authentication, Storage)
- Compte EmailJS pour l'envoi d'emails
- Compte Stripe pour les paiements (optionnel en développement)

### Installation

1. Cloner le dépôt
```bash
git clone https://github.com/votre-username/saas-facturation.git
cd saas-facturation
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
Créer un fichier `.env.local` à la racine du projet :
```
NEXT_PUBLIC_FIREBASE_API_KEY=votre_cle_api
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_domaine.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_projet_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=votre_cle_stripe_pub
```

4. Démarrer le serveur de développement
```bash
npm run dev
```

### Configuration de l'envoi d'emails

L'application utilise EmailJS pour l'envoi d'emails directement depuis le client :

1. Créer un compte sur [EmailJS](https://www.emailjs.com/)
2. Créer un service email dans votre compte EmailJS
3. Créer deux templates : un pour les notifications admin et un pour les confirmations client
4. Configurer les ID de service et templates dans `src/services/emailService.ts`
5. S'assurer que la clé publique est correctement configurée dans `src/app/providers.tsx`

### Déploiement

L'application peut être déployée sur Vercel en quelques étapes :

1. Connecter le dépôt GitHub à Vercel
2. Configurer les variables d'environnement dans Vercel
3. Déployer automatiquement à chaque push sur la branche principale

## Sécurité et bonnes pratiques

- Authentification sécurisée via Firebase Auth
- Règles Firestore pour contrôler l'accès aux données
- Protection contre les injections et XSS
- Ne stockez jamais de clés API ou secrets dans le code source
- Utilisez les variables d'environnement et Firebase Config

## Maintenance et support

Pour signaler un bug ou proposer une fonctionnalité :
- Ouvrir une issue sur GitHub
- Contacter le support via l'application

## Licence

Ce projet est sous licence [MIT](https://opensource.org/licenses/MIT).

## Auteur : Christian Grohens (@JavaChrist)