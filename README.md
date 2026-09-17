# Codejoueur

Codejoueur est une course de programmation multijoueur en temps réel : crée une salle, invite tes amis et résous des défis JavaScript avant la fin du chrono.

## Jouer

- Démo : https://codejoueur.vercel.app
- Documentation : [front-end/docs/index.html](front-end/docs/index.html)
- Politique de confidentialité : [front-end/privacy.html](front-end/privacy.html)
- Règles de sécurité : [front-end/security.html](front-end/security.html)
- Politique de signalement : [SECURITY.md](SECURITY.md)

## Fonctionnalités

- Création et partage de salles
- Lobby multijoueur en temps réel
- Défis JavaScript chronométrés
- Validation automatique des solutions
- Élimination progressive et résultats de partie
- Interface responsive avec thème sombre moderne

## Stack

- Front-end : HTML, CSS et JavaScript
- Back-end : Node.js, Express et Socket.IO
- Déploiement : Vercel + Render

## Développement local

```bash
git clone https://github.com/asraaznarulrich-glitch/Codejoueur.git
cd Codejoueur/backend
npm install
npm start
```

Le serveur écoute sur le port `3000` par défaut. Pour servir le front-end :

```bash
cd front-end
python -m http.server 8000
```

Ouvre ensuite `http://localhost:8000`. Pour connecter le client à ton serveur local, modifie l'URL Socket.IO dans `front-end/index.html`.

## Note de sécurité

Codejoueur est un projet de démonstration. Ne soumets pas de données confidentielles. Consulte [SECURITY.md](SECURITY.md) avant toute contribution liée à la sécurité.

## Contribution

Les contributions sont les bienvenues : nouveaux défis, amélioration de l'accessibilité, isolation de l'exécution du code et améliorations du mode multijoueur.
