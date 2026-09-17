# Codejoueur

Codejoueur est un mini-jeu multijoueur de programmation dans lequel plusieurs joueurs doivent résoudre des défis de code en temps limité. Le but est simple : créer ou rejoindre une salle, lancer une partie, puis corriger des fonctions JavaScript avant que le temps ne soit écoulé.

Une idée de jeu inspirée des concours de code, avec un système de salles, de rounds, et d'élimination progressive.

## Live demo

- Site : https://codejoueur.vercel.app
- Backend : https://codejoueur-backend.onrender.com

## Fonctionnalités

- Création d'une salle de jeu
- Rejoindre une salle avec un code partagé
- Lobby avec liste des joueurs
- Deux manches de défis de code
- Timer par round
- Vérification automatique des fonctions JavaScript soumises
- Élimination des joueurs qui ne répondent pas à temps
- Score et résultats finaux
- Interface web simple et rapide

## Stack technique

- Front-end : HTML, CSS, JavaScript
- Back-end : Node.js, Express
- Temps réel : Socket.IO
- Déploiement : Vercel + Render

## Structure du projet

```text
Codejoueur/
├── backend/
│   ├── package.json
│   └── server.js
├── front-end/
│   └── index.html
├── README.md
└── .gitignore
```

## Comment ça marche

1. Un joueur crée une salle depuis l'interface web.
2. Les autres joueurs rejoignent avec le code de la salle.
3. L'hôte lance la partie.
4. Une manche commence avec un énoncé de défi et un chrono.
5. Chaque joueur écrit une solution JavaScript dans le navigateur.
6. Le backend vérifie la fonction avec des tests automatiques.
7. Les joueurs qui ne répondent pas correctement sont éliminés.
8. La partie continue jusqu'à la fin des manches.

## Défis de code

Les problèmes actuels sont des mini-exercices JavaScript, par exemple :

- addition de deux nombres
- multiplication de deux nombres

Le backend exécute le code envoyé par le joueur dans un environnement contrôlé et vérifie qu'il retourne le bon résultat.

## Prérequis

Avant de lancer le projet localement, assure-toi d'avoir installé :

- Node.js (version 18 ou supérieure recommandée)
- npm

## Installation

Clone le projet :

```bash
git clone https://github.com/asraaznarulrich-glitch/Codejoueur.git
cd Codejoueur
```

### Backend

```bash
cd backend
npm install
npm start
```

Le serveur démarre sur le port 3000 par défaut.

### Front-end

Le front-end est une page HTML statique.

Tu peux l'ouvrir directement dans le navigateur :

```bash
cd front-end
# puis ouvrir index.html
```

Si tu veux le servir via un serveur local, tu peux aussi utiliser un mini serveur HTTP simple :

```bash
python -m http.server 8000
```

Puis ouvre : http://localhost:8000

## Configuration réseau

Le front-end est actuellement branché sur le backend hébergé :

```javascript
const socket = io("https://codejoueur-backend.onrender.com");
```

Tu peux modifier cette URL dans `front-end/index.html` si tu veux tester un backend local.

## Variables d'environnement

Le backend n'utilise pas encore de variables d'environnement complexes. Le port est configurable via :

```bash
PORT=3000
```

## Contribution

Les contributions sont les bienvenues. Voici quelques idées :

- ajouter plus de défis de code
- améliorer l'interface utilisateur
- ajouter des systèmes de classement
- gérer plusieurs salles plus robustement
- ajouter un mode solo / duel

## Licence

Ce projet n'a pas encore de licence explicite. Si tu veux l'utiliser en production ou le partager publiquement, il est conseillé d'ajouter une licence avant publication.

## Auteur

Projet développé par asraaznarulrich-glitch.

## Remerciements

Merci à tous ceux qui participent à la conception, au test et à l'amélioration du jeu.

---

Codejoueur est un projet simple, rapide à lancer et idéal pour démontrer un gameplay de type "code race" en temps réel.
