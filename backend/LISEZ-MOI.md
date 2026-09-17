# Codejoueur — backend sécurisé (sandbox isolated-vm)

## Ce qui a changé

Avant : `new Function(code + "; return add;")` exécutait le code du joueur
**directement dans ton processus Node**, sans aucune protection.

Maintenant : chaque soumission tourne dans un **V8 Isolate séparé** via
`isolated-vm` — un environnement complètement isolé de ton serveur, sans
accès à `require`, `process`, `fs`, le réseau, ou tout autre objet de ton
application.

Protections ajoutées :
- **Timeout d'1 seconde** — bloque les boucles infinies (`while(true){}`)
- **Limite mémoire de 8 Mo** — bloque les tentatives de saturation mémoire
- **Aucune référence d'objet ne traverse la frontière** — tout passe par
  `JSON.stringify`/`JSON.parse`, ce qui évite la classe de faille récente
  découverte dans le "glue code" C++ d'isolated-vm (CVE liée à la
  sérialisation d'objets complexes)
- **Limite de taille du code soumis** (5000 caractères) pour éviter l'abus
- **Plusieurs cas de test par manche** (3 au lieu de 2) pour réduire le
  risque de solutions qui trichent en codant en dur une seule valeur

## Installation

```bash
npm install isolated-vm
```

⚠️ `isolated-vm` compile un module natif (C++) à l'installation. Sur Render,
ça fonctionne nativement (Render supporte les build tools nécessaires), mais
si l'installation échoue en local, assure-toi d'avoir Python et un compilateur
C++ installés (`build-essential` sur Linux, Xcode Command Line Tools sur Mac).

**Important** : garde `isolated-vm` à jour (`npm update isolated-vm`
régulièrement) — une faille critique a été corrigée récemment dans le
projet, comme dans tout logiciel de sandboxing. Aucun sandbox n'est
"définitivement sûr" ; c'est une histoire de mise à jour continue.

## Limites de cette approche (à connaître)

Ce sandbox est largement suffisant pour ton cas d'usage actuel (défis
courts, type add/multiply, code JS simple). Ce n'est PAS une garantie
absolue à 100 % — pour un produit à très grande échelle avec des enjeux de
sécurité plus élevés, l'étape suivante serait l'isolation par conteneur
(ex: exécuter chaque soumission dans un conteneur Docker jetable), comme
le recommandent maintenant les mainteneurs eux-mêmes pour du code
totalement non fiable. Mais pour ton lancement, isolated-vm + ces limites
est le bon compromis rapidité/sécurité.

## Ajouter de nouvelles manches

Le format reste simple — juste `test` qui est maintenant asynchrone :

```js
{
  id: 3,
  title: "Manche 3 - ...",
  statement: "...",
  duration: 180,
  test: (code) => runInSandbox(code, "nomDeLaFonction", [
    { args: [...], expected: ... },
    // ajoute autant de cas de test que tu veux
  ])
}
```
