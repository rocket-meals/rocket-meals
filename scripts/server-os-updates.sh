#!/usr/bin/env bash
#
# Prüft die Betriebssystem-Updates (apt) eines Backend-Servers und spielt sie
# auf Wunsch ein. Läuft als root auf dem Server. Der Workflow
# .github/workflows/server-os-updates.yml schickt das Skript per SSH über stdin,
# es muss also nicht im Repository auf dem Server liegen:
#
#   ssh deploy@host "sudo bash -s -- check" < scripts/server-os-updates.sh
#   ssh deploy@host "sudo bash -s -- apply" < scripts/server-os-updates.sh
#
# Modi:
#   check   Paketlisten aktualisieren und anstehende Updates nur auflisten
#   apply   Updates einspielen (apt-get upgrade --with-new-pkgs, entfernt keine
#           Pakete), danach alte Pakete aufräumen und gestoppte Container
#           wieder starten
#
# Zweites Argument: Verzeichnis des Repositorys (Standard /root/rocket-meals).
# Die Container haben keine Restart-Policy. Startet ein Docker-Update den
# Daemon neu, bleiben sie gestoppt, deshalb startet "apply" sie wieder.
#
# Ausgabe für den Workflow:
#   Zwischen ROCKET_MEALS_SUMMARY_BEGIN und ROCKET_MEALS_SUMMARY_END steht
#   Markdown für die Zusammenfassung des Laufs.
#   ROCKET_MEALS_REBOOT_REQUIRED     Der Server braucht einen Neustart.
#   ROCKET_MEALS_SECURITY_UPDATES=n  Anzahl anstehender Sicherheitsupdates.
#   ROCKET_MEALS_OS_UNSUPPORTED      Die Distribution bekommt keine
#                                    Sicherheitsupdates mehr.

set -euo pipefail

MODE="${1:-check}"
REPO_DIR="${2:-/root/rocket-meals}"

if [[ "$MODE" != "check" && "$MODE" != "apply" ]]; then
  echo "Fehler: Modus muss 'check' oder 'apply' sein, nicht '$MODE'" >&2
  exit 1
fi
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Fehler: Das Skript muss als root laufen" >&2
  exit 1
fi
if ! command -v apt-get >/dev/null 2>&1; then
  echo "Fehler: apt-get nicht gefunden, nur Debian und Ubuntu werden unterstützt" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
# needrestart (Ubuntu) fragt sonst interaktiv, welche Dienste neu starten sollen.
export NEEDRESTART_MODE=a
APT_OPTS=(-o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold -o DPkg::Lock::Timeout=300)

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

# Zeilen "Inst paket [alt] (neu herkunft [arch])" aus einer Simulation als
# "paket|alt|neu|herkunft".
parse_inst_lines() {
  sed -nE 's/^Inst ([^ ]+) (\[([^]]*)\] )?\(([^ ]+) (.*) \[[^]]*\]\).*/\1|\3|\4|\5/p'
}

simulate() {
  apt-get -s "${APT_OPTS[@]}" "$@" 2>/dev/null | parse_inst_lines
}

compose() {
  (cd "$REPO_DIR" && docker compose "$@")
}

running_services() {
  if [[ -f "$REPO_DIR/docker-compose.yaml" ]] && command -v docker >/dev/null 2>&1; then
    compose ps --status running --services 2>/dev/null | sort || true
  fi
}

# --- Systeminformationen ---
# shellcheck disable=SC1091
. /etc/os-release
OS_NAME="${PRETTY_NAME:-unbekannt}"
OS_ID="${ID:-}"
OS_VERSION_MAJOR="${VERSION_ID%%.*}"
KERNEL="$(uname -r)"
UPTIME="$(uptime -p 2>/dev/null || true)"
ROOT_DISK="$(df -h / | awk 'NR==2 {print $4 " frei von " $2 " (" $5 " belegt)"}')"

# Debian 11 (bullseye) bekommt seit dem Ende von LTS am 31.08.2026 keine
# Sicherheitsupdates mehr. Debian 12 ist im LTS bis 30.06.2028.
OS_UNSUPPORTED=false
if [[ "$OS_ID" == "debian" && -n "$OS_VERSION_MAJOR" && "$OS_VERSION_MAJOR" -le 11 ]]; then
  OS_UNSUPPORTED=true
fi

log "Aktualisiere Paketlisten (apt-get update)"
apt-get update -qq "${APT_OPTS[@]}"

UPGRADES="$(simulate upgrade --with-new-pkgs)"
FULL_UPGRADES="$(simulate dist-upgrade)"
# Pakete, die nur ein dist-upgrade mitnehmen würde, weil dafür andere Pakete
# entfernt werden müssten. Die spielt dieses Skript bewusst nicht ein.
KEPT_BACK="$(comm -13 <(cut -d'|' -f1 <<<"$UPGRADES" | sort -u) <(cut -d'|' -f1 <<<"$FULL_UPGRADES" | sort -u) | sed '/^$/d' || true)"

count_lines() {
  if [[ -z "$1" ]]; then echo 0; else wc -l <<<"$1" | tr -d ' '; fi
}
UPGRADE_COUNT="$(count_lines "$UPGRADES")"
SECURITY_COUNT="$(count_lines "$(grep -i 'security' <<<"$UPGRADES" || true)")"
KEPT_BACK_COUNT="$(count_lines "$KEPT_BACK")"
DOCKER_IN_UPGRADES="$(cut -d'|' -f1 <<<"$UPGRADES" | grep -E '^(docker-ce|docker-ce-cli|containerd\.io|docker-compose-plugin|docker-buildx-plugin)$' || true)"

package_table() {
  echo "| Paket | Installiert | Neu | Herkunft |"
  echo "|---|---|---|---|"
  while IFS='|' read -r name old new origin; do
    [[ -z "$name" ]] && continue
    local mark=""
    if grep -qi 'security' <<<"$origin"; then mark="🔒 "; fi
    echo "| ${mark}\`$name\` | ${old:-neu} | $new | $origin |"
  done <<<"$1"
}

reboot_required() {
  [[ -f /var/run/reboot-required ]]
}

# --- Updates einspielen ---
APPLY_RESULT=""
if [[ "$MODE" == "apply" ]]; then
  if (( UPGRADE_COUNT == 0 )); then
    log "Keine Updates anstehend"
    APPLY_RESULT="Keine Updates anstehend, nichts eingespielt."
  else
    SERVICES_BEFORE="$(running_services)"
    log "Spiele $UPGRADE_COUNT Updates ein (apt-get upgrade --with-new-pkgs)"
    apt-get -y "${APT_OPTS[@]}" upgrade --with-new-pkgs
    log "Entferne nicht mehr benötigte Pakete (apt-get autoremove)"
    apt-get -y "${APT_OPTS[@]}" autoremove
    apt-get clean
    APPLY_RESULT="✅ $UPGRADE_COUNT Pakete aktualisiert."

    # Ein Docker-Update startet den Daemon neu. Ohne Restart-Policy bleiben die
    # Container danach gestoppt.
    SERVICES_AFTER="$(running_services)"
    MISSING="$(comm -23 <(echo "$SERVICES_BEFORE") <(echo "$SERVICES_AFTER") | sed '/^$/d' || true)"
    if [[ -n "$MISSING" ]]; then
      log "Container laufen nicht mehr: $(tr '\n' ' ' <<<"$MISSING")"
      log "Starte Container wieder (docker compose up -d)"
      compose up -d
      APPLY_RESULT="$APPLY_RESULT Gestoppte Container wurden wieder gestartet: $(tr '\n' ' ' <<<"$MISSING")"
    fi
  fi
fi

# --- Zusammenfassung ---
REBOOT_TEXT="nein"
if reboot_required; then
  REBOOT_TEXT="⚠️ ja"
  if [[ -f /var/run/reboot-required.pkgs ]]; then
    REBOOT_TEXT="$REBOOT_TEXT ($(sort -u /var/run/reboot-required.pkgs | tr '\n' ' ' | sed 's/ $//'))"
  fi
fi

OS_TEXT="$OS_NAME"
if [[ "$OS_UNSUPPORTED" == "true" ]]; then
  OS_TEXT="$OS_TEXT ⚠️ bekommt keine Sicherheitsupdates mehr, Upgrade der Distribution nötig"
fi

echo "ROCKET_MEALS_SUMMARY_BEGIN"
echo "| | |"
echo "|---|---|"
echo "| Betriebssystem | $OS_TEXT |"
echo "| Kernel | \`$KERNEL\` |"
echo "| Laufzeit | $UPTIME |"
echo "| Festplatte / | $ROOT_DISK |"
if [[ "$MODE" == "check" ]]; then
  echo "| Anstehende Updates | $UPGRADE_COUNT (davon 🔒 $SECURITY_COUNT Sicherheitsupdates) |"
else
  echo "| Ergebnis | $APPLY_RESULT |"
fi
echo "| Zurückgehalten | $KEPT_BACK_COUNT |"
echo "| Neustart nötig | $REBOOT_TEXT |"
echo
if [[ "$MODE" == "check" && -n "$DOCKER_IN_UPGRADES" ]]; then
  echo "> ⚠️ Docker wird aktualisiert ($(tr '\n' ' ' <<<"$DOCKER_IN_UPGRADES" | sed 's/ $//')). Der Daemon startet dabei neu, das Backend ist kurz nicht erreichbar. Die Container werden danach automatisch wieder gestartet."
  echo
fi
if [[ "$MODE" == "check" && "$UPGRADE_COUNT" -gt 0 ]]; then
  echo "<details><summary>Anstehende Updates ($UPGRADE_COUNT)</summary>"
  echo
  package_table "$UPGRADES"
  echo
  echo "</details>"
  echo
fi
if (( KEPT_BACK_COUNT > 0 )); then
  echo "<details><summary>Zurückgehalten ($KEPT_BACK_COUNT), brauchen \`apt-get dist-upgrade\` von Hand</summary>"
  echo
  sed 's/^/- `/; s/$/`/' <<<"$KEPT_BACK"
  echo
  echo "</details>"
fi
echo "ROCKET_MEALS_SUMMARY_END"

echo "ROCKET_MEALS_SECURITY_UPDATES=$([[ "$MODE" == "check" ]] && echo "$SECURITY_COUNT" || echo 0)"
if reboot_required; then
  echo "ROCKET_MEALS_REBOOT_REQUIRED"
fi
if [[ "$OS_UNSUPPORTED" == "true" ]]; then
  echo "ROCKET_MEALS_OS_UNSUPPORTED"
fi
