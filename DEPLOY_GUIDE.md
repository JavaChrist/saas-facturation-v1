# 🚀 Guide de déploiement - SaaS Facturation

## ✅ Corrections apportées pour Vercel

### 🔧 Problèmes résolus :

1. **❌ `useSearchParams()` sans Suspense**

   - ✅ Page `/invitation` refactorisée avec pattern Suspense
   - ✅ Même structure que la page login

2. **❌ Firebase Admin non initialisé**

   - ✅ Configuration Firebase Admin sécurisée
   - ✅ Évite l'initialisation pendant le build
   - ✅ Gestion d'erreur gracieuse

3. **❌ Variables d'environnement manquantes**
   - ✅ Guide de configuration créé (`VERCEL_ENV_SETUP.md`)
   - ✅ Variables critiques identifiées

## 📋 Checklist de déploiement

### 🔥 1. Configuration Firebase Admin

Créer un service account Firebase :

```bash
# Dans Firebase Console > Project Settings > Service Accounts
# Générer une nouvelle clé privée
# Télécharger le fichier JSON
```

Variables à ajouter dans Vercel :

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@projet.iam.gserviceaccount.com
```

### 📧 2. Configuration Resend

Variables à ajouter dans Vercel :

```
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### 💳 3. Configuration Stripe

Variables **manquantes** actuellement :

```
STRIPE_PREMIUM_PRICE_ID=price_xxxxxxxxxx
STRIPE_ENTREPRISE_PRICE_ID=price_xxxxxxxxxx
STRIPE_FREE_PRICE_ID=price_xxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx
```

### 🌐 4. URLs de base

Variables à ajouter :

```
NEXT_PUBLIC_BASE_URL=https://votre-app.vercel.app
NEXT_PUBLIC_URL=https://votre-app.vercel.app
```

## 🚀 Étapes de déploiement

1. **Push les corrections vers GitHub**
2. **Configurer les variables d'environnement dans Vercel**
3. **Redéployer le projet**
4. **Tester les fonctionnalités critiques**

## 🧪 Tests post-déploiement

### ✅ Fonctionnalités à vérifier :

- [ ] **Page d'accueil** charge correctement
- [ ] **Connexion/inscription** fonctionne
- [ ] **Page invitation** (`/invitation`) fonctionne
- [ ] **Dashboard** accessible après connexion
- [ ] **Envoi d'emails** via Resend
- [ ] **API subscription** fonctionne
- [ ] **Paiements Stripe** opérationnels

### 🐛 Debug en cas de problème :

1. **Vérifier les logs Vercel**
2. **Contrôler les variables d'environnement**
3. **Tester les API routes individuellement**
4. **Vérifier Firebase Admin dans les logs**

## 📊 Monitoring

### 🔍 Points à surveiller :

- **Temps de build** : ~45 secondes attendu
- **Erreurs Firebase Admin** : doivent être nulles
- **Variables undefined** : doivent être résolues
- **Pages SSG** : doivent se générer sans erreur

## 🆘 Support

Si problèmes persistent :

1. **Vérifier VERCEL_ENV_SETUP.md**
2. **Comparer avec variables de développement**
3. **Tester localement avec `vercel dev`**
4. **Consulter logs détaillés Vercel**

---

## 🎯 Variables critiques manquantes identifiées

D'après les logs de déploiement :

```
❌ STRIPE_PREMIUM_PRICE_ID: undefined
❌ STRIPE_ENTREPRISE_PRICE_ID: undefined
❌ STRIPE_FREE_PRICE_ID: undefined
❌ NEXT_PUBLIC_URL: undefined
```

**👉 Configurez ces variables en priorité pour un déploiement réussi !**
