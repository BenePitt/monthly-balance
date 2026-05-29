# Statisches React-Projekt auf GitHub Pages deployen

Diese Anleitung erklärt, wie ein React-Projekt (Vite + TypeScript + Tailwind) automatisch als statische Webseite auf GitHub Pages gehostet wird. Sie kann direkt für andere Projekte übernommen werden.

---

## Voraussetzungen

- GitHub-Repository (öffentlich oder mit GitHub Pro für private Repos)
- React-Projekt mit Vite als Build-Tool
- Node.js 18+

---

## Schritt 1: Vite-Konfiguration anpassen

In [vite.config.ts](vite.config.ts) muss `base` auf `'./'` gesetzt werden, damit Assets auf GitHub Pages korrekt geladen werden:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
})
```

> **Hinweis:** Falls das Repo unter einem Unterverzeichnis gehostet wird (z. B. `https://username.github.io/repo-name/`), kann alternativ `base: '/repo-name/'` gesetzt werden. Mit `'./'` funktioniert beides.

---

## Schritt 2: GitHub Actions Workflow anlegen

Datei erstellen: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

## Schritt 3: GitHub Pages im Repository aktivieren

1. Repository auf GitHub öffnen
2. **Settings → Pages** aufrufen
3. Unter **Source** die Option **"GitHub Actions"** auswählen (nicht "Deploy from a branch")
4. Speichern

---

## Schritt 4: Deployment auslösen

Beim nächsten Push auf `main` läuft der Workflow automatisch. Manuell auslösbar über:

**GitHub → Actions → "Deploy to GitHub Pages" → "Run workflow"**

Die Seite ist danach unter folgendem Link erreichbar:

```
https://<username>.github.io/<repository-name>/
```

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| Seite zeigt 404 | GitHub Pages Source auf "GitHub Actions" prüfen |
| Assets laden nicht | `base: './'` in `vite.config.ts` sicherstellen |
| Workflow schlägt fehl | `npm ci` schlägt fehl → `package-lock.json` muss im Repo committed sein |
| Alte Version angezeigt | Browser-Cache leeren oder im Inkognito-Modus testen |

---

## Claude / Codex Prompt

Nutze diesen Prompt, um ein bestehendes React-Vite-Projekt für GitHub Pages einzurichten:

---

```
Ich habe ein React-Projekt mit Vite und TypeScript. Richte GitHub Pages Deployment ein.

Aufgaben:
1. Prüfe vite.config.ts und setze `base: './'` falls nicht vorhanden.
2. Erstelle die Datei `.github/workflows/deploy.yml` mit einem GitHub Actions Workflow, der:
   - Bei Push auf `main` und manuell (workflow_dispatch) ausgelöst wird
   - Node 20 verwendet mit npm cache
   - `npm ci` und `npm run build` ausführt
   - Das `dist`-Verzeichnis als GitHub Pages Artifact hochlädt (actions/upload-pages-artifact@v3)
   - Das Artifact mit actions/deploy-pages@v4 deployed
   - Die korrekten permissions hat: `contents: read`, `pages: write`, `id-token: write`
   - Den `concurrency`-Block für Pages hat (group: pages, cancel-in-progress: false)
3. Erkläre kurz, welche Einstellung in GitHub Settings → Pages aktiviert werden muss ("GitHub Actions" als Source).

Füge keine zusätzlichen CI-Schritte (Tests, Linting) hinzu, die im Projekt nicht existieren.
```

---

## Technologie-Stack dieses Projekts

| Tool | Version | Zweck |
|---|---|---|
| React | 18 | UI-Framework |
| TypeScript | 5 | Typsicherheit |
| Vite | 6 | Build-Tool |
| Tailwind CSS | 3 | Styling |
| GitHub Actions | — | CI/CD |
| GitHub Pages | — | Hosting |
