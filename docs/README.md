# Suivi Arbitres Handball — Variante statique sans authentification

> **Version `v1.0.0_static_sans_auth`** — Dérivée de la v1.0.0 officielle. Supprime l'authentification et le backend pour un déploiement 100 % statique (GitHub Pages, hébergement mutualisé, etc.). Toutes les données sont conservées localement via `localStorage`.

Application web progressive (PWA) de suivi et d'évaluation des arbitres de handball, conçue pour une utilisation sur tablette (iPad paysage) pendant un match.

> © Vincent Guerlach — Commission Arbitres Occitanie — Tous droits réservés

---

## Présentation

**Suivi Arbitres Handball** est une application légère, fonctionnelle hors ligne, permettant à un observateur d'arbitres de handball de :

- configurer un match (équipes, arbitres, compétition, date/heure) ;
- chronométrer le match avec gestion des mi-temps et des prolongations ;
- suivre le score et les temps morts (TME) ;
- saisir des observations rapides via un système de **Quick Notes** tactile avec tags prédéfinis par catégorie ;
- visualiser la synthèse via un **radar interactif** avec comparaison des deux arbitres ;
- exporter un rapport complet au format PDF ;
- consulter l'historique des matchs précédents.

---

## Structure du projet

```
├── index.html          # Point d'entrée HTML (toutes les vues)
├── styles.css          # Feuille de styles complète (responsive, dark mode)
├── theme-init.js       # Initialisation du thème avant le rendu (évite le flash)
├── manifest.json       # Manifeste PWA
├── sw.js               # Service Worker (cache hors ligne + CDN jsPDF)
├── logo.png            # Logo FFHandball
├── docs/
│   ├── CHANGELOG.md    # Historique des modifications
│   └── README.md       # Ce fichier
└── js/
    ├── main.js         # Point d'entrée ES module — import, exposition window, init
    ├── state.js        # État partagé, constantes, catégories, tags par catégorie
    ├── match.js        # Cycle de vie du match (démarrer, terminer, retour accueil)
    ├── timer.js        # Chronomètre, gestion des périodes, prolongations, recalage
    ├── score.js        # Score et gestion des temps morts (TME)
    ├── observations.js # Quick Notes : grille tactile, popup tags, compteurs
    ├── synthesis.js    # Radar SVG de synthèse par catégorie avec filtres
    ├── pdf.js          # Export PDF (chargement lazy de jsPDF + autoTable)
    ├── storage.js      # Persistance localStorage, reprise de match, historique
    ├── ui.js           # Thème clair/sombre, alertes, questionnaire d'évaluation
    ├── utils.js        # Fonctions utilitaires (formatage temps, dates)
    ├── logger.js       # Journal structuré JSON exportable
    └── version.js      # Source unique de vérité pour la version
```

---

## Fonctionnalités détaillées

### Écran de configuration (Setup)
- Saisie de la date, heure, compétition, équipes et noms des deux arbitres.
- Détection automatique d'un match interrompu (bannière de reprise).
- Pré-remplissage de la date et heure courante.
- Accès à l'historique des matchs.

### Écran principal (Match)

**Panneau gauche (fixe) :**
- **Chronomètre** : démarrage / pause, recalage manuel (mm:ss), badge de période (MT1 / MT2 / Prolongations).
- **Score** : incrémentation/décrémentation par équipe, mémorisation du score à la mi-temps.
- **Temps morts (TME)** : tableau par équipe, ajout horodaté, pause automatique du chrono.
- **Contexte du match** : zone de texte libre.

**Panneau droit — Quick Notes :**
- **Grille compacte 6 colonnes** avec les deux zones A1/A2 côte à côte.
- **19 catégories** réparties en Décisions techniques (SPP, SPA, J7M, Protocole, PF, MB, JF, EJ, Jeu Passif, Marcher, Pied, Reprise de dribble, Zone, Continuité, Communication) et Positionnement (Placement, Déplacement, Zone d'influence, Gestion du sifflet) + Autre.
- **Tap sur ✘ ou ✔** → ouvre une popup avec tags prédéfinis spécifiques à la catégorie + tags généraux + note libre optionnelle.
- **Tags conditionnés à la couleur** : certains tags n'apparaissent que sur rouge ou vert.
- **Compteurs en temps réel** par bouton et par arbitre.
- **Tableau des observations** avec tri par heure, catégorie, arbitre ou type.

### Écran de fin de match (Synthèse)
- Score final avec rappel du score à la mi-temps.
- Contexte du match éditable.
- Questionnaire d'évaluation générale (esprit, engagement physique, niveaux équilibrés).
- **Radar de synthèse** :
  - Deux polygones individuels superposés (A1 bleu, A2 ambre pointillé).
  - Scores individuels au centre du radar.
  - Compteurs xR - xV sur chaque rayon.
  - Taille des labels pondérée par le nombre d'observations.
  - Filtres Arbitre (Les deux / A1 / A2) et Période (Tout / MT1 / MT2).
  - Panneau détail à droite avec mini-barres et pourcentages.
- Tableau complet de toutes les observations.
- Commentaire global libre.
- **Export PDF** : rapport généré côté client via jsPDF + autoTable.

### Historique
- Liste des matchs exportés avec réexport PDF possible.
- Suppression individuelle de matchs.

### Thème
- Mode clair / sombre avec détection automatique des préférences système.
- Bascule manuelle persistante (localStorage).

---

## Architecture technique

| Aspect | Détail |
|---|---|
| Type | Application web progressive (PWA) |
| Langage | HTML5, CSS3, JavaScript ES Modules (sans framework) |
| Persistance | `localStorage` (deux clés : `arbitres_hb_current` et `arbitres_hb_history`) |
| Hors ligne | Service Worker — cache des assets + pré-cache CDN jsPDF |
| Export | jsPDF 2.5.1 + jsPDF-autoTable 3.8.2 (CDN cdnjs, chargement lazy + preload) |
| Responsive | Optimisé tablette paysage (iPad), compatible mobile portrait |
| Installation | Installable sur iOS et Android |

---

## Installation et utilisation

### Déploiement sur hébergement statique (GitHub Pages, O2switch, etc.)

**GitHub Pages :**
1. Créer un dépôt GitHub (ex: `suivi-arbitres`).
2. Uploader le contenu du dossier `Suivi_arbitres_v1.0.0_static_sans_auth/` à la racine.
3. Dans *Settings → Pages*, sélectionner la branche `main` / dossier `/ (root)`.
4. L'app est accessible à `https://<user>.github.io/<repo>/`.

**Hébergement web classique (O2switch, etc.) :**
1. Décompresser l'archive `Suivi_arbitres_v1.0.0_static_sans_auth.zip`.
2. Uploader le contenu du dossier à la racine du domaine ou sous-domaine.
3. HTTPS requis pour le Service Worker.

### Mise à jour depuis une version précédente
1. Uploader les nouveaux fichiers en écrasant les anciens.
2. Vider le cache du Service Worker : sur iPad → Réglages Safari → Données de sites → chercher le domaine → Supprimer.
3. Recharger la page.

### Installation PWA sur tablette
1. Ouvrir l'URL dans Safari (iOS) ou Chrome (Android).
2. Utiliser *Partager → Sur l'écran d'accueil* (iOS) ou *Installer l'application* (Android).
3. L'application est disponible hors ligne après la première visite avec connexion internet.

> **Note** : Le premier export PDF nécessite une connexion internet pour charger la librairie jsPDF depuis le CDN. Les exports suivants fonctionnent hors ligne grâce au cache du Service Worker.

---

## Catégories d'observations

### Décisions techniques
| Code | Libellé |
|---|---|
| SPP | Sanction — Pénalité Progressive |
| SPA | Sanction — Pénalité / Avertissement |
| J7M | Jet de 7 mètres |
| Protocole | Protocole arbitral |
| PF | Faute personnelle |
| MB | Mêlée / Balle disputée |
| JF | Jet Franc |
| EJ | Exécution du jet |
| Jeu Passif | Jeu passif |
| Marcher | Marcher |
| Pied | Faute de pied |
| Reprise de dribble | Reprise de dribble |
| Zone | Violation de zone |
| Continuité | Continuité du jeu |
| Communication | Communication entre arbitres |

### Positionnement
| Code | Libellé |
|---|---|
| Placement | Placement des arbitres |
| Déplacement | Déplacement des arbitres |
| Zone d'influence | Zone d'influence |
| Gestion du sifflet | Gestion du sifflet |

---

## Dépendances externes

| Bibliothèque | Version | Usage | Chargée |
|---|---|---|---|
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | Génération PDF | À la demande (CDN + preload) |
| [jsPDF-autoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) | 3.8.2 | Tableaux dans le PDF | À la demande (CDN + preload) |

Aucune dépendance npm. Aucun bundler requis.

---

## Conventions de développement

> **À l'attention de toute personne (humaine ou IA assistante) qui modifie ce projet :** ces conventions sont **persistantes et obligatoires**. Elles ont été établies au fil des versions et doivent être respectées sans qu'il soit nécessaire de les répéter à chaque conversation. Le but est qu'un nouvel intervenant puisse charger un ZIP du projet et savoir immédiatement comment travailler dessus.

### Méthode de travail

1. **Un sujet par version.** Chaque version corrige ou améliore un seul point identifiable (un bug, un frag, une amélioration). Cela permet un rollback simple si quelque chose casse : on revient à la version précédente sans perdre d'autres améliorations. Si plusieurs sujets doivent être traités, il faut **demander explicitement** à l'utilisateur s'il accepte le groupage. Par défaut : refus du groupage.
2. **Pas de modification non demandée.** Ne jamais "en profiter pour" nettoyer, refactorer, renommer ou améliorer du code en dehors du périmètre validé. Toute modification opportuniste doit être proposée à l'utilisateur et acceptée explicitement.
3. **Approche spec-first.** Avant de coder, présenter le plan, lister les fichiers qui seront touchés, demander validation. L'utilisateur préfère valider la spec avant l'implémentation.
4. **Rollback facile.** Toujours partir de la dernière version stable validée par l'utilisateur. Ne jamais empiler plusieurs versions non testées.

### Versioning sémantique

Format : `X.Y.Z` (cf. `js/version.js` qui est la source unique de vérité).
- **X** = majeur — refonte structurelle ou visuelle complète
- **Y** = mineur — nouvelle fonctionnalité significative
- **Z** = patch — correction de bug, ajout de logs, retouche mineure

À chaque nouvelle version, **bumper systématiquement** :
- `js/version.js` (constante `APP_VERSION`)
- `sw.js` (constante `CACHE_NAME`, format `arbitres-hb-vX.Y.Z`)

Le bump du cache du Service Worker est **obligatoire** sinon les utilisateurs continuent de servir l'ancienne version depuis le cache local.

### Nommage des livrables

- **Dossier de travail interne :** `Suivi_arbitres_vX.Y.Z` (avec points)
- **Fichier ZIP livré à l'utilisateur :** `Suivi_arbitres_v0_3_XX.zip` (avec underscores, sans le numéro majeur séparé). Exemple : `Suivi_arbitres_v0_3_22.zip`.
- **À l'intérieur du ZIP**, le dossier racine porte le même nom que le fichier ZIP : `Suivi_arbitres_v0_3_22/`.

### Validation obligatoire avant livraison

Aucune version n'est livrée à l'utilisateur sans avoir effectué **toutes** les étapes suivantes :

1. **Validation syntaxique JavaScript** de tous les fichiers JS modifiés (et idéalement de tous les fichiers JS du projet) via `new Function()` après dépouillement des `import`/`export`. Procédure type :
   ```bash
   for f in js/*.js sw.js; do node -e "
     const fs = require('fs');
     const src = fs.readFileSync('$f', 'utf8');
     const stripped = src.replace(/^\s*import\b[^;]*;?/gm, '').replace(/^\s*export\s+/gm, '');
     try { new Function(stripped); console.log('OK  $f'); }
     catch(e) { console.log('ERR $f:', e.message); }
   "; done
   ```
2. **Cohérence des imports/exports.** Vérifier qu'aucun nom importé ne pointe vers une fonction inexistante dans le module source, et qu'aucun nom exposé dans `window.App` ou `window.X` n'est cassé.
3. **Recherche des IDs DOM morts.** À chaque modification touchant `index.html` ou un `getElementById`, exécuter :
   ```bash
   grep -roh "getElementById('[^']*')" js/ | sort -u | sed "s/getElementById('//;s/')//" > /tmp/js_ids.txt
   grep -oh 'id="[^"]*"' index.html | sed 's/id="//;s/"//' | sort -u > /tmp/html_ids.txt
   comm -23 /tmp/js_ids.txt /tmp/html_ids.txt
   ```
   Si la liste n'est pas vide → un `getElementById` pointe vers un ID qui n'existe pas dans le HTML, c'est un bug en attente. Cette vérification a permis de découvrir BUG-3 en v0.3.21.
4. **Diff complet** entre la version précédente et la version livrée pour confirmer que **seuls** les fichiers prévus sont modifiés et qu'aucun fichier inattendu n'a été touché :
   ```bash
   diff -rq Suivi_arbitres_v(N-1) Suivi_arbitres_vN
   ```
5. **Pas de tests runtime.** L'environnement de développement n'a généralement pas de navigateur disponible. Les tests fonctionnels sont **toujours à la charge de l'utilisateur**, à exécuter via le fichier `docs/instructions test.md` de la version livrée.

### Modules à ne jamais toucher sans demande explicite

- `js/auth.js` — module d'authentification, bénéficie d'un découpage propre. Hors scope par défaut. Toute modification doit être explicitement demandée.
- `logo.png`, `manifest.json` — touchés uniquement sur demande explicite.

### Documentation : où va quoi

| Fichier | Rôle | Mise à jour |
|---|---|---|
| `docs/CHANGELOG.md` | Historique exhaustif des modifications version par version | **À chaque version**, ajout d'une nouvelle entrée en haut, ancienne en bas |
| `docs/instructions test.md` | Scénarios de test utilisateur de la version courante | **Réécrit à chaque version** (pas accumulé), centré sur les modifications de la version livrée |
| `docs/README.md` | Documentation générale persistante du projet (présentation, structure, conventions) | Mis à jour uniquement quand quelque chose de structurel change (architecture, conventions, dépendances) |

**Aucun `CHANGELOG.md` ne doit exister à la racine du projet.** La source unique du changelog est `docs/CHANGELOG.md`. Cette règle a été établie après avoir créé par erreur un changelog racine en v0.3.20 puis l'avoir nettoyé en v0.3.22.

### Style de code

- **Commentaires riches.** Préférer un commentaire explicatif détaillé à un commentaire laconique. Quand une modification est faite pour résoudre un bug ou un frag identifié, **annoter** la zone avec un commentaire `v0.3.XX (BUG-N)` ou `v0.3.XX (FRAG-N)` qui explique le pourquoi, pas seulement le quoi. Exemple : `/* v0.3.22 (FRAG-1) : flush du debounce de saisie contexte avant fermeture pour ne perdre aucun caractère tapé dans les 500 dernières ms. */`
- **Logger systématique.** Utiliser le module `js/logger.js` (`log.info`, `log.warn`, `log.error`, `log.perf`) pour tout événement notable. Ne pas utiliser `console.log` directement (sauf cas exceptionnel justifié).
- **Conserver la rétro-compatibilité.** Le code de `resumeMatch()` et `reexportPDF()` contient déjà des migrations pour les anciens snapshots. Si une nouvelle version change la structure de l'état `S`, **ajouter une migration** plutôt que casser les anciens snapshots stockés en localStorage chez les utilisateurs.
- **Pas de framework, pas de bundler, pas de transpilation.** L'application doit rester chargeable directement par le navigateur sans étape de build.

### En cas de bug découvert en production

1. L'utilisateur signale le bug avec les étapes de reproduction.
2. **Diagnostic d'abord** : lire le code, comprendre l'origine, ne pas patcher à l'aveugle.
3. **Hotfix isolé** : créer une nouvelle version contenant **uniquement** le correctif (méthode "un sujet par version" appliquée strictement). Pas de groupage avec d'autres améliorations en attente.
4. Documenter le bug dans `docs/CHANGELOG.md` avec : symptôme, cause technique, correctif appliqué, fichiers touchés.
5. Mettre à jour `docs/instructions test.md` avec un test de non-régression dédié à ce bug, à intégrer dans toutes les versions futures.

### Référence audit

Le projet a fait l'objet d'un audit technique complet en avril 2026 sur la base de la v0.3.19. Cet audit a identifié 2 bugs critiques (BUG-1, BUG-2) et 7 frags (FRAG-1 à FRAG-7), traités progressivement à partir de la v0.3.20. La roadmap complète et le détail technique de chaque point sont consultables dans le rapport d'audit (`AUDIT_Suivi_arbitres_v0.3.19.md`) — fourni séparément à l'utilisateur, pas inclus dans le ZIP.

---

## Licence

© **Vincent Guerlach** — Commission Arbitres Occitanie — Tous droits réservés.  
Usage réservé à l'auteur et aux personnes expressément autorisées.
