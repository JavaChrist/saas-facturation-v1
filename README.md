# 🚀 SaaS Facturation - Application de facturation moderne

## 📋 Description

Application SaaS de facturation complète construite avec Next.js, Firebase et Stripe. Cette solution moderne permet aux entreprises de gérer facilement leurs clients, factures, abonnements et équipes avec une interface intuitive et des fonctionnalités avancées.

## ✨ Fonctionnalités principales

### 🎯 Gestion de facturation

- ✅ **Création de factures** avec éditeur moderne
- ✅ **Gestion des clients** complète avec historique
- ✅ **Templates personnalisables** avec logo et branding
- ✅ **Génération PDF automatique** avec modèles professionnels
- ✅ **Suivi des paiements** et relances automatiques
- ✅ **Factures récurrentes** avec gestion automatisée

### 👥 Collaboration multi-utilisateurs

- ✅ **Système d'invitations intelligent** avec workflow complet
- ✅ **Gestion des rôles** (Admin, Éditeur, Visiteur)
- ✅ **Permissions granulaires** par fonctionnalité
- ✅ **Activation/désactivation** des utilisateurs
- ✅ **Suppression sécurisée** avec confirmations

### 📧 Communication professionnelle

- ✅ **Envoi d'emails via Resend** (migration EmailJS terminée)
- ✅ **Templates d'emails personnalisés** pour tous types
- ✅ **Signatures personnalisées** par utilisateur
- ✅ **Notifications automatiques** avec centre unifié
- ✅ **Système de contact commercial** intégré

### 💳 Abonnements et paiements

- ✅ **Intégration Stripe complète** pour les paiements
- ✅ **Plans flexibles** (Gratuit, Premium, Entreprise)
- ✅ **Gestion des limites** par plan automatisée
- ✅ **Webhooks Stripe** pour synchronisation temps réel
- ✅ **Interface de gestion d'abonnement** moderne

### 🎨 Interface utilisateur

- ✅ **Design moderne et responsive** avec Tailwind CSS
- ✅ **Mode sombre/clair** avec next-themes
- ✅ **Dashboard interactif** avec graphiques temps réel
- ✅ **Composants modulaires** et réutilisables
- ✅ **Notifications toast** et modales élégantes

## 🛠️ Technologies utilisées

| Catégorie       | Technologies                                   |
| --------------- | ---------------------------------------------- |
| **Frontend**    | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Backend**     | Firebase (Firestore, Auth, Functions)          |
| **Paiements**   | Stripe (Checkout, Webhooks, Subscriptions)     |
| **Emails**      | Resend API avec templates HTML                 |
| **PDF**         | jsPDF avec templates personnalisés             |
| **Déploiement** | Vercel avec optimisations production           |
| **Thèmes**      | next-themes avec persistance                   |

## 🚀 Installation et configuration

### Prérequis

- Node.js 18+
- Compte Firebase
- Compte Stripe
- Compte Resend

### 1️⃣ Installation

```bash
git clone https://github.com/votre-repo/saas-facturation-v1.git
cd saas-facturation-v1
npm install
```

### 2️⃣ Configuration des variables d'environnement

Créez un fichier `.env.local` :

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (pour les API)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_PREMIUM_PRICE_ID=price_xxxxx
STRIPE_ENTREPRISE_PRICE_ID=price_xxxxx
STRIPE_FREE_PRICE_ID=price_xxxxx

# Resend Configuration
RESEND_API_KEY=re_xxxxx

# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_URL=http://localhost:3000
```

### 3️⃣ Configuration Firebase

1. Créez un projet Firebase
2. Activez Authentication (Google, Email/Password)
3. Configurez Firestore avec les règles appropriées
4. Générez une clé de service pour Firebase Admin

### 4️⃣ Configuration Stripe

1. Créez des produits et prix dans votre dashboard Stripe
2. Configurez les webhooks Stripe vers `/api/webhooks/stripe`
3. Notez les IDs des prix pour vos plans

### 5️⃣ Lancement

```bash
# Développement
npm run dev

# Production
npm run build
npm start
```

## 🌐 Déploiement sur Vercel

### Déploiement automatique

1. **Connectez votre repository à Vercel**
2. **Configurez les variables d'environnement** (voir `VERCEL_ENV_SETUP.md`)
3. **Déployez** automatiquement

### Variables d'environnement Vercel

Ajoutez toutes les variables dans le dashboard Vercel :

- Sections : Production, Preview, Development
- Variables critiques : voir `VERCEL_ENV_SETUP.md`

### Optimisations incluses

- ✅ **Build optimisé** avec exclusions intelligentes
- ✅ **Gestion d'erreurs gracieuse** pour le build
- ✅ **Variables d'environnement sécurisées**
- ✅ **Firebase Admin optimisé** pour Vercel
- ✅ **Suspense boundaries** pour les pages dynamiques

## 📁 Structure du projet

```
src/
├── app/                    # Pages Next.js App Router
│   ├── api/               # API Routes
│   ├── dashboard/         # Interface utilisateur connectée
│   ├── invitation/        # Page d'invitation utilisateurs
│   └── login/             # Authentification
├── components/            # Composants React réutilisables
│   ├── dashboard/         # Composants spécifiques au dashboard
│   ├── notifications/     # Système de notifications
│   └── ui/               # Composants UI génériques
├── lib/                  # Configuration et utilitaires
├── services/             # Services métier
└── types/               # Types TypeScript
```

## 🔒 Sécurité

- ✅ **Authentification Firebase** sécurisée
- ✅ **Règles Firestore** restrictives
- ✅ **Validation côté serveur** pour toutes les APIs
- ✅ **Webhooks Stripe** avec vérification de signature
- ✅ **Variables d'environnement** protégées
- ✅ **Permissions utilisateurs** granulaires

## 📊 Monitoring et performances

- ✅ **Logs d'erreurs** minimaux et pertinents
- ✅ **Code optimisé** sans logs de debug en production
- ✅ **Gestion d'erreurs** gracieuse partout
- ✅ **Performance optimisée** avec lazy loading
- ✅ **Cache intelligent** pour les données fréquentes

## 🆕 Dernières améliorations

### ✨ Code Production-Ready

- 🧹 **Nettoyage complet** des logs de debug
- 🗑️ **Suppression** des fichiers de test inutiles
- ⚡ **Optimisation** des performances et du build
- 🔧 **Configuration Vercel** complète et documentée

### 🎯 Fonctionnalités récentes

- 📧 **Migration Resend** terminée (EmailJS retiré)
- 👥 **Système d'invitations** complet avec workflow intelligent
- ✏️ **Signatures personnalisées** pour tous les utilisateurs
- 🎨 **Thèmes cohérents** avec next-themes dans toute l'app
- 🚀 **Déploiement optimisé** pour Vercel avec guides complets

## 🤝 Support et maintenance

- 📧 **Support technique** : support@javachrist.fr
- 📚 **Documentation** : Guides complets inclus
- 🐛 **Issues** : Via GitHub Issues
- 🔄 **Mises à jour** : Déploiement continu avec Vercel

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

**🎉 Prêt pour la production avec un code propre et optimisé !**
