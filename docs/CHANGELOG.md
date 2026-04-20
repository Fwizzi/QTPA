# CHANGELOG — Suivi Arbitres Handball

Toutes les modifications notables de l'application sont documentées ici.  

> **À l'attention de toute personne (humaine ou IA assistante) qui modifie ce projet :** ce fichier est la **source unique** du changelog du projet. Ne créez jamais de `CHANGELOG.md` à la racine. Respectez le format ci-dessous sans qu'il soit nécessaire de vous le rappeler à chaque conversation.

## Conventions de mise à jour de ce fichier

### Format des entrées

- **Titre de version :** `## [X.Y.Z] — YYYY-MM-DD` (norme Keep a Changelog), pas `## vX.Y.Z` ni de format de date français.
- **Ordre :** la version la plus récente est **en haut**, la plus ancienne en bas. Toute nouvelle entrée s'insère **juste après** ce bloc de conventions et **avant** l'entrée précédente la plus récente.
- **Séparateur :** une ligne `---` entre chaque version.

### Sections autorisées dans une entrée de version

Les sections suivent l'ordre ci-dessous (omettre une section si vide) :

- `### Ajouté` — nouvelles fonctionnalités, nouveaux fichiers, nouvelles fonctions.
- `### Modifié` — modifications de comportement existant, refactorings visibles, changements d'API interne.
- `### Corrigé` — correctifs de bugs (préférer ce mot à "Fix").
- `### Retiré` — suppression de code, fichiers, fonctionnalités, commentaires vestige.
- `### Maintenance` — bumps de version, mises à jour de cache, nettoyage technique mineur.
- `### Validation effectuée avant livraison` — détail des contrôles effectués (validation syntaxique, recherche d'IDs morts, diff complet, etc.). Section recommandée à chaque version.

### Description par fichier

Chaque modification est décrite **par fichier**, dans le format :

```
- `chemin/du/fichier.ext` — **Description courte**. Description détaillée expliquant le pourquoi, pas seulement le quoi. Quand pertinent, mentionner le numéro de bug ou de frag traité (ex: BUG-1, FRAG-3).
```

L'objectif est qu'un lecteur puisse comprendre **pourquoi** une modification a été faite, pas seulement quoi a été changé. C'est ce qui permet de débugger plus tard ou de revenir en arrière en connaissance de cause.

### Référence aux bugs et frags

Quand une version corrige un bug ou un frag identifié dans l'audit, **toujours référencer** son identifiant (ex: `BUG-1`, `FRAG-5`). Ces identifiants sont définis dans le rapport d'audit `AUDIT_Suivi_arbitres_v0.3.19.md` et permettent de relier code, tests et documentation.

### Exemple complet d'une entrée de version

```markdown
## [0.3.42] — 2026-05-15

### Corrigé
- `js/storage.js` — **Fix BUG-12 : perte du score à la reprise après prolongation.** Description détaillée du bug, du diagnostic, et du correctif. Mention des fichiers connexes éventuellement impactés.

### Maintenance
- `js/version.js` — version `0.3.42`.
- `sw.js` — cache name `arbitres-hb-v0.3.42`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js`.
- Recherche exhaustive d'IDs DOM morts : aucun trouvé.
- Diff complet v0.3.41 → v0.3.42 contrôlé : seuls les fichiers prévus sont modifiés.

---
```


---

## [1.1.0] — 2026-04-19

> **Authentification Supabase.** Restaure l'intégralité du système d'authentification et de synchronisation, en remplaçant le backend custom `api.suiviarbitres.omnelya.fr` par Supabase (auth JWT, base PostgreSQL, Edge Function). L'application reste 100 % statique côté client — aucun serveur à maintenir.

### Ajouté
- `js/auth.js` — **Nouveau module auth Supabase** (remplace l'ancien auth backend). Charge le SDK `@supabase/supabase-js@2` en lazy depuis le CDN jsDelivr (même pattern que jsPDF). Expose `initAuth()`, `login()`, `logout()`, `isLoggedIn()`, `isAdmin()`, `getEmail()`, `getRole()`, `saveMatchRemote()`, `fetchMatches()`, `deleteMatchRemote()`, `changePassword()`, et les 4 fonctions admin (`adminGetUsers`, `adminCreateUser`, `adminDeleteUser`, `adminResetPassword`). Les fonctions admin passent par l'Edge Function `admin-users` pour ne pas exposer la `service_role_key` côté client.
- `edge-functions/admin-users/index.ts` — **Edge Function Supabase** (TypeScript/Deno). Vérifie que l'appelant est admin (via table `profiles`), puis utilise la `service_role_key` (injectée en variable d'environnement) pour lister, créer, supprimer les utilisateurs et réinitialiser les mots de passe via l'API Admin Supabase. La clé n'est jamais transmise au client.
- `supabase-setup/01_schema.sql` — **Schéma SQL** à exécuter une fois dans le dashboard Supabase. Crée les tables `profiles` (id, role) et `matches` (structure identique à l'ancien backend), et le trigger `handle_new_user` qui insère automatiquement un profil `role=user` à chaque inscription.
- `supabase-setup/02_rls.sql` — **Row Level Security**. Chaque utilisateur ne voit que ses propres données. L'admin accède à tout via l'Edge Function (service_role bypass RLS automatiquement).

### Modifié
- `js/main.js` — **Restauration complète de l'auth UI.** `initAuth()` appelé en `async` au `load` pour restaurer la session Supabase persistée (le SDK Supabase persiste le token dans localStorage automatiquement). Si session active → `_showApp()` direct sans repasser par le login. Toutes les fonctions auth/admin/pwd identiques à la v1.0.0 originale, adaptées pour Supabase (`last_sign_in_at` remplace `last_login`).
- `js/storage.js` — **Restauration de la sync remote.** `saveToHistory()` sauvegarde dans Supabase après la sauvegarde locale (admin uniquement). `renderHistory()` charge depuis Supabase pour les admins. `deleteHistoryRemote()` restauré.
- `js/version.js` — Version `1.1.0`.
- `sw.js` — Cache name `arbitres-hb-v1.1.0`.

### Validation effectuée avant livraison
- **Validation syntaxique JS** : 15 fichiers JS + sw.js → tous OK via `new Function()`.
- **IDs DOM morts** : 6 IDs sans correspondance HTML (tous dynamiques, déjà présents en v1.0.0) — aucune régression.
- **Diff complet** : 5 fichiers modifiés (`index.html`, `js/main.js`, `js/storage.js`, `js/version.js`, `sw.js`), 1 fichier ajouté (`js/auth.js`), 3 fichiers de setup ajoutés hors app (`edge-functions/`, `supabase-setup/`). Aucun fichier non prévu touché.

---


---

## [1.0.0_static_sans_auth] — 2026-04-19

> **Variante statique sans authentification.** Cette version est dérivée de la v1.0.0 officielle. Elle supprime l'intégralité du système d'authentification et de la synchronisation backend pour produire une application 100 % autonome, déployable sur GitHub Pages ou tout hébergement statique sans serveur.

### Retiré
- `js/auth.js` — **Suppression du module d'authentification.** Ce module gérait la connexion JWT au backend `api.suiviarbitres.omnelya.fr`, la persistance du token, la synchronisation distante des matchs (POST /api/matches), la récupération de l'historique serveur (GET /api/matches), la suppression distante et la gestion admin des utilisateurs. Devenu sans objet en mode statique.
- `index.html` — **Suppression de l'écran de connexion (`#AuthS`).** Le formulaire email/mot de passe, le bouton "Se connecter" et le message d'erreur auth sont retirés. L'application démarre désormais directement sur l'écran de configuration.
- `index.html` — **Suppression de l'écran administration (`#AdminS`).** L'espace administrateur (création, suppression, réinitialisation de mot de passe des utilisateurs) est retiré. Cette fonctionnalité n'a de sens qu'avec un backend.
- `index.html` — **Suppression de la modale changement de mot de passe (`#pwdChangeOverlay`).** Sans backend, il n'y a pas de mot de passe à changer.
- `index.html` — **Suppression des boutons "Admin", "Mot de passe" et "Déconnexion"** de la topbar de l'écran de configuration. Ces actions n'ont plus de sens en mode statique.
- `index.html` — **Suppression du badge utilisateur (`#userBadge`).** Affichait l'email de l'utilisateur connecté.

### Modifié
- `js/main.js` — **Démarrage direct sans login.** Suppression des fonctions `submitLogin`, `doLogout`, `_showLogin`, `_updateUserBadge`, `openAdmin`, `closeAdmin`, `_renderAdminUsers`, `adminSubmitUser`, `adminDeleteUserUI`, `adminResetPasswordUI`, `changePasswordUI`, de la politique de mot de passe (`PWD_RULES`, `validatePassword`, `buildPwdChecklist`, `updatePwdChecklist`) et de toutes les expositions `window.*` associées. La fonction `_showApp()` est conservée et appelée directement au `load` sans condition d'authentification.
- `js/storage.js` — **Suppression de la synchronisation distante dans `saveToHistory()`.** Le bloc conditionnel `if (isLoggedIn() && isAdmin())` qui postait le match au backend après export PDF est retiré. La sauvegarde locale (localStorage) est l'unique mécanisme de persistance.
- `js/storage.js` — **Suppression du chargement serveur dans `renderHistory()`.** Le bloc qui chargeait l'historique depuis le serveur pour les admins connectés est retiré. `renderHistory()` lit désormais uniquement le localStorage.
- `js/storage.js` — **Suppression de la fonction `deleteHistoryRemote()`.** Cette fonction appelait `DELETE /api/matches/:id`. La suppression d'historique passe désormais uniquement par `deleteHistory()` (local).
- `js/version.js` — Version `1.0.0_static_sans_auth`. Le format `x.y.z_static_sans_auth` identifie sans ambiguïté les livrables de cette variante.
- `sw.js` — Cache name `arbitres-hb-v1.0.0-static` pour forcer le cycle install/activate.

### Validation effectuée avant livraison
- **Validation syntaxique JS** : 14 fichiers JS + sw.js → tous OK via `new Function()`.
- **IDs DOM morts** : 6 IDs sans correspondance HTML (`swUpdateBanner`, `swUpdateDismiss`, `swUpdateReload`, `pdfExportBtn`, `pdfModalClose`, `pdfModalOverlay`) — tous créés dynamiquement par JS, déjà présents dans la v1.0.0 source, pas de régression.
- **Diff complet** : 5 fichiers modifiés (`index.html`, `js/main.js`, `js/storage.js`, `js/version.js`, `sw.js`), 1 fichier supprimé (`js/auth.js`). Aucun fichier non prévu touché.
- **Vérification des références auth résiduelles** : aucune occurrence de `isLoggedIn`, `isAdmin`, `saveMatchRemote`, `fetchMatches`, `deleteMatchRemote`, `deleteHistoryRemote`, `AuthS`, `AdminS`, `pwdChangeOverlay`, `btnAdmin`, `doLogout`, `changePasswordUI`, `userBadge` dans le code livré.

---

### Référence

Pour les conventions générales de développement du projet (méthode de travail, validation, naming, modules à ne pas toucher, etc.), voir `docs/README.md` section **Conventions de développement**.

---

## [1.0.0] — 2026-04-19

### Maintenance
- `js/version.js` — passage en version `1.0.0`. Aucune modification fonctionnelle ni structurelle par rapport à la v0.4.12.
- `sw.js` — cache name `arbitres-hb-v1.0.0`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` : tous OK.
- Diff v0.4.12 → v1.0.0 : 2 fichiers modifiés (`js/version.js`, `sw.js`). Aucun autre fichier touché.

---

## [0.4.12] — 2026-04-19

### Modifié
- `js/observations.js` — **Remplacement de l'icône d'édition par le crayon SVG "option B" (Feather pencil).** Dans `oRow()` : SVG simplifié à un seul `<path>` (`M17 3a2.828...`), `stroke-width` réduit à `1.8` (plus sobre). Dans les titres de la popup détail (ouverture et toggle type) : emoji ✏️ remplacé par le caractère Unicode ✎ plus neutre.

### Maintenance
- `js/version.js` — version `0.4.12`.
- `sw.js` — cache name `arbitres-hb-v0.4.12`.

### Validation effectuée avant livraison
- Validation syntaxique `observations.js` : OK.
- Diff v0.4.11 → v0.4.12 : 3 lignes modifiées dans `observations.js`, plus les bumps de version. Aucun autre fichier touché.

---

## [0.4.11] — 2026-04-19

### Ajouté
- `js/observations.js` — **Modification de l'arbitre et du type directement depuis la popup d'édition.** Deux groupes de boutons toggle (`#detailEditControls`) visibles uniquement en mode édition. Toggle Arbitre (A1 / A2) : change `S.detailPending.arb[0]` et reconstruit le label "+ Autre aussi". Toggle Type (✘ Non conforme / ✔ Conforme) : change `S.detailPending.col`, met à jour le titre de la popup, puis applique la règle de réinitialisation sélective des tags.
- `js/observations.js` — **Réinitialisation sélective des tags au changement de type.** Seuls les tags `red`/`green` spécifiques à la catégorie sont réinitialisés. Les tags `both` (communs aux deux types) et les tags généraux (noms d'équipes + TAGS_GENERAUX) qui étaient sélectionnés sont conservés.
- `js/observations.js` — **Extraction de `_rebuildTags(cat, col, keepTags, primaryArb)`** : fonction privée qui reconstruit la zone de tags de façon réutilisable (appelée à l'ouverture de la popup et à chaque changement de type ou d'arbitre).
- `js/observations.js` — **Extraction de `_getSelectedTags()`** : lit les tags sélectionnés dans la popup au moment du changement de type pour calculer les tags à conserver.
- `index.html` — **Bloc `#detailEditControls`** inséré entre le header et les tags de la popup. Contient deux groupes : arbitre (`#detailArb_A1`, `#detailArb_A2`) et type (`#detailCol_red`, `#detailCol_green`). Masqué par défaut (`display:none`), affiché uniquement en mode édition.
- `styles.css` — **Section v0.4.11** : `.detail-edit-controls`, `.detail-edit-group`, `.detail-edit-label`, `.detail-edit-btns`, `.edit-ctrl-arb`, `.edit-ctrl-type` avec variantes `.edit-ctrl-active` (bleu pour arbitre, rouge pour Non conforme, vert pour Conforme) et support dark mode.

### Maintenance
- `js/version.js` — version `0.4.11`.
- `sw.js` — cache name `arbitres-hb-v0.4.11`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` : tous OK.
- Recherche IDs DOM morts : aucun nouveau (faux positifs connus inchangés).
- Diff v0.4.10 → v0.4.11 : 5 fichiers modifiés (`index.html`, `js/observations.js`, `styles.css`, `js/version.js`, `sw.js`). Aucun fichier inattendu touché.

---

## [0.4.10] — 2026-04-19

### Ajouté
- `js/observations.js` — **Mise à jour automatique de la synthèse par catégorie depuis l'écran ES.** Nouvelle fonction privée `_refreshSynthesisIfVisible()` : vérifie si l'écran ES (`#ES`) est actuellement affiché (`style.display !== 'none'`), et si oui appelle `window.App.buildSynTable()` pour reconstruire le radar et le panneau détail. Appelée systématiquement après `saveDetail()` (mode édition) et `confirmDelete()`. En mode création depuis MS, l'écran ES n'est pas visible donc aucun appel superflu n'est effectué.

### Maintenance
- `js/version.js` — version `0.4.10`.
- `sw.js` — cache name `arbitres-hb-v0.4.10`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` : tous OK.
- Diff v0.4.9 → v0.4.10 : 3 fichiers modifiés (`js/observations.js`, `js/version.js`, `sw.js`). Aucun autre fichier touché.

---

## [0.4.9] — 2026-04-19

### Ajouté
- `js/observations.js` — **Édition d'une observation existante (`editObservation(idx)`).** Rouvre la popup de saisie avec toutes les données pré-remplies : tags pré-sélectionnés (spécifiques + généraux), note libre pré-remplie, arbitres restaurés (y compris le cas "A1 + A2"). `S.detailPending` reçoit un champ `editIndex` pour distinguer création vs édition.
- `js/observations.js` — **Modification de `saveDetail()` pour gérer le mode édition.** Détecte `d.editIndex !== undefined` : si présent, remplace l'observation via `S.obs.splice(idx, 1, obsEntry)` au lieu de `push`. Les deux tables MS et ES sont rafraîchies après validation.
- `js/observations.js` — **Suppression d'une observation avec confirmation (`deleteObservation(idx)`, `confirmDelete()`, `closeConfirm()`).** `deleteObservation()` stocke l'index candidat dans `_pendingDeleteIdx` et alimente la modale de confirmation avec un résumé lisible de l'observation. `confirmDelete()` exécute le `splice` puis rafraîchit les deux tables et déclenche l'autosave. `closeConfirm()` annule sans modification.
- `js/observations.js` — **Colonne "Actions" dans `oRow(o, idx)`.** Deux boutons SVG inline par ligne : crayon bleu (édition) et croix rouge (suppression), avec `data-idx` sur le `<tr>` et `onclick` câblés sur les fonctions exposées sur `window`. L'index passé est celui dans `S.obs` (pas dans le tableau filtré), ce qui garantit la cohérence même avec des filtres actifs.
- `js/main.js` — **Import et exposition** de `editObservation`, `deleteObservation`, `confirmDelete`, `closeConfirm` dans `window.App` et sur `window`. Fermeture de `confirmOverlay` au clic extérieur ajoutée au listener existant.
- `index.html` — **7e colonne `<th class="th-actions">` vide** dans les `<thead>` des tables MS et ES. `id="detailBtnSave"` ajouté sur le bouton Enregistrer de la popup détail (pour changer son libellé en "Mettre à jour" en mode édition). **Modale de confirmation** `#confirmOverlay` avec icône d'alerte SVG, message fixe "Voulez-vous réellement supprimer cette observation ?", résumé de l'observation (`#confirmObsSummary`), boutons "Annuler" et "Supprimer".
- `styles.css` — **Styles dédiés v0.4.9** : `.th-actions` (largeur fixe 56px), `.obs-actions` (flex, aligné à droite), `.obs-btn-edit` (crayon bleu discret, hover bleu foncé, dark mode), `.obs-btn-del` (croix rouge discrète, hover rouge, dark mode), `.confirm-sheet`, `.confirm-icon`, `.confirm-msg`, `.confirm-summary`, `.qn-btn-delete` (bouton rouge plein).

### Maintenance
- `js/version.js` — version `0.4.9`.
- `sw.js` — cache name `arbitres-hb-v0.4.9`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` : tous OK.
- Recherche IDs DOM morts : `pdfExportBtn`, `pdfModalClose`, `pdfModalOverlay` déjà présents en v0.4.8 (hérités, non introduits par cette version). Faux positifs `swUpdate*` connus depuis v0.3.27. Aucun nouveau ID mort introduit.
- Diff v0.4.8 → v0.4.9 : 6 fichiers modifiés (`index.html`, `js/observations.js`, `js/main.js`, `styles.css`, `js/version.js`, `sw.js`). Aucun fichier inattendu touché.

---

## [0.4.7] — 2026-04-18

### Ajouté
- `js/observations.js` — **Injection dynamique des noms des équipes en tête des tags généraux.** Au moment de construire la popup, `S.tA` et `S.tB` sont préfixés à `TAGS_GENERAUX` pour apparaître en premier. Les équipes non renseignées sont filtrées via `.filter(Boolean)`.

### Modifié
- `js/state.js` — **Mise à jour complète de `CAT_TAGS` et `TAGS_GENERAUX`** selon la version de référence fournie par lutilisateur (corrections et ajouts de tags par catégorie).

### Maintenance
- `js/version.js` — version `0.4.7`.
- `sw.js` — cache name `arbitres-hb-v0.4.7`.

### Validation effectuée avant livraison
- Validation syntaxique JS de tous les fichiers : OK.
- Diff v0.4.6 → v0.4.7 : 4 fichiers modifiés (observations.js, state.js, version.js, sw.js).

---

## [0.4.6] — 2026-04-18

### Ajouté
- `js/state.js` — **Ajout du tag "Respect des 3m" dans la catégorie EJ.** Tag ajouté dans le tableau `both` de `TAGS['EJ']`.

### Maintenance
- `js/version.js` — version `0.4.6`.
- `sw.js` — cache name `arbitres-hb-v0.4.6`.

### Validation effectuée avant livraison
- Validation syntaxique JS de tous les fichiers : OK.
- Diff v0.4.5 → v0.4.6 : seuls 3 fichiers modifiés (state.js, version.js, sw.js).

---

## [0.4.5] — 2026-04-18

### Corrigé
- `index.html` — **Correction de 3 fautes d'accent dans l'interface.** `Competition` → `Compétition` (label écran Setup), `Chronometre` → `Chronomètre` (titre carte écran Match), `Retour a l'accueil` → `Retour à l'accueil` (attribut `title` du logo topbar écran Match).
- `js/state.js` — **Correction des clés de catégories `'Continuite'` et `'Deplacement'`.** Corrigées en `'Continuité'` et `'Déplacement'` dans les tableaux `CT`, `CP` et l'objet `TAGS`. Note : les snapshots `localStorage` existants avec l'ancienne graphie continueront d'être lus (les observations historiques afficheront simplement l'ancienne valeur de catégorie).
- `js/observations.js` — **Mise à jour du mapping d'abréviations `ABBR`.** Clés `'Continuite'` → `'Continuité'` et `'Deplacement'` → `'Déplacement'` pour cohérence avec `state.js`.
- `js/synthesis.js` — **Idem dans le mapping d'abréviations.** Clés `'Continuite'` → `'Continuité'` et `'Deplacement'` → `'Déplacement'`.
- `js/pdf.js` — **Correction orthographique dans un commentaire.** `resolution` → `résolution`.

### Maintenance
- `js/version.js` — version `0.4.5`.
- `sw.js` — cache name `arbitres-hb-v0.4.5`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS modifiés : OK.
- Cohérence inter-fichiers vérifiée : clés `'Continuité'` et `'Déplacement'` identiques dans `state.js`, `observations.js` et `synthesis.js`.
- Diff v0.4.4 → v0.4.5 : 7 fichiers modifiés (`index.html`, `js/state.js`, `js/observations.js`, `js/synthesis.js`, `js/pdf.js`, `js/version.js`, `sw.js`). Aucun fichier inattendu touché.

---

## [0.4.4] — 2026-04-18

### Corrigé
- `js/pdf.js` — **Fix FIX-ECRASEMENT : radar SVG écrasé horizontalement dans le PDF.** En v0.4.3, `width=height=1500` était forcé sur le clone SVG avant sérialisation. Le SVG ayant `width="100%"` dans un conteneur rectangulaire (plus large que haut), le navigateur rasterisait selon les proportions du conteneur affiché, pas du viewBox carré `0 0 500 500` — d'où le radar aplati. Correction : le clone reçoit `width="500" height="500"` (dimensions exactes du viewBox natif déclaré dans `synthesis.js`) et `style` est supprimé pour neutraliser tout `max-width` ou `width:100%`. L'upscale ×3 est effectué uniquement côté canvas (`drawImage` 500→1500), ce qui est propre et sans déformation. Trois constantes documentées : `RADAR_NATIVE_SIZE = 500`, `RADAR_SCALE = 3`, `RADAR_CANVAS_SIZE = 1500`.

### Maintenance
- `js/version.js` — version `0.4.4`.
- `sw.js` — cache name `arbitres-hb-v0.4.4`.

### Validation effectuée avant livraison
- Validation syntaxique `js/pdf.js` : OK.
- Diff v0.4.3 → v0.4.4 : 3 fichiers modifiés (`js/pdf.js`, `js/version.js`, `sw.js`). Aucun fichier inattendu touché.

---

## [0.4.3] — 2026-04-18

### Corrigé
- `js/pdf.js` — **Fix QUALITE-RADAR : radar SVG pixelisé dans le PDF.** La résolution du canvas de capture était fixée à 400×400, en dessous du SVG natif (500×500 d'après `synthesis.js`), ce qui causait une interpolation dégradée. Correction : le SVG est d'abord cloné (pour ne pas altérer le DOM), ses attributs `width`/`height` sont forcés à 1500×1500 (3× la taille native, ~346 DPI à l'insertion dans le PDF), et le `viewBox` d'origine est préservé pour que le contenu soit mis à l'échelle correctement. Le canvas de capture est également porté à 1500×1500. L'image est insérée à 110mm dans le PDF (contre 80mm avant), ce qui améliore lisibilité et netteté. Deux constantes documentées : `RADAR_CANVAS_SIZE = 1500` et `RADAR_PDF_MM = 110`.

### Maintenance
- `js/version.js` — version `0.4.3`.
- `sw.js` — cache name `arbitres-hb-v0.4.3`.

### Validation effectuée avant livraison
- Validation syntaxique `js/pdf.js` : OK.
- Diff v0.4.2 → v0.4.3 : 3 fichiers modifiés (`js/pdf.js`, `js/version.js`, `sw.js`). Aucun fichier inattendu touché.

---

## [0.4.2] — 2026-04-18

### Corrigé
- `js/pdf.js` — **Fix BUG-RADAR : le radar SVG n'apparaissait pas dans le PDF.** La capture du SVG via `XMLSerializer` + `Canvas` est asynchrone (résolution dans `Image.onload`), mais `doc.save()` était appelé de façon synchrone immédiatement après, avant que l'image soit prête. Le radar était donc toujours ignoré. Correction : `_generatePDF()` est désormais `async` et utilise `await _captureRadar()` — une nouvelle fonction dédiée qui retourne une `Promise<string|null>` se résolvant avec le dataURL PNG quand l'image est chargée, ou `null` en cas d'échec (SVG absent, erreur canvas, timeout). Un timeout de 3 secondes évite tout blocage infini. `_onExportClick()` utilise désormais `await _generatePDF(selection)` et a été converti en `async function` en conséquence. `doc.save()` n'est appelé qu'après résolution complète de toutes les sections.

### Maintenance
- `js/version.js` — version `0.4.2`.
- `sw.js` — cache name `arbitres-hb-v0.4.2`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` : tous OK.
- Recherche IDs DOM morts : `pdfExportBtn`, `pdfModalClose`, `pdfModalOverlay` créés dynamiquement (comportement attendu, inchangé). Aucun nouveau faux positif.
- Diff v0.4.1 → v0.4.2 : 3 fichiers modifiés (`js/pdf.js`, `js/version.js`, `sw.js`). Aucun fichier inattendu touché.

---

## [0.4.1] — 2026-04-18

### Modifié
- `js/pdf.js` — **Remplacement du Design C « Audit » par le Design A « Officiel ».**
  Bandeau bleu marine `#1D3A7A` en en-tête, sections délimitées par ligne fine grise, tableaux autoTable austères (fond alterné gris clair, en-tête bleu navy), typo Helvetica sobre. Score final centré en grande typographie avec mi-temps en sous-titre gris. Évaluation générale avec ligne pointillée de liaison et valeur Oui/Non colorée alignée à droite. Synthèse par catégorie en tableau avec coloration des colonnes Non conf. / Conf. / Conformité. Pied de page minimaliste (texte gris, pagination). Compatible impression noir & blanc.
- `js/pdf.js` — **Modal de sélection adapté au style de l'application.** Header bleu `#1D3A7A` (= `--blue-main`), bouton « Exporter PDF » imite `.btn-act.prim`, bouton « Annuler » imite `.btn-act`, `accent-color` des checkboxes aligné sur la couleur primaire. Logique de sélection, mémorisation session et comportement Tout/Rien inchangés (identique v0.4.0).

### Maintenance
- `js/version.js` — version `0.4.1`.
- `sw.js` — cache name `arbitres-hb-v0.4.1`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` : tous OK.
- Recherche IDs DOM morts : `pdfExportBtn`, `pdfModalClose`, `pdfModalOverlay` créés dynamiquement (comportement attendu, identique v0.4.0). Aucun nouveau faux positif.
- Diff v0.4.0 → v0.4.1 : 3 fichiers modifiés (`js/pdf.js`, `js/version.js`, `sw.js`). Aucun fichier inattendu touché.

---

## [0.4.0] — 2026-04-18

### Ajouté
- `js/pdf.js` — **Refonte complète du module PDF : modal de sélection des cards et Design C « Audit ».**
  - Nouveau point d'entrée `exportPDF()` qui ouvre un modal (créé dynamiquement en JS pur, sans dépendance HTML/CSS) listant les 7 sections exportables avec checkboxes : Score final, Contexte, Évaluation générale, Synthèse par catégorie, Radar SVG, Observations, Commentaire global. Bouton « Tout sélectionner / Tout désélectionner ». Sélection mémorisée pendant la session. Export refusé si aucune section cochée.
  - Design C « Audit » : header sombre `#1a1a2e` avec badge compétition doré, sections numérotées dynamiquement (numéro circulaire blanc sur fond sombre), barres de conformité colorées par seuil (vert ≥70%, amber ≥40%, rouge <40%) avec fond piste rouge clair, badges Oui/Non colorés pour l'évaluation générale, point coloré rouge/vert par ligne d'observation dans le tableau, footer avec fond gris clair et pagination.
  - Score final : mise en page centrée avec équipes + score en grande typographie + mi-temps en sous-titre gris.
  - Radar SVG : capture optionnelle du SVG `#synRadar` via `XMLSerializer` + Canvas, intégrée en image PNG dans le PDF.
  - Restructuration en fonctions courtes documentées : `_showCardSelectionModal`, `_getModalState`, `_closeModal`, `_onExportClick`, `_readSelection`, `_generatePDF`, `_buildSynData`.

### Modifié
- `index.html` — **Libellé du bouton** `#BExp` passé de `Exporter PDF` à `Exporter PDF…` pour signaler l'ouverture d'un modal intermédiaire.

### Maintenance
- `js/version.js` — version `0.4.0`.
- `sw.js` — cache name `arbitres-hb-v0.4.0`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` via `new Function()` : tous OK.
- Recherche IDs DOM morts : `pdfExportBtn`, `pdfModalClose`, `pdfModalOverlay` sont créés dynamiquement par le modal (comportement attendu, même pattern que `swUpdateBanner`). Aucun faux positif nouveau.
- Diff v0.3.33 → v0.4.0 : 4 fichiers modifiés (`js/pdf.js`, `index.html`, `js/version.js`, `sw.js`). Aucun fichier inattendu touché.

---

## [0.3.33] — 2026-04-18

### Modifié
- `index.html` — **Fusion du sélecteur de tri dans la barre de filtres (écrans MS et ES).** Le bloc `.obs-controls` (titre + label « Tri : » + select séparé) est supprimé. Le titre et le select de tri sont désormais intégrés directement dans la `.flt-bar`, sur la même ligne que les filtres. Le select de tri conserve ses IDs `sortSel`/`sortSelE` et ses `onchange` → aucune logique JS modifiée. Option `time_asc` ajoutée (« Heure — ancien en haut ») absente de l'ancienne version.
- `styles.css` — **Nouvelle classe `.flt-title`** : override `margin-bottom:0` et `flex-shrink:0` pour intégrer le titre `card-title` dans le flux flex de `.flt-bar` sans casser l'alignement.

### Maintenance
- `js/version.js` — version `0.3.33`.
- `sw.js` — cache name `arbitres-hb-v0.3.33`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` : tous OK.
- Recherche IDs DOM morts : aucun nouveau (3 faux positifs connus inchangés).
- Diff v0.3.32 → v0.3.33 : 4 fichiers modifiés (`index.html`, `styles.css`, `js/version.js`, `sw.js`). Aucun fichier JS applicatif touché.

---



### Ajouté
- `js/observations.js` — **Filtres par colonne sur les deux tableaux d'observations (MS et ES), indépendants l'un de l'autre.** Deux objets d'état `F` (écran match) et `FE` (écran fin de match) stockent les valeurs courantes : `{ cat, col, period, arb }`, chaque champ valant `'all'` quand inactif. Fonction pure `applyFilters(obs, f)` qui filtre un tableau source sans effet de bord : test d'égalité stricte sur catégorie, type (`red`/`green`), période et code arbitre (`A1`/`A2`). Les filtres sont cumulables et le filtrage porte sur les données sources (pas uniquement visuel). Performances constantes quelle que soit la taille de `S.obs`.
- `js/observations.js` — **Options dynamiques Catégorie et Arbitre.** La fonction `_syncFilterOptions(screen)` reconstruit les `<option>` des selects Catégorie (toutes les catégories présentes dans `S.obs`, triées) et Arbitre (A1/A2 avec noms réels depuis `S.a1`/`S.a2`) à chaque rendu. La sélection précédente est préservée si la valeur existe encore.
- `js/observations.js` — **Badge "N filtre(s) actif(s)" et bouton Reset.** La fonction `_syncFilterBadge(screen)` met à jour le badge (masqué si aucun filtre actif), active/désactive le bouton Reset, et ajoute la classe CSS `flt-on` sur les selects dont la valeur est active pour un retour visuel immédiat.
- `js/observations.js` — **Compteur d'observations filtré.** Dans `renderTable()` (écran MS), l'indicateur `#OC` affiche `N/total obs.` quand des filtres sont actifs, `total obs.` sinon. Message distinct "Aucun résultat pour ces filtres" vs "Aucune observation" selon le cas.
- `js/observations.js` — **Fonctions exportées** : `onFilterChange()`, `onFilterChangeE()`, `resetFilters()`, `resetFiltersE()` — appelées par les `onchange`/`onclick` du HTML, exposées sur `window` via `main.js`.
- `js/main.js` — **Import et exposition** des 4 nouvelles fonctions de filtrage dans `window.App` et sur `window` directement.
- `index.html` — **Barre de filtres `.flt-bar`** insérée entre `.obs-controls` et `.obs-wrap` sur les deux tableaux (écrans MS et ES). Contient : select Catégorie (`fltCat`/`fltCatE`), select Type (`fltCol`/`fltColE`, options fixes), select MT (`fltMT`/`fltMTE`, options fixes incluant Prol.1 et Prol.2), select Arbitre (`fltArb`/`fltArbE`), badge (`fltBadge`/`fltBadgeE`), bouton Reset (`fltReset`/`fltResetE`).
- `styles.css` — **Section dédiée v0.3.32** : `.flt-bar`, `.flt-bar select`, `.flt-bar select.flt-on` (select actif en bleu avec fond teinté, dark mode inclus), `.flt-badge` (pill bleue), `.flt-reset` / `.flt-reset-active` (rouge au survol quand actif), adaptation mobile `@media (max-width: 767px)`.

### Maintenance
- `js/version.js` — version `0.3.32`.
- `sw.js` — cache name `arbitres-hb-v0.3.32`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` via `new Function()` : tous OK.
- Recherche exhaustive d'IDs DOM morts : aucun nouveau. Les 3 faux positifs connus (`swUpdateBanner`, `swUpdateDismiss`, `swUpdateReload`) sont créés dynamiquement par `_showUpdateBanner()` depuis v0.3.27.
- Diff complet v0.3.31 → v0.3.32 contrôlé : 6 fichiers modifiés (`index.html`, `js/observations.js`, `js/main.js`, `styles.css`, `js/version.js`, `sw.js`). Aucun fichier inattendu touché.

---



### Corrigé
- `js/state.js` + `js/match.js` + `js/timer.js` + `js/score.js` + `js/observations.js` + `js/main.js` + `index.html` — **Fix BUG-5 : bandeau de reprise après démarrage de match sans action réelle.** Le simple appel à `startMatch()` suffisait à déclencher l'autosave sur fermeture (les noms d'équipes étaient copiés dans `S`, ce qui satisfaisait les conditions de `_hasMatchData()`). Désormais, un flag `S.matchActif` conditionne l'autosave : il est mis à `true` uniquement par une action réelle (chrono via `toggleChrono()`, score via `chgScore()`, temps mort via `addTme()`, observation via `saveDetail()`, contexte via `oninput` sur `ctxTA`). `startMatch()` et `goHome()` remettent le flag à `false`. `_hasMatchData()` est simplifié à `return S.matchActif === true`.

### Maintenance
- `js/version.js` — version `0.3.31`.
- `sw.js` — cache name `arbitres-hb-v0.3.31`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers modifiés via `new Function()` : OK.
- Diff v0.3.30 → v0.3.31 contrôlé : 9 fichiers modifiés (`index.html`, `js/state.js`, `js/match.js`, `js/timer.js`, `js/score.js`, `js/observations.js`, `js/main.js`, `js/version.js`, `sw.js`). Aucun autre fichier touché.

---

## [0.3.30] — 2026-04-10

### Maintenance
- `js/version.js` — version `0.3.30`.
- `sw.js` — cache name `arbitres-hb-v0.3.30`.

---

## [0.3.29] — 2026-04-10 — 2026-04-10

### Corrigé
- `index.html` + `js/ui.js` — **Fix : bouton thème réduit à l'icône seule, synchronisation CSS pure.** Texte SOMBRE/CLAIR supprimé. L'icône est pilotée uniquement par `body.dark` via CSS — synchronisation instantanée sur tous les écrans simultanément.
- `js/main.js` — **Fix BUG-4a : bandeau de reprise fantôme au lancement sans match amorcé.** Garde `_hasMatchData()` sur `beforeunload` et `visibilitychange`. Étendue pour lire aussi les inputs HTML de l'écran Setup (tA, tB, a1, a2) en plus de l'état `S` — couvre le cas où les données sont saisies avant `startMatch()`.
- `js/storage.js` — **Fix BUG-4b : historique et sauvegarde remote réservés aux admins.** Les utilisateurs non-admin voient uniquement leur historique local et ne sauvegardent pas sur le serveur. `isAdmin()` ajouté aux imports depuis `auth.js` ; conditions `isLoggedIn() && isAdmin()` appliquées dans `renderHistory()` et `saveToHistory()`.

### Maintenance
- `js/version.js` — version `0.3.29`.
- `sw.js` — cache name `arbitres-hb-v0.3.29`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de `js/storage.js` et `js/main.js` via `new Function()` : OK.
- Diff v0.3.28 → v0.3.29 contrôlé : 6 fichiers modifiés (`index.html`, `js/ui.js`, `js/main.js`, `js/storage.js`, `js/version.js`, `sw.js`). Aucun autre fichier touché.

---

## [0.3.28] — 2026-04-09

## [0.3.28] — 2026-04-09

## [0.3.28] — 2026-04-09

## [0.3.28] — 2026-04-09

## [0.3.28] — 2026-04-09

## [0.3.28] — 2026-04-09

## [0.3.28] — 2026-04-09

## [0.3.28] — 2026-04-09

**Optimisation critique de la détection de mise à jour** introduite en v0.3.27. En conditions réelles (test utilisateur sur connexion mobile 4G), le bandeau "Nouvelle version disponible" mettait **plus d'une minute** à apparaître après le déploiement d'une mise à jour, ce qui rendait le mécanisme inutilisable en pratique. Le mécanisme est refait avec un fichier sentinelle pour passer à une détection en moins d'une seconde sur connexion correcte.

### Modifié
- `sw.js` — **Refonte du mécanisme de détection de mise à jour : passage à une stratégie sentinelle.** Avant v0.3.28, la fonction `responsesDiffer()` lisait et comparait le contenu complet de chaque fichier de l'app à chaque rechargement (20 fichiers, plusieurs Ko chacun, lecture `.text()` synchrone), ce qui était le bottleneck identifié. Désormais, le SW utilise `js/version.js` comme **fichier sentinelle** : un seul petit fichier (~700 octets) que l'utilisateur bumpe déjà à chaque release par convention. Au tout premier `fetch` de la session SW, la fonction `checkSentinel()` est appelée **une seule fois** (protégée par le flag `_sentinelChecked`) et fait : (1) lecture de la sentinelle en cache, (2) fetch réseau frais avec `cache: 'no-store'` pour bypasser le cache HTTP du navigateur, (3) comparaison des deux contenus en texte brut, (4) si différent → mise à jour du cache de la sentinelle + appel à `notifyClientsUpdateAvailable()`. Le `e.waitUntil(checkSentinel())` garantit que le SW reste actif le temps que la vérification termine. La fonction `responsesDiffer()` est **supprimée** car elle n'a plus d'utilité. La fonction `staleWhileRevalidate()` est **simplifiée** : elle ne fait plus de comparaison ni de notification, juste son rôle de cache (servir le cache + rafraîchir en arrière-plan).

### Maintenance
- `js/version.js` — version `0.3.28`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` via `new Function()` : tous OK.
- Validation supplémentaire spécifique au SW : exécution simulée du fichier `sw.js` dans un contexte Worker mocké pour vérifier l'absence d'erreur de référence ou de syntaxe au démarrage. Résultat : OK.
- Recherche exhaustive d'IDs DOM morts : aucun nouveau (les 3 faux positifs `swUpdateBanner`, `swUpdateReload`, `swUpdateDismiss` créés dynamiquement par `_showUpdateBanner()` dans `main.js` sont préservés et inchangés depuis v0.3.27).
- Diff complet v0.3.27 → v0.3.28 contrôlé : 4 fichiers modifiés (`sw.js`, `js/version.js`, `docs/CHANGELOG.md`, `docs/instructions test.md` réécrit). Aucun fichier inattendu touché. **Pas de modification de `js/main.js` ni de `styles.css`** : le côté client (écouteur `postMessage`, fonction `_showUpdateBanner()`, styles du bandeau) est strictement identique à v0.3.27. Seul le mécanisme **côté SW** qui décide quand envoyer le `postMessage` change.

### Bénéfices attendus
- **Détection en moins d'une seconde** sur connexion correcte (vs >1 minute en v0.3.27).
- **Code plus simple côté SW** : `responsesDiffer()` supprimée (~25 lignes), `staleWhileRevalidate()` allégée (~10 lignes en moins).
- **Fiabilité par construction** : tant que `js/version.js` est bumpé à chaque release (déjà obligatoire dans les conventions), aucun faux négatif possible.
- **Pattern standard** : c'est l'approche utilisée par la plupart des PWA matures pour la détection de mise à jour.

### Risques résiduels et mitigations
- **Si l'utilisateur oublie de bumper `js/version.js`** lors d'une release : la sentinelle n'est pas détectée comme changée et le bandeau ne s'affiche pas. Mitigation : c'est déjà une violation des conventions documentées en v0.3.23, donc le risque réel est faible. De plus, le bump du `CACHE_NAME` dans `sw.js` reste obligatoire et constitue un second filet de sécurité (le navigateur active le nouveau SW de toute façon, le cache est mis à jour silencieusement, juste sans notification).
- **Si la requête réseau de la sentinelle échoue** (réseau cassé, serveur down) : `checkSentinel()` attrape l'erreur silencieusement et n'envoie pas de notification. L'app continue de fonctionner normalement avec le cache existant. Au prochain rechargement avec réseau fonctionnel, le check sera relancé.
- **Cache HTTP du navigateur** : pour éviter qu'un proxy ou le cache HTTP du navigateur ne renvoie une vieille version de la sentinelle (faussant la comparaison), l'option `cache: 'no-store'` est explicitement passée à `fetch()`. C'est un détail crucial qui était souvent oublié dans les implémentations naïves.

---

## [0.3.27] — 2026-04-08

**Version sensible** : refonte complète du Service Worker pour passer d'une stratégie "réseau d'abord" à "stale-while-revalidate" (FRAG-2 de l'audit). Cette version doit être testée rigoureusement avant mise en production car un bug de service worker peut bloquer l'app sur une vieille version impossible à rafraîchir.

### Modifié
- `sw.js` — **Refonte complète du Service Worker** (FRAG-2). Passage de la stratégie "réseau d'abord" pour les fichiers de l'app à une stratégie "stale-while-revalidate". Comportement nouveau : à chaque ouverture, le SW sert immédiatement la version en cache (ouverture instantanée online comme offline), puis fait un fetch réseau en arrière-plan pour vérifier si une nouvelle version est disponible et mettre à jour le cache pour la prochaine ouverture. Dispatch par origine : les fichiers de l'app (même origine que le SW) passent par stale-while-revalidate, les CDN jsPDF restent en cache-first comme avant, **toutes les autres origines (notamment l'API backend `api.suiviarbitres.omnelya.fr`) ne sont plus interceptées du tout** pour éviter de casser l'authentification. Les requêtes non-GET (POST vers l'API) sont également ignorées par le SW. Ajout d'une fonction helper `responsesDiffer()` qui compare la taille et optionnellement le contenu des réponses cache/réseau pour détecter une vraie mise à jour. Quand une mise à jour est détectée en arrière-plan, le SW envoie un `postMessage` aux clients avec `{ type: 'APP_UPDATE_AVAILABLE' }`. Les mécanismes `skipWaiting()` et `clients.claim()` sont conservés pour forcer l'activation immédiate du nouveau SW à chaque bump. L'ensemble du fichier est abondamment commenté pour expliquer les choix de conception et les pièges à éviter.
- `js/main.js` — **Ajout d'un écouteur de messages du Service Worker.** À la fin du bloc d'enregistrement SW, ajout d'un `navigator.serviceWorker.addEventListener('message', ...)` qui écoute les messages `{ type: 'APP_UPDATE_AVAILABLE' }` envoyés par le SW quand stale-while-revalidate détecte une nouvelle version sur le serveur. À la réception, la fonction `_showUpdateBanner()` crée dynamiquement (via `document.createElement`) un bandeau fixe en bas de l'écran proposant à l'utilisateur de recharger. Protection contre les déclenchements multiples via le flag `_updateBannerShown`. Le bandeau contient un bouton "Recharger" qui fait `window.location.reload()` et un bouton de fermeture "×" qui masque le bandeau si l'utilisateur préfère rester sur l'ancienne version pour l'instant. Chaque action logge un événement dédié (`SW/update_disponible`, `SW/update_reload_demande`, `SW/update_reload_differe`).
- `styles.css` — **Ajout des styles du bandeau `.sw-update-banner`** à la fin du fichier dans une section dédiée v0.3.27. Bandeau `position: fixed` en bas au centre de l'écran, fond bleu cohérent avec le thème de la topbar (`#1D3A7A`), animation d'entrée douce par le bas (`sw-update-slide-in` 0.3s), ombre marquée pour détacher du contenu, `z-index: 9999` pour passer au-dessus de tous les overlays de l'app. Bouton "Recharger" blanc contrasté, bouton "×" discret en haut à droite du bandeau.

### Maintenance
- `js/version.js` — version `0.3.27`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` via `new Function()` : tous OK.
- **Validation supplémentaire spécifique au SW** : exécution simulée du fichier `sw.js` dans un contexte Worker minimum mocké (`self`, `caches`, `fetch`, `URL`, `Response`, `Promise`) pour vérifier qu'il se charge sans erreur d'exécution au démarrage. Résultat : OK. Cette validation ne remplace pas un test dans un vrai navigateur mais confirme l'absence d'erreur de référence ou de syntaxe non-détectée par la validation standard.
- Recherche exhaustive d'IDs DOM morts : aucun trouvé.
- Diff complet v0.3.26 → v0.3.27 contrôlé : 6 fichiers modifiés (`sw.js`, `js/main.js`, `styles.css`, `js/version.js`, `docs/CHANGELOG.md`, `docs/instructions test.md` réécrit). Aucun fichier inattendu touché.

### Notes importantes et mises en garde
- **Cette version requiert un protocole de test strict**, détaillé dans `docs/instructions test.md`. Les scénarios critiques incluent : premier chargement online, rechargement online (doit être instantané), test hors ligne complet (mode avion), déploiement d'une mise à jour avec apparition du bandeau, non-régression sur l'authentification (login/logout/fetchMatches ne doivent pas être cassés par la nouvelle stratégie). **Ne pas déployer en production sans avoir passé tous ces tests.**
- **Rollback d'urgence** : si un bug critique survient après déploiement et que l'app devient impossible à rafraîchir pour les utilisateurs existants, la procédure de rollback est : (1) redéployer rapidement la v0.3.26 en conservant tous ses fichiers, (2) attendre que les utilisateurs rouvrent l'app au moins une fois (le SW v0.3.27 fera un fetch en arrière-plan et détectera le "downgrade" comme une nouvelle version), (3) ils verront le bandeau "nouvelle version" et pourront recharger pour revenir à v0.3.26. Ce n'est pas instantané mais c'est la raison d'être du bandeau de notification.
- **Convention d'architecture préservée** : `js/auth.js` n'est pas modifié. Il continue d'être servi comme les autres fichiers de l'app via stale-while-revalidate. Les **appels réseau** qu'il effectue vers `api.suiviarbitres.omnelya.fr` ne sont plus interceptés par le SW grâce au filtre par origine, ce qui est un changement positif : avant v0.3.27 ils étaient aussi mis dans le cache du SW (via la stratégie "réseau d'abord" qui cachait tout), ce qui pouvait causer des comportements inattendus sur l'authentification.

---

## [0.3.26] — 2026-04-08

Version **purement cosmétique** : repositionnement de l'indicateur visuel d'autosave dans le coin supérieur droit des topbars MS et ES, à la demande de l'utilisateur. Aucune modification de logique JavaScript : la fonction `_updateAutosaveDots()` cible toujours les mêmes IDs `autosaveDotMS` et `autosaveDotES`, seul leur emplacement DOM et leur style CSS ont changé.

### Modifié
- `index.html` — **Déplacement du span `#autosaveDotMS`** : retiré de sa position précédente entre le bouton thème et le bouton "Fin de match" (où il était collé inline avec un `margin` horizontal), repositionné en début de la `<div class="topbar">` juste avant le `topbar-logo`. Ajout de la classe `autosave-dot-corner` qui le positionne en absolute dans le coin supérieur droit du parent.
- `index.html` — **Déplacement du span `#autosaveDotES`** : retiré de l'intérieur de `<div class="end-acts">` (où il était placé entre le bouton thème et le bouton Retour), repositionné directement dans la `<div class="end-header">` au tout début, avant la `<div>` qui contient le titre Synthèse. Même classe `autosave-dot-corner`.
- `styles.css` — **Ajout de `position: relative` sur `.topbar` et `.end-header`** : nécessaire pour servir d'ancrage au positionnement absolu du nouveau point. Modification minime qui ne change rien au rendu existant des enfants en flux normal.
- `styles.css` — **Nouvelle classe `.autosave-dot-corner`** ajoutée juste après la classe `.autosave-dot` existante. Override la marge horizontale, force `position: absolute` avec `top: 6px; right: 8px;`, réduit la taille à 8 px (au lieu de 10 px) pour rester discret en coin, et ajoute `z-index: 10` pour s'assurer que le point reste visible au-dessus des autres éléments de la topbar/end-header. La classe `.autosave-dot` de base est conservée intacte (composition CSS : un span peut avoir les deux classes pour cumuler les comportements).

### Maintenance
- `js/version.js` — version `0.3.26`.
- `sw.js` — cache name `arbitres-hb-v0.3.26`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` via `new Function()`. Aucun fichier JS n'a été modifié dans cette version mais validation systématique conservée par principe.
- Recherche exhaustive d'IDs DOM morts : aucun trouvé. Les IDs `autosaveDotMS` et `autosaveDotES` sont toujours présents dans le HTML aux nouvelles positions.
- Diff complet v0.3.25 → v0.3.26 contrôlé : 5 fichiers modifiés (`index.html`, `styles.css`, `js/version.js`, `sw.js`, `docs/CHANGELOG.md`) + 1 fichier réécrit (`docs/instructions test.md`). Aucun fichier inattendu touché. **Aucune modification de code JavaScript applicatif.**

### Notes importantes
- **Aucun risque de régression fonctionnelle** : la logique JavaScript de mise à jour des points est strictement identique. Seuls le HTML et le CSS ont changé, et uniquement pour repositionner visuellement un élément qui existait déjà.
- L'ancien comportement (point inline entre les boutons) ne peut pas être restauré accidentellement par un cache du navigateur grâce au bump du `CACHE_NAME` du service worker.

---

## [0.3.25] — 2026-04-08

Version groupant **un sujet de code** (indicateur visuel d'autosave) et **un sujet de documentation pure** (nouveau fichier `docs/ARCHITECTURE.md`). Le groupage est validé en respect de l'esprit de la convention « un sujet par version » : il n'y a qu'un seul sujet de code, le second étant un fichier de doc qui ne touche aucun code applicatif et ne peut donc rien casser.

### Ajouté
- `index.html` — **Indicateur visuel d'autosave dans les topbars MS et ES.** Deux nouveaux éléments `<span class="autosave-dot autosave-ok" id="autosaveDotMS|autosaveDotES" title="Sauvegarde OK">` insérés respectivement entre le bouton thème et le bouton "Fin de match" (écran MS), et entre le bouton thème et le bouton "Retour" dans `end-acts` (écran ES). État par défaut : vert (sauvegarde OK). Tooltip natif via l'attribut `title`.
- `styles.css` — **Styles `.autosave-dot`, `.autosave-ok`, `.autosave-error`** ajoutés à la fin du fichier dans une section dédiée v0.3.25. Point de 10 px, transition douce sur le changement de couleur, animation de pulsation lente sur l'état d'erreur pour attirer l'attention sans être agressif. Vert `#4CAF50` pour OK, rouge `#E24B4A` (cohérent avec `--red-text` du thème) pour ERROR.
- `js/storage.js` — **Fonction `_updateAutosaveDots(state)`** qui met à jour les deux points en fonction d'un état (`'ok'` ou `'error'`). Volontairement défensive : si les éléments DOM n'existent pas (utilisateur sur l'écran SS, AdminS, HistS, AuthS), la fonction ne fait rien. Met aussi à jour le tooltip `title` pour refléter l'état.
- `js/storage.js` — **Hook dans `autosave()`** : appel `_updateAutosaveDots('ok')` après écriture localStorage réussie, et `_updateAutosaveDots('error')` en cas d'erreur non-quota.
- `js/storage.js` — **Hook dans `_notifyQuotaExceeded()`** : appel `_updateAutosaveDots('error')` qui couvre du même coup les erreurs de quota déclenchées depuis `autosave()` ET depuis `saveToHistory()`.
- `docs/ARCHITECTURE.md` — **Nouveau fichier de documentation interne** (~2 pages) destiné à toute personne (humaine ou IA) qui doit lire ou modifier le code. Contenu : vue d'ensemble de l'app PWA sans framework, cartographie ASCII des modules avec leurs dépendances, détail par module (rôle, conventions importantes), 4 flux de données critiques expliqués pas à pas (démarrage de match, ajout d'observation, reprise de match, export PDF + sauvegarde historique), conventions de couplage (registre `window.App`, expositions `window.X` héritées, mutation directe vs immutabilité), table des clés localStorage, philosophie générale de simplicité du projet.

### Maintenance
- `js/version.js` — version `0.3.25`.
- `sw.js` — cache name `arbitres-hb-v0.3.25`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` via `new Function()` après dépouillement des `import`/`export`. Tous OK.
- Recherche exhaustive d'IDs DOM morts : aucun trouvé. Les nouveaux IDs `autosaveDotMS` et `autosaveDotES` sont bien présents dans le HTML et référencés dans le JS (la fonction `_updateAutosaveDots` les cible).
- Diff complet v0.3.24 → v0.3.25 contrôlé : 6 fichiers modifiés (`index.html`, `styles.css`, `js/storage.js`, `js/version.js`, `sw.js`, `docs/CHANGELOG.md`) + 2 fichiers ajoutés (`docs/ARCHITECTURE.md`, `docs/instructions test.md` réécrit). Aucun fichier inattendu touché.

### Notes importantes
- **Conformément aux conventions :** un seul sujet de code dans cette version. Le fichier `docs/ARCHITECTURE.md` est de la documentation pure qui ne touche aucun code applicatif et n'introduit donc aucun risque de régression.
- L'indicateur ne s'affiche que sur les écrans MS et ES par choix utilisateur. Les autres écrans (Setup, Historique, Admin, Auth) n'ont pas de point d'autosave car ils ne génèrent pas d'autosave applicatif (ou très rarement).

---

## [0.3.24] — 2026-04-08

Version **groupée à la demande explicite de l'utilisateur** : FRAG-3 + FRAG-5 + FRAG-6 + audit complet des accents dans `index.html`. Par défaut les conventions du projet imposent un sujet par version, le groupage a été accepté en connaissance de cause.

### Modifié
- `index.html` — **Audit complet des accents manquants dans l'interface.** Correction d'environ 25 chaînes textuelles dans tous les écrans (Setup, Match, Fin, Historique, Admin, Auth, modales). Principales corrections : `acceder a` → `accéder à` (demande explicite sur l'écran AUTH), `Deconnexion` → `Déconnexion`, `Demarrer` → `Démarrer`, `Reinit.` → `Réinit.`, `Equipe` → `Équipe` (×3), `Categorie` → `Catégorie` (×4), `Synthese` → `Synthèse` (×3), `Periode` → `Période`, `Evaluation generale` → `Évaluation générale`, `Basculer le theme` → `Basculer le thème` (×4), `Elements de contexte` → `Éléments de contexte`, `Creer` → `Créer`, `Politique affichee` → `Politique affichée`, `Un suivi interrompu a ete retrouve` → `Un suivi interrompu a été retrouvé`, `Tous droits reserves` → `Tous droits réservés`, `Telecharger les logs` → `Télécharger les logs`, `Fin du temps reglementaire` → `Fin du temps réglementaire`, `Heure (recent en haut)` → `Heure (récent en haut)` (×2), `Synthese generale` → `Synthèse générale`. Aucune modification de structure ni de classes CSS, uniquement des corrections orthographiques. Vérification finale par grep : aucun accent manquant ne subsiste dans `index.html`.
- `js/utils.js` — **FRAG-3 : ajout de la fonction `escapeHtml()`.** Fonction utilitaire qui échappe les 5 caractères dangereux du HTML (`&`, `<`, `>`, `"`, `'`). À utiliser obligatoirement lors de l'injection de toute donnée utilisateur (nom d'équipe, nom d'arbitre, contexte, commentaire, tag, email) dans un `innerHTML` ou une chaîne HTML construite par concaténation. Commentaire explicatif détaillé dans le code.
- `js/match.js` — **FRAG-3 : échappement HTML de `S.tA`, `S.tB`, `S.a1`, `S.a2` dans `startMatch()`** (ligne `topInfo.innerHTML`). Import de `escapeHtml` depuis `utils.js`.
- `js/storage.js` — **FRAG-3 : trois points d'application.** (1) `topInfo.innerHTML` dans `resumeMatch()` ; (2) template littéral de la liste d'historique distante — échappement de `m.equipe_a`, `m.equipe_b`, `m.arbitre1`, `m.arbitre2`, `m.date_match`, `m.competition`, `m.score_a`, `m.score_b`, `m.id` ; (3) template littéral de la liste d'historique locale — échappement de `m.S.tA`, `m.S.tB`, `m.S.a1`, `m.S.a2`, `fmtDate(m.S.mDate)`, `m.S.sA`, `m.S.sB`. Import de `escapeHtml`.
- `js/observations.js` — **FRAG-3 : deux points d'application.** (1) En-tête de zone Quick Notes — échappement de `nameLabel` qui correspond à `S.a1` ou `S.a2` ; (2) fonction `oRow()` — échappement de `o.an` (noms d'arbitres concaténés, données utilisateur), `o.cat` (par sécurité défensive) et `cmtText` (tags + commentaire libre, données utilisateur). Import de `escapeHtml`.
- `js/synthesis.js` — **FRAG-3 : durcissement de `sn()` + 6 points dans le SVG.** La fonction `sn()` (qui retourne un nom de catégorie court) est modifiée pour échapper son retour, ce qui sécurise d'un coup toutes ses utilisations dans le SVG et le panneau détail. Les 6 injections de `S.a1` et `S.a2` dans les `<text>` SVG et les `<div>` de légende sont explicitement enveloppées dans `escapeHtml()`. Rappel : un SVG `<text>` est aussi vulnérable au XSS que du HTML via une balise `<script>` imbriquée. Import de `escapeHtml`.
- `js/main.js` — **FRAG-3 : liste admin utilisateurs échappée.** La fonction `_renderAdminUsers()` construisait des `innerHTML` contenant `u.email` (donnée saisie côté admin, potentiellement malveillante si un admin compromis crée un utilisateur), `u.role` et `u.id`. Les trois sont désormais échappés via des variables locales `eEmail`, `eRole`, `eId`. Bénéfice supplémentaire : l'échappement HTML transforme les apostrophes en `&#39;`, ce qui sécurise aussi les injections dans les attributs `onclick='...'`. Import de `escapeHtml`.

### Ajouté
- `js/storage.js` — **FRAG-5 : validation des snapshots.** Nouvelle constante `VALID_PERIODS = ['MT1', 'MT2', 'Prol.1', 'Prol.2']` et nouvelles fonctions `validateSnapshot(snap)` et `_backupCorruptedSnapshot(rawPayload, errors)`. `validateSnapshot()` effectue des contrôles structurels défensifs sur le snapshot chargé depuis le localStorage : présence et type string de `tA`/`tB`/`a1`/`a2`, période dans la liste autorisée, scores numériques positifs et finis, `elapsed` numérique positif, `obs` tableau (réparable si null), `tme.A`/`tme.B` tableaux de longueur 3 (réparable automatiquement), `ans` objet (réparable), `savedAt` timestamp (réparable). Retourne `{ ok: true, snap }` si OK, `{ ok: false, errors: [...] }` sinon. `_backupCorruptedSnapshot()` sauvegarde le JSON brut corrompu sous une clé `arbitres_hb_current_BACKUP_<timestamp>` pour analyse ultérieure.
- `js/storage.js` — **FRAG-5 : branchement de la validation dans `resumeMatch()`.** La fonction parse désormais le JSON dans un try/catch dédié (un JSON cassé → backup + abandon propre + alerte utilisateur), puis appelle `validateSnapshot()` sur le snapshot parsé. En cas d'échec de validation : backup du snapshot corrompu, nettoyage de `KEY_CURRENT`, suppression de la bannière de reprise, alerte utilisateur avec les 3 premières erreurs et la clé du backup. L'utilisateur peut toujours démarrer un nouveau match normalement.
- `js/storage.js` — **FRAG-6 : détection du quota localStorage.** Nouvelle fonction `isQuotaExceededError(e)` qui détecte les différents noms d'erreur selon les navigateurs (`QuotaExceededError` en Chrome/Edge, `NS_ERROR_DOM_QUOTA_REACHED` en Firefox, codes 22 et 1014). Nouvelle fonction `_notifyQuotaExceeded(context)` qui affiche une alerte visible à l'utilisateur (une seule fois par session via `_quotaAlertShown`) l'invitant à nettoyer l'historique ou exporter ses données avant qu'il ne soit trop tard. `autosave()` détecte désormais spécifiquement ces erreurs et les remonte au lieu de les attraper silencieusement.
- `js/storage.js` — **FRAG-6 : rotation automatique de l'historique.** Nouvelle constante `MAX_HISTORY = 50`. Dans `saveToHistory()`, après `unshift()` de la nouvelle entrée, si `history.length > MAX_HISTORY` la fin du tableau est tronquée (FIFO : les plus anciens matchs disparaissent). Un log `STORAGE/historique_rotation` est émis avec le nombre de matchs supprimés. L'écriture elle-même est désormais enrobée dans un try/catch dédié qui détecte le quota et appelle `_notifyQuotaExceeded()` au lieu de laisser remonter l'erreur.
- `js/storage.js` — **FRAG-6 : affichage de la conso dans l'écran historique.** Dans `renderHistory()` (fallback local), le compteur affiche désormais `N / MAX match(s) sauvegardé(s) · X Ko` où X est la taille estimée de la chaîne JSON de l'historique dans le localStorage. Permet à l'utilisateur d'avoir un retour visuel sur le remplissage.

### Maintenance
- `js/version.js` — version `0.3.24`.
- `sw.js` — cache name `arbitres-hb-v0.3.24`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` via `new Function()` après dépouillement des `import`/`export`. Tous OK.
- Recherche exhaustive d'IDs DOM morts : aucun trouvé.
- Diff complet v0.3.23 → v0.3.24 contrôlé : 9 fichiers de code modifiés (`index.html`, `js/utils.js`, `js/match.js`, `js/storage.js`, `js/observations.js`, `js/synthesis.js`, `js/main.js`, `js/version.js`, `sw.js`) + 2 fichiers de doc mis à jour (`docs/CHANGELOG.md`, `docs/instructions test.md`). Aucun fichier inattendu touché.

⚠️ Pas de test runtime effectué — voir `docs/instructions test.md` pour les tests critiques à faire côté utilisateur avant mise en production. Particulièrement important pour cette version : les tests de FRAG-3 (échappement HTML via noms d'équipes contenant des caractères spéciaux) et FRAG-5 (reprise avec snapshot volontairement corrompu).

---

## [0.3.23] — 2026-04-08

Version **méta uniquement** : aucune modification fonctionnelle de l'application. Cette version documente les conventions de développement et de documentation du projet pour qu'elles soient persistantes d'une conversation à l'autre avec une IA assistante (ou pour un nouvel intervenant humain). L'objectif est qu'il ne soit plus nécessaire de répéter ces conventions à chaque échange.

### Ajouté
- `docs/README.md` — **nouvelle section "Conventions de développement"** insérée avant la section Licence. Couvre : méthode de travail (un sujet par version, pas de modification non demandée, spec-first, rollback facile), versioning sémantique X.Y.Z avec bumps obligatoires de `js/version.js` et `sw.js`, nommage des livrables (dossiers vs ZIP), validation obligatoire avant livraison (syntaxique, imports/exports, IDs DOM morts, diff complet), modules à ne jamais toucher sans demande explicite (`js/auth.js`), répartition de la documentation entre `CHANGELOG.md` / `instructions test.md` / `README.md`, style de code (commentaires riches, logger systématique, rétro-compatibilité), procédure en cas de bug en production.
- `docs/CHANGELOG.md` — **encart "Conventions de mise à jour" inséré en tête** (juste après le titre, avant la première entrée de version). Documente le format Keep a Changelog adopté : titre `## [X.Y.Z] — YYYY-MM-DD`, ordre antichronologique, sections autorisées (Ajouté / Modifié / Corrigé / Retiré / Maintenance / Validation effectuée), description par fichier avec le pourquoi et pas seulement le quoi, référencement systématique des bugs et frags par identifiant, exemple complet d'une entrée.
- `docs/instructions test.md` — **encart "Comment ce fichier est maintenu" inséré en tête**. Documente : ce fichier est **réécrit à chaque version** (pas accumulé), centré sur les modifications de la version courante, avec une approche orientée "tests qui cherchent à casser" (edge cases, timings limites, séquences inhabituelles). Précise la structure recommandée en sections (tests des nouveautés, tests de non-régression des versions précédentes, tests destructifs) et le format attendu pour les retours utilisateur en cas d'échec.

### Maintenance
- `js/version.js` — version `0.3.23`.
- `sw.js` — cache name `arbitres-hb-v0.3.23`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` (aucun fichier de code n'est modifié, mais validation systématique conservée par principe).
- Diff complet v0.3.22 → v0.3.23 contrôlé : seuls 5 fichiers sont touchés (`js/version.js`, `sw.js`, `docs/README.md`, `docs/CHANGELOG.md`, `docs/instructions test.md`), aucun fichier de code applicatif modifié.
- Aucun changement de comportement runtime. Cette version est strictement documentaire.

### Notes importantes
- **Aucun test fonctionnel nouveau requis** pour cette version (pas de modification de code applicatif). Le fichier `docs/instructions test.md` contient néanmoins un test minimal de bonne intégration de la version (vérification que l'app charge bien et que le numéro de version affiché est `0.3.23`) et reprend les tests de non-régression v0.3.20+v0.3.21+v0.3.22.
- À partir de cette version, **un nouvel intervenant** (humain ou IA) qui prend le projet en main peut consulter `docs/README.md` section "Conventions de développement" pour comprendre toutes les règles de travail sans avoir à les redemander.

---

## [0.3.22] — 2026-04-08

### Modifié
- `js/storage.js` — **FRAG-1 : ajout de `autosaveDebounced()` et `flushAutosave()`** pour la frappe libre dans les textareas. Avant cette version, taper dans le champ contexte (`ctxTA` ou `ECtxEdit`) déclenchait `autosave()` à chaque caractère via `oninput`, ce qui produisait une sérialisation JSON complète de tout l'état du match à chaque touche. Sur un long contexte avec un état lourd (50 obs), cela créait du lag perceptible et saturait le buffer du logger. Nouvelle fonction `autosaveDebounced()` qui attend 500 ms d'inactivité avant de flusher l'autosave, et `flushAutosave()` pour forcer un flush en attente. **`autosave()` reste inchangé et synchrone** pour tous ses autres appelants (observations, score, TME, `advPeriod`, filet 30s, fermeture).
- `js/main.js` — **FRAG-1 : flush du debounce dans les écouteurs `beforeunload` et `visibilitychange`.** Sans cela, les caractères tapés dans les 500 dernières ms avant fermeture de l'app ou passage en arrière-plan auraient été perdus. Le flush garantit qu'on ne perd aucun caractère.
- `index.html` — **FRAG-1 : `oninput="window.App.autosave()"` remplacé par `oninput="window.App.autosaveDebounced()"`** sur les deux textareas de contexte (`ctxTA` ligne 163 et `ECtxEdit` ligne 231). Aucun autre élément du HTML n'est touché.

### Retiré
- `js/main.js` — **FRAG-7 : import mort `saveThemeRemote`.** Cette fonction était importée depuis `auth.js` mais n'était jamais appelée nulle part dans le code (vestige d'un projet abandonné de synchronisation du thème côté serveur). La fonction reste exportée dans `js/auth.js` (hors scope du nettoyage, ne pas toucher au module auth).
- `js/storage.js` — **FRAG-7 : 4 lignes mortes de compatibilité `selArb`/`selCat`** (2 dans `resumeMatch`, 2 dans `reexportPDF`). Vérifié exhaustivement : ces champs ne sont déclarés nulle part (ni dans `state.js`, ni ailleurs) et n'apparaissent que dans ces lignes. Elles créaient un champ orphelin sur l'objet `S` global pour rien.
- `index.html` — **FRAG-7 : commentaire vestige `<!-- /MODALE RESET MOT DE PASSE retirée en v0.3.18 -->`** supprimé (la modale a été retirée il y a 4 versions, le commentaire ne sert plus à rien).
- `CHANGELOG.md` (racine) — **fichier supprimé.** Créé par erreur en v0.3.20 alors que `docs/CHANGELOG.md` existait déjà comme source de vérité. À partir de cette version, les changelogs sont uniquement dans `docs/CHANGELOG.md`.

### Ajouté
- `docs/instructions test.md` — **nouveau fichier** contenant les scénarios de test utilisateur pour cette version. Approche orientée « tests qui cherchent à casser » : edge cases, timings limites, séquences inhabituelles, conçus pour révéler d'éventuels bugs cachés plutôt que pour valider uniquement le cas nominal.

### Maintenance
- `js/version.js` — version `0.3.22`.
- `sw.js` — cache name `arbitres-hb-v0.3.22`.

### Validation effectuée avant livraison
- Validation syntaxique JavaScript de tous les fichiers JS et `sw.js` via `new Function()` après dépouillement des `import`/`export`.
- Recherche exhaustive d'IDs DOM morts (`getElementById('X')` pointant vers un `id` absent du HTML) : aucun trouvé.
- Diff complet v0.3.21 → v0.3.22 contrôlé : seuls les 5 fichiers prévus (`index.html`, `js/main.js`, `js/storage.js`, `js/version.js`, `sw.js`) sont modifiés, et le `CHANGELOG.md` racine est bien supprimé.

⚠️ Pas de test runtime effectué côté Claude — voir `docs/instructions test.md` pour les tests à faire côté utilisateur avant mise en production.

---

## [0.3.21] — 2026-04-08

### Corrigé
- `js/storage.js` — **Fix BUG-3 : reprise de match cassée par `null is not an object` sur `AN1`/`AN2`.** Bug découvert lors du test utilisateur de la v0.3.20 sur le scénario de reprise de match. Il était **masqué par le BUG-1** : tant que `buildCats()` plantait avant (en v0.3.19 et antérieures), on n'arrivait jamais jusqu'à l'erreur sur `AN1`/`AN2`. Une fois BUG-1 corrigé en v0.3.20, le BUG-3 est devenu visible. La fonction `resumeMatch()` contenait deux lignes `document.getElementById('AN1').textContent = S.a1` et idem pour `AN2`, mais ces éléments DOM n'existaient plus dans `index.html` depuis la migration vers Quick Notes. `getElementById` retournait `null` et l'accès à `.textContent` levait `TypeError`, attrapé par le `try/catch` englobant qui affichait l'alerte d'erreur de reprise. Les noms d'arbitres sont déjà restaurés via `topInfo.innerHTML` et via `buildQuickNotes()`, donc les deux lignes ont été simplement supprimées. Vérification systématique effectuée : aucun autre `getElementById` ne pointe vers un ID inexistant dans le HTML.

### Maintenance
- `js/version.js` — version `0.3.21`.
- `sw.js` — cache name `arbitres-hb-v0.3.21`.

---

## [0.3.20] — 2026-04-08

Version cumulant **deux correctifs critiques** issus de l'audit technique de la v0.3.19 (`AUDIT_Suivi_arbitres_v0.3.19.md`) : BUG-1 (crash certain à la reprise d'un match interrompu) et BUG-2 (perte de données possible sur fermeture brutale pendant un match).

### Corrigé
- `js/storage.js` — **Fix BUG-1 : `buildCats()` n'existe pas.** La fonction `resumeMatch()` appelait `window.App.buildCats()`, fonction qui n'existait plus depuis la migration vers le mode Quick Notes (vbeta.3). Cet appel levait un `TypeError` qui interrompait `resumeMatch` en plein milieu : l'état du match était partiellement restauré (équipes, arbitres, score) mais l'utilisateur restait bloqué sur l'écran d'accueil, sans bascule vers l'écran de match, sans grille d'observations rapides, et sans table des observations. Remplacé par `window.App.buildQuickNotes()` qui reconstruit la grille d'observations rapides à partir des noms d'arbitres restaurés depuis le snapshot.

### Ajouté
- `js/storage.js` — **Fix BUG-2 partie 1 : filet d'autosave périodique 30 s.** Nouvelles fonctions exportées `startSafetyAutosave()` et `stopSafetyAutosave()`. Reposent sur un timestamp `_lastSaveAt` mis à jour par `autosave()` lui-même, et un `setInterval` qui s'exécute toutes les 5 secondes et déclenche un autosave si et seulement si plus de 30 secondes se sont écoulées depuis le dernier autosave réussi. Tant qu'il y a de l'activité (obs, score, TME, contexte, période), les autosaves existants réinitialisent `_lastSaveAt` et le filet ne se déclenche jamais — il ne se déclenche que dans les phases mortes. Aucun des autosaves existants n'est modifié.
- `js/match.js` — démarrage du filet à la fin de `startMatch()`, arrêt au début de `goHome()`. Le filet **continue de tourner sur l'écran de fin de match** car c'est précisément à ce moment que l'utilisateur peut taper longuement le commentaire global et le contexte (donc pas d'arrêt dans `endMatch()`).
- `js/storage.js` — démarrage du filet à la fin de `resumeMatch()` également (reprise d'un match interrompu).
- `js/timer.js` — **Fix BUG-2 partie 2 : autosave dans `advPeriod()`** pour couvrir tous les changements de période MT1→MT2, MT2→fin du temps réglementaire, Prol.1→Prol.2 et fin de prolongation. Avant cette version, ces transitions n'étaient pas explicitement persistées.
- `js/main.js` — **Fix BUG-2 partie 3 : écouteurs `beforeunload` et `visibilitychange`** ajoutés à la fin du bloc des écouteurs globaux. `beforeunload` couvre la fermeture d'onglet et le rechargement sur desktop, `visibilitychange` couvre le passage en arrière-plan sur mobile (verrouillage écran, changement d'app) — c'est le filet le plus important sur iOS où l'OS peut tuer une PWA en arrière-plan sans préavis. Les deux déclenchent un autosave silencieux enrobé dans un `try/catch` (il ne faut pas qu'une erreur ici empêche la fermeture).
- `js/main.js` — import + exposition de `startSafetyAutosave` et `stopSafetyAutosave` dans `window.App`.
- `CHANGELOG.md` (racine) — créé par erreur. Sera supprimé en v0.3.22 et son contenu déplacé dans `docs/CHANGELOG.md`.

### Maintenance
- `js/version.js` — version `0.3.20`.
- `sw.js` — cache name `arbitres-hb-v0.3.20`.

---

## [0.3.19] — 2026-04-07

### Corrigé
- `index.html` — **bouton thème de l'écran de remplissage des données du match (SS)** : utilisait `btn-theme-adaptive` (fond clair/sombre adaptatif) alors qu'il est posé sur la topbar bleue, créant une incohérence visuelle avec le bouton équivalent de l'écran de saisie des observations (MS) qui utilise `btn-theme` (fond blanc-transparent). Remplacement par `btn-theme` pour uniformiser l'apparence sur les deux écrans à fond bleu. Les autres écrans (ES, HistS, AdminS, AuthS) qui ont des fonds clairs conservent `btn-theme-adaptive`.
- `js/version.js` — version 0.3.19.
- `sw.js` — cache name `arbitres-hb-v0.3.19`.

---

## [0.3.18] — 2026-04-07

### Retiré
- **Fonctionnalité « Mot de passe oublié » entièrement retirée** (l'implémentation complète sera reprise plus tard).
- `index.html` — bouton « Mot de passe oublie ? » sur l'écran de connexion et modale `#forgotOverlay` (étapes 1 et 2).
- `js/main.js` — import `requestPasswordReset`, expositions `window.openForgotPassword` / `closeForgotPassword` / `submitForgotPassword`, et bloc `FORGOT PASSWORD` complet (fonctions `openForgotPassword`, `closeForgotPassword`, `submitForgotPassword`).
- `js/auth.js` — fonctions `requestPasswordReset()` et `resetPasswordWithToken()`.
- `docs/backend_reset_password.js` — fichier supprimé.
- `sw.js` — version du cache passée à `v0.3.18`.

---

## [0.3.17] — 2026-04-07

### Modifié — Centrage du texte dans les champs Date et Heure

- `.picker-display` : ajout de `text-align: center` pour centrer la date et l'heure dans leurs cases.

### Fichiers modifiés
- `styles.css` — `.picker-display` : `text-align: center` ajouté.
- `js/version.js` — version 0.3.17.
- `sw.js` — cache name `arbitres-hb-v0.3.17`.
- `docs/CHANGELOG.md` — entrée 0.3.17 ajoutée.

---

## [0.3.16] — 2026-04-07

### Corrigé — Chevauchement et hauteur des champs Date / Heure sur iOS Safari

Les inputs `type="date"` et `type="time"` ont un rendu natif incontrôlable sur Safari iOS (hauteur variable, icône qui déborde). Solution : chaque champ est remplacé par un **input texte visible** (`picker-display`) superposé à un **input natif invisible** (`picker-hidden`) en overlay absolu. Le tap sur le champ texte déclenche le sélecteur natif, les fonctions `syncDate()` / `syncTime()` mettent à jour l'affichage en `jj/mm/aaaa` et `hh:mm`. Les trois cases de la grille ont désormais une hauteur identique.

### Fichiers modifiés
- `index.html` — inputs date/heure remplacés par la structure `picker-wrap / picker-display / picker-hidden`.
- `styles.css` — styles `.picker-wrap`, `.picker-display`, `.picker-hidden` ajoutés.
- `js/main.js` — fonctions `syncDate()` et `syncTime()` exposées sur `window` ; préremplissage adapté.
- `js/match.js` — préremplissage adapté.
- `js/version.js` — version 0.3.16.
- `sw.js` — cache name `arbitres-hb-v0.3.16`.
- `docs/CHANGELOG.md` — entrée 0.3.16 ajoutée.

---

## [0.3.15] — 2026-04-07

### Corrigé — Alignement et hauteur des champs Date / Heure / Compétition

- **Chevauchement date/heure** : les inputs `type="date"` et `type="time"` incluent une icône native qui débordait. Ajout de `box-sizing: border-box` et `height: 44px` fixe pour uniformiser la hauteur des 3 champs.
- **Colonnes égales** : `.g3` passe de `1fr 1fr 1.4fr` à `1fr 1fr 1fr` pour que les 3 cases aient la même largeur.
- Corrections appliquées aussi en mobile.

### Fichiers modifiés
- `styles.css` — `.sf input` : `height: 44px` + `box-sizing: border-box` ; `.g3` : colonnes `1fr 1fr 1fr` ; règle mobile `.g3 .sf input` alignée.
- `js/version.js` — version 0.3.15.
- `sw.js` — cache name `arbitres-hb-v0.3.15`.
- `docs/CHANGELOG.md` — entrée 0.3.15 ajoutée.

---

## [0.3.14] — 2026-04-07

### Modifié — Saisie Date et Heure avec sélecteurs natifs

- **Champ Date** : `type="text"` → `type="date"` : ouvre le calendrier natif du navigateur/OS avec le jour actuel prérempli.
- **Champ Heure** : `type="text"` → `type="time"` : ouvre le cadran/sélecteur d'heure natif avec l'heure actuelle préremplie.
- **Format ISO** : le préremplissage JS passe en `aaaa-mm-jj` (requis par `type="date"`). `fmtDate()` dans `utils.js` convertit déjà ce format en `jj/mm/aaaa` pour l'affichage dans les titres, le PDF et l'historique — aucune régression.
- **Historique** : `m.S.mDate` passe désormais par `fmtDate()` pour afficher `jj/mm/aaaa` même si la date stockée est en format ISO.

### Fichiers modifiés
- `index.html` — inputs `mDate` et `mTime` : `type="date"` et `type="time"`.
- `js/main.js` — préremplissage date en format ISO (`aaaa-mm-jj`).
- `js/match.js` — préremplissage date en format ISO (`aaaa-mm-jj`).
- `js/storage.js` — affichage date historique via `fmtDate()`.
- `js/version.js` — version 0.3.14.
- `sw.js` — cache name `arbitres-hb-v0.3.14`.
- `docs/CHANGELOG.md` — entrée 0.3.14 ajoutée.

---

## [0.3.13] — 2026-04-07

### Modifié — Hauteur de la card Observations (tri) sur mobile

- `#cardObsTable` : ajout de `min-height: 400px` sur mobile (≤ 767px) pour doubler la hauteur visible de la card.

### Fichiers modifiés
- `styles.css` — `#cardObsTable` : `min-height: 400px` ajouté dans `@media (max-width: 767px)`.
- `js/version.js` — version 0.3.13.
- `sw.js` — cache name `arbitres-hb-v0.3.13`.
- `docs/CHANGELOG.md` — entrée 0.3.13 ajoutée.

---

## [0.3.12] — 2026-04-07

### Corrigé — Ordre des sections sur mobile (écran match)

Sur mobile (≤ 767px), les sections « Observations rapides » et « Observations (tri) » apparaissaient avant le groupe Chronomètre / Score / Temps morts / Contexte du match. Correction par ordre CSS explicite :

- `.left-panel` → `order: 1` (Chrono, Score, TME, Contexte en premier)
- `#cardQuickNotes` → `order: 2` (Observations rapides en second)
- `#cardObsTable` → `order: 3` (Tableau observations en dernier)
- `.left-panel` passe de `position: sticky` à `position: static` sur mobile pour un défilement naturel.
- IDs `cardQuickNotes` et `cardObsTable` ajoutés sur les deux cards dans `index.html` pour des sélecteurs fiables.

### Fichiers modifiés
- `index.html` — IDs `cardQuickNotes` et `cardObsTable` ajoutés.
- `styles.css` — `@media (max-width: 767px)` : `order` sur `.left-panel`, `#cardQuickNotes`, `#cardObsTable` ; `.left-panel` en `position: static`.
- `js/version.js` — version 0.3.12.
- `sw.js` — cache name `arbitres-hb-v0.3.12`.
- `docs/CHANGELOG.md` — entrée 0.3.12 ajoutée.

---

## [0.3.11] — 2026-04-07

### Corrigé — Écran Setup non scrollable sur mobile

- **`setup-screen`** : sur mobile (≤ 767px), `height: 100vh; overflow: hidden` empêchait tout défilement. Remplacé par `height: auto; min-height: 100vh; overflow-y: auto`.
- **`setup-content`** : `justify-content: center` retiré sur mobile (remplacé par `flex-start`) pour que le contenu parte du haut et soit scrollable naturellement.
- **`g3`** (Date / Heure / Compétition) : passe en colonne unique sur mobile au lieu de rester en 3 colonnes compressées.

### Fichiers modifiés
- `styles.css` — règles `@media (max-width: 767px)` : `.setup-screen`, `.setup-content`, `.g3` corrigés.
- `js/version.js` — version 0.3.11.
- `sw.js` — cache name `arbitres-hb-v0.3.11`.
- `docs/CHANGELOG.md` — entrée 0.3.11 ajoutée.

---

## [0.3.10] — 2026-04-07

### Corrigé / Amélioré — Responsive mobile & tablette

#### Page d'authentification
- **Styles recréés** : `.setup-card`, `.setup-logo`, `.setup-title`, `.setup-subtitle` avaient été supprimés en v0.3.8 (refonte Setup) mais restaient utilisés par la page auth. Styles recréés avec fond card, bordure, border-radius et ombre.
- **Adaptation mobile** : padding réduit (32px → 24px/16px), logo réduit (56px → 44px), titres allégés sur écran ≤ 767px.

#### Écran Historique
- **Header responsive** : `flex-wrap: wrap` ajouté pour éviter le débordement. Boutons passent en ligne séparée sur mobile. H2 réduit à 16px.

#### Écran Admin
- **Header responsive** : même correction que Historique.

### Fichiers modifiés
- `styles.css` — styles `.setup-card` + famille recréés ; règles `@media (max-width: 767px)` complétées pour auth, hist-header, admin-header.
- `js/version.js` — version 0.3.10.
- `sw.js` — cache name `arbitres-hb-v0.3.10`.

---

## [0.3.9] — 2026-04-07

### Corrigé
- **Bouton Thème écran Setup** : le bouton utilisait la classe `btn-theme` au lieu de `btn-theme-adaptive`, ce qui l'excluait de la mise à jour du label par `applyTheme()`. Le label restait figé sur « SOMBRE » même après bascule. Classe corrigée en `btn-theme-adaptive`.

### Modifié
- **Centrage vertical écran Setup** : ajout de `justify-content: center` et `min-height: 0` sur `.setup-content` pour centrer les cards dans la zone disponible sous la topbar (le scroll reste actif si le contenu déborde).
- **Zone d'influence — nouveaux tags** : ajout de `Gestion du pivot` et `Crédibilité` dans les tags `both` de la catégorie Zone d'influence.

### Fichiers modifiés
- `index.html` — classe du bouton thème Setup : `btn-theme` → `btn-theme-adaptive`.
- `styles.css` — `.setup-content` : ajout de `justify-content: center` et `min-height: 0`.
- `js/state.js` — `Zone d'influence.both` : ajout de `'Gestion du pivot'` et `'Crédibilité'`.
- `js/version.js` — version 0.3.9.
- `sw.js` — cache name `arbitres-hb-v0.3.9`.

---

## [0.3.8] — 2026-04-06

### Refonte visuelle — Ecran Setup

Harmonisation de l'ecran de saisie des donnees du match avec le graphisme de l'ecran match (observations).

#### Topbar
- **Topbar identique a l'ecran match** : fond bleu fonce avec logo a gauche, titre « Suivi Arbitres Handball » + email utilisateur au centre.
- **Boutons d'action deplaces dans la topbar** : Admin, Mot de passe, Historique, Theme (avec icone lune/soleil), Deconnexion — meme style semi-transparent que les boutons de l'ecran match (`.btn-end`).
- Suppression de l'ancienne barre de pills centree et du badge utilisateur inline.

#### Cards separees
- **3 cards distinctes** remplacent l'ancien formulaire monobloc :
  - « Informations du match » (Date, Heure, Competition)
  - « Equipes » (Equipe A, Equipe B)
  - « Arbitres » (Arbitre 1, Arbitre 2)
- Chaque card utilise le composant `.card` + `.card-title` identique a l'ecran match.

#### Mise en page
- Layout vertical centre (`setup-content`) avec `overflow-y: auto`, remplacant l'ancien `setup-screen` centre verticalement.
- Banniere de reprise de match conservee entre la topbar et les cards.
- Bouton « Demarrer le suivi » en pleine largeur sous les cards.
- Copyright bar en bas de page.

### Fichiers modifies
- `index.html` — ecran Setup restructure : topbar + 3 cards + modale mot de passe deplacee.
- `styles.css` — `.setup-content`, `.setup-card-inner`, `.setup-topbar-actions` ajoutees ; `.setup-card`, `.setup-logo`, `.setup-title`, `.setup-subtitle` supprimees ; media queries adaptees.
- `js/version.js` — version 0.3.8.
- `sw.js` — cache name `arbitres-hb-v0.3.8`.

---

## [0.3.7] — 2026-04-06

### Modifie
- **Bouton theme sur l'ecran Setup** : le bouton texte « Theme » a ete retire de la barre de boutons et remplace par un `btn-theme-adaptive` avec icone lune/soleil, positionne en haut a droite de la setup-card.
- `js/version.js` — version 0.3.7.
- `sw.js` — cache name `arbitres-hb-v0.3.7`.

---

## [0.3.5 et 6] — 2026-04-06

### Refonte majeure — Mode Quick Notes

Remplacement complet du formulaire d'observation par un système de saisie tactile rapide conçu pour une utilisation en match sans quitter le terrain des yeux.

#### Nouveau système de saisie (Quick Notes)
- **Grille compacte 6 colonnes** : les catégories sont groupées par paires sur chaque ligne (nom ✘ ✔ | nom ✘ ✔), divisant la hauteur de la grille par deux par rapport à l'ancienne disposition.
- **Deux zones A1/A2 toujours visibles** côte à côte en mode tablette paysage.
- **Tap = popup obligatoire** : chaque tap (rouge ou vert) ouvre une bottom sheet avec tags prédéfinis + note libre optionnelle. Plus de tap court pour éviter les annotations accidentelles.
- **Tags spécifiques par catégorie** : chaque catégorie a ses propres tags contextuels (ex : SPA → Retient, Pousse, Ceinturage...), affichés en premier dans la popup, suivis des tags généraux (Bonne décision, Hésitation, Retard...).
- **Tags conditionnés à la couleur** : certains tags n'apparaissent que sur rouge ou vert (ex : « Bonne verbale » uniquement sur SPP vert, « Manque CJ » uniquement sur SPP rouge).
- **Compteurs en temps réel** sur chaque bouton et totaux par arbitre (xR · xV).
- **Flash visuel + vibration haptique** à chaque enregistrement.
- **Commentaire optionnel** : la note libre et les tags sont optionnels, contrairement à l'ancien commentaire obligatoire.
- **Bouton « + A2 aussi »** dans la popup pour ajouter l'autre arbitre à l'observation.

#### Nouvelles catégories
- **JF** (Jet Franc) ajouté aux décisions techniques, avec tags : Pas au bon endroit, Sortir des 9m, Pied hors du terrain.
- **EJ** (Exécution du jet) ajouté aux décisions techniques, avec tags : Engagement, Jet Franc, J7M, Renvoi, Remise en jeu.
- **Gestion du sifflet** ajouté au positionnement, avec tags : Croissant, Décroissant, Coup de sifflet brefs, Arrêt du temps.

#### Tags par catégorie (liste complète)
- **SPP** : rouge → Verbale retard, Manque CJ, Manque explication, Pas CJ après but · vert → Bonne verbale
- **SPA** : Retient, Pousse, Ceinturage, Dépassée, Ferme en retard, Contre-attaque, Neutralise par derrière, Tête visage gorge, Amène au sol, Ne retient pas
- **J7M** : Défense en zone, OMB, Équilibré, Retient, Retard
- **Protocole** : rouge → Manque protocole · vert → Bon protocole
- **PF** : Pas d'intervalle, Raffut, Épaule en avant
- **MB** : Hors cylindre (bras), Hors cylindre (fesses), Écran illégal
- **JF** : Pas au bon endroit, Sortir des 9m, Pied hors du terrain
- **EJ** : Engagement, Jet Franc, J7M, Renvoi, Remise en jeu
- **Jeu Passif** : rouge → Trop tôt, Trop tard, Non cohérent · vert → Bon avertissement · les deux → 2-3 passes après JF
- **Marcher** : Piétine
- **Reprise de dribble** : Pas de maîtrise ballon
- **Zone** : Passage en zone, Dribble en zone, Appui zone, Gardien non maître de son équilibre ET du ballon
- **Continuité** : Bras libre + équilibrée, Irrégularité + perd la balle, Pas de faute
- **Communication** : Bonne comm., Gestuelle floue, Manque comm. binôme
- **Placement** : Trop loin, Trop proche, Latéralité, Profondeur, Angle de vue
- **Déplacement** : Jaillissement, Contre-attaque trop lent, Changement de zone, Permutation, Latéral, Profondeur
- **Zone d'influence** : Regarde le pivot en AZ, Pas ta zone
- **Gestion du sifflet** : Croissant, Décroissant, Coup de sifflet brefs, Arrêt du temps
- **Tags généraux** (toutes catégories) : Bonne décision, Hésitation, Retard, Anticipé, Sifflet tardif, Modulation

#### Radar de synthèse (remplace le tableau)
- **Radar SVG dynamique** remplaçant l'ancien tableau de synthèse par catégorie.
- **Cercles concentriques arrondis** pour l'échelle (0%, 25%, 50%, 75%, 100%).
- **Deux polygones individuels superposés** en mode « Les deux » : A1 en bleu continu (#185FA5), A2 en ambre pointillé (#BA7517). Chaque polygone représente la performance individuelle de l'arbitre (pas une moyenne).
- **Calcul du point** : V / (V + R) × 100% par catégorie et par arbitre.
- **Axes sautés** : quand un arbitre n'a pas d'observation sur une catégorie, son polygone relie directement les axes adjacents sans point intermédiaire.
- **Compteurs xR - xV** positionnés sur chaque rayon avec carré de couleur indicateur (bleu A1, ambre A2), R en rouge et V en vert.
- **Scores individuels au centre** : pourcentage global de chaque arbitre affiché dans sa couleur.
- **Taille des labels pondérée** : de 9px (1 obs.) à 20px (13+ obs.) avec couleur atténuée pour les catégories peu observées.
- **Noms abrégés** sur le radar (mêmes abréviations que la grille de saisie).
- **Filtres Arbitre** (Les deux / A1 / A2) : en mode individuel, seules les catégories observées par cet arbitre apparaissent, un seul polygone, un seul score au centre.
- **Filtres Période** (Tout / MT1 / MT2) : recalcule le radar pour la période sélectionnée.
- **Panneau détail** à droite du radar avec mini-barres empilées rouge/vert, compteurs et pourcentages, triés par nombre d'observations décroissant.
- Filtres Type (Non conf. / Conformes) et Tri (Points faibles / Points forts / A-Z) supprimés car non pertinents pour un radar.

#### Autres modifications
- **Authentification retirée** : accès direct sans login. L'authentification sera réintégrée ultérieurement quand l'application sera stable.
- **Export PDF** : préchargement de jsPDF via `<link rel="preload">` et pré-cache dans le Service Worker pour fiabiliser le premier export. Message d'erreur amélioré si le CDN est inaccessible.
- **PDF adapté** : le commentaire dans le PDF combine désormais les tags sélectionnés + la note libre (format : « tag1, tag2 · note libre »).
- Le tableau des observations et tout l'écran de fin de match (score, contexte, évaluation, commentaire global, export PDF) restent inchangés.

### Fichiers modifiés
- `js/state.js` — catégories JF, EJ, Gestion du sifflet ajoutées ; `CAT_TAGS` et `TAGS_GENERAUX` remplacent `TAGS` ; `synFilters` simplifié (arb + per uniquement).
- `js/observations.js` — entièrement réécrit : grille compacte 6 colonnes, tap obligatoire via popup, tags contextuels par catégorie.
- `js/synthesis.js` — entièrement réécrit : radar SVG dynamique avec deux polygones individuels, panneau détail, labels abrégés et pondérés.
- `js/match.js` — adapté au Quick Notes (`buildQuickNotes` au lieu de `buildCats`), synFilters simplifié.
- `js/storage.js` — suppression de la couche auth/backend, compatibilité arrière pour les tags.
- `js/main.js` — suppression de l'auth, exposition des nouvelles fonctions Quick Notes.
- `js/pdf.js` — commentaire combine tags + note libre, message d'erreur amélioré.
- `js/version.js` — version 0.3.5.
- `index.html` — formulaire remplacé par Quick Notes, section synthèse remplacée par radar, auth/admin supprimés, preload jsPDF.
- `styles.css` — styles Quick Notes (grille compacte, boutons tap, popup), styles radar, suppression des styles du tableau synthèse.
- `sw.js` — pré-cache des CDN jsPDF, version du cache v0.3.5.

---

## [0.3.4] — 2026-04-04

### Corrigé
- `js/observations.js` — **tri chronologique corrigé** : la fonction `sorted()` prend désormais en compte la période (MT1 < MT2 < Prol.1 < Prol.2) en plus du temps écoulé. Avant, une observation à 25:00 en MT1 apparaissait au-dessus d'une observation à 5:00 en MT2 (tri uniquement sur `elapsed`). Un poids par période (`PERIOD_WEIGHT`) garantit l'ordre chronologique réel du match.
- `js/main.js` — **tri de fin de match réparé** : les fonctions `renderTable()` et `renderEndTable()` n'étaient pas exposées sur `window`, ce qui rendait les `onchange` des `<select>` de tri inopérants (erreur silencieuse). Ajout de `window.renderTable` et `window.renderEndTable`.
- `sw.js` — version du cache passée à `v26`.

---

## [0.3.3] — 2026-04-03

### Ajouté
- Bouton **Thème clair/sombre** sur tous les écrans où il était absent (Connexion, Setup, Historique, Admin, Synthèse) — le bouton d'origine sur l'écran Match est conservé.
- Bouton **Mot de passe oublié** sur la page de connexion
  - Modale en deux étapes : saisie email → confirmation d'envoi
  - Appel API `POST /auth/forgot-password` (endpoint backend à implémenter)
  - Sécurité : réponse identique que l'adresse existe ou non (anti-énumération de comptes)
- `js/auth.js` — fonctions `requestPasswordReset()` et `resetPasswordWithToken()`
- `js/main.js` — fonctions `openForgotPassword()`, `closeForgotPassword()`, `submitForgotPassword()`
- `docs/backend_reset_password.js` — code Express/Nodemailer à intégrer côté serveur

---

## [0.3.2] — 2026-03-29

### Ajouté
- `main.js` — **politique de mot de passe centralisée** avec 5 critères : 8 caractères minimum, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.
- **Coches dynamiques en temps réel** : indicateur visuel (○ gris → ✓ vert) à chaque frappe.

### Modifié
- `main.js` — le nouveau mot de passe doit obligatoirement être différent de l'actuel.
- `sw.js` — version du cache passée à `v25`.

---

## [0.3.1] — 2026-03-29

### Ajouté
- `auth.js` — fonction `changePassword(currentPassword, newPassword)`.
- `main.js` — modale de changement de mot de passe.
- `index.html` — bouton **Mot de passe** dans la barre utilisateur.
- `sw.js` — version du cache passée à `v24`.

---

## [0.3.0] — 2026-03-29

### Ajouté
- **Communication** dans les catégories de décisions techniques.
- **Multi-sélection des arbitres** : cocher un ou deux arbitres sur la même observation.
- **Multi-sélection des catégories** : cocher plusieurs catégories sur la même observation.

### Modifié
- **Panneau gauche fixe** (sticky) lors du défilement vertical.
- `selArb` et `selCat` passent de valeur unique à tableaux.
- `sw.js` — version du cache passée à `v23`.

---

## [0.2.4] — 2026-03-29

### Corrigé
- Écran de connexion mal positionné.
- `submitLogin()` : message d'erreur explicite si serveur injoignable.
- `sw.js` — version du cache passée à `v20`.

---

## [0.2.3] — 2026-03-29

### Corrigé
- Tous les écrans masqués par défaut au chargement pour éviter l'affichage simultané.
- `sw.js` — version du cache passée à `v19`.

---

## [0.2.2] — 2026-03-28

### Corrigé
- URL API passée de `http://` à `https://` (mixed content).
- Backend Node.js en HTTPS + Nginx reverse proxy.
- `sw.js` — version du cache passée à `v18`.

---

## [0.2.1] — 2026-03-28

### Modifié
- Accès fermé sans connexion. Rôles utilisateurs (user/admin) dans le JWT.

### Ajouté
- **Espace administrateur** : liste utilisateurs, création, suppression, réinitialisation mot de passe.
- `sw.js` — version du cache passée à `v17`.

---

## [0.2.0] — 2026-03-28

### Ajouté
- **Authentification utilisateur** via backend MySQL. Tokens JWT.
- **Synchronisation de l'historique** sur le serveur.
- `sw.js` — version du cache passée à `v16`.

---

## [0.1.3] — 2026-03-27

### Ajouté
- **Synthèse par catégorie** unifiée avec filtres croisés (arbitre, période, type, tri).
- Score global de conformité avec code couleur.
- `sw.js` — version du cache passée à `v15`.

---

## [0.1.2] — 2026-03-27

### Modifié
- Champs Date/Heure convertis en `type="text"` avec `inputmode="numeric"`.
- `sw.js` — version du cache passée à `v13`.

---

## [0.1.1] — 2026-03-27

### Corrigé
- Grille `.g3` : largeur minimale Safari sur inputs date/time.
- `sw.js` — version du cache passée à `v12`.

---

## [0.1.0] — 2026-03-27

### Modifié
- Grille Date/Heure/Compétition rééquilibrée (1fr 1fr 1.4fr).
- `sw.js` — version du cache passée à `v11`.

---

## [0.0.9] — 2026-03-27

### Corrigé
- Grille `.g3` responsive mobile.
- `sw.js` — version du cache passée à `v10`.

---

## [0.0.8] — 2026-03-27

### Modifié
- Dossier interne du ZIP nommé proprement.
- Format du copyright mis à jour.
- `sw.js` — version du cache passée à `v9`.

---

## [0.0.7] — 2026-03-27

### Corrigé
- `cancelTime` non exposée sur `window` global.
- `sw.js` — version du cache passée à `v8`.

---

## [0.0.6] — 2026-03-27

### Corrigé
- `pdf.js` — erreur de syntaxe JS critique avec l'opérateur spread.
- `sw.js` — version du cache passée à `v7`.

---

## [0.0.5] — 2026-03-27

### Corrigé
- Import inutile dans `storage.js`.
- Version corrigée dans `version.js`.
- `sw.js` — version du cache passée à `v6`.

---

## [0.0.4] — 2026-03-27

### Corrigé
- Déplacement CHANGELOG et README dans `docs/`.

---

## [0.0.3] — 2026-03-27

### Ajouté
- **Versioning** : `js/version.js` comme source unique de vérité.
- Affichage dynamique de la version dans les pieds de page.
- `sw.js` — version du cache passée à `v5`.

---

## [0.0.2] — 2026-03-27

### Ajouté
- **Système de logs structurés JSON** exportable.
- Instrumentation complète de tous les modules.
- `sw.js` — version du cache passée à `v4`.

---

## [0.0.1] — 2026-03-27

### Ajouté
- Fichier `README.md`.

---

## [0.0.0] — Version initiale

Première version fonctionnelle : configuration match, chronomètre, score, TME, observations horodatées, synthèse, export PDF, historique, thème clair/sombre, PWA.
