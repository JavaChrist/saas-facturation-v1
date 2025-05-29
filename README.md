# 📊 SaaS Facturation

> **Application SaaS de facturation complète avec gestion avancée des utilisateurs, emails automatisés et interface moderne**

Une solution de facturation professionnelle tout-en-un avec gestion multi-utilisateurs, système d'invitations, emails automatisés et interface responsive avec thème sombre/clair.

## ✨ Fonctionnalités

### 📄 Gestion des factures

- ✅ Création et édition de factures avec calcul automatique des totaux
- ✅ Génération de PDF des factures avec templates personnalisés
- ✅ Suivi des paiements et des échéances
- ✅ Factures récurrentes/abonnements automatisés
- ✅ Saisie des prix TTC et calcul automatique HT/TVA
- ✅ Envoi automatique par email avec templates professionnels
- ✅ Historique complet des envois et interactions

### 👥 Gestion des clients

- ✅ Base de données clients complète avec recherche avancée
- ✅ Historique des factures par client
- ✅ Informations de contact et adresses de facturation multiples
- ✅ Emails secondaires pour l'envoi de factures
- ✅ Synchronisation automatique des emails par défaut

### 🏢 Gestion multi-utilisateurs avancée

- ✅ **Système d'invitations par email** avec workflow complet
- ✅ **3 niveaux de rôles** : Administrateur, Éditeur, Visiteur
- ✅ **Page d'invitation dédiée** (`/invitation`) avec authentification intelligente
- ✅ **Modales modernes** pour toutes les actions utilisateurs
- ✅ **Gestion des limites** selon le plan d'abonnement
- ✅ **Activation/désactivation** et suppression sécurisée des utilisateurs

### 💰 Abonnements et plans

- ✅ Plans tarifaires différents (Gratuit, Premium, Entreprise)
- ✅ Gestion des limites selon le plan (factures, clients, utilisateurs)
- ✅ Interface de changement de plan/abonnement
- ✅ Paiement par carte bancaire via Stripe
- ✅ Système de désabonnement et gestion du cycle de vie

### 🔐 Authentification et sécurité

- ✅ Connexion/inscription avec Google et email/mot de passe
- ✅ Gestion des profils utilisateurs avec signatures personnalisées
- ✅ Système de rôles et permissions granulaires
- ✅ Protection des routes et données par utilisateur
- ✅ Réinitialisation de mot de passe sécurisée

### 📧 Système d'emails unifié (Resend)

- ✅ **Migration complète vers Resend** pour une délivrabilité optimale
- ✅ **Templates HTML professionnels** pour tous types d'emails
- ✅ **Emails automatisés** : factures, invitations, confirmations
- ✅ **Gestion intelligente** : mode développement vs production
- ✅ **Support multi-destinataires** avec gestion des échecs
- ✅ **Historique des envois** et tracking des emails

### 🎨 Interface utilisateur moderne

- ✅ **Design system cohérent** avec composants réutilisables
- ✅ **Thème sombre/clair** via next-themes
- ✅ **Interface responsive** pour mobile, tablette et desktop
- ✅ **Animations et transitions** fluides
- ✅ **Notifications temps réel** avec centre de notifications
- ✅ **Modales modernes** avec confirmations sécurisées

## 🗂️ Structure des pages

### 🔐 Authentification

- `/login` - Page de connexion (toujours en mode clair)
- `/invitation` - **[NOUVEAU]** Page d'acceptation d'invitation avec workflow intelligent

### 📊 Dashboard

- `/dashboard` - Tableau de bord avec statistiques et graphiques
- `/dashboard/clients` - Gestion complète des clients
- `/dashboard/factures` - Gestion des factures avec envoi email
- `/dashboard/factures/recurrentes` - Factures récurrentes automatisées
- `/dashboard/utilisateurs` - **[AMÉLIORÉ]** Gestion avancée des utilisateurs
- `/dashboard/profil` - **[NOUVEAU]** Gestion du profil avec signatures personnalisées
- `/dashboard/abonnement` - Gestion de l'abonnement avec contact commercial
- `/dashboard/parametres` - Configuration de l'entreprise et de l'application
- `/dashboard/notifications` - Centre de notifications temps réel

### 🌐 Pages publiques

- `/` - Page d'accueil avec présentation du produit
- `/contact` - Formulaire de contact avec email automatique
- `/invoice/[token]` - Vue publique partageable des factures

## 🛠️ Configuration technique

### 📋 Prérequis

- **Node.js 18+** et npm/yarn
- **Compte Firebase** (Firestore, Authentication, Storage)
- **Compte Resend** pour l'envoi d'emails
- **Compte Stripe** pour les paiements (optionnel en développement)

### 🚀 Installation

1. **Cloner le dépôt**

```bash
git clone https://github.com/votre-username/saas-facturation.git
cd saas-facturation
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configurer les variables d'environnement**
   Créer un fichier `.env.local` à la racine du projet :

```env
# Configuration Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=votre_cle_api
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_domaine.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_projet_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id

# Configuration Resend (pour les emails)
RESEND_API_KEY=votre_cle_resend

# Configuration Stripe (optionnel)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=votre_cle_stripe_pub

# URL de base pour les liens d'invitation
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

4. **Démarrer le serveur de développement**

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### 📧 Configuration du système d'emails (Resend)

**Migration d'EmailJS vers Resend** pour une meilleure délivrabilité :

1. **Créer un compte [Resend](https://resend.com/)**
2. **Ajouter et vérifier votre domaine** dans Resend
3. **Générer une clé API** et l'ajouter à `.env.local`
4. **Configurer les DNS** pour l'authentification des emails

**🎯 Fonctionnalités emails :**

- ✅ **Emails de factures** avec PDF en pièce jointe
- ✅ **Invitations utilisateurs** avec liens sécurisés
- ✅ **Contact commercial** avec confirmations automatiques
- ✅ **Templates responsives** avec design professionnel
- ✅ **Mode développement** : tous les emails redirigés vers l'adresse vérifiée

### 🔥 Configuration Firebase

1. **Créer un projet Firebase**
2. **Activer Firestore** et configurer les règles de sécurité
3. **Activer Authentication** (Google + Email/Password)
4. **Activer Storage** pour les fichiers PDF
5. **Importer les règles Firestore** depuis `firestore.rules`

**Structure des collections :**

```
├── users/{userId}
├── organizations/{orgId}
│   └── membres/{userId}
├── invitations/{invitationId}
├── factures/{factureId}
├── clients/{clientId}
├── parametres/{userId}
└── notifications/{notificationId}
```

### 🎨 Configuration des thèmes

L'application utilise **next-themes** pour la gestion des thèmes :

```javascript
// Thèmes disponibles
- light (par défaut)
- dark
- system (suit le thème de l'OS)
```

**Note :** La page de login reste toujours en mode clair pour une cohérence visuelle.

## 🚀 Déploiement

### Vercel (Recommandé)

1. **Connecter le dépôt** à Vercel
2. **Configurer les variables d'environnement** dans le dashboard Vercel
3. **Déployer automatiquement** à chaque push sur `main`

### Autres plateformes

L'application est compatible avec :

- **Netlify**
- **Railway**
- **AWS Amplify**
- **DigitalOcean App Platform**

## 🔒 Sécurité et bonnes pratiques

### 🛡️ Mesures de sécurité

- ✅ **Authentification sécurisée** via Firebase Auth
- ✅ **Règles Firestore** strictes pour l'accès aux données
- ✅ **Protection CSRF** et validation des inputs
- ✅ **Chiffrement des données** sensibles
- ✅ **Validation côté serveur** pour toutes les API

### 📋 Bonnes pratiques

- ✅ **Variables d'environnement** pour tous les secrets
- ✅ **Code splitting** et optimisation des performances
- ✅ **Tests automatisés** (à implémenter)
- ✅ **Monitoring des erreurs** avec logging avancé
- ✅ **Sauvegarde automatique** des données Firestore

## 🧪 Tests et qualité

```bash
# Lancer les tests (à implémenter)
npm run test

# Vérifier le linting
npm run lint

# Construire pour la production
npm run build
```

## 📚 Technologies utilisées

### Frontend

- **Next.js 14** (App Router)
- **React 18** avec Hooks
- **TypeScript** pour la sécurité des types
- **Tailwind CSS** pour le styling
- **next-themes** pour la gestion des thèmes

### Backend & Services

- **Firebase** (Firestore, Auth, Storage)
- **Resend** pour les emails
- **Stripe** pour les paiements
- **API Routes Next.js** pour les endpoints

### Outils de développement

- **ESLint** et **Prettier** pour la qualité du code
- **Git** avec conventions de commit
- **VS Code** avec extensions recommandées

## 📞 Support et maintenance

### 🐛 Signaler un bug

1. Vérifier les [issues existantes](https://github.com/votre-username/saas-facturation/issues)
2. Créer une nouvelle issue avec le template approprié
3. Inclure les étapes de reproduction et l'environnement

### 💡 Proposer une fonctionnalité

1. Ouvrir une **Feature Request** sur GitHub
2. Décrire le besoin et l'impact attendu
3. Proposer une solution si possible

### 📧 Contact

- **Email :** support@javachrist.fr
- **Site web :** [javachrist.fr](https://javachrist.fr)
- **GitHub :** [@JavaChrist](https://github.com/JavaChrist)

## 📈 Roadmap

### 🎯 Prochaines fonctionnalités

- [ ] **API REST complète** pour intégrations tierces
- [ ] **Dashboard analytics** avancé avec KPIs
- [ ] **Exports comptables** (FEC, CSV)
- [ ] **Multi-devises** et gestion des taux de change
- [ ] **Mobile app** React Native
- [ ] **Intégrations** (Zapier, Make, etc.)

### 🔄 Améliorations techniques

- [ ] **Tests unitaires** et d'intégration
- [ ] **CI/CD** avec GitHub Actions
- [ ] **Monitoring** avec Sentry
- [ ] **Performance** avec Web Vitals
- [ ] **SEO** et optimisation

## 📄 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**Christian Grohens** ([@JavaChrist](https://github.com/JavaChrist))

- 🌐 Site web : [javachrist.fr](https://javachrist.fr)
- 📧 Email : contact@javachrist.fr
- 💼 LinkedIn : [Christian Grohens](https://linkedin.com/in/christian-grohens)

---

<div align="center">

**⭐ Si ce projet vous aide, n'hésitez pas à lui donner une étoile !**

[🚀 Démo en ligne](https://votre-demo.vercel.app) • [📖 Documentation](https://docs.votre-site.com) • [🐛 Signaler un bug](https://github.com/votre-username/saas-facturation/issues)

</div>
