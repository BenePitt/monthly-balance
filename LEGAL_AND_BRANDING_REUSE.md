# Veit-BDS Legal & Branding — Wiederverwendungsanleitung

Dieses Dokument beschreibt, wie **Impressum**, **Datenschutzerklärung** und das **Veit-BDS Logo** aus diesem Projekt in ein beliebiges anderes React/TypeScript/Tailwind-Projekt übertragen werden können.

Am Ende dieses Dokuments befindet sich ein fertiger **Claude Code Prompt**, den du direkt in einem anderen Projekt einfügen kannst.

---

## Was wird implementiert?

| Komponente | Beschreibung |
|---|---|
| **Impressum** | Modal mit Pflichtangaben nach § 5 TMG, Haftungsausschluss und Urheberrecht |
| **Datenschutzerklärung** | DSGVO-konformes Modal (kein Tracking, externe Dienste, GitHub Pages Hosting) |
| **Veit-BDS Logo** | Footer-Branding mit Logo-Bild, Text "Gebaut von Veit-BDS", optionaler Link |

---

## Voraussetzungen im Zielprojekt

- React 18+ mit TypeScript
- Tailwind CSS
- Vite als Build-Tool (für `import.meta.env.BASE_URL`)
- Dark-Theme mit Tailwind-Klassen (ansonsten Farben anpassen)

---

## Schritt-für-Schritt-Anleitung

### 1. Logo-Datei kopieren

Kopiere `public/assets/veit-bds-logo.png` in den `public/assets/`-Ordner des Zielprojekts.

### 2. Konfigurationsdatei anlegen

**`src/legal/legalData.ts`** — nur diese Datei muss projektspezifisch angepasst werden:

```typescript
export const legalData = {
  name: 'Benedikt Veit',        // Pflicht für Impressum/Datenschutz-Links
  street: 'Werderstraße 34',
  zip: '86159',
  city: 'Augsburg',
  email: 'benedikt.veit@o2mail.de',  // Pflicht für Impressum/Datenschutz-Links
  phone: '',                     // Optional — leer lassen = nicht angezeigt
  website: '',                   // Optional — macht das Logo klickbar
}
```

### 3. LegalModal-Komponente anlegen

**`src/components/LegalModal.tsx`** — vollständig kopierbar, nur den Abschnitt "Externe Dienste" in der `Datenschutz`-Funktion an das Projekt anpassen (welche externen APIs/Dienste genutzt werden).

### 4. App-Komponente anpassen

In der Haupt-Komponente (`App.tsx` o. Ä.) folgende Elemente ergänzen:

**Imports:**
```typescript
import { useState } from 'react'
import { LegalModal } from './components/LegalModal'
import { legalData } from './legal/legalData'
```

**State:**
```typescript
const [legalView, setLegalView] = useState<'impressum' | 'datenschutz' | null>(null)
```

**Footer** (innerhalb des JSX):
```tsx
<footer className="...">
  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

    {/* Veit-BDS Branding */}
    {legalData.website ? (
      <a href={legalData.website} target="_blank" rel="noopener noreferrer"
         className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <img src={`${import.meta.env.BASE_URL}assets/veit-bds-logo.png`}
             alt="Veit-BDS" className="h-6 w-auto"
             onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        <span className="text-gray-500 hover:text-gray-300 transition-colors">
          Gebaut von <strong className="text-gray-400">Veit-BDS</strong>
        </span>
      </a>
    ) : (
      <div className="flex items-center gap-2">
        <img src={`${import.meta.env.BASE_URL}assets/veit-bds-logo.png`}
             alt="Veit-BDS" className="h-6 w-auto"
             onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        <span className="text-gray-500">
          Gebaut von <strong className="text-gray-400">Veit-BDS</strong>
        </span>
      </div>
    )}

    {/* Impressum & Datenschutz Links */}
    {(legalData.name || legalData.email) && (
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <button onClick={() => setLegalView('impressum')}
                className="hover:text-gray-400 underline transition-colors">
          Impressum
        </button>
        <button onClick={() => setLegalView('datenschutz')}
                className="hover:text-gray-400 underline transition-colors">
          Datenschutz
        </button>
      </div>
    )}

  </div>
</footer>

{/* Modal */}
{legalView && (
  <LegalModal view={legalView} onClose={() => setLegalView(null)} />
)}
```

---

## Anpassungen je nach Projekt

| Was anpassen | Wo |
|---|---|
| Name, Adresse, E-Mail | `src/legal/legalData.ts` |
| Externe Dienste (APIs, SDKs) | `LegalModal.tsx` → Funktion `Datenschutz` → Abschnitt 3 |
| Hosting (nicht GitHub Pages) | `LegalModal.tsx` → Funktion `Datenschutz` → Abschnitt 4 |
| Haftungsausschluss-Text | `LegalModal.tsx` → Funktion `Impressum` → Abschnitt "Haftungsausschluss" |
| Tailwind-Farbklassen (f1red, f1card, etc.) | `LegalModal.tsx` — ersetzen durch projektspezifische Farben |

### Tailwind-Farben ersetzen

Das Quellprojekt nutzt custom Tailwind-Farben. Im Zielprojekt entweder:

**Option A:** Dieselben Custom-Farben in `tailwind.config.js` definieren:
```js
colors: {
  f1red: '#e10600',
  f1dark: '#15151e',
  f1card: '#1e1e2e',
  f1border: '#2e2e3e',
}
```

**Option B:** Farben in `LegalModal.tsx` direkt ersetzen (`f1red` → `red-600`, `f1card` → `gray-900`, usw.)

---

## Dateistruktur im Zielprojekt

```
projekt/
├── public/
│   └── assets/
│       └── veit-bds-logo.png          ← Datei kopieren
├── src/
│   ├── components/
│   │   └── LegalModal.tsx             ← Datei anlegen (Inhalt unten)
│   ├── legal/
│   │   └── legalData.ts               ← Datei anlegen & anpassen
│   └── App.tsx (oder Hauptkomponente) ← Footer + State + Modal ergänzen
```

---

## Claude Code Prompt

Kopiere den folgenden Prompt und füge ihn in einem neuen Projekt in Claude Code ein. Passe die Werte im Abschnitt "KONFIGURATION" an.

---

```
Implementiere in diesem React/TypeScript/Tailwind-Projekt drei Dinge:
1. Ein Impressum-Modal (§ 5 TMG, Deutschland)
2. Eine Datenschutzerklärung als Modal (DSGVO-konform, für statisches Hosting ohne Tracking)
3. Das Veit-BDS Logo im Footer mit dem Text "Gebaut von Veit-BDS"

──────────────────────────────────────────────────────────
KONFIGURATION — diese Werte bitte anpassen:
──────────────────────────────────────────────────────────
  Name:     Benedikt Veit
  Straße:   Werderstraße 34
  PLZ:      86159
  Ort:      Augsburg
  E-Mail:   benedikt.veit@o2mail.de
  Telefon:  (leer lassen, nicht anzeigen)
  Website:  (leer lassen, Logo nicht verlinken)

  Externe Dienste (für Datenschutz Abschnitt 3):
    - Name: [NAME DES DIENSTES, z.B. "OpenWeather API"]
    - URL:  [URL DES DIENSTES]
    - Zweck: [WOFÜR WIRD ER GENUTZT]
    Falls keine externen APIs genutzt werden: Abschnitt 3 weglassen.

  Hosting-Plattform (für Datenschutz Abschnitt 4):
    GitHub Pages (Standard — falls anderes Hosting, bitte angeben)

──────────────────────────────────────────────────────────
SCHRITT 1 — Datei anlegen: src/legal/legalData.ts
──────────────────────────────────────────────────────────
Inhalt:

  // Trage hier deine Pflichtangaben für Impressum & Datenschutz ein
  export const legalData = {
    name: 'Benedikt Veit',
    street: 'Werderstraße 34',
    zip: '86159',
    city: 'Augsburg',
    email: 'benedikt.veit@o2mail.de',
    phone: '',
    website: '',
  }

──────────────────────────────────────────────────────────
SCHRITT 2 — Datei anlegen: src/components/LegalModal.tsx
──────────────────────────────────────────────────────────
Erstelle eine React-Komponente mit diesen Eigenschaften:

- Props: { view: 'impressum' | 'datenschutz', onClose: () => void }
- Fixed fullscreen overlay (z-50, bg-black/70), schließt bei Klick auf Hintergrund
- Escape-Taste schließt das Modal (useEffect + keydown listener)
- Scrollbares Modal-Fenster (max-h-[80vh] overflow-y-auto), max-w-2xl
- Sticky Header mit Titel ("Impressum" oder "Datenschutzerklärung") und × Close-Button
- Dark-Theme: bg-gray-900 / border-gray-700 / text-gray-300 / text-white für Überschriften
- Akzentfarbe für Links: text-red-500 hover:underline

Impressum-Inhalt (aus legalData befüllen):
  § Angaben gemäß § 5 TMG: Name, Straße, PLZ Ort
  § Kontakt: Telefon (nur wenn vorhanden), E-Mail als mailto-Link, Website (nur wenn vorhanden)
  § Haftungsausschluss: "Diese Webseite ist ein privates Freizeitprojekt ohne kommerziellen
    Hintergrund. Es besteht kein Anspruch auf Vollständigkeit oder Aktualität."
  § Urheberrecht: Hinweis, dass eigene Inhalte dem deutschen Urheberrecht unterliegen und
    dass keine Verbindung zu Markeninhabern der genutzten Daten besteht (projektspezifisch
    anpassen).

Datenschutz-Inhalt:
  1. Verantwortlicher: Name, Straße, PLZ Ort, E-Mail aus legalData
  2. Erhebung und Verarbeitung: "Diese Webseite erhebt und speichert keine personenbezogenen
     Daten. Es werden keine Cookies gesetzt, kein Tracking durchgeführt und keine Nutzerdaten
     an Dritte weitergegeben."
  3. Externe Dienste: Für jeden genutzten externen Dienst einen Absatz mit Name, URL und
     Hinweis auf dessen Datenschutzerklärung. (Abschnitt weglassen wenn keine externen
     Dienste vorhanden.)
  4. Hosting (GitHub Pages): GitHub Inc. / Microsoft, IP-Adresse wird verarbeitet, Fastly CDN,
     EU-US Data Privacy Framework, Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO,
     Link zur GitHub Privacy Policy.
  5. Ihre Rechte: Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch nach DSGVO.
     Da keine Daten erhoben werden ist eine Anfrage voraussichtlich gegenstandslos.
     Hinweis auf Bayerischen Landesbeauftragten für den Datenschutz.

──────────────────────────────────────────────────────────
SCHRITT 3 — Logo-Datei
──────────────────────────────────────────────────────────
Die Logo-Datei liegt unter public/assets/veit-bds-logo.png und muss in dieses Projekt kopiert
werden. Gehe davon aus, dass die Datei bereits vorhanden ist.

Lade das Logo mit: src={`${import.meta.env.BASE_URL}assets/veit-bds-logo.png`}
Füge einen onError-Handler hinzu, der das Bild bei Ladefehler ausblendet:
  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}

──────────────────────────────────────────────────────────
SCHRITT 4 — App-Hauptkomponente anpassen
──────────────────────────────────────────────────────────
Ergänze in der Haupt-Komponente (App.tsx oder äquivalent):

Imports:
  import { useState } from 'react'
  import { LegalModal } from './components/LegalModal'
  import { legalData } from './legal/legalData'

State:
  const [legalView, setLegalView] = useState<'impressum' | 'datenschutz' | null>(null)

Footer (am Ende von <main> oder als eigenes <footer>-Element einfügen):

  <footer className="max-w-6xl mx-auto px-4 py-6 mt-4 border-t border-gray-800 text-xs text-gray-600">
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

      {/* Veit-BDS Branding */}
      {legalData.website ? (
        <a href={legalData.website} target="_blank" rel="noopener noreferrer"
           className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={`${import.meta.env.BASE_URL}assets/veit-bds-logo.png`}
               alt="Veit-BDS" className="h-6 w-auto"
               onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <span className="text-gray-500 hover:text-gray-300 transition-colors">
            Gebaut von <strong className="text-gray-400">Veit-BDS</strong>
          </span>
        </a>
      ) : (
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}assets/veit-bds-logo.png`}
               alt="Veit-BDS" className="h-6 w-auto"
               onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <span className="text-gray-500">
            Gebaut von <strong className="text-gray-400">Veit-BDS</strong>
          </span>
        </div>
      )}

      {/* Impressum & Datenschutz Links */}
      {(legalData.name || legalData.email) && (
        <div className="flex items-center gap-4">
          <button onClick={() => setLegalView('impressum')}
                  className="hover:text-gray-400 underline transition-colors">
            Impressum
          </button>
          <button onClick={() => setLegalView('datenschutz')}
                  className="hover:text-gray-400 underline transition-colors">
            Datenschutz
          </button>
        </div>
      )}

    </div>
  </footer>

  {/* Legal Modal */}
  {legalView && (
    <LegalModal view={legalView} onClose={() => setLegalView(null)} />
  )}

──────────────────────────────────────────────────────────
HINWEISE
──────────────────────────────────────────────────────────
- Die Impressum/Datenschutz-Buttons erscheinen nur, wenn legalData.name oder legalData.email
  gesetzt ist (bedingte Anzeige).
- Das Logo erscheint immer; es wird als <a>-Link gerendert wenn legalData.website gesetzt ist,
  sonst als <div>.
- Tailwind-Farben: Verwende standard Tailwind-Klassen (gray-900, red-600 etc.), keine
  Custom-Farben aus dem Quellprojekt (f1red, f1card etc.).
- Kein React Router nötig — alles über useState und Modal gelöst.
- Die Datenschutzerklärung ist auf GitHub Pages als Hosting ausgelegt. Bei anderem Hosting
  (Netlify, Vercel, etc.) den Abschnitt 4 entsprechend anpassen.
```
