# Salon 8

Billard 8-ball dans le navigateur : local, contre l’ordinateur, ou en ligne (PeerJS).

## Jouer

Version déployée : [https://xeroxytb3.github.io/8-ball-pool/](https://xeroxytb3.github.io/8-ball-pool/)

En local :

```bash
npm install
npm run dev
```

## Commandes

| Commande | Rôle |
|---|---|
| `npm test` | Tests des règles 8-ball |
| `npm run build` | Build GitHub Pages |
| `npm run preview` | Prévisualiser le build |

Le jeu en ligne utilise le cloud PeerJS + STUN. Le premier onglet ouvert tente de tenir le lobby (`salon8-hub-v2`) ; les autres s’y connectent. Si le hub se ferme, le lobby se reforme tout seul.

Les profils restent dans `localStorage` (export JSON possible).
