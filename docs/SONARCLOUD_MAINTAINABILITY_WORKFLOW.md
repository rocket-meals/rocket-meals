# SonarCloud Maintainability-Workflow (für KI-Agenten)

Dieser Workflow beschreibt, wie die verbleibenden SonarCloud-Maintainability-Issues
schrittweise abgearbeitet werden. Wenn der Nutzer z. B. schreibt „mach mit den
Maintainability-Issues weiter", ist genau dieser Ablauf gemeint.

## Ablauf

1. **Issues zählen und sortieren**

   ```bash
   node scripts/count-sonar-maintainability-issues.js
   ```

   Das Script liest `reports/sonarCloud/report_maintainability.csv`, gruppiert die
   Issues nach Meldungstyp und gibt die Top 10 mit Anzahl aus. Zur Gruppierung
   werden Zahlen sowie zitierte Bezeichner in den Meldungen normalisiert (z. B.
   zählt `Remove this useless assignment to variable "setNickname"` als
   `... to variable "X"`). Keyword-Zitate, die die Regel selbst ausmachen (z. B.
   `` `Set` ``, `` `.some(…)` ``, `` `readonly` ``), bleiben erhalten — Liste
   `KEYWORD_QUOTES` im Script bei Bedarf ergänzen.

2. **Top 10 dem Nutzer nennen** — immer mit Anzahl pro Typ.

3. **Häufigsten Typ beheben** — alle Vorkommen dieses Typs refactoren.
   - Die betroffenen Stellen (Datei + Zeile) stehen in
     `reports/sonarCloud/report_maintainability.csv`
     (Spalten: `Key,Message,Component,Line`; `Component` hat das Präfix
     `rocket-meals_rocket-meals:`).
   - Achtung: Die Zeilennummern beziehen sich auf den Stand des letzten
     SonarCloud-Scans. Vor jeder Änderung prüfen, ob die Zeile noch zum
     gemeldeten Issue passt; bei Abweichung die Stelle manuell suchen.
   - Für mechanische Fixes bevorzugt einen kleinen Codemod schreiben, der die
     CSV einliest und nur Zeilen ändert, die dem erwarteten Muster entsprechen
     (Mismatches loggen statt blind ersetzen).

4. **Wenn der häufigste Typ weniger als 10 Vorkommen hat**, zusätzlich den
   nächsthäufigsten Typ mit beheben (so lange fortsetzen, bis insgesamt ein
   sinnvoller Umfang erreicht ist bzw. ein Typ ≥ 10 Vorkommen abgearbeitet wurde).

5. **Verifizieren**
   - Nur die gemeldeten Stellen anfassen, keine ungefragten Umbauten.
   - Prüfen, dass der Fix keine Semantik ändert (z. B. bei `readonly`:
     sicherstellen, dass die Property nirgends neu zugewiesen wird — auch
     Compound-Zuweisungen `+=`, `++` und Bracket-Zugriffe `Class['prop'] = ...`
     prüfen). Stellen, an denen der Fix nicht möglich ist, unverändert lassen
     und im PR dokumentieren.
   - Wenn möglich Typecheck/Build der betroffenen Workspaces laufen lassen.

6. **PR erstellen**
   - Branch: den vom Task vorgegebenen `claude/...`-Branch verwenden.
   - Niemals direkt auf `master` pushen (PR-Pflicht, siehe `AGENTS.md`).
   - Im PR-Text: behobenen Issue-Typ, Anzahl der Fixes, bewusst ausgelassene
     Stellen mit Begründung sowie die aktuelle Top-10-Liste aufführen.

## Bereits abgearbeitete Typen

| Datum | Issue-Typ | Anzahl | PR |
|---|---|---|---|
| 2026-07-20 | Make this public static property readonly. | 242 von 242 (234 per `readonly`; 8 neu zugewiesene Properties auf `private static` bzw. Getter/Setter umgestellt) | #3938 |
| 2026-07-20 | Prefer using an optional chain expression instead. | 81 von 81 (per Codemod + manuelle Fixes für mehrzeilige JSX-Guards und `!a \|\| a.x !== y`-Muster) | #3942 |
| 2026-07-20 | Redundant double negation. | 62 von 62 (per Codemod) | #3942 |
| 2026-07-20 | Remove this unused import of 'X'. | 124 von 124 | #3946 |
| 2026-07-20 | Do not call `Array#push()` multiple times. | 60 von 60 (AST-Codemod, Kommentare zwischen pushes bleiben erhalten) | #3946 |
| 2026-07-20 | Mark the props of the component as read-only. | 58 von 58 (`Readonly<Props>`) | #3946 |
| 2026-07-20 | The empty object is useless. | 53 von 53 (`...(x ?? {})` → `...x`) | #3946 |
| 2026-07-20 | Prefer `node:X` over `X`. | 49 von 51 (2x `node:buffer` im Expo-Frontend zurückgenommen — Metro kann `node:`-Imports nicht auflösen) | #3946 |
| 2026-07-20 | 'X' imported multiple times. | 32 von 32 (Import-Merges) | #3946 |
| 2026-07-20 | `String.raw` should be used. | 24 von 24 | #3946 |
| 2026-07-20 | Prefer `.at(…)` over `[….length - N]`. | 24 von 24 (an strikt typisierten Stellen mit `!`) | #3946 |
| 2026-07-20 | Unnecessary conditional for default assignment. | 21 von 21 (`a ? a : b` → `a \|\| b`) | #3946 |
| 2026-07-20 | Use the "RegExp.exec()" method instead. | 20 von 20 (nur Regexe ohne `g`-Flag) | #3946 |
| 2026-07-20 | Prefer `String#replaceAll()`. | 10 von 10 | #3946 |
| 2026-07-20 | Kleintypen: Fragment (7), case-Block (7), useless constructor (6), redundantes `\| undefined` (6), unnötige Escapes (6), Boolean-Literal-Ternary (5), `Math.hypot` (5), `Number.parseInt` (3), `Date.now()` (3) | 48 von 48 | #3946 |
| 2026-07-20 | Prefer using nullish coalescing operator (`??=` / `??`). | 18 von 18 (Codemod mit Zeilenverifikation; alle Ziel-Typen `X \| null` bzw. `boolean \| undefined`) | – |
| 2026-07-20 | Redirect this error message to stderr (>&2). | 14 von 14 (nur Shell-Skripte, `bash -n` geprüft) | – |
| 2026-07-20 | 'If' statement should not be the only statement in 'else' block. | 10 von 10 (`else { if }` → `else if`) | – |
| 2026-07-20 | Expected a `for-of` loop instead of a `for` loop with this simple iteration. | 12 von 12 (Cheerio-Objekt per `.toArray()` iteriert) | #3953 |
| 2026-07-20 | 'any' overrides all other types in this union type. | 12 von 12 (wo möglich sprechende Typen wie `Partial<...>` statt `any`; sonst redundante Union-Member entfernt) | #3953 |
| 2026-07-20 | Refactor this code to not use nested template literals. | 10 von 10 (innere Literale ohne Interpolation → normale Strings; sonst in Variable extrahiert) | #3953 |
| 2026-07-20 | Remove this useless assignment to variable "X". | 97 von 97 (ungenutzte useState-Werte per Array-Elision, tote Deklarationen/Handler samt ungenutzt gewordener Imports entfernt; Seiteneffekt-Aufrufe als nacktes `await` behalten) | #3958 |
| 2026-07-20 | useState call is not destructured into value + setter pair | 18 von 18 (10x Array-Elision aus #3958 zurück zu benanntem `[x, setX]`-Paar mit `NOSONAR`-Kommentar — Kommentar entfernen, sobald die Variable genutzt wird; 8x Setter-Umbenennung: 6x Tippfehler `setAmimationJson` → `setAnimationJson`, 2x `set...State`-Suffix in `useLanguage.ts`) | #3961 |
| 2026-07-20 | Add an explicit return statement at the end of the function. | 20 von 20 (Shell-Funktionen; nacktes `return` am Funktionsende — propagiert den Exit-Status des letzten Befehls, semantisch neutral; `bash -n` geprüft) | #3961 |
| 2026-07-20 | Default parameters should be last. | 20 von 20, ohne Aufrufer-Änderung: Default am führenden Parameter entfernt, Typ um `\| undefined` erweitert, `param ??= default;` als erste Body-Zeile (16 Redux-Reducer + 4 Einzelfunktionen; `friendshipsReducer` hatte dasselbe Muster und wurde vorsorglich mitgefixt) | #3961 |

Neu abgearbeitete Typen bitte hier ergänzen.

**Übersprungen (Stand 2026-07-20, individuelle Refactorings statt mechanischer Fixes):**
„Cognitive Complexity" (113x), „Move this component definition out of the parent
component" (97x), „Array index in keys" (60x, braucht stabile IDs), TODO-Kommentare
(39x), Funktions-Verschachtelung (35x), Exception-Handling (23x),
`await` auf Non-Promise (16x), Parameter-Reihenfolge (16x).
Diese Typen in kleinen, thematisch gruppierten PRs separat angehen.

## Hinweise

- Die CSV-Reports werden per CI aktualisiert (Commits `chore: update sonarcloud reports`).
  Nach einem Merge zeigt der nächste Scan die verbleibenden Issues.
- Das Zähl-Script akzeptiert optional einen Pfad und Top-N:
  `node scripts/count-sonar-maintainability-issues.js [csv] [topN]`.
