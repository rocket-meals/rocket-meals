# Modul „Rocket Meals“ im Directus-Backend

Eigener Bereich in der Directus-Oberfläche (Modul-Leiste links, Raketen-Symbol,
`/admin/rocket-meals`) für Werkzeuge, die nicht in die generischen Ansichten von Directus passen.
Aufbau wie beim Content-Modul: links eine Seitenleiste mit den Seiten, rechts die Seite.

Directus-Module sind Vue-Komponenten (die Directus-Oberfläche selbst ist Vue).
React-Native-/Expo-Screens der Apps lassen sich hier nicht einbinden; geteilt wird stattdessen Logik
aus `repo-depkit-common` und der Übersetzungskatalog.

## Seiten

| Seite            | Pfad                                     | Was sie kann                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Speise-Feedbacks | `/admin/rocket-meals/food-feedbacks`     | Neueste Speise-Feedbacks mit Kommentar und Bild der Speise. Filter nach Status (Offen, Neu, Wartet auf Antwort, Beantwortet, Erledigt, Alle) mit Anzahl, nach Mensen (Mehrfachauswahl), Speise (Name) und Bewertung (Schlecht 1–2, Mittel 3, Gut 4–5, Ohne); Sortierung nach Datum oder Bewertung; Suche im Kommentar; Seitengröße 10/25/50/100. Mensen, Sortierung und Seitengröße merkt sich der Browser. „Als erledigt markieren“ direkt in der Liste, per Checkbox auch mehrere auf einmal. „Antworten“ / „Zum Chat“ öffnet den Chat mit dem Autor. |
| Chat             | `/admin/rocket-meals/food-feedbacks/:id` | Kommentar als erste Nachricht, Verlauf, Antwort schreiben (Eingabe wie im Claude-Chat: Enter sendet, Shift+Enter neue Zeile, auf dem Handy Senden-Knopf), Status über den Status-Chip ändern (Wartet auf Antwort / Beantwortet / Erledigt), Link zum Datensatz. Neue Nachrichten des Nutzers erscheinen ohne Neuladen (alle 20 s). |
| App-Feedbacks    | `/admin/rocket-meals/app-feedbacks`      | Rückmeldungen aus dem Feedback-Formular der App und Bewertungen aus App Store / Google Play. Gleicher Aufbau wie die Speise-Feedbacks: Status-Filter mit Anzahl, Filter nach Quelle (App, App Store, Google Play) und Daumen hoch/runter, Sortierung nach Datum, Suche, Seitengröße, „Als erledigt markieren“ einzeln und per Checkbox. Quelle, Sortierung und Seitengröße merkt sich der Browser. |
| App-Feedback     | `/admin/rocket-meals/app-feedbacks/:id`  | Titel und Text als erste Nachricht, Gerät und Kontakt-E-Mail im Kopf, derselbe Chat wie bei den Speise-Feedbacks (Status-Chip, Enter sendet, Aktualisierung alle 20 s). Bei einer Store-Bewertung schreibt die Eingabe die öffentliche Antwort im Store (`app_feedbacks.response`); der `app-reviews-pull-hook` veröffentlicht sie automatisch. Pro Bewertung gibt es nur eine Antwort – ein Hinweis über der Eingabe sagt, dass eine neue Nachricht die bisherige ersetzt. |
| Live-Puls        | `/admin/rocket-meals/live-pulse`         | Für den zweiten Bildschirm: wer heute aktiv war (Avatar, Nickname, „vor 3 Minuten“; Ring grün unter 15 min, orange unter 1 h), ein Ticker aus Speise-Feedbacks, angekündigten Mensa-Besuchen, neuen Profilen und anonymen `app_usage_events`, Kennzahlen (aktiv in den letzten 15 min, heute aktiv, neue Profile, Gerichte angesehen, Speise-Feedbacks) und ein Balkendiagramm der aktiven Nutzer pro Stunde aus `directus_activity`. Aktualisiert sich alle 30 s.                                                                                      |
| Workflows        | `/admin/rocket-meals/workflows`          | Eine Kachel je Workflow: Ampel (grün = der letzte Lauf, der etwas getan hat, ging durch; rot = er schlug fehl; pulsierend = läuft gerade; übersprungene Läufe zählen nicht), Schalter zum Aktivieren/Deaktivieren, Play-Knopf zum manuellen Starten, Zeitplan, nächster Lauf mit Countdown und zuletzt erfolgreicher Lauf. Namen kommen aus dem Backend-Katalog (`workflow_name_*`). Sortierung „Automatisch“: fehlgeschlagene zuerst, dann die übrigen aktiven alphabetisch (`workflows-runs-cleanup` als letzter aktiver), deaktivierte und auf diesem Server nicht eingerichtete am Ende. Die Reihenfolge wird nur beim Öffnen der Seite (oder beim Wechsel der Sortierung) berechnet, Klicks verschieben keine Kachel. Filter Alle/Probleme/Laufend/Deaktiviert, Suche. |
| Workflow         | `/admin/rocket-meals/workflows/:id`      | Schalter, „Jetzt starten“ und „Mit Input starten“ (JSON), Zeitplan mit Cron-Ausdruck und den nächsten 5 Läufen, Quote ohne Fehler und Ø Laufzeit der geladenen Läufe, Liste der Läufe (Status, Start, Dauer, ausgelöst von Person oder automatisch) mit Filter. Ein Klick öffnet den Lauf in einer Seitenleiste mit Log, Input, Output und Result-Hash; ein laufender Lauf aktualisiert sein Log alle 3 s. |

### Status eines Speise-Feedbacks

| Status             | Bedeutung                               | Daten                                            |
| ------------------ | --------------------------------------- | ------------------------------------------------ |
| Neu                | Kommentar, noch niemand hat geantwortet | `foods_feedbacks.chat` ist leer                  |
| Wartet auf Antwort | Der Nutzer hat zuletzt geschrieben      | `chats.conversation_state = waiting_for_support` |
| Beantwortet        | Support hat zuletzt geschrieben         | `chats.conversation_state = waiting_for_user`    |
| Erledigt           | Von Hand abgeschlossen                  | `chats.conversation_state = resolved`            |

„Offen“ fasst „Neu“ und „Wartet auf Antwort“ zusammen – alles, worum sich jemand kümmern muss.

Der Status lässt sich im Chat über den Status-Chip von Hand setzen, „Erledigt“ auch direkt in der
Liste (einzeln oder für alle ausgewählten; bestehende Chats in einem Request, siehe
`src/helpers/rocket-meals-module/FoodFeedbackChatActions.ts`). Hat ein Feedback noch keinen Chat,
wird er dabei angelegt (der Status steht in `chats.conversation_state`) – der Autor sieht den Chat
dann in der App, auch ohne Antwort. „Neu“ ist nicht wählbar: es bedeutet nur „noch kein Chat“.

### Was beim ersten Antworten passiert

Die erste Antwort legt den Chat an, genau in der Form, die der `app-feedbacks-hook` für
App-Feedbacks anlegt, damit der Autor ihn in der App sieht:

1. `chats` mit `alias` „Feedback zu &lt;Speise&gt;“ (in der Sprache des Autors aus
   `profiles.language`), `initial_message` = Kommentar, `conversation_state = waiting_for_support`.
2. `chats_participants` mit dem Profil des Autors.
3. `foods_feedbacks.chat` zeigt auf den Chat.
4. Die Nachricht selbst als `chat_messages` **ohne** `profile` – daran erkennen App und Hook eine
   Support-Nachricht. Der `chat-conversation-state-hook` setzt den Status auf „Beantwortet“ und
   schickt dem Autor eine Push-Benachrichtigung.

Feedbacks ohne Profil können nicht beantwortet werden; es gäbe niemanden, der den Chat sieht.

Der `chat-conversation-state-hook` erkennt Support jetzt an der App-Berechtigung des Schreibenden
(`accountability.app`) und nicht mehr nur an Admin-Rechten – so werden auch Antworten von
Mensa-Mitarbeitenden mit eigener Rolle richtig als Support gewertet.

### Status eines App-Feedbacks

Dieselben Status wie bei den Speise-Feedbacks, aber sie stehen **am App-Feedback selbst** in
`app_feedbacks.state` – so zeigt auch ein Export von `app_feedbacks` den Stand. Das Modul liest
nur dieses Feld, nie den Chat.

| Status             | `app_feedbacks.state` | `chats.conversation_state` |
| ------------------ | --------------------- | -------------------------- |
| Neu                | `open` (oder leer)    | bleibt, wie er ist         |
| Wartet auf Antwort | `waiting_for_support` | `waiting_for_support`      |
| Beantwortet        | `waiting_for_user`    | `waiting_for_user`         |
| Erledigt           | `closed`              | `resolved`                 |

- **Abgleich in beide Richtungen** (`AppFeedbackStateSyncHelper`): Ändert sich der Status eines
  Chats – nach jeder Nachricht oder von Hand –, übernimmt der `chat-conversation-state-hook` ihn in
  die verknüpften App-Feedbacks. Setzt das Modul `state`, gibt der `app-feedbacks-hook` ihn an den
  Chat weiter, damit der Nutzer ihn in der App sieht. Geschrieben wird nur, wenn sich der Wert
  ändert. Ältere Feedbacks werden nicht nachträglich abgeglichen, sie springen bei der nächsten
  Nachricht oder Statusänderung um.
- Der `app-feedbacks-hook` legt den Chat schon beim Absenden an, wenn der Nutzer ein Profil hat.
  Das Feedback bleibt „Neu“, bis jemand schreibt.
- Wie ein App-Feedback beantwortet wird, hängt davon ab, was der Nutzer hinterlassen hat
  (`AppFeedbackChatHelper.getAnswerChannel`):
  - **Profil vorhanden** → Chat. Antwortet der Support, bekommt der Autor eine
    Push-Benachrichtigung und eine Mail (siehe unten).
  - **Kein Profil, aber Kontakt-E-Mail** → kein Chat, sondern ein Antwortfeld mit Hinweis auf die
    Adresse. Die Antwort landet in `app_feedbacks.response`, das Feedback wird zugleich erledigt
    (`state = closed`), und der `app-feedbacks-hook` mailt die Antwort mit dem Hinweis, nicht auf
    die Mail zu antworten. Das ist die einzige Mail, die eine Änderung an einem App-Feedback
    auslöst.
  - **Weder Profil noch E-Mail** (anonym) → keine Antwort möglich, nur „Als erledigt markieren“.
- Store-Bewertungen haben nie einen Chat. Sobald `app_feedbacks.response` gesetzt wird (im Modul,
  direkt in Directus oder beim Abholen aus dem Store), veröffentlicht der `app-reviews-pull-hook` die
  Antwort im Store und setzt `state = closed`. Es zählt nur `state`: eine ältere Bewertung mit
  Antwort, aber offenem `state`, bleibt offen, bis sie jemand schließt.

### Mails zu Chat-Nachrichten

Mails gehen **zeitversetzt** raus, damit eine laufende Unterhaltung nicht pro Nachricht eine Mail
auslöst (`ChatMailDigestHelper`):

- Der `chat-conversation-state-hook` verschickt selbst keine Mail. Er merkt sich die erste noch
  nicht gemailte Nachricht in `chats.mail_pending_since` und startet pro Nachricht einen Timer
  (`setTimeout`, 5 Minuten).
- Läuft der Timer ab, schaut er in der Datenbank nach, ob es im Chat inzwischen eine neuere
  Nachricht gibt. Dann übernimmt deren Timer und dieser tut nichts. Sonst schickt er **eine** Mail
  pro Empfänger mit allen Nachrichten, die der Empfänger noch nicht gesehen hat: was andere nach
  seiner eigenen letzten Nachricht geschrieben haben. Wer inzwischen selbst geantwortet hat, bekommt
  nichts.
- Push-Benachrichtigungen bei Antworten des Supports gehen weiterhin sofort raus.

> **Mehrere Instanzen:** Das Backend läuft mit mehreren Directus-Instanzen. Der Timer läuft nur
> auf der Instanz, die die Nachricht gespeichert hat, und die Prüfung „gibt es eine neuere
> Nachricht?“ geht über die gemeinsame Datenbank. So verschickt genau eine Instanz die Mail, auch
> wenn die Nachrichten eines Chats über verschiedene Instanzen kommen. Wird eine Instanz während der
> 5 Minuten neu gestartet, geht ihr Timer verloren. `mail_pending_since` bleibt dann gesetzt, und die
> Mails gehen mit der nächsten Nachricht im Chat raus.
>
> Ein Directus-`schedule()` in einer Extension läuft dagegen **nicht** auf jeder Instanz, solange
> `SYNCHRONIZATION_STORE: "redis"` gesetzt ist (wie in `apps/backend/docker-compose.yaml`): Directus
> stimmt jeden Tick über Redis ab, und genau eine Instanz führt ihn aus. Ausprobiert mit
> Directus 11.17.4 und 2 Replikas, Cron alle 5 Sekunden: mit Redis jeder Tick einmal (abwechselnd
> auf beiden Instanzen), mit `SYNCHRONIZATION_STORE: "memory"` jeder Tick zweimal. Die Abstimmung
> gilt pro Tick, nicht für die Laufzeit: dauert ein Lauf länger als der Abstand zwischen zwei Ticks,
> kann der nächste Tick auf einer anderen Instanz schon parallel starten.

Vor jeder Mail wird die Adresse geprüft (`ChatMailRecipientHelper`):

- Empfänger sind die Teilnehmer des Chats und die Autoren verknüpfter Feedbacks (Adresse ihres
  Directus-Accounts und die Kontakt-E-Mail ihres App-Feedbacks).
- Gast-Accounts (`guest-…@guest.example.com`) und alle anderen Adressen unter `example.com` bekommen
  keine Mail.
- Die Directus-Standardadresse `admin@example.com` steht für den Support: die Mail geht an die
  Support-Adresse.
- Der Support bekommt eine Mail über alles, was Nutzer seit seiner letzten Antwort geschrieben haben,
  mit Link auf die Chat-Seite im Modul (`RocketMealsModulePages.getAdminUrl`), egal ob der Chat zu
  einem Feedback gehört.
- Die Mail an den Nutzer enthält bewusst keinen Link in die App: Gäste der nativen App hätten in der
  Web-App keinen Zugriff auf ihren Chat. Stattdessen verweist sie auf den Menüpunkt „Chats“.

Die gemeinsamen Teile beider Feedback-Seiten liegen in `src/rocket-meals-module/support-chat/`
(Verlauf + Eingabe, Status-Menü) und `src/helpers/rocket-meals-module/SupportChatActions.ts`
(Status setzen, mehrere als erledigt markieren).

### KI-Handlungsempfehlungen

Sobald ein Speise-Feedback einen neuen oder geänderten Kommentar hat, fragt der
`action-recommendations-hook` die KI, was zu tun ist: antworten (mit Antwortvorschlag für den Chat) oder
als erledigt markieren. Die App legt ein Feedback ohne Kommentar an und schreibt den Kommentar per
Update, und sie schickt bei jeder Änderung (auch einer neuen Bewertung) das ganze Feedback. Deshalb
vergleicht der Hook den Kommentar vor und nach dem Update, statt nur auf das Anlegen zu hören.
Die Antwort landet in `action_recommendations` (`collection`, `item`, `action`, `reason`, `draft_reply`,
`recommended_by_ai` = Anbieter und Modell, z. B. `OpenRouter · gpt-4o`). Die KI schlägt nur vor, am
Feedback selbst ändert sich nichts.

| `status`     | Bedeutung                                                    | Liste im Modul                         |
| ------------ | ------------------------------------------------------------ | -------------------------------------- |
| `processing` | Die Zeile entsteht sofort, die KI wird gerade gefragt        | „Die KI wird gefragt“, lädt alle 5 s neu |
| `draft`      | Empfehlung da                                                | ✨ am Button, Begründung, Vorschlag     |
| `failed`     | KI-Fehler oder keine gültige Antwort, Grund in `logs`        | „KI-Empfehlung fehlgeschlagen“ + letzte Log-Zeile |
| `archived`   | Übernommen oder verworfen                                    | nicht mehr angezeigt                   |

`logs` hält mit Zeitstempel fest, wann die KI gefragt wurde und was sie geantwortet hat (oder der
Fehler). Eine neue Anfrage ersetzt die offenen (`processing`, `draft`, `failed`) KI-Empfehlungen
desselben Eintrags.

- **Einschalten:** `app_settings.ai_action_recommendations_enabled` (Standard aus) und ein
  OpenAI-kompatibler Anbieter unter Einstellungen > KI. Fehlt eins davon, passiert nichts.
- **Was an die KI geht**, steht fest im Code (`src/helpers/action-recommendations/ActionRecommendationDefinitions.ts`):
  pro Collection eine Allowlist der Felder (bei Speise-Feedbacks nur `comment` und `rating`, nie das
  Profil) und die erlaubten Handlungen. Die Antwort wird streng geprüft
  (`ActionRecommendationPrompt.parseRecommendations`): unbekannte Einträge, nicht erlaubte Handlungen
  und Antworten ohne Begründung werden verworfen. Einen Antwortvorschlag gibt es nur bei `reply`.
- **Sprache des Antwortvorschlags:** aus `profiles.language` des Autors. Ohne Sprache oder bei Deutsch
  schreibt die KI in der Standardsprache des Servers (`directus_settings.default_language`, Einstellungen >
  Projekt), sonst auf Englisch. Das Profil selbst geht nicht an die KI, nur der Sprachcode.
- **In der Liste** markiert ✨ (`auto_awesome`) den empfohlenen Button. Unter dem Kommentar stehen
  Begründung (eingeklappt, „Erklärung anzeigen“) und Antwortvorschlag, mit „Chat mit Vorschlag starten“ (öffnet den Chat mit dem
  Vorschlag in der Eingabe) und „Vorschlag verwerfen“.
- **Im Chat** steht der Vorschlag vollständig in einer Karte „Vorschlag der KI“ über der Eingabe,
  „In Eingabe übernehmen“ übernimmt ihn. Die Karte verschwindet, solange die Eingabe genau diesen Text enthält.
- **„Vorschlag generieren“ von Hand**, z. B. für ältere Feedbacks ohne Empfehlung (nur ein Anbieter unter
  Einstellungen > KI ist nötig, der Schalter in den App-Settings gilt nur für die automatischen
  Empfehlungen; ohne Anbieter ausgegraut):
  - auf der Detailseite für das eine Feedback, mit Karte „KI-Empfehlung: …“ samt Begründung über dem Chat
    (der Antwortvorschlag steht in der Karte „Vorschlag der KI“ an der Eingabe),
  - in der Liste für alle ausgewählten mit Kommentar in einem Batch: höchstens 100 pro Anfrage
    (mehr werden auf mehrere Anfragen verteilt), an die KI in Aufrufen zu je 25.
  Die Zeilen entstehen sofort als `processing`, die KI wird danach im Hintergrund gefragt
  (`background: true`), die Seiten laden nach, bis sie fertig sind. Hat ein Feedback schon einen Chat,
  bekommt die KI dessen letzte 20 Nachrichten mit (nur Rolle `guest` oder `support`, keine Namen), der
  Antwortvorschlag ist dann die nächste Nachricht des Supports.
- **Erledigt und wieder öffnen:** Auf der Detailseite „Als erledigt markieren“ bzw. bei einem erledigten
  Feedback „Wieder öffnen“ (Chat zurück auf „Wartet auf Antwort“). In der Liste „Wieder öffnen“ pro
  Zeile und „Ausgewählte wieder öffnen“ für mehrere (ein Request, `SupportChatActions.reopen`).
- **Erledigt:** Antworten, „Als erledigt markieren“ oder Verwerfen setzt die Empfehlung auf
  `archived`.
- **Gelöschte Einträge:** Der Hook löscht für jede Collection die Empfehlungen gelöschter Einträge mit,
  `action_recommendations` hat keinen Fremdschlüssel auf den Eintrag.
- **Auf Anfrage:** `POST /action-recommendations/recommend` (`{ collection, ids, language }`) und
  `POST /action-recommendations/summarize` (`{ collection, group_value?, language }`, z. B. alle
  Kommentare zu einer Speise) für angemeldete Nutzer; die Einträge werden mit deren Rechten gelesen.
- **Rollen ohne Admin-Rechte** brauchen Lese- und Schreibrechte auf `action_recommendations`, um die
  Empfehlungen im Modul zu sehen und zu archivieren.
- **Neue Collection:** Eintrag in `ActionRecommendationDefinitions.DEFINITIONS`; eine neue Handlung
  braucht zusätzlich eine Auswahl im Dropdown `action_recommendations.action` (ein Test vergleicht
  beides) und ein Label im Backend-Katalog.

## Gemeinsame Logik in `repo-depkit-common`

Die Regeln hinter den Chats stehen nicht im Modul, sondern in `packages/common` – so rechnen App,
Directus-Hooks und Modul garantiert gleich. Im Bundle bleibt nur, was Directus-spezifisch ist
(Darstellung, Icons, Endpunkte, Feldlisten:
`src/helpers/rocket-meals-module/FoodFeedbackChatHelper.ts`).

| Helper (`repo-depkit-common`)  | Was er regelt                                                                                                                                   | Genutzt von                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `ChatHelper`                   | Support- vs. Nutzer-Nachricht, Status nach einer Nachricht, Sortierung, neuer Support-Chat, Teilnehmer                                          | `chat-conversation-state-hook`, `app-feedbacks-hook`, Modul, App-Chat |
| `FoodFeedbackChatStatusHelper` | Status eines Speise-Feedbacks, Filter (Directus-Filter und im Speicher), wer beantwortet werden kann, Sprache des Autors, Chat für ein Feedback | Modul; für eine Ansicht in der App direkt nutzbar                     |
| `AppFeedbackChatStatusHelper`  | Status eines App-Feedbacks (inkl. Store-Bewertungen), Status- und Quellen-Filter, wer beantwortet werden kann, Chat für ein Feedback (Titel, erste Nachricht) | `app-feedbacks-hook`, Modul                                           |
| `RelationHelper`               | ID einer Relation, egal ob als Schlüssel oder als ausgeklappte Zeile geladen                                                                    | Modul, Chat-Logik                                                     |

Neue Logik, die auch eine App brauchen könnte, gehört dorthin (mit Test unter
`packages/common/src/__tests__/`). Code, der in die Directus-Oberfläche gebündelt wird, importiert
sie per Deep-Import (`repo-depkit-common/src/ChatHelper`), damit der Paket-Index nicht
moment-timezone und Co. in den Browser zieht.

## Sprache

Alle Texte des Moduls und der `[Erweitert]`-Panels erscheinen in der Sprache, in der Directus selbst
gerade angezeigt wird – nicht in der Sprache des Browsers. Directus nimmt die Sprache aus dem
Benutzerprofil (`Sprache`), sonst die Projekt-Standardsprache (Einstellungen → Projekt) und schreibt
sie nach `<html lang>`; `useAppExtensionTranslate()` liest genau das und wechselt bei einer Änderung
sofort mit.

## Neue Seite hinzufügen

1. Eintrag in `RocketMealsModulePages.PAGES`
   (`src/helpers/rocket-meals-module/RocketMealsModulePages.ts`) – Seitenleiste und Übersicht
   entstehen daraus.
2. Route in `src/rocket-meals-module/index.ts`, Komponente unter `src/rocket-meals-module/<seite>/`.
3. Texte als Keys `rocket_meals_module_*` im Backend-Katalog (alle Sprachen), in Komponenten über
   `useAppExtensionTranslate()`.
4. Fachlogik nach `packages/common` (siehe oben), Directus-spezifische Logik ohne Vue in
   `src/helpers/rocket-meals-module/` – beides mit Test, die Tests laufen in Node.

### Live-Puls: woher die Daten kommen

| Anzeige            | Quelle                                                                                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zuletzt aktiv      | `profiles.date_updated` (die App setzt es beim Start und bei jedem Wechsel in den Vordergrund), heute, neueste zuerst                                                                                      |
| Avatare            | `GET /profile-avatar/<profileId>?size=64` – zeichnet `profiles.avatar` mit derselben Logik wie die App (`AvatarSvg` in `repo-depkit-common-ui`)                                                            |
| Gerichte angesehen | `app_usage_events` mit `food_details_opened`, geschrieben vom `food-details-usage-event-hook` beim Abruf `GET /items/foodoffers/<id>` aus einer App; anonym, `session_id` = `Backend_<Jahr>_<Monat>_<Tag>` |
| Diagramm           | verschiedene Nutzer pro Stunde in `directus_activity`, nur Collections, in denen App-Nutzer schreiben (Mitarbeitende, die Speisen pflegen, zählen nicht)                                                   |

Die Avatare werden absichtlich auf dem Server gezeichnet: die DiceBear-Stile sind rund 2 MB
JavaScript und würden sonst mit jeder Seite der Directus-Oberfläche geladen. Die Stunden fragt die
Seite einzeln mit Zeitstempeln ab statt mit Directus' `hour()`, damit in der Zeitzone des Browsers
gezählt wird.

### Workflows: woher die Daten kommen

| Anzeige             | Quelle |
| ------------------- | ------ |
| Kacheln, Schalter   | `workflows` (`enabled`), gelesen und geschrieben mit den Rechten des Nutzers. Aktiv ist nur `enabled = true`, genau wie im Zeitplan. |
| Ampel, zuletzt erfolgreich | `workflows_runs`, je Workflow und Status das späteste `date_started` (Aggregat, nur `success` und `failed`) plus alle Läufe mit `running` |
| Zeitplan, nächster Lauf, Input-Vorlage | `GET /rocket-meals-workflows/schedules` (`workflows-schedules-endpoint`). Die Cron-Ausdrücke stehen im Code der Hooks, nicht in der Datenbank; der Server rechnet die nächsten Läufe in seiner eigenen Zeitzone (`TZ` des Containers) aus. Workflows, die der Endpoint nicht kennt, sind auf diesem Server nicht eingerichtet und lassen sich nicht starten. |
| Starten             | `POST /items/workflows_runs` mit `{ workflow, state: "running", input? }` – der `workflows-runs-hook` startet den Lauf und lehnt ihn ab, wenn der Workflow deaktiviert ist oder schon läuft. |

Ein neuer Workflow bekommt seinen Namen als Key `workflow_name_<id>` im Backend-Katalog und einen
Eintrag in `WorkflowsPageHelper.WORKFLOW_NAME_KEYS`; ohne Eintrag zeigt die Seite die ID. Braucht ein
Lauf ein Input, liefert `getInputTemplate()` im `WorkflowRunJobInterface` die Vorlage für den Start-Dialog.

Ideen für weitere Seiten: Wohnheim-Verwaltung, Renner/Penner-Listen der Speisen.

## Freischaltung

Neue Module zeigt Directus erst, wenn sie in der Modul-Leiste aktiviert sind (Einstellungen →
Projekt → Modul-Leiste). Die ausgelieferten Settings
(`data/directus-sync-data/configuration/directus-config/collections/settings.json`) aktivieren
`rocket-meals` direkt hinter „Insights“. Sichtbar ist das Modul für alle Nutzer mit App-Zugang;
welche Daten sie sehen und schreiben dürfen, regeln wie überall die Directus-Berechtigungen.
