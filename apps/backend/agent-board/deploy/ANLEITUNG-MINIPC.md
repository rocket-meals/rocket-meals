# Agent Board + Claude-Sitzung auf einem Mini-PC / Raspberry Pi

Ziel: Ein kleiner Rechner (ohne Bildschirm, z. B. im Regal neben dem Router) betreibt dauerhaft
das **Agent Board** (Docker) und eine **Claude-Code-Sitzung**, die Issues abarbeitet.
Nach Stromausfall oder Neustart startet alles von selbst. Bedient wird per SSH vom Mac und per
**Remote Control** in der Claude-App am Handy.

> Alle Befehle mit `mac$` laufen auf dem Mac, alle mit `pc$` auf dem Mini-PC (per SSH).
> Ungetestet auf echter Hardware – bei Abweichungen `claude --help` bzw. die Fehlermeldung prüfen.

---

## 1. Betriebssystem installieren

| Gerät | System | Hinweis |
|---|---|---|
| Mini-PC (x86) | **Ubuntu Server 24.04 LTS** | Bei der Installation „OpenSSH server“ ankreuzen, Rechnername `agentboard` |
| Raspberry Pi 5 | **Raspberry Pi OS Lite (64-bit)** mit dem Raspberry Pi Imager | Im Imager: Hostname `agentboard`, SSH aktivieren, Benutzer anlegen. Besser von **SSD/USB** booten als von SD-Karte (hält länger). Offizielles 27-W-Netzteil. |

Netzwerkkabel statt WLAN, wenn möglich.

## 2. Nach Stromausfall automatisch einschalten

- **Mini-PC:** Im BIOS/UEFI (beim Start meist `Entf` oder `F2`) die Einstellung
  **„Restore on AC Power Loss“ / „After Power Failure“ → „Power On“** setzen.
- **Raspberry Pi:** startet von selbst, sobald Strom da ist – nichts zu tun.

## 3. Feste Adresse in der FRITZ!Box

FRITZ!Box-Oberfläche → **Heimnetz → Netzwerk → Gerät `agentboard` bearbeiten →
„Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen“**.
Danach ist der Rechner auch als **`agentboard.fritz.box`** erreichbar.

## 4. SSH vom Mac einrichten

```bash
mac$ ssh-copy-id <benutzer>@agentboard.fritz.box     # einmal Passwort, danach per Schlüssel
mac$ ssh <benutzer>@agentboard.fritz.box
```

Optional härten (erst wenn der Schlüssel-Login klappt):
```bash
pc$ sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
pc$ sudo systemctl restart ssh
```

## 5. Ruhezustand abschalten und Grundpakete

```bash
pc$ sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
pc$ sudo apt update && sudo apt -y upgrade
pc$ sudo apt -y install git tmux curl ca-certificates
pc$ sudo apt -y install unattended-upgrades       # Sicherheitsupdates automatisch
```

## 6. Docker installieren (startet bei jedem Booten)

```bash
pc$ curl -fsSL https://get.docker.com | sudo sh
pc$ sudo usermod -aG docker "$USER"
pc$ sudo systemctl enable docker
pc$ exit                                            # neu anmelden, damit die Gruppe gilt
mac$ ssh <benutzer>@agentboard.fritz.box
pc$ docker run --rm hello-world
```

## 7. Node.js 22 (für Watcher und MCP-Server)

```bash
pc$ curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
pc$ sudo apt -y install nodejs
pc$ node -v                                          # v22.x
```

## 8. Agent Board übertragen und starten

Entweder per GitHub (`git clone …`) oder direkt vom Mac kopieren:
```bash
mac$ rsync -av --exclude node_modules --exclude data --exclude .env \
       ~/Desktop/agent-board/ <benutzer>@agentboard.fritz.box:~/agent-board/
```

Auf dem PC:
```bash
pc$ cd ~/agent-board && npm ci
pc$ cat > .env <<EOF
AB_API_KEY=$(openssl rand -hex 16)
AB_BIND=0.0.0.0
AB_PUBLIC_URL=http://agentboard.fritz.box:4317
EOF
pc$ chmod 600 .env
pc$ docker compose up -d --build
pc$ curl -s http://127.0.0.1:4317/health             # {"ok":true,…}
```

`restart: unless-stopped` in der `docker-compose.yml` sorgt dafür, dass das Board nach jedem
Neustart von selbst wieder läuft.

**Admin-Schlüssel** (für dich im Browser) anzeigen, in den Passwortmanager übernehmen:
```bash
pc$ grep AB_API_KEY .env
```
Board am Handy/Mac: `http://agentboard.fritz.box:4317/?token=<admin-schlüssel>` (einmal öffnen, danach gespeichert).

## 9. Schlüssel für Claude (Rolle agent, nur Provider claude)

```bash
pc$ docker compose exec agent-board node --import tsx src/cli/key.ts create \
      --name claude-agentboard --role agent --providers claude
# Ausgabe ab_… kopieren – wird nur einmal angezeigt
pc$ mkdir -p ~/.config/agent-board
pc$ printf 'AB_AGENT_KEY=%s\nAB_URL=http://127.0.0.1:4317\n' 'ab_…HIER_EINFÜGEN…' > ~/.config/agent-board/agent.env
pc$ chmod 600 ~/.config/agent-board/agent.env
```
Damit die Claude-Sitzung den admin-Schlüssel nicht sieht, sollte er nach dem Notieren aus `.env`
**nicht** im Klartext für Claude lesbar sein: `.env` gehört dem Nutzer und hat Rechte 600 – Claude
läuft als derselbe Nutzer und *könnte* sie lesen. Für strikte Trennung den admin-Schlüssel nach dem
Start aus `.env` entfernen und stattdessen per `AB_KEYS`/`data/keys.json` nur gehasht ablegen
(siehe README „Sicherheit & Schlüssel“).

## 10. Claude Code installieren und anmelden

```bash
pc$ curl -fsSL https://claude.ai/install.sh | bash   # offizieller Installer, legt ~/.local/bin/claude an
pc$ echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && . ~/.bashrc
pc$ cd ~/agent-board && claude
```
- Beim ersten Start **`/login`**: Claude zeigt einen Link – am Mac/Handy öffnen, anmelden, Code einfügen.
- MCP-Server **`agent-board`** aus `.mcp.json` freigeben (Abfrage beim Start oder `/mcp`).
- Einmal testen: „Ruf board_rules und inbox auf.“ – danach mit `/exit` beenden.

**Berechtigungen für den unbeaufsichtigten Betrieb** – damit die Sitzung nicht bei jedem
Werkzeug nachfragt, in `~/agent-board/.claude/settings.local.json` (wird nicht committet):
```json
{
  "permissions": {
    "allow": [
      "mcp__agent-board__*",
      "Bash(npm run --silent watch*)",
      "Bash(npm run watch*)",
      "Agent"
    ]
  },
  "enabledMcpjsonServers": ["agent-board"]
}
```
Bewusst **kein** `--dangerously-skip-permissions`: Alles andere fragt die Sitzung weiterhin nach –
diese Rückfragen siehst und beantwortest du per Remote Control am Handy.

## 11. Claude-Sitzung automatisch starten (systemd + tmux)

```bash
pc$ chmod +x ~/agent-board/deploy/start-claude.sh ~/agent-board/deploy/backup.sh
pc$ mkdir -p ~/.config/systemd/user
pc$ cp ~/agent-board/deploy/agent-board-claude.service ~/.config/systemd/user/
pc$ systemctl --user daemon-reload
pc$ systemctl --user enable --now agent-board-claude.service
pc$ sudo loginctl enable-linger "$USER"             # Dienst startet beim Booten, auch ohne Anmeldung
pc$ tmux ls                                          # board: 1 windows …
```

`start-claude.sh` wartet, bis das Board antwortet, und startet dann in der tmux-Sitzung `board`:
`claude --remote-control "Sitzungsstart: … inbox prüfen, Watcher starten, Issues per Subagenten abarbeiten."`

- **Am Mac hineinschauen:** `ssh -t <benutzer>@agentboard.fritz.box tmux attach -t board`
  (verlassen ohne zu beenden: `Strg+b`, dann `d`).
- **Am Handy:** Claude-App → Code → die Remote-Control-Sitzung „agent-board“ öffnen.

## 12. Neustart-Test

```bash
pc$ sudo reboot
# 1–2 Minuten warten
mac$ ssh <benutzer>@agentboard.fritz.box 'docker ps; tmux ls; curl -s http://127.0.0.1:4317/health'
```
Erwartet: Container `agent-board` „healthy“, tmux-Sitzung `board`, Health `{"ok":true}`.
Dann im Board ein Test-Issue anlegen (z. B. Haiku: „Welcher Tag ist heute?“) – es sollte
innerhalb weniger Sekunden beantwortet werden.

## 13. Backup (täglich)

```bash
pc$ (crontab -l 2>/dev/null; echo "15 3 * * * $HOME/agent-board/deploy/backup.sh") | crontab -
```
Legt unter `~/backups/agent-board/` täglich eine `.tar.gz` an und behält 14 Stück.
Ideal zusätzlich auf NAS/USB-Stick kopieren.

## 14. Aktualisieren

```bash
mac$ rsync -av --exclude node_modules --exclude data --exclude .env \
       ~/Desktop/agent-board/ <benutzer>@agentboard.fritz.box:~/agent-board/
pc$ cd ~/agent-board && npm ci && docker compose up -d --build
pc$ systemctl --user restart agent-board-claude.service
```
Claude Code aktualisiert sich selbst.

---

## Was passiert wann?

| Ereignis | Board | Claude-Sitzung |
|---|---|---|
| Stromausfall → Strom wieder da | PC bootet (BIOS-Einstellung), Docker startet Container | systemd startet tmux + Claude, Watcher läuft wieder |
| `sudo reboot` | wie oben | wie oben |
| Claude-Prozess stürzt ab | läuft weiter | `systemctl --user restart agent-board-claude` (oder per SSH `deploy/start-claude.sh`) |
| Watcher läuft nach 2 h ohne Neues ab | – | Claude startet ihn laut CLAUDE.md neu |
| Internet weg | Board im Heimnetz läuft weiter | Claude kann nicht antworten; Issues warten, bis das Netz zurück ist |

**Stromverbrauch:** Raspberry Pi 5 ca. 3–6 W, Mini-PC ca. 6–15 W (≈ 10–40 € im Jahr).
Eine kleine USV ist optional – Board-Daten werden atomar geschrieben, ein harter Stromausfall
beschädigt sie normalerweise nicht.
