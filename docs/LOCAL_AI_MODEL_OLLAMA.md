# Lokales KI-Modell statt externem Anbieter (Ollama)

Stand: 14.10.2026. Übergabe-Notiz für die nächste Session auf dem Testserver.

## Ziel

Die KI-Funktionen des Backends laufen aktuell über einen externen Anbieter (Opus). Aus Datenschutzgründen
soll ein kleines Open-Weight-Modell direkt auf dem Server laufen, damit Feedback- und Chat-Texte den Server
nicht verlassen.

## Wie das Backend die KI anspricht

- Alles läuft über den OpenAI-kompatiblen Anbieter aus **Directus → Settings → AI**:
  `apps/backend/Backend/directusExtensions/directus-extension-rocket-meals-bundle/src/helpers/ai/DirectusOpenAiCompatibleClient.ts`.
- **Kein Code-Wechsel nötig**: Ollama bietet unter `/v1` eine OpenAI-kompatible API. Base URL und Modellname in
  den Directus-Settings eintragen, fertig.
- **Stolperfalle:** `parseSettings` liefert `null`, wenn kein API-Key gesetzt ist. Ollama ignoriert den Key, trotzdem
  einen Dummy eintragen (z. B. `ollama`), sonst gilt die KI als nicht konfiguriert.
- Timeout im Client: 10 Minuten, `maxRetries: 1`. Reicht für CPU-Inferenz.
- Welches Modell geantwortet hat, steht in `action_recommendations.recommended_by_ai` (`Anbieter · Modell`). Damit lassen
  sich Opus und das lokale Modell direkt vergleichen.

Aufrufer von `chatJson`:

| Funktion | Datei | Anspruch an das Modell |
| --- | --- | --- |
| Action Recommendations (Feedback einordnen, `draft_reply` in Sprache des Gastes) | `src/helpers/action-recommendations/ActionRecommendationService.ts`, Prompt in `ActionRecommendationPrompt.ts` | Klassifikation leicht, mehrsprachige Antwortentwürfe mittel |
| Feature-Wish-Review täglich 20:00 (publish/decline/merge-Vorschlag) | `src/feature-wishes-daily-workflow/index.ts` | mittel, langer Kontext durch alle veröffentlichten Wünsche |
| Eingebauter Directus AI Assistant (Agent mit Tool-Calls) | Directus selbst | für kleine Modelle ungeeignet, nicht einplanen |

## Bekannte Schwachstellen für kleine Modelle (noch nicht umgesetzt)

1. `ActionRecommendationDefinitions.MAX_ITEMS_PER_RECOMMENDATION = 25`: bis zu 25 Einträge pro Aufruf und ein langes
   JSON zurück. Kleine Modelle liefern dabei oft kaputtes oder unvollständiges JSON.
   Idee: Chunk-Größe einstellbar machen (z. B. 5 für lokale Modelle).
2. `DirectusOpenAiCompatibleClient.chatJson` setzt kein `response_format`. Ollama und vLLM können JSON-Ausgabe
   erzwingen (`response_format: { type: 'json_object' }`). Vorher prüfen, ob der bisherige Anbieter das ebenfalls
   akzeptiert, sonst nur optional setzen.
3. Die Prompts sind auf Deutsch geschrieben. Bei Gemma 4 kein Problem, trotzdem beim Test darauf achten.

## Modellwahl

Server: **keine GPU, 64 GB RAM**. Auf CPU zählt, wie viele Parameter pro Token gerechnet werden, nicht die Dateigröße.

| Ollama-Tag | Datei | RAM (Schätzung inkl. Cache) | aktiv pro Token | Bemerkung |
| --- | --- | --- | --- | --- |
| `gemma4:12b-it-qat` | 7,2 GB | ca. 10 bis 12 GB | 12B (dense) | Wunsch des Nutzers, sparsam beim RAM, auf CPU eher langsamer |
| `gemma4:26b-a4b-it-qat` | 16 GB | ca. 20 bis 24 GB | ca. 4B (MoE) | Empfehlung: vermutlich schneller und besser (MMMLU 86,3 % statt 83,4 %) |
| `qwen3.6:35b-a3b` (Tag vorher prüfen) | ca. 23 GB | ca. 28 GB | ca. 3B (MoE) | Gegenkandidat, gilt als stark bei JSON und Tool-Calling |

- QAT-Varianten bevorzugen: auf 4 Bit trainiert, weniger Qualitätsverlust als normales Q4.
- Ollama entlädt das Modell nach `OLLAMA_KEEP_ALIVE` (Standard 5 Minuten) ohne Anfrage. Der RAM ist also nur belegt,
  solange gerechnet wird. Die echten Kosten sind CPU-Last während der Läufe.
- Kontext nicht auf 256K lassen: 16K bis 32K reichen, sonst kostet der KV-Cache mehrere GB extra.
- Tempo auf CPU ist nicht gemessen, grobe Schätzung 5 bis 15 Tokens pro Sekunde. **Auf dem Testserver messen.**

## Plan für die Session auf dem Testserver

1. Ollama als Container neben Directus starten, im Netzwerk `directus_network`, mit CPU- und RAM-Limit, z. B.:

   ```yaml
   rocket-meals-ollama:
     image: ollama/ollama
     restart: ${RESTART}
     environment:
       - OLLAMA_KEEP_ALIVE=5m
       - OLLAMA_NUM_PARALLEL=1
       - OLLAMA_CONTEXT_LENGTH=16384
     cpus: "4"        # an die Kernzahl des Servers anpassen
     mem_limit: 24g
     volumes:
       - ./../../data/ollama:/root/.ollama
     networks:
       - directus_network
   ```

   Nicht über Traefik nach außen freigeben. Erst nach erfolgreichem Test in `apps/backend/docker-compose.yaml`
   übernehmen (per PR).
2. Modelle laden: `docker exec <ollama> ollama pull gemma4:12b-it-qat` und `ollama pull gemma4:26b-a4b-it-qat`.
3. Direkt messen, bevor Directus angefasst wird:
   `curl http://localhost:11434/v1/chat/completions -d '{"model":"gemma4:12b-it-qat","messages":[{"role":"user","content":"..."}]}'`
   und mit `ollama run <modell> --verbose` die Tokens pro Sekunde ablesen. Dabei RAM und CPU mit `docker stats` beobachten.
4. In Directus → Settings → AI: Base URL `http://rocket-meals-ollama:11434/v1`, API-Key `ollama`, Modell eintragen.
5. 10 bis 20 echte Feedbacks über das Action-Recommendations-Modul mit beiden Modellen laufen lassen und vergleichen:
   Dauer, gültiges JSON, Qualität der Einordnung, Qualität und Sprache von `draft_reply`.
6. Je nach Ergebnis: Chunk-Größe und `response_format` (siehe oben) als PR umsetzen, Ollama-Service in die
   Compose-Datei übernehmen.

## Datenschutz

Das Backend sendet nur freigegebene Felder, bei Chats nur Rollen (Gast/Support) statt Namen. Freitext kann trotzdem
personenbezogene Daten enthalten. Alternative ohne eigenes Modell: Anbieter mit AVV und Verarbeitung in der EU
(z. B. Claude über AWS Bedrock Frankfurt, Mistral). Die Entscheidung liegt beim Datenschutzbeauftragten, das hier ist
keine Rechtsberatung.

## Quellen

- [Ollama gemma4 tags](https://ollama.com/library/gemma4/tags) (Dateigrößen oben stammen von hier)
- [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)
- [Unsloth: Gemma 4 lokal betreiben](https://unsloth.ai/docs/models/gemma-4)
- [Gemma 4 QAT Self-Hosting Guide](https://lushbinary.com/blog/gemma-4-qat-self-hosting-guide-ollama-llama-cpp-vllm/)
- [Best Local LLMs (October 2026), BenchLM](https://benchlm.ai/best/local-llm)
- [Qwen-Modelle für Ollama, AgenticWire](https://www.agenticwire.news/article/ollama-qwen)
