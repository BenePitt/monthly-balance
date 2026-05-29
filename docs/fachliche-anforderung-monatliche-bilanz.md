# Fachliche Anforderung und Claude-Code-Prompt  
## Anwendung zur monatlichen Bilanz einer Privatperson

---

## Inhaltsverzeichnis

1. [Fachliche Anforderung](#1-fachliche-anforderung)
2. [Ziel der Anwendung](#2-ziel-der-anwendung)
3. [Fachlicher Umfang](#3-fachlicher-umfang)
4. [Transaktionen](#4-transaktionen)
5. [Wiederkehrende und einmalige Transaktionen](#5-wiederkehrende-und-einmalige-transaktionen)
6. [Monatsauswahl und Zeitraumdarstellung](#6-monatsauswahl-und-zeitraumdarstellung)
7. [Filterfunktionen](#7-filterfunktionen)
8. [Diagrammdarstellung](#8-diagrammdarstellung)
9. [Detailansicht](#9-detailansicht)
10. [Benutzeroberfläche](#10-benutzeroberfläche)
11. [Datenhaltung](#11-datenhaltung)
12. [Technische Rahmenbedingungen](#12-technische-rahmenbedingungen)
13. [Datenmodell](#13-datenmodell)
14. [Berechnungslogik](#14-berechnungslogik)
15. [Akzeptanzkriterien](#15-akzeptanzkriterien)
16. [Nicht-Ziele der ersten Version](#16-nicht-ziele-der-ersten-version)
17. [Prompt für Claude Code](#17-prompt-für-claude-code)
18. [Optionale Ergänzungen für Claude Code](#18-optionale-ergänzungen-für-claude-code)

---

# 1. Fachliche Anforderung

Diese Datei beschreibt die fachlichen und technischen Anforderungen an eine Anwendung zur Darstellung der monatlichen Bilanz einer Privatperson.

Die Anwendung soll Einnahmen und Ausgaben erfassen, auswerten und übersichtlich für einen oder mehrere Monate darstellen. Dabei sollen Filter, Diagramme und Detailansichten helfen, die persönliche Finanzsituation sowohl zusammenfassend als auch detailliert zu betrachten.

Zusätzlich enthält diese Datei einen direkt nutzbaren Prompt für Claude Code, mit dem die Anwendung entwickelt werden kann.

---

# 2. Ziel der Anwendung

Die Anwendung soll einer Privatperson ermöglichen, Einnahmen und Ausgaben strukturiert zu erfassen, auszuwerten und für ausgewählte Monate übersichtlich darzustellen.

Das Ziel ist eine klare monatliche Bilanz mit der Möglichkeit, bei Bedarf detailliert nach Verwendungszweck, Kategorie und Transaktionspartner zu analysieren.

Es sollen zwei Varianten entstehen:

## 2.1 Windows-Desktop-Anwendung

Die Desktop-Anwendung soll:

- installierbar und ausführbar als `.exe` sein
- auf einem Windows-Rechner verwendet werden können
- Daten lokal speichern
- keine Backend- oder Cloud-Abhängigkeit haben
- beim Neustart die lokal gespeicherten Daten wieder laden

## 2.2 Statische Webanwendung

Die statische Webanwendung soll:

- als reine statische Webseite lauffähig sein
- ohne Backend funktionieren
- keine dauerhafte Speicherung verwenden
- Daten nur während der aktuellen Browser-Sitzung im Arbeitsspeicher halten
- nach Neuladen der Seite ohne vorherige Transaktionsdaten starten

---

# 3. Fachlicher Umfang

Die Anwendung soll folgende Kernbereiche abdecken:

1. Erfassung von Einnahmen und Ausgaben
2. Unterscheidung zwischen einmaligen und regelmäßigen Transaktionen
3. Darstellung der monatlichen Bilanz über einen oder mehrere Monate
4. Filterung nach:
   - Verwendungszweck
   - Kategorie
   - Transaktionspartner
5. Darstellung als:
   - Säulendiagramm
   - fortlaufendes Diagramm, zum Beispiel Liniendiagramm
6. Detaillierte tabellarische Ansicht der Transaktionen
7. Lokale Speicherung in der Desktop-Version
8. Keine dauerhafte Speicherung in der statischen Webversion

---

# 4. Transaktionen

## 4.1 Erfassung von Transaktionen

Die Anwendung soll es ermöglichen, finanzielle Transaktionen zu erfassen.

Eine Transaktion besteht mindestens aus folgenden Feldern:

| Feld | Beschreibung | Pflichtfeld |
|---|---|---|
| Datum | Datum der Transaktion beziehungsweise Startdatum bei regelmäßigen Transaktionen | Ja |
| Typ | Einnahme oder Ausgabe | Ja |
| Betrag | Geldbetrag der Transaktion | Ja |
| Verwendungszweck | Beschreibung oder Zweck der Zahlung | Ja |
| Kategorie | Fachliche Gruppierung, zum Beispiel Miete, Gehalt, Lebensmittel, Versicherung | Ja |
| Transaktionspartner | Person, Firma oder Organisation, mit der die Transaktion stattgefunden hat | Ja |
| Wiederholungsart | Einmalig oder regelmäßig | Ja |

## 4.2 Beispiele für Transaktionen

| Datum | Typ | Betrag | Verwendungszweck | Kategorie | Transaktionspartner | Wiederholungsart |
|---|---:|---:|---|---|---|---|
| 01.05.2026 | Einnahme | 3.200,00 € | Gehalt Mai | Gehalt | Arbeitgeber GmbH | Regelmäßig |
| 03.05.2026 | Ausgabe | 950,00 € | Monatsmiete | Wohnen | Vermieter | Regelmäßig |
| 07.05.2026 | Ausgabe | 54,90 € | Wocheneinkauf | Lebensmittel | Supermarkt | Einmalig |

## 4.3 Einnahmen und Ausgaben

Die Anwendung muss zwischen Einnahmen und Ausgaben unterscheiden.

Einnahmen erhöhen die monatliche Bilanz.

Ausgaben verringern die monatliche Bilanz.

Die monatliche Bilanz berechnet sich wie folgt:

```text
Monatliche Bilanz = Summe Einnahmen des Monats - Summe Ausgaben des Monats
```

Zusätzlich sollen die Summen separat angezeigt werden:

```text
Einnahmen gesamt
Ausgaben gesamt
Bilanz / Saldo
```

Beispiel:

| Monat | Einnahmen | Ausgaben | Bilanz |
|---|---:|---:|---:|
| Mai 2026 | 3.200,00 € | 1.850,00 € | 1.350,00 € |

---

# 5. Wiederkehrende und einmalige Transaktionen

## 5.1 Einmalige Transaktionen

Eine einmalige Transaktion wird nur in dem Monat berücksichtigt, in dem ihr Datum liegt.

Beispiel:

Eine Ausgabe am 07.05.2026 wird nur für Mai 2026 berücksichtigt.

## 5.2 Regelmäßige Transaktionen

Eine regelmäßige Transaktion soll für mehrere Monate berücksichtigt werden.

Mindestanforderung:

Eine regelmäßige Transaktion wird monatlich ab ihrem Startdatum berücksichtigt.

Beispiel:

Eine Miete mit Startdatum 01.01.2026 und Betrag 950,00 € wird für Januar 2026, Februar 2026, März 2026 und alle nachfolgenden ausgewerteten Monate berücksichtigt.

Für die erste Version reicht folgende Logik:

| Feld | Beschreibung |
|---|---|
| Startdatum | Datum, ab dem die regelmäßige Transaktion gilt |
| Betrag | Betrag pro Monat |
| Typ | Einnahme oder Ausgabe |
| Verwendungszweck | Beschreibung |
| Kategorie | Gruppierung |
| Transaktionspartner | Zahlungspartner |
| Wiederholungsart | Regelmäßig |

Optional kann später ergänzt werden:

| Feld | Beschreibung |
|---|---|
| Enddatum | Datum, ab dem die regelmäßige Transaktion nicht mehr gilt |
| Wiederholungsintervall | monatlich, jährlich, wöchentlich |
| Änderungsverlauf | Historie, falls sich Beträge ändern |

Für den initialen Stand soll monatliche Wiederholung ausreichen.

---

# 6. Monatsauswahl und Zeitraumdarstellung

## 6.1 Auswahl mehrerer Monate

Die Anwendung soll es ermöglichen, mehrere Monate auszuwählen und gemeinsam auszuwerten.

Die Auswahl kann zum Beispiel über folgende Optionen erfolgen:

- Startmonat und Endmonat
- einzelne auswählbare Monate
- vordefinierte Zeiträume wie aktueller Monat, letzte 3 Monate, letzte 6 Monate, aktuelles Jahr

Mindestanforderung:

Der Nutzer kann einen Zeitraum über Startmonat und Endmonat auswählen.

Beispiel:

```text
Startmonat: Januar 2026
Endmonat: Juni 2026
```

Die Anwendung zeigt dann die Bilanz für Januar, Februar, März, April, Mai und Juni 2026.

## 6.2 Monatliche Bilanzübersicht

Für jeden ausgewählten Monat sollen mindestens folgende Werte angezeigt werden:

| Monat | Einnahmen | Ausgaben | Bilanz |
|---|---:|---:|---:|
| Januar 2026 | 3.200,00 € | 1.800,00 € | 1.400,00 € |
| Februar 2026 | 3.200,00 € | 1.950,00 € | 1.250,00 € |
| März 2026 | 3.200,00 € | 2.100,00 € | 1.100,00 € |

Zusätzlich soll es eine Gesamtauswertung für den gewählten Zeitraum geben:

| Kennzahl | Wert |
|---|---:|
| Einnahmen gesamt | 9.600,00 € |
| Ausgaben gesamt | 5.850,00 € |
| Bilanz gesamt | 3.750,00 € |
| Durchschnittliche Monatsbilanz | 1.250,00 € |

---

# 7. Filterfunktionen

Die monatliche Bilanz soll filterbar sein.

## 7.1 Filter nach Verwendungszweck

Der Nutzer soll nach einem oder mehreren Verwendungszwecken filtern können.

Beispiele:

```text
Nur Transaktionen mit Verwendungszweck "Miete"
Nur Transaktionen mit Verwendungszweck "Gehalt"
Nur Transaktionen, deren Verwendungszweck "Einkauf" enthält
```

Mindestanforderung:

Eine Texteingabe filtert alle Transaktionen, deren Verwendungszweck den eingegebenen Text enthält.

## 7.2 Filter nach Kategorie

Der Nutzer soll nach einer oder mehreren Kategorien filtern können.

Beispiele:

```text
Wohnen
Lebensmittel
Gehalt
Versicherung
Freizeit
Mobilität
```

Mindestanforderung:

Es soll eine Auswahl vorhandener Kategorien geben. Der Nutzer kann eine oder mehrere Kategorien auswählen.

## 7.3 Filter nach Transaktionspartner

Der Nutzer soll nach einem oder mehreren Transaktionspartnern filtern können.

Beispiele:

```text
Arbeitgeber GmbH
Vermieter
Supermarkt
Versicherung AG
Stadtwerke
```

Mindestanforderung:

Es soll eine Auswahl vorhandener Transaktionspartner geben. Der Nutzer kann einen oder mehrere Transaktionspartner auswählen.

## 7.4 Kombinierte Filter

Filter sollen miteinander kombiniert werden können.

Beispiel:

```text
Zeitraum: Januar 2026 bis Juni 2026
Kategorie: Wohnen
Transaktionspartner: Vermieter
Verwendungszweck enthält: Miete
```

Dann sollen nur Transaktionen berücksichtigt werden, die alle Filterbedingungen erfüllen.

Alle aktiven Filter werden logisch mit UND verknüpft.

---

# 8. Diagrammdarstellung

Die monatliche Bilanz soll grafisch dargestellt werden können.

Es sollen mindestens zwei Darstellungsarten verfügbar sein:

1. Säulendiagramm
2. Fortlaufendes Diagramm, zum Beispiel Liniendiagramm über mehrere Monate

Der Nutzer soll zwischen beiden Diagrammarten umschalten können.

## 8.1 Säulendiagramm

Das Säulendiagramm soll die ausgewählten Monate auf der horizontalen Achse darstellen.

Die vertikale Achse zeigt Geldbeträge.

Pro Monat sollen Einnahmen, Ausgaben und Bilanz verständlich dargestellt werden.

Mögliche Mindestdarstellung:

- eine Säule für Einnahmen
- eine Säule für Ausgaben
- eine Säule für Bilanz

Beispiel:

```text
Januar 2026: Einnahmen 3.200 €, Ausgaben 1.800 €, Bilanz 1.400 €
Februar 2026: Einnahmen 3.200 €, Ausgaben 1.950 €, Bilanz 1.250 €
März 2026: Einnahmen 3.200 €, Ausgaben 2.100 €, Bilanz 1.100 €
```

## 8.2 Optische Trennung innerhalb des Säulendiagramms

Im Säulendiagramm sollen einzelne Säulen nach folgenden Dimensionen optisch getrennt dargestellt werden können:

- Verwendungszweck
- Kategorie
- Transaktionspartner

Das bedeutet:

Der Nutzer soll auswählen können, nach welcher Dimension die Säulen aufgeteilt werden.

Beispiele:

```text
Säulendiagramm gruppiert nach Kategorie
Säulendiagramm gruppiert nach Verwendungszweck
Säulendiagramm gruppiert nach Transaktionspartner
```

Beispiel für Gruppierung nach Kategorie:

| Monat | Kategorie | Einnahmen | Ausgaben | Bilanz |
|---|---|---:|---:|---:|
| Mai 2026 | Gehalt | 3.200,00 € | 0,00 € | 3.200,00 € |
| Mai 2026 | Wohnen | 0,00 € | 950,00 € | -950,00 € |
| Mai 2026 | Lebensmittel | 0,00 € | 420,00 € | -420,00 € |

Die grafische Darstellung soll erkennen lassen, welcher Anteil zu welcher Kategorie, welchem Verwendungszweck oder welchem Transaktionspartner gehört.

Mögliche technische Umsetzung:

- gestapelte Säulen
- gruppierte Säulen
- Legende mit Farben und Bezeichnungen
- Tooltip mit Detailwerten

## 8.3 Fortlaufendes Diagramm

Das fortlaufende Diagramm soll die Entwicklung über mehrere Monate darstellen.

Mindestanforderung:

Es soll eine Linie für die monatliche Bilanz angezeigt werden.

Optional können zusätzlich Linien für Einnahmen und Ausgaben angezeigt werden.

Beispiel:

```text
Januar 2026: Bilanz 1.400 €
Februar 2026: Bilanz 1.250 €
März 2026: Bilanz 1.100 €
April 2026: Bilanz 1.600 €
```

Ziel ist es, Trends sichtbar zu machen.

---

# 9. Detailansicht

Neben der Diagrammansicht soll es eine tabellarische Detailansicht geben.

Die Tabelle soll alle Transaktionen anzeigen, die durch Zeitraum und Filter berücksichtigt werden.

Spalten:

| Spalte | Beschreibung |
|---|---|
| Datum | Datum der Transaktion |
| Typ | Einnahme oder Ausgabe |
| Betrag | Betrag |
| Verwendungszweck | Zweck der Transaktion |
| Kategorie | Kategorie |
| Transaktionspartner | Zahlungspartner |
| Wiederholungsart | Einmalig oder regelmäßig |

Die Tabelle soll mindestens folgende Funktionen bieten:

- Sortierung nach Datum
- Sortierung nach Betrag
- Anzeige gefilterter Ergebnisse
- klare Unterscheidung zwischen Einnahmen und Ausgaben
- Bearbeiten vorhandener Transaktionen
- Löschen vorhandener Transaktionen

Optional:

- Duplizieren vorhandener Transaktionen
- Export gefilterter Ergebnisse
- Import von Beispiel- oder Testdaten

---

# 10. Benutzeroberfläche

Die Anwendung soll übersichtlich und leicht verständlich sein.

## 10.1 Hauptbereiche der Oberfläche

Die Oberfläche soll aus folgenden Bereichen bestehen:

1. Navigation oder Seitenstruktur
   - Dashboard
   - Transaktionen
   - Auswertung

2. Transaktionserfassung
   - Formular zum Erfassen neuer Einnahmen und Ausgaben

3. Filterbereich
   - Zeitraum
   - Verwendungszweck
   - Kategorie
   - Transaktionspartner

4. Kennzahlenbereich
   - Einnahmen gesamt
   - Ausgaben gesamt
   - Bilanz
   - durchschnittliche Monatsbilanz

5. Diagrammbereich
   - Säulendiagramm
   - fortlaufendes Diagramm
   - Umschaltung zwischen Diagrammtypen
   - Auswahl der Gruppierung

6. Detailtabelle
   - Liste der relevanten Transaktionen

## 10.2 Anforderungen an die Bedienbarkeit

Die Anwendung soll folgende Bedienprinzipien erfüllen:

- verständliche deutsche Beschriftungen
- Euro-Beträge im deutschen Format, zum Beispiel `1.234,56 €`
- Datumsanzeige im deutschen Format, zum Beispiel `28.05.2026`
- klare Unterscheidung von Einnahmen und Ausgaben
- responsive Darstellung für unterschiedliche Bildschirmgrößen
- keine unnötig komplexe Bedienung
- Filter sollen leicht zurückgesetzt werden können
- Diagramme sollen Tooltips oder Detailinformationen bei Auswahl oder Hover anzeigen
- Eingabefehler sollen verständlich angezeigt werden
- Pflichtfelder sollen klar gekennzeichnet sein

---

# 11. Datenhaltung

## 11.1 Desktop-Anwendung

Die Desktop-Anwendung soll die Daten lokal auf dem Windows-Rechner speichern.

Anforderungen:

- keine Cloud-Speicherung
- kein Backend
- Daten bleiben nach Schließen der Anwendung erhalten
- Speicherung in einer lokalen Datei oder lokalen Datenbank
- Speicherort im Benutzerprofil des Windows-Nutzers
- Daten sollen beim Start der Anwendung automatisch geladen werden

Empfohlene einfache Umsetzung:

```text
Electron-App mit lokaler JSON-Datei oder IndexedDB
```

Alternativ möglich:

```text
Electron-App mit SQLite
```

Für die erste Version ist eine lokale JSON-Datei ausreichend, sofern die Daten sauber strukturiert gespeichert werden.

## 11.2 Statische Webanwendung

Die statische Webanwendung soll keine dauerhafte Speicherung verwenden.

Anforderungen:

- kein Backend
- keine Datenbank
- keine Speicherung in LocalStorage
- keine Speicherung in IndexedDB
- keine Cookies für Transaktionsdaten
- Daten existieren nur im Arbeitsspeicher während der geöffneten Browser-Sitzung
- nach Reload oder Schließen des Tabs sind die Daten weg

Die statische Webversion darf dieselben Formulare, Tabellen und Diagramme wie die Desktop-Version verwenden.

Unterschied:

```text
Desktop-Version: lokale Persistenz aktiv
Statische Webversion: Persistenz deaktiviert
```

---

# 12. Technische Rahmenbedingungen

## 12.1 Programmiersprache

Die Anwendung soll mit JavaScript umgesetzt werden.

Empfohlener Technologie-Stack:

```text
JavaScript
React
Vite
Electron
Chart.js oder Recharts
```

Begründung:

- React eignet sich für strukturierte Oberflächen
- Vite eignet sich für moderne Webentwicklung und statische Builds
- Electron ermöglicht eine installierbare Windows-Desktop-Anwendung als `.exe`
- Chart.js oder Recharts eignet sich für Säulen- und Liniendiagramme

## 12.2 Zielartefakte

Es sollen zwei lauffähige Artefakte entstehen.

### Artefakt 1: Windows-Desktop-App

```text
Installierbare Windows-Anwendung als .exe
```

Eigenschaften:

- lokale Speicherung aktiv
- Installation auf Windows möglich
- Start über ausführbare Datei oder Startmenü
- Daten bleiben erhalten

### Artefakt 2: Statische Webseite

```text
Statische HTML/CSS/JavaScript-Webseite
```

Eigenschaften:

- ohne Backend
- ohne dauerhafte Speicherung
- kann über statisches Hosting oder lokal im Browser geöffnet werden
- Daten gehen beim Neuladen verloren

## 12.3 Gemeinsame Codebasis

Die Anwendung soll möglichst aus einer gemeinsamen Codebasis bestehen.

Empfohlenes Prinzip:

```text
Gemeinsame UI- und Logik-Komponenten
Unterschiedliche Speicheradapter
```

Beispiel:

```text
StorageAdapterDesktop = lokale Speicherung
StorageAdapterWeb = In-Memory-Speicherung
```

Dadurch können beide Varianten dieselbe Oberfläche und dieselbe Auswertungslogik verwenden.

---

# 13. Datenmodell

## 13.1 Transaction

```js
{
  id: "uuid",
  date: "2026-05-28",
  type: "income" | "expense",
  amount: 125.50,
  purpose: "Wocheneinkauf",
  category: "Lebensmittel",
  partner: "Supermarkt",
  recurrence: "once" | "monthly",
  createdAt: "2026-05-28T10:00:00.000Z",
  updatedAt: "2026-05-28T10:00:00.000Z"
}
```

## 13.2 Fachliche Bedeutung der Felder

| Feld | Bedeutung |
|---|---|
| id | eindeutige technische ID |
| date | Datum der Transaktion oder Startdatum bei regelmäßiger Transaktion |
| type | Einnahme oder Ausgabe |
| amount | Betrag als positive Zahl |
| purpose | Verwendungszweck |
| category | Kategorie |
| partner | Transaktionspartner |
| recurrence | einmalig oder monatlich |
| createdAt | technischer Erstellzeitpunkt |
| updatedAt | technischer Änderungszeitpunkt |

Wichtig:

Der Betrag soll immer positiv gespeichert werden. Ob der Betrag positiv oder negativ in die Bilanz eingeht, wird über `type` entschieden.

---

# 14. Berechnungslogik

## 14.1 Monatszuordnung

Einmalige Transaktionen werden dem Monat ihres Datums zugeordnet.

Regelmäßige Transaktionen werden jedem Monat ab ihrem Startmonat zugeordnet.

Beispiel:

```js
date: "2026-01-01"
recurrence: "monthly"
```

Diese Transaktion wird für Januar 2026, Februar 2026, März 2026 und alle nachfolgenden ausgewerteten Monate berücksichtigt.

## 14.2 Einnahmen, Ausgaben und Bilanz

Für jeden Monat gilt:

```text
Einnahmen = Summe aller Transaktionen mit type = income
Ausgaben = Summe aller Transaktionen mit type = expense
Bilanz = Einnahmen - Ausgaben
```

## 14.3 Filterlogik

Eine Transaktion wird in der Auswertung berücksichtigt, wenn sie:

1. in den ausgewählten Zeitraum fällt oder als regelmäßige Transaktion für diesen Zeitraum gilt
2. zum Filter für Verwendungszweck passt
3. zur ausgewählten Kategorie passt
4. zum ausgewählten Transaktionspartner passt

Alle aktiven Filter werden logisch mit UND verknüpft.

---

# 15. Akzeptanzkriterien

## 15.1 Transaktionserfassung

Die Anforderung ist erfüllt, wenn:

- der Nutzer eine Einnahme erfassen kann
- der Nutzer eine Ausgabe erfassen kann
- Datum, Betrag, Verwendungszweck, Kategorie und Transaktionspartner gespeichert werden
- der Nutzer zwischen einmalig und regelmäßig wählen kann
- ungültige Eingaben verhindert oder verständlich angezeigt werden
- eine gespeicherte Transaktion in der Tabelle erscheint
- vorhandene Transaktionen bearbeitet werden können
- vorhandene Transaktionen gelöscht werden können

## 15.2 Monatliche Bilanz

Die Anforderung ist erfüllt, wenn:

- für jeden ausgewählten Monat Einnahmen, Ausgaben und Bilanz berechnet werden
- mehrere Monate gleichzeitig angezeigt werden können
- regelmäßige Transaktionen in mehreren Monaten berücksichtigt werden
- einmalige Transaktionen nur im jeweiligen Monat berücksichtigt werden
- die Gesamtsumme über den ausgewählten Zeitraum angezeigt wird
- die durchschnittliche Monatsbilanz angezeigt wird

## 15.3 Filter

Die Anforderung ist erfüllt, wenn:

- nach Verwendungszweck gefiltert werden kann
- nach Kategorie gefiltert werden kann
- nach Transaktionspartner gefiltert werden kann
- Filter kombiniert werden können
- Diagramm, Kennzahlen und Tabelle dieselben Filter verwenden
- Filter zurückgesetzt werden können

## 15.4 Diagramme

Die Anforderung ist erfüllt, wenn:

- ein Säulendiagramm angezeigt werden kann
- ein fortlaufendes Diagramm angezeigt werden kann
- zwischen Diagrammarten gewechselt werden kann
- das Säulendiagramm nach Kategorie gruppiert werden kann
- das Säulendiagramm nach Verwendungszweck gruppiert werden kann
- das Säulendiagramm nach Transaktionspartner gruppiert werden kann
- die Diagramme auf Zeitraum und Filter reagieren
- Tooltips oder Detailinformationen im Diagramm sichtbar sind

## 15.5 Desktop-App

Die Anforderung ist erfüllt, wenn:

- die Anwendung als Windows-`.exe` gebaut werden kann
- Daten lokal gespeichert werden
- Daten nach Neustart der Anwendung wieder vorhanden sind
- keine Backend-Verbindung erforderlich ist

## 15.6 Statische Webseite

Die Anforderung ist erfüllt, wenn:

- die Webversion ohne Backend funktioniert
- keine Transaktionsdaten dauerhaft gespeichert werden
- die Anwendung nach einem Reload ohne vorherige Daten startet
- die Webversion trotzdem Transaktionen während der Sitzung erfassen und auswerten kann

---

# 16. Nicht-Ziele der ersten Version

Folgende Funktionen sind nicht Bestandteil der ersten Version:

- Bankkonten-Anbindung
- automatischer Import von Kontoauszügen
- Benutzerkonten
- Cloud-Synchronisierung
- Mehrbenutzerfähigkeit
- Steuerberechnung
- Budgetplanung
- mobile App
- automatische Kategorisierung durch KI

Diese Funktionen können später ergänzt werden.

---

# 17. Prompt für Claude Code

Der folgende Prompt kann direkt in Claude Code verwendet werden.

```text
Du bist Claude Code und sollst eine vollständige JavaScript-Anwendung gemäß der fachlichen Anforderung „Anwendung zur monatlichen Bilanz einer Privatperson“ entwickeln.

Die fachliche Anforderung ist verbindlich und steht in dieser Markdown-Datei. Berücksichtige insbesondere die Abschnitte zu Ziel der Anwendung, fachlichem Umfang, Transaktionen, Wiederholungslogik, Monatsauswahl, Filterfunktionen, Diagrammdarstellung, Detailansicht, Datenhaltung, technischen Rahmenbedingungen, Datenmodell, Berechnungslogik und Akzeptanzkriterien.

Falls diese Datei im Projekt abgelegt wird, verwende sie als Hauptquelle, zum Beispiel unter:

docs/fachliche-anforderung-monatliche-bilanz.md

Ziel:
Entwickle eine Anwendung zur Erfassung und Auswertung der monatlichen Bilanz einer Privatperson. Es sollen Einnahmen und Ausgaben mit Datum, Betrag, Verwendungszweck, Kategorie, Transaktionspartner und Wiederholungsart erfasst werden können. Die Transaktionen können einmalig oder regelmäßig sein. Regelmäßige Transaktionen sollen monatlich ab ihrem Startdatum berücksichtigt werden.

Es müssen zwei Varianten entstehen:

1. Eine Windows-Desktop-Anwendung
   - JavaScript-basiert
   - installierbar und ausführbar als .exe
   - lokale Speicherung der Daten auf dem Windows-Rechner
   - keine Backend- oder Cloud-Abhängigkeit

2. Eine statische Webanwendung
   - JavaScript-basiert
   - ohne Backend
   - ohne dauerhafte Speicherung
   - keine Nutzung von LocalStorage, IndexedDB oder Cookies für Transaktionsdaten
   - Daten nur im Arbeitsspeicher während der aktuellen Sitzung

Technische Vorgabe:
Verwende JavaScript. Ein sinnvoller Stack ist React + Vite + Electron. Für Diagramme kann Chart.js, Recharts oder eine vergleichbare JavaScript-Bibliothek verwendet werden. Die Lösung soll möglichst eine gemeinsame Codebasis für Desktop und Web verwenden.

Architekturvorgabe:
Baue die Anwendung so auf, dass UI, Berechnungslogik und Speicherlogik sauber getrennt sind.

Empfohlene Struktur:

- src/components
- src/pages
- src/domain
- src/services
- src/storage
- src/charts
- src/utils
- electron
- docs

Nutze ein Storage-Adapter-Konzept:

- DesktopStorageAdapter: speichert Daten lokal dauerhaft
- WebMemoryStorageAdapter: speichert Daten nur im Arbeitsspeicher

Die fachliche Logik zur Bilanzberechnung soll unabhängig von der Speicherart funktionieren.

Kernfunktionen:

1. Transaktionen erfassen
   - Datum
   - Typ: Einnahme oder Ausgabe
   - Betrag
   - Verwendungszweck
   - Kategorie
   - Transaktionspartner
   - Wiederholungsart: einmalig oder regelmäßig

2. Transaktionen bearbeiten und löschen

3. Monatliche Bilanz berechnen
   - Einnahmen pro Monat
   - Ausgaben pro Monat
   - Bilanz pro Monat
   - Gesamteinnahmen im Zeitraum
   - Gesamtausgaben im Zeitraum
   - Gesamtbilanz im Zeitraum
   - durchschnittliche Monatsbilanz

4. Zeitraum auswählen
   - Startmonat
   - Endmonat
   - mehrere Monate gleichzeitig darstellen

5. Filter bereitstellen
   - Verwendungszweck
   - Kategorie
   - Transaktionspartner
   - kombinierte Filterlogik mit UND-Verknüpfung

6. Diagramme anzeigen
   - Säulendiagramm
   - fortlaufendes Diagramm beziehungsweise Liniendiagramm
   - Umschaltung zwischen Diagrammtypen
   - Säulendiagramm gruppierbar nach:
     - Verwendungszweck
     - Kategorie
     - Transaktionspartner

7. Detailtabelle anzeigen
   - gefilterte Transaktionen
   - Datum
   - Typ
   - Betrag
   - Verwendungszweck
   - Kategorie
   - Transaktionspartner
   - Wiederholungsart

8. Deutsche Benutzeroberfläche
   - deutsche Labels
   - Datumsformat: TT.MM.JJJJ
   - Geldformat: deutsches Euro-Format, zum Beispiel 1.234,56 €
   - verständliche Fehlermeldungen
   - übersichtliches Layout

Wichtige fachliche Regeln:

- Beträge werden als positive Zahlen gespeichert.
- Ob ein Betrag Einnahme oder Ausgabe ist, wird über den Typ entschieden.
- Einmalige Transaktionen werden nur im Monat ihres Datums berücksichtigt.
- Regelmäßige Transaktionen werden monatlich ab ihrem Startdatum berücksichtigt.
- Die Bilanz berechnet sich als Einnahmen minus Ausgaben.
- Alle aktiven Filter müssen auf Kennzahlen, Diagramme und Detailtabelle gleichermaßen wirken.
- In der statischen Webversion dürfen Transaktionsdaten nicht dauerhaft gespeichert werden.

Erwartetes Ergebnis:

Bitte erstelle den vollständigen Projektcode inklusive:

- package.json
- Vite-/React-Konfiguration
- Electron-Konfiguration für die Desktop-App
- Build-Skripte für Web und Windows
- Komponenten für Formular, Filter, Kennzahlen, Diagramme und Tabelle
- Domain-Logik für Transaktionen, Wiederholungen, Monatsberechnung und Filter
- Storage-Adapter für Desktop und statische Webversion
- Beispiel- oder Demo-Daten optional nur für Entwicklungszwecke
- README.md mit Installations-, Entwicklungs- und Build-Anleitung

Bitte achte besonders auf:

- klare Projektstruktur
- wartbaren Code
- verständliche deutsche UI
- saubere Trennung von Fachlogik und Darstellung
- keine Backend-Abhängigkeit
- keine dauerhafte Speicherung in der statischen Webversion
- robuste Berechnung regelmäßiger monatlicher Transaktionen
- einfache spätere Erweiterbarkeit

Akzeptanzkriterien:

Die Umsetzung gilt als erfolgreich, wenn:

1. eine Einnahme und eine Ausgabe erfasst werden können
2. einmalige und regelmäßige Transaktionen unterstützt werden
3. mehrere Monate ausgewählt und ausgewertet werden können
4. Einnahmen, Ausgaben und Bilanz pro Monat korrekt berechnet werden
5. nach Verwendungszweck, Kategorie und Transaktionspartner gefiltert werden kann
6. Diagramm, Kennzahlen und Tabelle dieselben Filter verwenden
7. ein Säulendiagramm angezeigt wird
8. ein Liniendiagramm beziehungsweise fortlaufendes Diagramm angezeigt wird
9. das Säulendiagramm nach Verwendungszweck, Kategorie und Transaktionspartner gruppiert werden kann
10. die Desktop-App Daten lokal dauerhaft speichert
11. die Desktop-App als Windows-.exe gebaut werden kann
12. die statische Webversion ohne Backend funktioniert
13. die statische Webversion keine Transaktionsdaten dauerhaft speichert
14. die Benutzeroberfläche deutsch und übersichtlich ist

Arbeite schrittweise:

1. Lege zuerst die Projektstruktur an.
2. Implementiere das Datenmodell und die Fachlogik.
3. Implementiere die Storage-Adapter.
4. Implementiere die Benutzeroberfläche.
5. Implementiere Tabellen, Filter und Kennzahlen.
6. Implementiere die Diagramme.
7. Implementiere Desktop-Build und Web-Build.
8. Ergänze README und kurze technische Dokumentation.
9. Prüfe die Akzeptanzkriterien.

Bitte ändere die fachlichen Anforderungen nicht eigenständig. Falls technische Detailentscheidungen erforderlich sind, triff pragmatische Entscheidungen im Sinne der Anforderung und dokumentiere sie kurz in der README.
```

---

# 18. Optionale Ergänzungen für Claude Code

## 18.1 Gewünschte `package.json`-Skripte

Dieser Abschnitt kann zusätzlich an Claude Code übergeben werden:

```text
Bitte richte mindestens folgende npm-Skripte ein:

npm run dev
  Startet die Webentwicklung mit Vite.

npm run electron:dev
  Startet die Desktop-App im Entwicklungsmodus.

npm run build:web
  Erstellt die statische Webversion.

npm run build:desktop
  Erstellt die Windows-Desktop-Anwendung.

npm run lint
  Prüft den Code, sofern Linting eingerichtet wird.

npm run test
  Führt Tests für die Fachlogik aus, insbesondere für Bilanzberechnung, Filter und regelmäßige Transaktionen.
```

## 18.2 Empfohlene Tests

```text
Bitte erstelle Tests für folgende fachliche Fälle:

1. Eine einmalige Einnahme im Mai 2026 erscheint nur im Mai 2026.
2. Eine regelmäßige Ausgabe mit Start Januar 2026 erscheint in Januar, Februar und März 2026.
3. Eine regelmäßige Ausgabe mit Start März 2026 erscheint nicht in Januar oder Februar 2026.
4. Einnahmen und Ausgaben werden korrekt zur Monatsbilanz verrechnet.
5. Der Filter nach Kategorie reduziert Kennzahlen, Tabelle und Diagrammdaten korrekt.
6. Der Filter nach Transaktionspartner reduziert Kennzahlen, Tabelle und Diagrammdaten korrekt.
7. Der Filter nach Verwendungszweck findet Teilbegriffe.
8. Mehrere Filter werden mit UND verknüpft.
9. Die statische Webversion nutzt nur In-Memory-Speicherung.
10. Die Desktop-Version lädt gespeicherte Daten nach Neustart wieder.
```

---

# 19. Zusammenfassung des gewünschten Ergebnisses

Am Ende soll eine Anwendung entstehen, die folgende Fragen schnell beantworten kann:

```text
Wie hoch war meine Bilanz im Mai 2026?
Wie haben sich meine Einnahmen und Ausgaben über mehrere Monate entwickelt?
Wofür gebe ich am meisten Geld aus?
Welche Kategorien verursachen die meisten Ausgaben?
Welche Transaktionspartner sind besonders relevant?
Welche regelmäßigen Zahlungen beeinflussen meine monatliche Bilanz?
```

Die Anwendung soll dabei sowohl eine schnelle Übersicht als auch eine detaillierte Analyse ermöglichen.
