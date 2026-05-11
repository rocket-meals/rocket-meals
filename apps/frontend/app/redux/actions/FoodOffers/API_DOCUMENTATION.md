# Speiseplan API-Dokumentation (Meal Plan API Documentation)

Diese Dokumentation beschreibt die Directus REST-API-Endpunkte zum Abrufen des Speiseplans, inklusive Mensen, Speiseangeboten, Allergenen/Markierungen und Übersetzungen.

**Base-URL:** `https://studi-futter.rocket-meals.de/rocket-meals/api`

Alle Endpunkte verwenden die [Directus REST-API](https://docs.directus.io/reference/items.html). Für öffentliche Daten ist keine Authentifizierung nötig, sofern die Berechtigungen im Directus-Backend entsprechend konfiguriert sind.

---

## Inhaltsverzeichnis

1. [Mensen (Canteens) abrufen](#1-mensen-canteens-abrufen)
2. [Allergene / Markierungen (Markings) abrufen](#2-allergene--markierungen-markings-abrufen)
3. [Speiseangebote (Food Offers) abrufen](#3-speiseangebote-food-offers-abrufen)
4. [Einzelnes Speiseangebot mit Details abrufen](#4-einzelnes-speiseangebot-mit-details-abrufen)
5. [Speise-Details (Food) abrufen](#5-speise-details-food-abrufen)
6. [Übersetzungen (Translations)](#6-übersetzungen-translations)
7. [Kategorien abrufen](#7-kategorien-abrufen)
8. [Gebäude (Buildings) abrufen](#8-gebäude-buildings-abrufen)
9. [Datenmodell-Referenz](#9-datenmodell-referenz)
10. [Filter-Operatoren](#10-filter-operatoren)
11. [Empfohlener Ablauf](#11-empfohlener-ablauf)

---

## 1. Mensen (Canteens) abrufen

Ruft alle verfügbaren Mensen ab, inklusive Öffnungszeiten.

### Endpoint

```
GET /items/canteens
```

### Parameter

| Parameter | Wert | Beschreibung |
|-----------|------|--------------|
| `fields`  | `*, foodservice_hours.*, foodservice_hours_during_semester_break.*` | Alle Felder + Öffnungszeiten |
| `limit`   | `-1` | Alle Ergebnisse (keine Pagination) |

### Beispiel-Request

```
GET /items/canteens?fields=*,foodservice_hours.*,foodservice_hours_during_semester_break.*&limit=-1
```

### Beispiel-Response

```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "alias": "Mensa am Aasee",
      "status": "published",
      "sort": 1,
      "external_identifier": "mensa-aasee",
      "building": "building-uuid-or-null",
      "foodservice_hours": [
        {
          "id": 1,
          "day_of_week": "monday",
          "open": "11:30:00",
          "close": "14:00:00"
        }
      ],
      "foodservice_hours_during_semester_break": []
    }
  ]
}
```

### Felder der Collection `canteens`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | UUID (string) | Primärschlüssel |
| `alias` | string \| null | Anzeigename |
| `status` | string \| null | `published`, `draft`, `archived` |
| `sort` | number \| null | Sortierreihenfolge |
| `external_identifier` | string \| null | Externer Bezeichner (z.B. aus Quellsystem) |
| `building` | UUID \| null | Referenz auf `buildings` |
| `foodservice_hours` | O2M | Öffnungszeiten (Vorlesungszeit) |
| `foodservice_hours_during_semester_break` | O2M | Öffnungszeiten (Semesterferien) |

---

## 2. Allergene / Markierungen (Markings) abrufen

Markings sind Allergene, Zusatzstoffe und Ernährungshinweise (z.B. vegan, vegetarisch, Schwein, Gluten, etc.).

### Endpoint

```
GET /items/markings
```

### Parameter

| Parameter | Wert | Beschreibung |
|-----------|------|--------------|
| `fields`  | `*, translations.*` | Alle Felder + alle Übersetzungen |
| `limit`   | `-1` | Alle Ergebnisse |
| `filter`  | `{"_and":[{"status":{"_eq":"published"}}]}` | Nur veröffentlichte Markings |

### Beispiel-Request

```
GET /items/markings?fields=*,translations.*&limit=-1&filter={"_and":[{"status":{"_eq":"published"}}]}
```

### Beispiel-Response

```json
{
  "data": [
    {
      "id": "marking-uuid-...",
      "alias": "Vegan",
      "status": "published",
      "sort": 1,
      "short_code": "Vg",
      "external_identifier": "vegan",
      "icon": "leaf",
      "background_color": "#4CAF50",
      "show_on_card": true,
      "show_on_label_list": true,
      "group": "marking-group-uuid-or-null",
      "image": "file-uuid-or-null",
      "translations": [
        {
          "id": 1,
          "markings_id": "marking-uuid-...",
          "languages_code": "de-DE",
          "name": "Vegan",
          "description": "Enthält keine tierischen Produkte"
        },
        {
          "id": 2,
          "markings_id": "marking-uuid-...",
          "languages_code": "en-US",
          "name": "Vegan",
          "description": "Contains no animal products"
        }
      ]
    }
  ]
}
```

### Felder der Collection `markings`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | UUID (string) | Primärschlüssel |
| `alias` | string \| null | Anzeigename |
| `status` | string \| null | `published`, `draft`, `archived` |
| `sort` | number \| null | Sortierreihenfolge |
| `short_code` | string \| null | Kurzcode (z.B. "Vg", "Ve") |
| `external_identifier` | string \| null | Externer Bezeichner |
| `icon` | string \| null | Icon-Name |
| `background_color` | string \| null | Hintergrundfarbe (Hex) |
| `invert_background_color` | boolean \| null | Farbe invertieren |
| `hide_border` | boolean \| null | Rahmen ausblenden |
| `show_on_card` | boolean \| null | Auf Karten-Ansicht anzeigen |
| `show_on_label_list` | boolean \| null | In Label-Liste anzeigen |
| `image` | UUID \| null | Bild-Referenz auf `directus_files` |
| `image_remote_url` | string \| null | Remote-Bild-URL |
| `group` | UUID \| null | Referenz auf `markings_groups` |
| `translations` | O2M | Übersetzungen (→ `markings_translations`) |

### Felder der Collection `markings_translations`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | number | Primärschlüssel |
| `markings_id` | UUID | Referenz auf `markings` |
| `languages_code` | string | Sprachcode, z.B. `de-DE`, `en-US` |
| `name` | string \| null | Übersetzter Name |
| `description` | string \| null | Übersetzte Beschreibung |

---

## 3. Speiseangebote (Food Offers) abrufen

Ruft alle Speiseangebote einer Mensa für ein bestimmtes Datum ab. Dies ist der **Hauptendpunkt für den Speiseplan**.

### Endpoint

```
GET /items/foodoffers
```

### Parameter

| Parameter | Wert | Beschreibung |
|-----------|------|--------------|
| `fields`  | `*, markings.*, food.*, food.translations.*, attribute_values.*, attribute_values.food_attribute.*, attribute_values.food_attribute.group.*, attribute_values.food_attribute.translations.*, foods_attributes_values.*` | Alle relevanten Felder mit Relationen |
| `limit`   | `-1` | Alle Ergebnisse |
| `filter`  | Siehe unten | Filter nach Mensa und Datum |

### Filter-Struktur

```json
{
  "_and": [
    {
      "canteen": {
        "_eq": "<CANTEEN_ID>"
      }
    },
    {
      "_or": [
        {
          "_and": [
            { "date": { "_gte": "2025-01-15" } },
            { "date": { "_lte": "2025-01-15" } }
          ]
        },
        {
          "date": { "_null": true }
        }
      ]
    }
  ]
}
```

> **Hinweis:** Angebote mit `date: null` werden immer mitgeladen (z.B. dauerhafte Angebote).

### Beispiel-Request

```
GET /items/foodoffers?fields=*,markings.*,food.*,food.translations.*,attribute_values.*,attribute_values.food_attribute.*,attribute_values.food_attribute.group.*,attribute_values.food_attribute.translations.*&limit=-1&filter={"_and":[{"canteen":{"_eq":"CANTEEN_ID"}},{"_or":[{"_and":[{"date":{"_gte":"2025-01-15"}},{"date":{"_lte":"2025-01-15"}}]},{"date":{"_null":true}}]}]}
```

### Beispiel-Response

```json
{
  "data": [
    {
      "id": "foodoffer-uuid-...",
      "alias": "Spaghetti Bolognese",
      "date": "2025-01-15",
      "status": "published",
      "sort": 1,
      "canteen": "canteen-uuid-...",
      "food": {
        "id": "food-uuid-...",
        "alias": "Spaghetti Bolognese",
        "image": "file-uuid-or-null",
        "image_remote_url": null,
        "rating_average": 4.2,
        "rating_amount": 57,
        "food_category": "food-category-uuid-or-null",
        "translations": [
          {
            "id": 1,
            "foods_id": "food-uuid-...",
            "languages_code": "de-DE",
            "name": "Spaghetti Bolognese",
            "description": "Mit frischer Tomatensoße und Rindfleisch"
          },
          {
            "id": 2,
            "foods_id": "food-uuid-...",
            "languages_code": "en-US",
            "name": "Spaghetti Bolognese",
            "description": "With fresh tomato sauce and beef"
          }
        ]
      },
      "price_student": 2.50,
      "price_employee": 4.50,
      "price_guest": 5.50,
      "foodoffer_category": "category-uuid-or-null",
      "is_component": false,
      "markings": [
        {
          "id": 1,
          "foodoffers_id": "foodoffer-uuid-...",
          "markings_id": "marking-uuid-..."
        }
      ],
      "attribute_values": [
        {
          "id": 1,
          "value": "350",
          "food_attribute": {
            "id": "attr-uuid-...",
            "alias": "Kalorien",
            "unit": "kcal",
            "group": {
              "id": "group-uuid-...",
              "alias": "Nährwerte"
            },
            "translations": [
              {
                "languages_code": "de-DE",
                "name": "Kalorien"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Felder der Collection `foodoffers`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | UUID (string) | Primärschlüssel |
| `alias` | string \| null | Anzeigename |
| `date` | string \| null | Datum des Angebots (`YYYY-MM-DD`), `null` = dauerhaft |
| `status` | string \| null | `published`, `draft`, `archived` |
| `sort` | number \| null | Sortierreihenfolge |
| `canteen` | UUID \| Canteens | Referenz auf `canteens` (M2O) |
| `food` | UUID \| Foods | Referenz auf `foods` (M2O) |
| `foodoffer_category` | UUID \| null | Referenz auf `foodoffers_categories` (M2O) |
| `price_student` | number \| null | Preis für Studierende |
| `price_employee` | number \| null | Preis für Mitarbeitende |
| `price_guest` | number \| null | Preis für Gäste |
| `prices` | string | Preise (zusammengefasst) |
| `is_component` | boolean \| null | Ist Komponente eines anderen Angebots |
| `markings` | M2M | Allergene/Markierungen (→ `foodoffers_markings` Junction) |
| `attribute_values` | O2M | Nährwerte/Attribute (→ `foods_attributes_values`) |
| `foodoffer_components` | O2M | Komponenten (→ `foodoffers_components`) |
| `redirect_url` | string \| null | Weiterleitungs-URL |
| `result_hash` | string \| null | Hash für Änderungserkennung |

---

## 4. Einzelnes Speiseangebot mit Details abrufen

Ruft alle Details zu einem einzelnen Speiseangebot ab, inklusive Feedbacks, Kategorien und Übersetzungen.

### Endpoint

```
GET /items/foodoffers/<FOODOFFER_ID>
```

### Parameter

| Parameter | Wert | Beschreibung |
|-----------|------|--------------|
| `fields`  | `*, markings.*, feedbacks.*, food.*, food.translations.*, food.food_category.*, food.food_category.translations.*, foodoffer_category.*, foodoffer_category.translations.*, attribute_values.*, attribute_values.food_attribute.*, attribute_values.food_attribute.translations.*` | Alle Felder mit tiefen Relationen |
| `limit`   | `-1` | Alle Ergebnisse |
| `deep`    | `{"feedbacks":{"_filter":{"comment":{"_nnull":true}},"_sort":"-date_updated"}}` | Nur Feedbacks mit Kommentar, neueste zuerst |

### Beispiel-Request

```
GET /items/foodoffers/FOODOFFER_UUID?fields=*,markings.*,feedbacks.*,food.*,food.translations.*,food.food_category.*,food.food_category.translations.*,foodoffer_category.*,foodoffer_category.translations.*,attribute_values.*,attribute_values.food_attribute.*,attribute_values.food_attribute.translations.*&deep={"feedbacks":{"_filter":{"comment":{"_nnull":true}},"_sort":"-date_updated"}}
```

### Komponenten eines Angebots abrufen

Manche Angebote bestehen aus mehreren Komponenten (z.B. Hauptgericht + Beilage).

```
GET /items/foodoffers/<FOODOFFER_ID>?fields=foodoffer_components.component_foodoffers_id.*,foodoffer_components.component_foodoffers_id.markings.*
```

---

## 5. Speise-Details (Food) abrufen

Ruft Details zu einer einzelnen Speise (unabhängig vom Angebot/Datum).

### Endpoint

```
GET /items/foods/<FOOD_ID>
```

### Parameter

| Parameter | Wert | Beschreibung |
|-----------|------|--------------|
| `fields`  | `*, markings.*, feedbacks.*, translations.*` | Alle Felder mit Relationen |
| `deep`    | `{"feedbacks":{"_filter":{"comment":{"_nnull":true}},"_sort":"-date_updated"}}` | Nur Feedbacks mit Kommentar |

### Felder der Collection `foods`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | UUID (string) | Primärschlüssel |
| `alias` | string \| null | Anzeigename |
| `status` | string \| null | `published`, `draft`, `archived` |
| `sort` | number \| null | Sortierreihenfolge |
| `image` | UUID \| null | Bild (Referenz auf `directus_files`) |
| `image_remote_url` | string \| null | Alternatives Remote-Bild |
| `image_generated` | boolean \| null | Ob das Bild generiert wurde |
| `food_category` | UUID \| null | Referenz auf `foods_categories` (M2O) |
| `rating_average` | number \| null | Durchschnittliche Bewertung |
| `rating_amount` | number \| null | Anzahl Bewertungen |
| `markings` | M2M | Allergene/Markierungen (→ `foods_markings` Junction) |
| `translations` | O2M | Übersetzungen (→ `foods_translations`) |
| `feedbacks` | O2M | Nutzerfeedbacks |
| `attribute_values` | O2M | Nährwerte/Attribute |
| `extra` | string \| null | Zusätzliche Daten (JSON) |

### Felder der Collection `foods_translations`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | number | Primärschlüssel |
| `foods_id` | UUID | Referenz auf `foods` |
| `languages_code` | string | Sprachcode, z.B. `de-DE`, `en-US` |
| `name` | string \| null | Übersetzter Name der Speise |
| `description` | string \| null | Übersetzte Beschreibung |

---

## 6. Übersetzungen (Translations)

Übersetzungen werden in Directus über separate Tabellen gespeichert, die über `*_translations`-Relationen abgefragt werden.

### Prinzip

Jede Collection mit Übersetzungen hat eine zugehörige Translations-Tabelle:

| Haupttabelle | Translations-Tabelle | Schlüsselfelder |
|-------------|---------------------|----------------|
| `foods` | `foods_translations` | `foods_id`, `languages_code`, `name`, `description` |
| `markings` | `markings_translations` | `markings_id`, `languages_code`, `name`, `description` |
| `foodoffers_categories` | `foodoffers_categories_translations` | `foodoffers_categories_id`, `languages_code`, `name` |
| `foods_categories` | `foods_categories_translations` | `foods_categories_id`, `languages_code`, `name` |

### Übersetzung auswählen (Client-Logik)

Um den Namen einer Speise in der gewünschten Sprache zu erhalten:

```javascript
// Beispiel: Name der Speise auf Deutsch holen
const languageCode = "de"; // oder "en"

const translation = food.translations.find(
  (t) => t.languages_code?.split("-")[0] === languageCode
);

const displayName = translation?.name || food.alias;
```

### Verfügbare Sprachen abrufen

```
GET /items/languages?limit=-1
```

### Übersetzungen mit dem Hauptobjekt laden

Übersetzungen werden **nicht** separat abgefragt, sondern als verschachtelte Relation im `fields`-Parameter:

```
GET /items/foods?fields=*,translations.*
GET /items/markings?fields=*,translations.*
GET /items/foodoffers_categories?fields=*,translations.*
```

---

## 7. Kategorien abrufen

### Speiseangebots-Kategorien (Foodoffer Categories)

```
GET /items/foodoffers_categories?fields=*,translations.*&limit=-1&filter={"status":{"_eq":"published"}}
```

### Felder der Collection `foodoffers_categories`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | UUID (string) | Primärschlüssel |
| `alias` | string \| null | Anzeigename |
| `status` | string | `published`, `draft`, `archived` |
| `sort` | number \| null | Sortierreihenfolge |
| `external_identifier` | string \| null | Externer Bezeichner |
| `translations` | O2M | Übersetzungen (→ `foodoffers_categories_translations`) |

### Speise-Kategorien (Food Categories)

```
GET /items/foods_categories?fields=*,translations.*&limit=-1
```

---

## 8. Gebäude (Buildings) abrufen

```
GET /items/buildings?fields=*&limit=-1
```

Gebäude sind optional über die `building`-Relation in `canteens` verknüpft und enthalten Standortinformationen.

---

## 9. Datenmodell-Referenz

### Beziehungsdiagramm

```
canteens ──< foodoffers >── foods
                │                │
                │                ├──< foods_translations
                │                │
                │                ├──<> foods_markings >── markings
                │                │                          │
                │                │                          ├──< markings_translations
                │                │                          │
                │                │                          └── markings_groups
                │                │
                │                ├──< foods_attributes_values >── foods_attributes
                │                │
                │                └── foods_categories
                │                       └──< foods_categories_translations
                │
                ├──<> foodoffers_markings >── markings
                │
                ├──< foodoffers_components
                │
                └── foodoffers_categories
                       └──< foodoffers_categories_translations
```

Legende: `──<` = One-to-Many, `──<>` = Many-to-Many (Junction), `──` = Many-to-One

### Junction-Tabellen

| Junction-Tabelle | Verknüpft | Felder |
|-----------------|-----------|--------|
| `foodoffers_markings` | foodoffers ↔ markings | `foodoffers_id`, `markings_id` |
| `foods_markings` | foods ↔ markings | `foods_id`, `markings_id` |

---

## 10. Filter-Operatoren

Directus unterstützt folgende Filter-Operatoren (Auswahl):

| Operator | Beschreibung | Beispiel |
|----------|-------------|---------|
| `_eq` | Gleich | `{"status":{"_eq":"published"}}` |
| `_neq` | Ungleich | `{"status":{"_neq":"draft"}}` |
| `_gt` | Größer als | `{"rating":{"_gt":3}}` |
| `_gte` | Größer oder gleich | `{"date":{"_gte":"2025-01-15"}}` |
| `_lt` | Kleiner als | `{"price":{"_lt":5}}` |
| `_lte` | Kleiner oder gleich | `{"date":{"_lte":"2025-01-15"}}` |
| `_null` | Ist null | `{"date":{"_null":true}}` |
| `_nnull` | Ist nicht null | `{"date":{"_nnull":true}}` |
| `_in` | In Liste | `{"id":{"_in":["uuid1","uuid2"]}}` |
| `_and` | UND-Verknüpfung | `{"_and":[...]}` |
| `_or` | ODER-Verknüpfung | `{"_or":[...]}` |

Vollständige Referenz: [Directus Filter Rules](https://docs.directus.io/reference/filter-rules.html)

---

## 11. Empfohlener Ablauf

Für eine vollständige Implementierung des Speiseplans wird folgender Ablauf empfohlen:

### Schritt 1: Grunddaten laden (einmalig / beim App-Start)

```
1. GET /items/canteens?fields=*,foodservice_hours.*,foodservice_hours_during_semester_break.*&limit=-1
   → Alle Mensen mit Öffnungszeiten laden

2. GET /items/markings?fields=*,translations.*&limit=-1&filter={"_and":[{"status":{"_eq":"published"}}]}
   → Alle Allergene/Markierungen mit Übersetzungen laden

3. GET /items/languages?limit=-1
   → Verfügbare Sprachen laden (für Übersetzungsauswahl)

4. GET /items/foodoffers_categories?fields=*,translations.*&limit=-1&filter={"status":{"_eq":"published"}}
   → Kategorien laden (z.B. "Menü 1", "Menü 2", "Beilage")
```

### Schritt 2: Speiseplan für Mensa + Datum laden

```
5. GET /items/foodoffers?fields=*,markings.*,food.*,food.translations.*,attribute_values.*,attribute_values.food_attribute.*,attribute_values.food_attribute.group.*,attribute_values.food_attribute.translations.*&limit=-1&filter={"_and":[{"canteen":{"_eq":"<CANTEEN_ID>"}},{"_or":[{"_and":[{"date":{"_gte":"<DATUM>"}},{"date":{"_lte":"<DATUM>"}}]},{"date":{"_null":true}}]}]}
   → Alle Speiseangebote der gewählten Mensa für das gewählte Datum
   → <DATUM> im Format YYYY-MM-DD, z.B. "2025-01-15"
```

### Schritt 3: Detail-Ansicht (bei Klick auf ein Angebot)

```
6. GET /items/foodoffers/<ID>?fields=*,markings.*,feedbacks.*,food.*,food.translations.*,food.food_category.*,food.food_category.translations.*,foodoffer_category.*,foodoffer_category.translations.*,attribute_values.*,attribute_values.food_attribute.*,attribute_values.food_attribute.translations.*&deep={"feedbacks":{"_filter":{"comment":{"_nnull":true}},"_sort":"-date_updated"}}
   → Vollständige Details inkl. Feedbacks und Kategorien

7. GET /items/foodoffers/<ID>?fields=foodoffer_components.component_foodoffers_id.*,foodoffer_components.component_foodoffers_id.markings.*
   → Komponenten des Angebots (falls vorhanden)
```

### Schritt 4: Übersetzungen anwenden (Client-seitig)

```javascript
// Für jedes Food-Objekt die passende Übersetzung finden:
const lang = "de"; // Gewünschte Sprache
const translation = food.translations.find(
  (t) => t.languages_code?.split("-")[0] === lang
);
const name = translation?.name || food.alias;
const description = translation?.description || "";

// Für Markings analog:
const markingTranslation = marking.translations.find(
  (t) => t.languages_code?.split("-")[0] === lang
);
const markingName = markingTranslation?.name || marking.alias;
```

### Schritt 5: Markings/Allergene zuordnen (Client-seitig)

```javascript
// Aus dem foodoffers-Response die Marking-IDs extrahieren:
const markingIds = foodoffer.markings.map((m) => m.markings_id);

// Diese IDs gegen die in Schritt 1 geladenen Markings matchen:
const allergens = allMarkings.filter((m) => markingIds.includes(m.id));
```

---

## Quellcode-Referenzen

Die Implementierung dieser API-Aufrufe befindet sich in folgenden Dateien:

| Datei | Beschreibung |
|-------|-------------|
| `apps/frontend/app/redux/actions/FoodOffers/FoodOffers.ts` | Alle FoodOffer API-Aufrufe |
| `apps/frontend/app/redux/actions/Canteens/Canteens.ts` | Canteen API-Aufrufe |
| `apps/frontend/app/redux/actions/Markings/Markings.ts` | Markings API-Aufrufe |
| `apps/frontend/app/app/(app)/foodoffers/hooks.ts` | Hooks für Speiseplan-Screen |
| `apps/frontend/app/helper/collectionHelper.ts` | Basis-Klasse für API-Zugriff |
| `packages/common/src/databaseTypes/types.ts` | TypeScript-Typdefinitionen aller Collections |
