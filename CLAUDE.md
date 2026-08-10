# CLAUDE.md

Projektkontext für Claude Code in diesem Repository. Enthält nur Regeln, die aus dem bestehenden Code abgeleitet sind.

## Projektüberblick

**Monatliche Bilanz** — lokale App zur Verwaltung persönlicher Transaktionen (Einnahmen/Ausgaben), mit CSV-/JSON-Import, Kategorisierung, Filterung und Diagrammen (Recharts). Läuft als zwei Varianten aus derselben Codebasis:
- **Web**: statisch, Daten nur im Arbeitsspeicher (keine Persistenz zwischen Sessions).
- **Desktop**: Electron-App, persistiert nach `%APPDATA%\monthly-balance\transactions.json` über Electron-IPC.

Kein Backend, keine Netzwerk-Requests (kein `fetch`/`axios`) — **mit einer Ausnahme**: der Comdirect-Kontoabruf (`electron/comdirectClient.js`), siehe unten. Alle Daten sind ansonsten lokal.

**Stack**: React 18 (function components, Hooks, Context API), Vite 8, Recharts, `uuid`. Kein State-Management-Framework (kein Redux/Zustand). Kein CSS-Framework (eine globale `src/index.css`, BEM-artige Klassennamen). Electron 28 + electron-builder für Desktop-Build.

### Architektur (Schichten, strikte Abhängigkeitsrichtung nach unten)

```
components/ · pages/ · charts/   → konsumieren nur useApp()/useDataContext()/useUIContext()
hooks/                            → UI-nahe State-Logik, ruft domain/ direkt auf
context/ (AppContext, DataContext, UIContext) → verdrahtet services/ + storage/ + domain/ in React State
services/ (TransactionService)    → CRUD-Orchestrierung, bekommt Storage-Adapter injiziert
storage/ (DesktopStorageAdapter, WebMemoryStorageAdapter, storageFactory) → Persistenz-Abstraktion
domain/ (transaction, csvImport, jsonExport, filterEngine, balanceCalculator) → pure Funktionen, kein React, keine Persistenz
utils/ (AppLogger, formatting, demoData)
```

- `domain/` darf **nichts** außer `utils/AppLogger` und `uuid` importieren — keine React-, Storage- oder Service-Imports.
- `components/`, `pages/`, `charts/` rufen **niemals** `TransactionService` oder Storage-Adapter direkt auf — nur über Context-Hooks.
- Persistenz läuft ausschließlich über den Adapter aus `storageFactory.js` (`DesktopStorageAdapter` vs. `WebMemoryStorageAdapter`, Auswahl über `window.electronAPI?.isElectron`). Kein direkter `localStorage`/IndexedDB-Zugriff irgendwo im Code.
- `AppContext.jsx` ist aktuell ein Kompatibilitäts-Wrapper um die neueren, typisierten `DataContext` + `UIContext` (Context-Split-Migration im Gange). Neue Komponenten sollten bevorzugt `useDataContext()`/`useUIContext()` statt des generischen `useApp()` verwenden, wenn nur Daten- bzw. UI-State benötigt wird.

### Ausnahme: Comdirect-Kontoabruf (Netzwerk, nur Desktop)

Im Abschnitt „Daten hinzufügen“ gibt es (nur in der Electron/Desktop-Variante, Button per `window.electronAPI?.isElectron` ausgeblendet) einen Button, um Umsätze für einen Zeitraum direkt von der Comdirect abzurufen:

```
components/BankFetchModal.tsx (Formular: API Client-ID/Secret, Zugangsnummer/PIN, Zeitraum)
  → hooks/useBankFetch.ts (State Machine, hält Zugangsdaten nur im Renderer-Speicher)
    → window.electronAPI.comdirectFetchTransactions(...) (IPC, preload.js)
      → electron/comdirectClient.js (Electron-Main-Process, natives Node-`fetch`, OAuth2 + TAN-Flow)
  → domain/comdirectImport.ts (reine Mapping-Funktion comdirect-JSON → RawImportTransaction, keine I/O)
  → bestehende Import-Pipeline: jsonToImportDraft.ts → Vorschau/Bulk-Edit in ImportPanel.tsx → handleImport → TransactionService.addMany
```

Jedes Konto (`domain/account.js`, `Account`-Typ) hat ein optionales `iban`-Feld, gepflegt auf der Seite `Konten` (`updateAccountIban` in `DataContext`). Die IBAN des aktuell ausgewählten Kontos wird oben rechts in der Navigation (`Navigation.jsx`, `.nav-iban`) angezeigt. Der Comdirect-Abruf ist erst möglich, wenn dem ausgewählten Konto eine IBAN hinterlegt ist (Gate in `ImportPanel.tsx`) — sie dient zugleich dazu, in `electron/comdirectClient.js` das passende comdirect-Konto (per IBAN-Abgleich) aus der Kontenliste auszuwählen.

Regeln für diesen Bereich:
- Netzwerk-Calls (`fetch`) sind **ausschließlich** in `electron/comdirectClient.js` (Main-Process) erlaubt — nirgendwo im Renderer/`src/`.
- Zugangsnummer, PIN und TAN werden **nie** persistiert, nur für die Dauer eines Abrufs im Hook-State gehalten. Nur die comdirect-API-Client-ID/-Secret dürfen optional lokal gespeichert werden (`electron/main.js`, `bank-config.json` im `userData`-Verzeichnis, per `comdirect-load-config`/`comdirect-save-config`-IPC).
- `domain/comdirectImport.ts` bleibt eine reine Funktion (kein Netzwerk-Import), analog zu den übrigen `domain/`-Modulen.
- Diese Ausnahme gilt nur für die Comdirect-Integration; alle anderen Teile der App bleiben netzwerkfrei.

## Entwicklungsworkflow

Alle Befehle aus `package.json`:

| Zweck | Befehl |
|---|---|
| Installieren | `npm install` |
| Dev-Server (Web) | `npm run dev` |
| Dev (Electron) | `npm run electron:dev` |
| Build (Standard) | `npm run build` |
| Build (Web, statisch) | `npm run build:web` → `dist-web/` |
| Build (Desktop-Installer) | `npm run build:desktop` → `dist-desktop/` (bzw. `build-all.bat` für NSIS + portable + unpacked) |
| Tests | `npm test` (Vitest, `vitest run`) |
| Linting | `npm run lint` (`eslint src`) |
| Formatierung | `npm run format` (`prettier --write "src/**/*.{js,jsx,ts,tsx}"`) |
| Typecheck | **kein Skript vorhanden** — siehe „Offene Fragen“ |

Hinweis: Die GitHub-Actions-Pipeline (`.github/workflows/deploy.yml`) führt nur `npm run build` aus, **keine** Tests oder Lint. Lokal vor jedem Commit trotzdem `npm run lint` und `npm test` ausführen.

## Coding Conventions

**TypeScript-Migration**: Das Projekt befindet sich in einer schrittweisen JS→TS-Migration (seit 2026-06-24). Neue oder stark überarbeitete Dateien werden als `.ts`/`.tsx` angelegt (siehe `context/DataContext.tsx`, `context/UIContext.tsx`, `components/CsvPreviewTable.tsx`, `hooks/useCsvImportState.ts`, `types/index.ts`), unberührte ältere Dateien bleiben `.jsx`/`.js`. Es gibt **keinen** echten Typecheck-Lauf (kein `typescript`-Paket in `devDependencies`, `tsconfig.json` hat `noEmit: true` und wird nur von Vite/esbuild zum Transpilieren genutzt, nicht zur Prüfung). TS-Typfehler werden aktuell nicht automatisiert erkannt — auf saubere Typisierung trotzdem manuell achten.

- Props in `.tsx`-Dateien per `interface XyzProps { ... }`, in `.jsx`-Dateien ungetypte Destrukturierung ohne PropTypes (PropTypes-Regel ist in ESLint explizit deaktiviert: `react/prop-types: off`).
- Gemeinsame Typen liegen in `src/types/index.ts`, Import per `import type { ... } from '../types'`.

**Imports/Exports**: Nur relative Importpfade, keine Path-Aliase. Komponenten/Seiten/Hooks: `export default`. Domain-Funktionen, Konstanten, Services: `export function ...` / `export const ...` (named exports). Seiten werden per `lazy(() => import('./pages/...'))` geladen.

**Namenskonventionen**: Komponenten-Dateien PascalCase (`TransactionForm.jsx`), Domain-/Util-/Hook-Dateien camelCase (`csvImport.js`, `useCsvImportState.ts`). Funktionen/Variablen camelCase, Konstanten SCREAMING_SNAKE_CASE (`TRANSACTION_TYPES`, `MAX_ENTRIES`). Code-Identifier (Funktionen, Variablen, Dateinamen) sind Englisch; UI-Texte, Seitennamen (`Transaktionen`, `Einstellungen`, `Dashboard`, `Detailtabelle`) und Logger-Event-Strings sind Deutsch. Diese Sprachtrennung beibehalten — keine deutschen Bezeichner im Code, keine englischen UI-Texte.

**Error Handling**: Try/catch eng um I/O- und Parse-Operationen (Dateilesen, JSON-Parsing), oft ohne Error-Variable (`catch { ... }`), mit direkter deutschsprachiger Fehlermeldung für die UI. Kein globaler Error-Handler, keine Error-Boundaries. Validierungsfehler (z. B. in `TransactionForm`) sind einfache, feldbezogene Objekte, die inline gerendert werden — keine geworfenen Exceptions für Formvalidierung.

**Logging**: Ausschließlich über `src/utils/AppLogger.js` (selbstgebauter In-Memory-Ringbuffer, `MAX_ENTRIES = 2000`), kein externes Logging-Package. API: `AppLogger.log(event, data)`, `getEntries()`, `clear()`, `setDebugMode()`. Event-Namen sind deutsche SCREAMING-Strings (`'TRANSAKTION ANGELEGT'`, `'CSV-IMPORT GESTARTET'`, `'GESPEICHERT'`). Business-Events werden in `domain/`, `services/` und `context/` geloggt, nicht in `components/`. Neue Logging-Aufrufe an dieses Muster anpassen (kein `console.log` in Business-Logik; `console.error` ist nur in Storage-Adaptern als Fallback-Log akzeptiert).

**Async**: `async/await`, keine `.then()`-Ketten. Kein Netzwerk-I/O. Debounced Speichern in `AppContext.jsx` per `setTimeout`/`clearTimeout`-Refs für Desktop-Persistenz — dieses Muster bei ähnlichen Bedarfsfällen wiederverwenden statt neu zu erfinden.

**State Management**: React Context + `useReducer`, kein externes State-Management. Neuer globaler State geht in `DataContext`/`UIContext` (typisiert), nicht in den alten `AppContext`-Reducer, sofern nicht zwingend beides betroffen ist.

**Styling**: Eine globale `src/index.css`, BEM-artige Klassennamen (`btn btn-sm btn-outline`, `form-input--error`, `tx-row--income`). Inline `style={{...}}` für einmalige Layout-Anpassungen ist üblich. Keine CSS-Module, kein Tailwind, kein styled-components einführen.

**Tests**: Vitest (`describe/it/expect`, `vi.spyOn`), Dateien in `__tests__/`-Unterordnern neben dem Code (`src/domain/__tests__/*.test.js`, `src/storage/__tests__/*.test.js`). Getestet wird ausschließlich Domain-/Storage-Logik, keine Komponenten-Tests (kein `@testing-library` in den Dependencies). Neue Domain-/Storage-Logik entsprechend mit Vitest-Unit-Tests im gleichen Muster abdecken; für UI-Komponenten existiert aktuell keine Testkonvention.

## Bei jeder Änderung beachten

- Schichtenrichtung einhalten: `domain/` bleibt frei von React-/Storage-Imports; UI-Komponenten greifen nie direkt auf `services/` oder `storage/` zu.
- Persistenz ausschließlich über den bestehenden Storage-Adapter (`storageFactory.js`), niemals direktes `localStorage`/IndexedDB.
- Sprachtrennung beibehalten: englische Code-Identifier, deutsche UI-Texte/Logger-Events.
- Bestehendes Logging-Muster (`AppLogger`) statt `console.log` verwenden.
- Keine neuen Abhängigkeiten (State-Management, CSS-Framework, HTTP-Client, Testing-Library) ohne triftigen Grund hinzufügen — das Projekt ist bewusst minimal gehalten. Neue Netzwerk-Calls außerhalb von `electron/comdirectClient.js` sind nicht erlaubt.
- `npm run lint` muss fehlerfrei durchlaufen; `npm run format` vor dem Commit anwenden.
- `npm test` muss grün sein; neue Domain-/Storage-Logik durch Vitest-Tests abdecken.
- TS-Typen in berührten `.ts`/`.tsx`-Dateien konsistent halten, auch ohne automatisierten Typecheck (keiner läuft in CI oder lokal).
- Bei neuen/stark geänderten Dateien im Zweifel zu `.ts`/`.tsx` migrieren, statt neue `.js`/`.jsx`-Dateien anzulegen (folgt dem laufenden Migrationstrend).
- Web- und Desktop-Variante im Blick behalten: Änderungen an Persistenz/State müssen mit beiden Storage-Adaptern funktionieren.

## Wichtige Dateien

- `package.json` — Scripts, Dependencies, electron-builder-Konfiguration (`build`-Key).
- `vite.config.js` — Build-Setup, Chunk-Splitting (`vendor-react`, `vendor-recharts`), Dev-Port 5173.
- `vitest.config.js` — Testumgebung (`jsdom`, `globals: true`).
- `tsconfig.json` — nur für Transpilierung (Vite/esbuild), `noEmit: true`, kein Typecheck-Enforcement.
- `eslint.config.js` — Flat Config, React + React-Hooks-Regeln, `no-unused-vars` mit `^_`-Ignore-Pattern.
- `.prettierrc` — `singleQuote`, `semi`, `trailingComma: es5`, `printWidth: 100`.
- `src/context/AppContext.jsx` — Legacy-Kompatibilitäts-Context, wraps `DataContext` + `UIContext`.
- `src/storage/storageFactory.js` — wählt den Storage-Adapter (Web vs. Desktop).
- `src/utils/AppLogger.js` — zentrales Event-Logging.
- `src/types/index.ts` — gemeinsame TS-Typdefinitionen.
- `electron/comdirectClient.js` — einzige Stelle im Projekt mit Netzwerk-Requests (`fetch`); OAuth2+TAN-Flow für den Comdirect-Kontoabruf.
- `src/domain/comdirectImport.ts` — reine Mapping-Funktion comdirect-Umsatz-JSON → `RawImportTransaction`.
- `src/hooks/useBankFetch.ts` / `src/components/BankFetchModal.tsx` — UI/State für den Comdirect-Abruf-Dialog.
- `build-all.bat` — Windows-Skript für Desktop-Distribution (NSIS, portable, unpacked).
- `.github/workflows/deploy.yml` — GitHub-Pages-Deployment (nur Build, kein Test/Lint-Gate).
- `docs/fachliche-anforderung-monatliche-bilanz.md` — fachliche Anforderungen (deutsch).

## Offene Fragen

Folgende Punkte lassen sich nicht eindeutig aus dem Repository ableiten und sollten bei Bedarf mit dem Team geklärt werden:

- **Kein Typecheck-Skript**: Es gibt `.ts`/`.tsx`-Dateien, aber weder ein `typescript`-Devdependency noch ein `tsc --noEmit`-Skript. Ist das beabsichtigt (Vite übernimmt nur Transpilierung) oder eine Lücke, die geschlossen werden sollte?
- **CI ohne Test/Lint-Gate**: `.github/workflows/deploy.yml` deployt ungetesteten/ungelinteten Code nach jedem Push auf `main`. Soll das ergänzt werden, oder ist das bewusst so belassen?
- **Zielzustand der TS-Migration**: Gibt es einen Plan, ob/wann die verbleibenden `.jsx`/`.js`-Dateien vollständig migriert werden sollen, oder bleibt der gemischte Zustand dauerhaft bestehen?
- **`AppContext.jsx` als Shim**: Soll der alte `AppContext`/`useApp()` langfristig entfernt werden zugunsten von `DataContext`/`UIContext`, oder bleibt er als stabile öffentliche API bestehen?
- **Fehlende Komponenten-Tests**: Es gibt keine `@testing-library`-Tests für UI-Komponenten. Ist das eine bewusste Entscheidung (kleine App, geringes Risiko) oder soll das nachgerüstet werden?
- **`GITHUB_PAGES_DEPLOYMENT.md`** referenziert Tailwind/TS-Setup, das im aktuellen Projekt nicht (vollständig) vorhanden ist — vermutlich eine generische Vorlage. Relevanz für dieses Projekt unklar.
