# Politique de sécurité Codejoueur

## Signaler une vulnérabilité

Merci de ne pas publier d'informations exploitables dans une issue publique. Pour signaler une vulnérabilité, ouvre un signalement privé via l'onglet **Security** du dépôt GitHub ou contacte le propriétaire du projet.

Inclue si possible :

- une description claire du problème ;
- les étapes minimales pour le reproduire ;
- l'impact potentiel ;
- une preuve de concept non destructive ;
- une proposition de correction, si tu en as une.

## Règles de divulgation responsable

- Ne teste pas le service de démonstration avec des charges perturbatrices.
- Ne récupère, ne modifie et ne supprime aucune donnée qui ne t'appartient pas.
- Laisse au mainteneur un délai raisonnable pour analyser et corriger le problème.
- Ne partage pas publiquement de secrets ou de données personnelles.

## Limite importante

Les solutions JavaScript sont actuellement évaluées côté serveur avec `new Function`. Ce mécanisme n'est pas un bac à sable de production pour du code non fiable. Avant un usage public à grande échelle, l'exécution doit être isolée dans un environnement dédié avec limites de temps et de mémoire, permissions minimales et absence d'accès réseau.
