// Serves the interactive terminal client (pure bash + curl, no install):
//   bash -c "$(curl -fsSL <app-url>/api/functions/cliScript)"
// or save it:  curl -fsSL <app-url>/api/functions/cliScript -o mabis && chmod +x mabis
import { secrets } from 'base44:runtime';

// Written with @{...} where bash needs ${...}, so this file's own template
// literal never tries to interpolate the shell's variables.
const RAW = String.raw`#!/usr/bin/env bash
# MABIS Community Meeting — interactive terminal client.
set -uo pipefail

BASE="@{MABIS_URL:-https://mabis-community-meeting.base44.app}"
BASE="@{BASE%/}"
KEY="@{MABIS_KEY:-}"
EMAIL="@{MABIS_EMAIL:-}"
DOMAIN="@montessoribkk.com"

H=$'\e[1;35m'; D=$'\e[2m'; G=$'\e[32m'; R=$'\e[31m'; Y=$'\e[33m'; B=$'\e[1m'; X=$'\e[0m'

# read from the terminal, so running straight from curl still accepts input
if [ -t 0 ]; then TTY=/dev/stdin; else TTY=/dev/tty; fi
ask() { local __v; printf '%s' "$1" >&2; IFS= read -r __v <"$TTY" || { echo; exit 0; }; printf '%s' "$__v"; }

command -v curl >/dev/null 2>&1 || { echo "curl is required"; exit 1; }

# minimal JSON string escaper
esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e ':a;N;$!ba;s/\n/\\n/g'; }

# api <action> <entity> <extra-json-fields...>
api() {
  local action="$1"; shift
  local entity="@{1:-}"; shift || true
  local extra="$*"
  local payload="{\"key\":\"$(esc "$KEY")\",\"email\":\"$(esc "$EMAIL")\",\"format\":\"text\",\"action\":\"$(esc "$action")\""
  [ -n "$entity" ] && payload="$payload,\"entity\":\"$(esc "$entity")\""
  [ -n "$extra" ] && payload="$payload,$extra"
  payload="$payload}"
  curl -sS --max-time 30 -X POST "$BASE/api/functions/cliApi" \
    -H 'Content-Type: application/json' -d "$payload" 2>/dev/null \
    || echo "ERR: could not reach $BASE"
}

check() { case "$1" in ERR:*) echo "@{R}$1@{X}"; sleep 2 ;; esac; }

line62() { printf '═%.0s' $(seq 62); echo; }
header() { clear; printf '%s' "$H"; line62; echo "  MABIS  ·  $1"; line62; printf '%s' "$X"; echo; }
pause() { ask $'\n'"@{D}[enter] back@{X} " >/dev/null; }

IDS=(); LABELS=()
load() { # load <entity> [sort]
  IDS=(); LABELS=()
  local out line id label
  out="$(api list "$1" "\"sort\":\"@{2:--created_date}\"")"
  case "$out" in ERR:*) echo "@{R}$out@{X}"; return 1 ;; esac
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    id="@{line%%$'\t'*}"; label="@{line#*$'\t'}"
    IDS+=("$id"); LABELS+=("$label")
  done <<<"$out"
  return 0
}

show_list() {
  local i
  if [ "@{#IDS[@]}" -eq 0 ]; then echo "@{D}  (none yet)@{X}"; return; fi
  for i in "@{!IDS[@]}"; do printf '  %s%2d%s  %s\n' "$B" "$((i+1))" "$X" "@{LABELS[$i]}"; done
}

pick() { # echoes an id, or empty
  local c; c="$(ask $'\n'"  number (blank = cancel): ")"
  case "$c" in ''|*[!0-9]*) printf ''; return ;; esac
  if [ "$c" -ge 1 ] && [ "$c" -le "@{#IDS[@]}" ]; then printf '%s' "@{IDS[$((c-1))]}"; fi
}

confirm() { local yn; yn="$(ask "  delete? (y/N): ")"; [ "$yn" = y ] || [ "$yn" = Y ]; }

show_board() { header "BOARD"; api board; pause; }

# manage <entity> <title> <sort> <field:prompt> ...
manage() {
  local entity="$1" title="$2" sort="$3"; shift 3
  local fields=("$@")
  while true; do
    header "$title"
    load "$entity" "$sort" || { pause; return; }
    show_list
    echo
    echo "  @{G}a@{X} add   @{Y}e@{X} edit   @{R}d@{X} delete   @{D}b back@{X}"
    local c; c="$(ask $'\n'"  > ")"
    case "$c" in
      b|q|'') return ;;
      a|e)
        local id=""
        if [ "$c" = e ]; then id="$(pick)"; [ -z "$id" ] && continue; fi
        local data="" f prompt v
        for f in "@{fields[@]}"; do
          prompt="@{f#*:}"; f="@{f%%:*}"
          v="$(ask "  $prompt: ")"
          [ -z "$v" ] && continue
          [ -n "$data" ] && data="$data,"
          data="$data\"$(esc "$f")\":\"$(esc "$v")\""
        done
        [ -z "$data" ] && continue
        if [ "$c" = a ]; then
          check "$(api create "$entity" "\"data\":{$data}")"
        else
          check "$(api update "$entity" "\"id\":\"$id\",\"data\":{$data}")"
        fi ;;
      d)
        local id; id="$(pick)"; [ -z "$id" ] && continue
        if confirm; then check "$(api delete "$entity" "\"id\":\"$id\"")"; fi ;;
    esac
  done
}

topics() {
  while true; do
    header "DISCUSSION TOPICS"
    load DiscussionTopic || { pause; return; }
    show_list
    echo
    echo "  @{G}a@{X} add   @{Y}t@{X} toggle done   @{R}d@{X} delete   @{D}b back@{X}"
    local c; c="$(ask $'\n'"  > ")"
    case "$c" in
      b|q|'') return ;;
      a)
        local t desc who
        t="$(ask "  title: ")"; [ -z "$t" ] && continue
        desc="$(ask "  description: ")"; who="$(ask "  your name: ")"
        check "$(api create DiscussionTopic "\"data\":{\"title\":\"$(esc "$t")\",\"description\":\"$(esc "$desc")\",\"submitted_by\":\"$(esc "@{who:-CLI}")\"}")" ;;
      t)
        local id; id="$(pick)"; [ -z "$id" ] && continue
        check "$(api update DiscussionTopic "\"id\":\"$id\",\"toggle\":\"completed\"")" ;;
      d)
        local id; id="$(pick)"; [ -z "$id" ] && continue
        if confirm; then check "$(api delete DiscussionTopic "\"id\":\"$id\"")"; fi ;;
    esac
  done
}

DAYS=(Monday Tuesday Wednesday Thursday Friday)

jobs() {
  while true; do
    header "JOBS — THIS WEEK"
    load JobAssignment || { pause; return; }
    show_list
    echo
    echo "  @{G}m@{X} mark a day   @{R}d@{X} delete   @{D}b back@{X}"
    local c; c="$(ask $'\n'"  > ")"
    case "$c" in
      b|q|'') return ;;
      m)
        local id; id="$(pick)"; [ -z "$id" ] && continue
        local i; for i in "@{!DAYS[@]}"; do echo "   $((i+1)) @{DAYS[$i]}"; done
        local di; di="$(ask "  day number: ")"
        case "$di" in ''|*[!0-9]*) continue ;; esac
        if [ "$di" -lt 1 ] || [ "$di" -gt 5 ]; then continue; fi
        local st; st="$(ask "  (y)done / (n)not done / (c)clear: ")"
        check "$(api update JobAssignment "\"id\":\"$id\",\"mark_day\":\"@{DAYS[$((di-1))]}\",\"mark_status\":\"$(esc "$st")\"")" ;;
      d)
        local id; id="$(pick)"; [ -z "$id" ] && continue
        if confirm; then check "$(api delete JobAssignment "\"id\":\"$id\"")"; fi ;;
    esac
  done
}

if [ -z "$KEY" ]; then KEY="$(ask "Access key: ")"; fi
while :; do
  case "$EMAIL" in
    *"$DOMAIN") break ;;
    *) if [ -n "$EMAIL" ]; then echo "@{R}  only $DOMAIN accounts can make changes@{X}"; fi
       EMAIL="$(ask "Sign in with your $DOMAIN account: ")" ;;
  esac
done

while true; do
  header "COMMUNITY MEETING"
  echo "  @{B}1@{X}  Board (full read-only view)"
  echo "  @{B}2@{X}  Announcements"
  echo "  @{B}3@{X}  News"
  echo "  @{B}4@{X}  Discussion topics"
  echo "  @{B}5@{X}  Jobs"
  echo "  @{B}6@{X}  Calendar events"
  echo "  @{B}7@{X}  Members"
  echo "  @{B}8@{X}  Lost & found"
  echo
  echo "  @{D}q  quit@{X}"
  c="$(ask $'\n'"  > ")"
  case "$c" in
    q|Q) echo; exit 0 ;;
    1) show_board ;;
    2) manage Announcement "ANNOUNCEMENTS" "-created_date" "title:title" "body:body" "author_name:author" ;;
    3) manage NewsItem "NEWS" "-created_date" "title:title" "body:body" "author_name:author" ;;
    4) topics ;;
    5) jobs ;;
    6) manage CalendarEvent "CALENDAR" "date" "title:title" "date:date YYYY-MM-DD" "time:time HH:mm" "type:type (event/holiday/meeting/birthday/other)" "description:description" ;;
    7) manage Member "MEMBERS" "name" "name:name" "email:email" "role:role (student/teacher/chair/minutes/admin/editor)" ;;
    8) manage MissingItem "LOST & FOUND" "-created_date" "item_name:item" "colors:colours" "last_seen:last seen" "date_lost:date lost YYYY-MM-DD" "reported_by_name:your name" ;;
  esac
done
`;

const SCRIPT = RAW.split('@{').join('$' + '{');

export default async function (req: Request): Promise<Response> {
  // the script itself is not secret — it asks for the key at runtime
  void secrets;
  return new Response(SCRIPT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'inline; filename=mabis.sh',
    },
  });
}