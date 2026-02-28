# mSearch

**mSearch** est un navigateur web moderne, rapide et axé sur la confidentialité, conçu pour bloquer efficacement les traqueurs publicitaires et protéger la vie privée des utilisateurs. Basé sur une architecture Electron robuste, il propose une gestion innovante de la navigation par tâches et par onglets.

---

## 📊 Informations sur la version
- **Version actuelle :** `[VERSION]` (ex: 26.8.0)
- **Moteur (Electron) :** `[ENGINE_VERSION]` (ex: 40.0.0)

---

## 🚀 Fonctionnalités principales

* **Blocage natif des traqueurs** : Une protection intégrée pour une navigation plus saine et privée.
* **Gestion par Tâches (Tasks)** : Organisez vos sessions de navigation en groupes distincts pour mieux séparer vos activités.
* **Mode Focus** : Un mode dédié pour minimiser les distractions et rester concentré sur l'essentiel.
* **Outils intégrés** :
    * Lecteur PDF complet utilisant `pdfjs-dist`.
    * Système de traduction intégré via `@browsermt/bergamot-translator`.
    * Gestionnaire de téléchargements atomique.
* **Performance** : Utilisation de `WebContentsView` pour un rendu fluide et une meilleure gestion des fenêtres.

## 🛠 Détails techniques

* **Moteur** : Electron (Chromium).
* **Langages** : JavaScript (Node.js), HTML, CSS.
* **Base de données** : Dexie.js pour le stockage local des données.

## 📦 Installation et Développement

### Prérequis
Assurez-vous d'avoir Node.js et npm installés sur votre machine.

### Installation des dépendances
```bash
npm install
