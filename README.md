# SaaS Facturation

## Description

SaaS Facturation est une application web de gestion de facturation destinée aux entrepreneurs et aux PME. Elle permet la création, la gestion et l'envoi de factures de manière simplifiée, avec un suivi des paiements et des relances automatiques.

## Fonctionnalités principales

- **Gestion des clients** : Ajout, modification et suppression des clients.
- **Création de factures** : Génération de factures professionnelles en quelques clics.
- **Suivi des paiements** : Statut des paiements (payé, en attente, en retard).
- **Relances automatiques** : Notifications pour les factures en attente.
- **Export PDF** : Téléchargement et envoi des factures au format PDF.
- **Tableau de bord** : Aperçu rapide des revenus, factures impayées et statistiques.
- **Multi-utilisateurs** : Gestion des accès selon les rôles (administrateur, comptable, employé).
- **Sauvegarde Cloud** : Stockage sécurisé des documents et accès depuis n'importe où.
- **Paiement en ligne (Stripe)** : Intégration de Stripe pour permettre aux clients de payer leurs factures directement depuis l'application.

## Technologies utilisées

- **Front-end** : React (Next.js) avec TypeScript
- **Back-end** : Firebase (Auth, Firestore, Storage, Functions)
- **Paiement** : Stripe API
- **UI/UX** : TailwindCSS + ShadCN
- **Déploiement** : Vercel

## Installation

### 1. Cloner le projet
```sh
- **git clone https://github.com/ton-repo/saas-facturation.git**
- **cd saas-facturation**

### 2. Installer les dépendances
- **sh**
- **Copier**
- **Modifier**
- **npm install**

### 3. Configurer Firebase
- **Créer un projet Firebase**
- **Activer l'authentification-(Email/Google)**
- **Configurer Firestore et Storage**
- **Récupérer les clés d'API et les ajouter dans un fichier .env.local**

### 4. Configurer Stripe
- **Créer un compte Stripe et obtenir les clés API**
- **Ajouter les clés API Stripe (STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY) dans le fichier .env.local**
- **Configurer un webhook pour gérer les paiements**

### 5. Lancer l'application

- **sh**
- **Copier**
- **Modifier**
- **npm run dev**
- **Déploiement**
- **L'application est déployée sur Vercel. Pour déployer**

- **sh**
- **Copier**
- **Modifier**
- **vercel**
- **Assurez-vous d'avoir configuré les variables d'environnement dans Vercel.**

- **Contribution**
- **Les contributions sont les bienvenues !**

- **Forker le projet**
- **Créer une branche feature/ma-fonctionnalite**
- **Faire une PR**
- **Licence**
- **Ce projet est sous licence MIT.**

## Auteur : Christian Grohens (@JavaChrist)