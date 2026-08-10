# Kategoriebestimmung beim Import

Diese Datei erklärt, wie die App beim Import von Transaktionen (CSV-Import und Comdirect-Abruf) automatisch **Kategorie** und **Transaktionspartner** vorschlägt. Ziel ist ein für alle nachvollziehbares Verständnis der Logik, ohne den Code lesen zu müssen.

Beide Import-Wege (CSV und Comdirect) nutzen **dieselbe** Kategorie-Logik. Nur die Partner-Ermittlung unterscheidet sich, weil die Rohdaten unterschiedlich aufgebaut sind.

---

## 1. Überblick: zwei getrennte Schritte

Für jede importierte Transaktion laufen zwei unabhängige Schritte ab:

1. **Partner ermitteln** — wer ist die Gegenseite der Buchung? (unterschiedlich je nach Import-Quelle, siehe Abschnitt 2)
2. **Kategorie ermitteln** — in welche Kategorie gehört die Buchung? (identisch für alle Import-Quellen, siehe Abschnitt 3)

Der Partner wird zuerst bestimmt, weil die Kategorie-Logik den Partner als wichtigsten Anhaltspunkt nutzt.

---

## 2. Partner ermitteln

### 2.1 CSV-Import

Der Buchungstext von Banken hat meist eine erkennbare Struktur, z. B.:

```
Auftraggeber: Mustermann GmbH Buchungstext: Einkauf Elektronik Ref. XYZ
Empfänger: Markus MustermannKto/IBAN: DE712345678600 BLZ/BIC: CSDFFSEDXXX  Buchungstext: Ionos Ref. AZ2C29C32WEVC6XC/22732
```

Die App sucht zuerst nach `Auftraggeber:` oder `Empfänger:` und übernimmt den Namen dahinter direkt als Partner (Quelle `auftraggeber`).

Wird kein solches Feld gefunden (z. B. bei `AMAZON Mktp DE`), greifen **Keyword-Regeln** (Quelle `keyword-regel`) — in dieser Reihenfolge:

1. **Gelernte Regeln**: aus den bereits vorhandenen eigenen Transaktionen automatisch abgeleitet. Enthält eine Buchung z. B. immer "Netflix" bei Kategorie "Freizeit"/Partner "Netflix", merkt sich die App dieses Schlüsselwort.
2. **Öffentliche Regeln**: eine feste Liste bekannter Partner (Amazon, Edeka, PayPal, Deutsche Bahn, Netflix, Telekom, …) mit ihrer typischen Kategorie.
3. **Generische Regeln**: allgemeine Begriffe wie "Gehalt" → Partner "Arbeitgeber"/Kategorie "Gehalt", "Miete" → Partner "Vermieter"/Kategorie "Wohnen".

Wird nichts gefunden, bleibt der Partner leer und wird beim automatischen Import auf **"Unbekannt"** gesetzt.

### 2.2 Comdirect-Abruf

Hier gibt es keinen freien Text, sondern strukturierte Felder aus der Comdirect-API: `remitter` (Auftraggeber), `debtor` (Zahlungspflichtiger) und `creditor` (Zahlungsempfänger). Je nach Buchungsart (Lastschrift, ein- oder ausgehende Überweisung) steht das **eigene** Konto in einem anderen dieser drei Felder.

Die App vergleicht deshalb die IBAN jedes befüllten Feldes mit der IBAN des eigenen Kontos und nimmt den ersten Namen, dessen IBAN **nicht** die eigene ist. Das garantiert, dass der Partner nie man selbst ist — unabhängig davon, ob es sich um eine Einnahme oder Ausgabe handelt.

Findet sich gar keine passende Partei (z. B. bei einer Bargeldauszahlung ohne IBAN), wird ebenfalls **"Unbekannt"** verwendet.

---

## 3. Kategorie ermitteln (identisch für CSV und Comdirect)

Sobald der Partner feststeht, prüft die App die eigene Buchungshistorie in dieser Reihenfolge — der erste Treffer gewinnt:

| # | Regel | Beispiel |
|---|-------|----------|
| 1 | **Exakter Treffer**: gleicher Partner, gleicher Typ (Einnahme/Ausgabe) und exakt gleicher Betrag wie eine bestehende Buchung | Miete 750,00 € an "Vermieter GmbH" gab es schon genauso → gleiche Kategorie ("Wohnen") wird übernommen |
| 2 | **Ähnlichste Buchung mit gleichem Partner + Typ**: Betrag weicht ab, aber Partner und Typ stimmen überein — es wird die Buchung mit dem textlich ähnlichsten Verwendungszweck gesucht | "Miete Februar" ist textlich sehr ähnlich zu "Miete Januar" → gleiche Kategorie |
| 3 | **Ähnlichste Buchung mit gleichem Partner** (Typ diesmal egal) | falls es zum Partner nur Buchungen mit anderem Typ gibt |
| 4 | **Kategorie-Name als eigenes Wort im Text gefunden**: eine bereits genutzte Kategorie (z. B. "Lebensmittel") kommt im Verwendungszweck vor — und zwar als **eigenständiges Wort**, nicht als Teil eines längeren Wortes. Gibt es mehrere passende Kategorien, gewinnt die **längste** | "Lebensmittel Markt" → Kategorie "Lebensmittel" trifft zu; "Lebensmittelmarkt" (ohne Leerzeichen) trifft **nicht** zu, da direkt danach ein Buchstabe folgt. Sind sowohl "Bahn" als auch "Deutsche Bahn" bekannte Kategorien und der Text enthält "Deutsche Bahn", wird die längere ("Deutsche Bahn") gewählt |
| 5 | **Global ähnlichste Buchung**: die textlich ähnlichste Buchung über die gesamte Historie — nur wenn die Ähnlichkeit mindestens 70 % beträgt | |
| 6 | **Kein Treffer** → Kategorie bleibt leer und wird beim automatischen Import auf **"Sonstiges"** gesetzt | |

**"Textliche Ähnlichkeit"** wird über einen Zeichenketten-Vergleich (Levenshtein-Distanz) zwischen den Verwendungszwecken berechnet — je weniger Buchstaben geändert werden müssten, um den einen Text in den anderen zu verwandeln, desto ähnlicher gelten sie.

**Wichtiger Sonderfall — Partner "Unbekannt":** Konnte kein Partner ermittelt werden, wird das intern **nicht** wie ein echter Partnername "Unbekannt" behandelt (sonst würden ganz unterschiedliche Buchungen ohne erkennbaren Partner fälschlich als "gleicher Partner" zusammengefasst). Stattdessen wird direkt bei Schritt 4 (Kategorie-Name im Text) weitergemacht.

**Ohne jede Buchungshistorie** (z. B. bei der allerersten Nutzung der App) gibt es naturgemäß nichts zum Vergleichen — die Kategorie bleibt leer und wird zu "Sonstiges".

---

## 4. Wo im Code das passiert (für Entwickler)

- `src/domain/csvImport.js`
  - `extractBookingParts()` — zerlegt den CSV-Buchungstext in Auftraggeber/Empfänger, Buchungstext-Inhalt und vollen Text nach "Buchungstext:"
  - `inferImportMetadata()` — Partner-Ermittlung für den CSV-Import (Schritt 2.1)
  - `inferCategory()` — die gemeinsame Kategorie-Logik aus Abschnitt 3, für CSV und Comdirect gleichermaßen genutzt
- `src/domain/comdirectImport.ts`
  - `mapComdirectTransaction()` — Partner-Ermittlung für den Comdirect-Abruf über IBAN-Abgleich (Schritt 2.2)
  - `applyCategoryInference()` — ruft `inferCategory()` aus `csvImport.js` für jede abgerufene Comdirect-Transaktion auf
- `src/hooks/useImportState.ts`
  - `handleComdirectImport()` — verbindet Comdirect-Partner-Ermittlung und Kategorie-Ermittlung, bevor die Umsätze in der Vorschau angezeigt werden

In der Vorschau (Import-Dialog) lässt sich pro Zeile im Debug-Modus (Einstellungen → Debug-Modus) nachvollziehen, welche Regel konkret gegriffen hat.
