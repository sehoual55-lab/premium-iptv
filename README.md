# Premium IPTV

Site vitrine une page, 100 % statique. Aucun build, aucune dépendance à installer :
tout le CSS et le JavaScript sont dans `public/index.html`.

- **Poids** : ~130 Ko pour la page complète
- **Requêtes externes** : uniquement l'API TMDB (affiches de films) et Google Apps Script (commandes)
- **Langue** : français · **Marché** : France

---

## Structure

```
.
├── public/                     ← tout ce qui est publié
│   ├── index.html              La page (CSS + JS inclus)
│   ├── 404.html                Page d'erreur
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── site.webmanifest
│   ├── favicon.ico / .svg
│   ├── apple-touch-icon.png
│   ├── icon-192.png / icon-512.png
│   └── og-premium-iptv.jpg     Image de partage (1200×630)
├── apps-script/
│   └── Code.gs                 Réception des commandes dans Google Sheets
├── scripts/
│   └── set-domain.mjs          Remplace le domaine partout, en une commande
├── vercel.json                 En-têtes, cache, redirections
└── package.json
```

---

## 1. Mettre le dépôt sur GitHub

```bash
git init
git add .
git commit -m "Premium IPTV — site initial"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/premium-iptv.git
git push -u origin main
```

> Si le dépôt est **public**, sachez que la clé TMDB et la clé `commandes.cle`
> seront lisibles par tout le monde. La clé TMDB est de toute façon exposée
> côté navigateur, mais pensez à mettre une valeur unique dans `commandes.cle`
> (et la même dans `apps-script/Code.gs`). En cas de doute, mettez le dépôt en **privé** :
> Vercel déploie les dépôts privés sans surcoût sur l'offre Hobby.

---

## 2. Déployer sur Vercel

### Option A — depuis l'interface (recommandé)

1. <https://vercel.com/new>
2. **Import Git Repository** → choisissez `premium-iptv`
3. Laissez tous les réglages par défaut :
   - Framework Preset : **Other**
   - Build Command : *(vide)*
   - Output Directory : **public** — déjà imposé par `vercel.json`
4. **Deploy**

Chaque `git push` sur `main` redéploie automatiquement. Les autres branches
génèrent des URL de prévisualisation.

### Option B — en ligne de commande

```bash
npm i -g vercel
vercel          # prévisualisation
vercel --prod   # production
```

---

## 3. Brancher votre domaine

1. Vercel → votre projet → **Settings → Domains** → *Add*
2. Ajoutez `exemple.fr` **et** `www.exemple.fr`
3. Vercel indique l'enregistrement DNS à créer chez votre registrar :
   - `A` → `76.76.21.21` pour le domaine nu
   - `CNAME` → `cname.vercel-dns.com` pour le `www`
4. Dans la liste des domaines, laissez `exemple.fr` en **Primary** :
   Vercel redirige alors `www` vers le domaine nu automatiquement, en 308.

Le HTTPS est activé tout seul (Let's Encrypt), rien à faire.

### Puis renseignez le domaine dans les fichiers

```bash
npm run domain -- exemple.fr
git commit -am "Domaine : exemple.fr"
git push
```

Le script remplace `VOTRE-DOMAINE.com` dans `index.html`, `404.html`,
`robots.txt` et `sitemap.xml` (URL canonique, Open Graph, données structurées,
plan du site). Il est ré-exécutable si vous changez de domaine plus tard.

---

## 4. Réglages du site

Tout se trouve dans **`public/index.html`**, bloc `IPTV_CONFIG`
(cherchez `CONFIGURATION` dans le fichier) :

| Réglage | Ce que ça fait |
|---|---|
| `offres` | Nom, durée, prix et avantages des 4 formules |
| `remiseConnexion` | Remise par connexion supplémentaire (0.15 = −15 %) |
| `maxConnexions` | Nombre maximum de connexions sélectionnables |
| `paiements` | Moyens de paiement affichés dans le popup |
| `commandes.url` | URL `/exec` de votre déploiement Apps Script |
| `commandes.cle` | Clé partagée — **identique** à `CLE_SECRETE` dans `Code.gs` |
| `tmdb` | Clé et source des affiches de films (`actif: false` pour désactiver) |
| `avis` | Avis clients — tableau vide = section masquée |

**Couleur d'accent** : une seule ligne dans le CSS, en haut du `<style>` :

```css
--acc:#1668e3;
```

---

## 5. Réception des commandes (Google Sheets)

Le fichier `apps-script/Code.gs` enregistre chaque commande dans une feuille
Google et envoie une alerte e-mail avec un bouton WhatsApp pré-rempli.

1. <https://script.google.com> → nouveau projet → collez `Code.gs`
2. Renseignez `ID_FEUILLE`, `CLE_SECRETE`, `EMAIL_ALERTE`
3. Exécutez `diagnostic` (affiche la correspondance des colonnes, ne modifie rien)
4. Exécutez `testerEnregistrement` (écrit une ligne + envoie l'e-mail)
5. **Déployer → Nouveau déploiement → Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
6. Copiez l'URL `/exec` dans `commandes.url`

> ⚠️ Après **chaque** modification de `Code.gs` :
> *Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version*.
> Sans ça, Google continue d'exécuter l'ancien code.

Le script lit la **ligne 1** de votre feuille et place chaque donnée dans la
colonne correspondante : vous pouvez renommer, réordonner ou supprimer des
colonnes librement.

### Diagnostic

Ajoutez `?debug=1` à l'adresse du site pour afficher, sous l'écran de
confirmation, la réponse brute renvoyée par Google :

```
https://exemple.fr/?debug=1
```

À utiliser pour tester, pas à communiquer aux clients.

---

## 6. Développement local

```bash
npm run dev      # http://localhost:3000
```

Servir la page via un serveur HTTP est **important** : ouvrir `index.html`
par double-clic (`file://`) empêche la lecture de la réponse de Google
(le site bascule alors sur un envoi de secours, sans confirmation lisible).

---

## 7. Référencement

Après le premier déploiement :

1. <https://search.google.com/search-console> → ajoutez le domaine
2. **Sitemaps** → `sitemap.xml` → Envoyer
3. **Inspection de l'URL** → votre adresse → *Demander l'indexation*

Déjà en place : titre et meta description optimisés, un seul `H1`,
données structurées `FAQPage` + `Organization`, Open Graph et Twitter Card,
HTML sémantique, images en `loading="lazy"`.

---

## Avant d'ouvrir au public

- [ ] `npm run domain -- votredomaine.fr` exécuté
- [ ] `commandes.cle` = `CLE_SECRETE` dans Code.gs
- [ ] Commande de test reçue dans la feuille **et** par e-mail
- [ ] Mentions légales complétées (`[à compléter]` dans `index.html` :
      raison sociale, adresse, immatriculation, hébergeur) — **obligatoire en France**
- [ ] Chiffres des formules (chaînes, films) vérifiés : ce sont des
      engagements commerciaux, pas des éléments de décoration
- [ ] Avis clients réels ajoutés, ou section laissée masquée
      (publier de faux avis est sanctionné par la DGCCRF)

---

## Crédits

Affiches de films fournies par [TMDB](https://www.themoviedb.org/).
Ce produit utilise l'API de TMDB sans être approuvé ni certifié par TMDB.
Les noms et logos des fabricants cités appartiennent à leurs propriétaires
respectifs et servent uniquement à indiquer la compatibilité des applications.
