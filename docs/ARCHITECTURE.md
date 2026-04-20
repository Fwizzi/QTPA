# Architecture — Suivi Arbitres Handball (v1.0.0_static_sans_auth)

> Ce document décrit la structure interne de l'application : comment les modules s'articulent, où vit l'état, comment les données circulent, et quelles sont les conventions de couplage. Il est destiné à toute personne qui doit lire ou modifier le code (développeur humain ou IA assistante).
>
> Pour les conventions de **développement** (méthode de travail, naming des versions, validation, etc.), voir `docs/README.md` section *Conventions de développement*. Pour l'**historique** des modifications, voir `docs/CHANGELOG.md`.

---

## Vue d'ensemble

L'application est une **PWA mono-page** sans framework, sans bundler, sans étape de build. Tout est chargé directement par le navigateur via des **modules ES6** natifs (`<script type="module">`). Les avantages : zéro outillage à maintenir, déploiement par simple upload de fichiers, lisibilité maximale du code en ligne.

Le périmètre fonctionnel se résume à :
1. Configurer un match (équipes, arbitres, contexte)
2. Le chronométrer et noter des observations en temps réel
3. Produire une synthèse exportable en PDF
4. Conserver un historique consultable et reexportable

Tout ce qui est nécessaire à ces 4 étapes est dans le code. Tout le reste est volontairement absent.

---

## Cartographie des modules

```
┌────────────────────────────────────────────────────────────────────┐
│                          index.html                                │
│  (un seul fichier HTML contenant TOUS les écrans, basculés en CSS) │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ <script type="module">
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                          js/main.js                                │
│   Point d'entrée. Importe tous les modules, expose les fonctions   │
│   nécessaires sur window/window.App pour les onclick HTML, et      │
│   initialise l'app au load. Contient aussi l'écran AUTH et         │
│   l'écran ADMIN car ils touchent à plusieurs modules.              │
└────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────┬─────────┬─────┴──────┬─────────┬─────────────┐
        ▼         ▼         ▼            ▼         ▼             ▼
   ┌─────────┐ ┌──────┐ ┌──────┐ ┌──────────┐ ┌────────┐ ┌────────────┐
   │ state.js│ │ui.js │ │match │ │observation│ │synthesis│ │   pdf.js   │
   │         │ │      │ │ .js  │ │   s.js    │ │   .js   │ │ (lazy CDN) │
   │ État    │ │Thème │ │Cycle │ │Quick      │ │Radar    │ │Export PDF  │
   │ global  │ │Alerte│ │de vie│ │Notes,     │ │SVG,     │ │via jsPDF   │
   │ +       │ │Q oui/│ │du    │ │popup tags,│ │filtres, │ │+ autoTable │
   │ const.  │ │non   │ │match │ │table obs  │ │détail   │ │            │
   └────┬────┘ └──────┘ └──┬───┘ └─────┬─────┘ └────┬────┘ └────────────┘
        │                  │           │            │
        │                  ▼           │            │
        │             ┌────────┐       │            │
        │             │timer.js│       │            │
        │             │Chrono, │       │            │
        │             │période,│       │            │
        │             │TME pause│      │            │
        │             └───┬────┘       │            │
        │                 │            │            │
        │                 ▼            │            │
        │             ┌────────┐       │            │
        │             │score.js│       │            │
        │             │Score + │       │            │
        │             │TME     │       │            │
        │             └────────┘       │            │
        │                              │            │
        └──────────────────────────────┴────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   storage.js     │
                    │ Persistance      │
                    │ localStorage,    │
                    │ resume, history, │
                    │ filet 30s,       │
                    │ debounce contexte│
                    │ validation snap, │
                    │ quota detect     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │     auth.js      │
                    │ Login backend,   │
                    │ token, fetch     │
                    │ matches distants │
                    │ (HORS SCOPE par  │
                    │  défaut)         │
                    └──────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  Modules transverses (utilisés partout) : utils.js, logger.js,     │
│  version.js, theme-init.js                                         │
└────────────────────────────────────────────────────────────────────┘
```

---

## Détail par module

### `js/state.js` — État partagé

Le **cœur** de l'application. Exporte deux objets mutables qui sont importés par tous les autres modules :

- **`S`** : l'état complet du match en cours (équipes, arbitres, score, période, temps écoulé, observations, TME, etc.)
- **`ans`** : les réponses aux questions d'évaluation générale (esprit, engagement, niveau)
- **`synFilters`** : filtres actifs sur l'écran de synthèse (arbitre, période)

Et de nombreuses **constantes** : catégories d'observations (`CA`, `CP`, `CAU`), tags spécifiques par catégorie (`CAT_TAGS`), tags généraux (`TAGS_GENERAUX`), durées des périodes (`PL`, `PLR`), questions d'évaluation (`QS`), clés localStorage (`KEY_CURRENT`, `KEY_HISTORY`).

**Convention importante :** `S` et `ans` sont des **singletons mutables**. Aucune copie n'est faite à l'import. Tous les modules partagent la même référence et modifient directement les champs (ex. `S.sA++`, `S.obs.push(...)`). C'est rendu lisible et sûr par le fait qu'il n'y a qu'un seul flux d'exécution (pas de concurrence) et que chaque modification est suivie d'un autosave.

### `js/main.js` — Point d'entrée

Trois rôles :

1. **Importer** tous les modules et **exposer** les fonctions nécessaires sur `window` (pour les `onclick="..."` du HTML hérités) et sur `window.App` (registre central pour les appels inter-modules sans dépendance circulaire).
2. Contenir le **code des écrans AUTH et ADMIN**, qui touchent à plusieurs modules à la fois (auth + UI + alertes) et qui ne méritent pas leur propre module dédié pour le moment.
3. **Initialiser** l'application au `window.load` : restaurer le thème, brancher les écouteurs globaux d'erreur, brancher les écouteurs de fermeture (`beforeunload`, `visibilitychange`), enregistrer le service worker, lancer `_showApp()` ou `_showLogin()` selon l'état d'auth.

### `js/match.js` — Cycle de vie du match

Gère les transitions d'état macro :

- **`startMatch()`** : passe de l'écran SS à MS, initialise l'état `S` à partir des champs du formulaire, démarre le filet d'autosave 30 s
- **`endMatch()`** : passe de MS à ES (synthèse), affiche les résultats. **N'arrête pas** le filet d'autosave, qui continue pour couvrir la frappe du commentaire global et du contexte sur l'écran de fin
- **`backMatch()`** : retour de ES à MS, conserve le contexte
- **`goHome()`** : retour à l'accueil, **arrête** le filet d'autosave, réinitialise tout l'état `S`

### `js/timer.js` — Chronomètre

Gère le tic-tac via `setInterval`, les transitions de période (MT1 → MT2 → Prol.1 → Prol.2 → fin), le recalage manuel, la pause automatique sur prise de TME. Émet un autosave à chaque changement de période via `advPeriod()`.

### `js/score.js` — Score et temps morts

Gère les boutons +/- des scores et le tableau des TME. Pause automatique du chrono à la prise d'un TME, déblocage des TME interdits en deuxième mi-temps après 25:00. Émet un autosave à chaque action.

### `js/observations.js` — Quick Notes

Le module le plus volumineux. Construit la grille d'observations rapides (boutons par catégorie), gère la popup de détail à chaque tap (tags spécifiques + tags généraux + note libre + ajout d'un second arbitre), enregistre les observations dans `S.obs`, met à jour les compteurs en temps réel et le tableau des observations. Échappe systématiquement les noms d'arbitres et commentaires injectés en HTML (FRAG-3, v0.3.24).

### `js/synthesis.js` — Radar de synthèse

Génère le radar SVG affiché sur l'écran de fin de match : polygones par arbitre, scores au centre, labels pondérés par le nombre d'observations, panneau détail avec barres rouge/vert. Filtres par arbitre et par période. Tous les noms et catégories injectés sont échappés via la fonction `sn()` durcie en v0.3.24.

### `js/pdf.js` — Export PDF

Charge **paresseusement** jsPDF + jsPDF-autoTable depuis le CDN cdnjs (preload dans `<head>` pour gagner du temps). Construit le rapport complet : en-tête, score, évaluation générale, contexte, synthèse par catégorie, tableau d'observations, commentaire global, pied de page. Sauvegarde dans l'historique local (et distant si connecté) à la fin de l'export réussi.

### `js/storage.js` — Persistance

Le module qui a le plus évolué au fil de l'audit. Contient :

- **`autosave()`** : sauvegarde immédiate du snapshot complet dans `localStorage[KEY_CURRENT]`. Met à jour le timestamp `_lastSaveAt`. Met à jour l'indicateur visuel d'autosave (v0.3.25). Détecte le quota dépassé.
- **`autosaveDebounced()` / `flushAutosave()`** : version debouncée à 500 ms pour la frappe libre dans les textareas de contexte (FRAG-1, v0.3.22). Le flush est appelé dans `beforeunload`/`visibilitychange` pour ne pas perdre les caractères tapés dans les 500 dernières ms.
- **`startSafetyAutosave()` / `stopSafetyAutosave()`** : filet de sécurité 30 s (BUG-2, v0.3.20). Démarré dans `startMatch`/`resumeMatch`, arrêté dans `goHome`. Continue de tourner sur l'écran de fin de match.
- **`checkResume()` / `resumeMatch()`** : détection et reprise d'un match interrompu, avec validation structurelle du snapshot via `validateSnapshot()` et backup automatique en cas de corruption (FRAG-5, v0.3.24).
- **`saveToHistory()`** : sauvegarde dans l'historique local avec rotation FIFO automatique (`MAX_HISTORY = 50`, FRAG-6, v0.3.24) et synchronisation distante si connecté.
- **`renderHistory()` / `deleteHistory()` / `reexportPDF()`** : gestion de l'écran historique, fallback local en cas d'échec API distant.

Émet de nombreux logs structurés via `js/logger.js` pour faciliter le diagnostic en production.

### `js/auth.js` — Supprimé dans cette variante

> **Ce module n'existe pas dans la variante `v1.0.0_static_sans_auth`.** Il gérait la connexion JWT au backend `api.suiviarbitres.omnelya.fr`, la synchronisation distante des matchs et la gestion admin des utilisateurs. L'intégralité de ces fonctionnalités est sans objet en mode statique. Voir `docs/CHANGELOG.md` pour le détail des suppressions.

### `js/utils.js` — Fonctions utilitaires pures

Quatre fonctions :
- **`pad(n)`** : padding zéro à 2 chiffres
- **`fmt(s)`** : secondes → mm:ss
- **`fmtDate(d)`** : ISO aaaa-mm-jj → jj/mm/aaaa
- **`escapeHtml(str)`** : échappement HTML défensif (FRAG-3, v0.3.24)

Aucun état, aucun effet de bord, aucune dépendance externe. Importé un peu partout.

### `js/logger.js` — Journal structuré

Journal JSON exportable en mémoire (limité à 2000 entrées avec rotation FIFO), avec niveaux INFO/WARN/ERROR/PERF, catégories (LIFECYCLE, CHRONO, SCORE, TME, OBS, STORAGE, PDF, SW, UI, AUTH, GLOBAL), miroir console coloré, fonction d'export téléchargeable en `.json`, fonctions de mesure de performance (`startTimer`, `endTimer`).

**Discipline :** tout événement notable dans le code passe par `log.info` / `log.warn` / `log.error`. Aucun `console.log` direct (sauf cas exceptionnel justifié). C'est ce qui permet de diagnostiquer les bugs en production via l'export des logs.

### `js/version.js` — Source unique de vérité de la version

Trois constantes : `APP_VERSION`, `APP_YEAR`, `APP_AUTHOR`. **Doit être bumpée à chaque nouvelle version**, en parallèle du `CACHE_NAME` dans `sw.js`. C'est imposé par les conventions du projet.

### `theme-init.js` — Anti-flash thème sombre

Mini-script chargé en `<script>` synchrone dans le `<head>` pour appliquer le thème sombre **avant** le rendu, et éviter le flash blanc à l'ouverture pour les utilisateurs en mode sombre.

### `sw.js` — Service Worker

Stratégies multiples selon le type de ressource (refondu en v0.3.27 et optimisé en v0.3.28) :

- **Fichiers de l'app (même origine)** → **stale-while-revalidate**. Sert immédiatement la version cache (ouverture instantanée online comme offline) puis met à jour le cache en arrière-plan pour la prochaine ouverture. C'est ce qui rend l'app utilisable en quelques millisecondes même sur connexion pourrie.
- **CDN jsPDF (cdnjs)** → **cache-first**. Ces fichiers ne changent jamais (URLs versionnées), inutile de les revérifier.
- **API backend (`api.suiviarbitres.omnelya.fr`) et toutes les autres origines** → **non-interception** (network-only). Le SW laisse passer ces requêtes sans les toucher, ce qui est critique pour ne pas casser l'authentification. Filtrage par `url.origin === self.location.origin`. Les requêtes non-GET sont également ignorées.

**Détection rapide de mise à jour via fichier sentinelle (v0.3.28) :** au tout premier fetch de la session SW, la fonction `checkSentinel()` est appelée une seule fois (protégée par un flag de session) et vérifie si `js/version.js` (le fichier sentinelle, qui est bumpé à chaque release par convention) a changé entre le cache et le réseau. Si oui, un `postMessage { type: 'APP_UPDATE_AVAILABLE' }` est envoyé aux clients qui affichent alors le bandeau de mise à jour. Cette approche détecte les nouvelles versions en moins d'une seconde sur connexion correcte, contre plus d'une minute avec l'implémentation précédente qui comparait le contenu de tous les fichiers de l'app.

**Bump du `CACHE_NAME` à chaque release :** obligatoire et imposé par les conventions du projet. C'est ce qui garantit que le navigateur déclenche un nouveau cycle install/activate du SW à chaque version.

---

## Flux de données critiques

### Flux 1 — Démarrage d'un nouveau match

```
[Utilisateur clique "Démarrer le suivi"]
        │
        ▼
window.startMatch()  ─── exposé sur window depuis main.js ──→ match.js::startMatch()
        │
        ├── Lit les <input> du formulaire et écrit dans S
        ├── Met à jour les éléments DOM (sTA, sTB, thA, thB, topInfo, topMeta)
        ├── Appelle window.App.buildQuickNotes() (observations.js)
        ├── Appelle window.App.buildTme() (score.js)
        ├── Appelle window.App.buildQs() (ui.js)
        ├── Appelle window.App.renderTable() (observations.js)
        ├── Supprime le snapshot KEY_CURRENT (un nouveau match commence)
        ├── Bascule l'affichage : SS → MS
        └── startSafetyAutosave() (storage.js, démarre le filet 30 s)
```

### Flux 2 — Ajout d'une observation

```
[Utilisateur tape sur un bouton ✘ ou ✔]
        │
        ▼
observations.js::_makeTapBtn() → addEventListener('touchend' / 'click')
        │
        ▼
observations.js::_openDetail(arb, cat, col)
        │
        ├── Crée S.detailPending avec le contexte (arb, cat, couleur, temps, période)
        ├── Construit la popup avec les tags spécifiques + tags généraux
        └── Affiche l'overlay #detailOverlay
        │
[Utilisateur sélectionne des tags + commentaire libre + clique "Enregistrer"]
        │
        ▼
window.saveDetail() → observations.js::saveDetail()
        │
        ├── Lit les tags sélectionnés et le commentaire
        ├── Push une nouvelle entrée dans S.obs
        ├── log.info('OBS', 'observation_enregistree', ...)
        ├── closeDetail() → cache l'overlay
        ├── refreshCounters() → met à jour les compteurs ✘/✔ par catégorie
        ├── renderTable() → reconstruit le tableau des observations
        └── window.App.autosave() → storage.js::autosave()
                │
                ├── Sérialise S + ans + ctx en JSON
                ├── Écrit dans localStorage[KEY_CURRENT]
                ├── Met à jour _lastSaveAt (reset du filet 30 s)
                ├── _updateAutosaveDots('ok') (v0.3.25)
                └── log.info('STORAGE', 'autosave_ok', ...)
```

### Flux 3 — Reprise d'un match interrompu

```
[Au load de l'app] → main.js::_showApp() → storage.js::checkResume()
        │
        ├── Lit localStorage[KEY_CURRENT]
        ├── Si vide → return (pas de match en cours)
        └── Sinon → affiche la bannière #resumeBanner
        │
[Utilisateur clique "Reprendre"]
        │
        ▼
window.resumeMatch() → storage.js::resumeMatch()
        │
        ├── Lit localStorage[KEY_CURRENT] (raw)
        ├── try { snap = JSON.parse(raw) } catch → backup + alerte + abandon (FRAG-5)
        ├── validateSnapshot(snap) → si invalide : backup + alerte + abandon (FRAG-5)
        ├── Copie snap.S et snap.ans dans S et ans (mutation directe des singletons)
        ├── Compatibilité arrière sur les observations (arb/cats scalaires → tableaux)
        ├── Restaure tous les éléments DOM (équipes, arbitres, score, période, contexte)
        ├── Appelle buildTme, buildQs, buildQuickNotes, renderTable
        ├── Bascule l'affichage : SS → MS
        └── startSafetyAutosave() (démarre le filet 30 s)
```

### Flux 4 — Export PDF + sauvegarde dans l'historique

```
[Utilisateur sur l'écran ES clique "Exporter PDF"]
        │
        ▼
window.exportPDF() → pdf.js::exportPDF()
        │
        ├── Affiche "Chargement..." sur le bouton
        ├── loadJsPDF() → import lazy de jsPDF + autoTable depuis le CDN (avec mise en cache SW)
        ├── _generatePDF() → construit le document avec doc.text + doc.autoTable
        ├── doc.save(filename) → déclenche le téléchargement
        └── window.App.saveToHistory() → storage.js::saveToHistory()
                │
                ├── Construit l'entrée d'historique (id, savedAt, S, ans, ctx, gc)
                ├── Charge l'historique existant
                ├── unshift() la nouvelle entrée
                ├── Si history.length > MAX_HISTORY (50) → tronque (rotation FIFO)
                ├── Écrit dans localStorage[KEY_HISTORY] (avec détection quota)
                ├── Supprime KEY_CURRENT (le match est terminé)
                └── Si connecté : POST /api/matches (saveMatchRemote)
```

---

## Conventions de couplage

### Le registre `window.App`

Pour éviter les dépendances circulaires entre modules, certaines fonctions sont exposées via le registre central `window.App`. C'est un pattern volontairement simple : `main.js` importe tous les modules au démarrage et les expose sur `window.App.{nom}`. Les autres modules peuvent ensuite appeler `window.App.foo()` sans devoir importer le module qui l'expose.

Exemple : `score.js::addTme()` appelle `window.App.autosave()` plutôt que d'importer `storage.js::autosave`. Cela évite le couple `storage → score → storage` qui serait circulaire.

C'est un peu de la « triche » par rapport à un import propre, mais c'est lisible et ça marche tant que tous les appels passent par `main.js` qui est le point d'entrée garantissant l'enregistrement.

### Les `window.X` directs (héritage)

Beaucoup de fonctions sont aussi exposées en `window.foo` (et pas seulement en `window.App.foo`) parce que les `onclick="..."` dans le HTML les appellent directement. C'est de la dette historique identifiée par l'audit (FRAG-4). À long terme, on devrait migrer les `onclick` vers des `addEventListener` attachés en JS, ce qui permettra de retirer toutes les expositions `window.X`. Pour le moment c'est en place et ça fonctionne.

### Mutation directe vs immutabilité

L'app **mute directement** l'état global `S` partout. Pas de `setState`, pas de copies profondes (sauf au moment de la sérialisation pour l'autosave). C'est simple et rapide, et ça marche parce qu'il n'y a qu'un seul flux d'exécution (pas de React, pas de concurrence). La discipline est : **toute mutation de `S` est suivie d'un autosave** pour que la persistance reste cohérente avec l'affichage.

---

## Persistance : ce qui est dans localStorage

| Clé | Contenu | Géré par |
|---|---|---|
| `arbitres_hb_current` | Snapshot JSON du match en cours (S, ans, ctx, savedAt, period) | `storage.js::autosave()` |
| `arbitres_hb_history` | Tableau JSON des matchs sauvegardés (jusqu'à 50, rotation FIFO) | `storage.js::saveToHistory()` |
| `arbitres_hb_current_BACKUP_<ts>` | Snapshot corrompu archivé après échec de validation | `storage.js::_backupCorruptedSnapshot()` |
| `arbitres_hb_theme` | `'dark'` ou `'light'` | `js/ui.js::applyTheme()` |
| ~~`arbitres_hb_token`~~ | ~~Token JWT~~ | **Supprimé** (variante statique) |
| ~~`arbitres_hb_email`~~ | ~~Email utilisateur~~ | **Supprimé** (variante statique) |
| ~~`arbitres_hb_role`~~ | ~~Rôle utilisateur~~ | **Supprimé** (variante statique) |

---

## Pour aller plus loin

Cette architecture est **volontairement simple**. Pas de framework, pas de bundler, pas de TypeScript, pas de tests automatisés, pas de pipeline CI. Cette simplicité a un coût (pas d'aide à la refacturation, pas de garde-fous compilés) mais c'est aussi sa force : n'importe qui peut ouvrir le code, comprendre en quelques minutes, modifier sans casser, et déployer par simple upload de fichiers.

La règle d'or pour toute évolution future : **préserver cette simplicité**. Ne pas introduire de framework, de bundler ou d'outillage tant que ce n'est pas absolument nécessaire et justifié par un besoin réel et démontré.
