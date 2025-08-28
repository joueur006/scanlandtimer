# scanlandtimer
# Scanland Timer

Petit outil client-side pour suivre des sessions d'étude. Tout fonctionne sans serveur : ouvrez `index.html` dans un navigateur.

## Contenu du dépôt
- `index.html` — point d'entrée HTML (charge `styles.css` et `app.js`).
- `styles.css` — styles séparés.
- `app.js` — code JavaScript (timer, historique, import/export, graphiques).
- `mpsi-subjects.json`, `mp-subjects.json` — presets de matières (packs).

## Fonctionnalités
- Timer démarrage / pause / arrêt.
- Enregistrement des sessions dans `localStorage` (clé `sessions`).
- Gestion des matières et chapitres (clé `subjects`).
- Export / import JSON (merge ou remplacement).
- Historique et vue « progression » avec graphiques (Chart.js).
- Interface à onglets (Timer, Matières, Historique, Progression).
- Responsive : table <-> cartes en affichage mobile.

## Démarrage rapide
1. Ouvrir `index.html` dans un navigateur moderne (Chrome, Edge, Firefox).
2. Ou lancer un petit serveur local (optionnel, recommandé pour certains navigateurs) depuis le dossier du projet :

```powershell
# dans PowerShell, depuis c:\Users\User\OneDrive\Bureau\ScanlandTimer
python -m http.server 8000
# puis ouvrir http://localhost:8000/index.html
```

## Données et format
- `localStorage.sessions` : tableau d'objets sessions. Exemple de structure d'une session :
  - `date` : ISO string
  - `matiere` : nom de la matière
  - `chapitre` : nom du chapitre (optionnel)
  - `duree` : chaîne formatée `HH:MM:SS`
  - `pauses` : durée des pauses (ex: `12s`)
  - `dureeMs` : durée en millisecondes

- `localStorage.subjects` : tableau d'objets matières : `{ name: string, chapters: string[] }`.

L'export génère un fichier JSON contenant `{ exportedAt, sessions, subjects }`.

## Import / Presets
- Le bouton "Importer données" propose *Remplacer* (OK) ou *Fusionner* (Annuler).
- Les fichiers `mpsi-subjects.json` et `mp-subjects.json` sont des packs prêts à importer via l'interface d'import.

## Dépannage rapide
- Si le graphique n'apparaît pas, vérifier que la connexion CDN Chart.js est OK (balise `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>` dans `index.html`).
- Si l'interface semble cassée, vider le storage : dans les DevTools Console

```javascript
localStorage.removeItem('sessions');
localStorage.removeItem('subjects');
location.reload();
```

## Contributions / amélioration possible
- Ajouter sauvegarde automatique dans un fichier ou sur le cloud.
- Ajouter tests unitaires pour la logique d'import/merge.
- Ajouter toasts (au lieu d'alert/confirm) pour meilleure UX.

---
Fichier créé : `README.md`. Dis-moi si tu veux que j'ajoute une section spécifique (ex. une FAQ, captures d'écran, ou procédure de packaging).
