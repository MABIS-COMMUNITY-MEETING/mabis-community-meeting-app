// Serves the interactive terminal client:
//   curl -o mabis "<app-url>/api/functions/cliScript" && chmod +x mabis && ./mabis
import { secrets } from 'base44:runtime';

const SCRIPT = `#!/usr/bin/env python3
"""MABIS Community Meeting — interactive terminal client."""
import json, os, sys, urllib.request, urllib.error

BASE = os.environ.get("MABIS_URL", "").rstrip("/")
KEY = os.environ.get("MABIS_KEY", "")

C = {"h": "\\033[1;35m", "d": "\\033[2m", "g": "\\033[32m", "r": "\\033[31m",
     "y": "\\033[33m", "b": "\\033[1m", "x": "\\033[0m"}

def ask(p, default=""):
    try:
        v = input(p).strip()
    except (EOFError, KeyboardInterrupt):
        print()
        sys.exit(0)
    return v or default

def api(action, **kw):
    payload = {"key": KEY, "action": action}
    payload.update(kw)
    req = urllib.request.Request(BASE + "/api/functions/cliApi",
                                 data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(C["r"] + "error " + str(e.code) + ": " + body + C["x"])
        return {}
    except Exception as e:
        print(C["r"] + "connection error: " + str(e) + C["x"])
        return {}

def header(title):
    os.system("clear")
    print(C["h"] + "═" * 62 + C["x"])
    print(C["h"] + "  MABIS  ·  " + title + C["x"])
    print(C["h"] + "═" * 62 + C["x"] + "\\n")

def pause():
    ask("\\n" + C["d"] + "[enter] back" + C["x"] + " ")

def show_board():
    header("BOARD")
    res = api("board")
    print(res.get("text", ""))
    pause()

def pick(items, label):
    if not items:
        print(C["d"] + "  (none)" + C["x"])
        return None
    for i, it in enumerate(items, 1):
        print("  " + C["b"] + str(i).rjust(2) + C["x"] + "  " + label(it))
    c = ask("\\n  number (blank = cancel): ")
    if not c.isdigit() or not (1 <= int(c) <= len(items)):
        return None
    return items[int(c) - 1]

def manage(entity, title, label, fields, sort="-created_date"):
    while True:
        header(title)
        items = api("list", entity=entity, sort=sort).get("items", [])
        for i, it in enumerate(items, 1):
            print("  " + C["b"] + str(i).rjust(2) + C["x"] + "  " + label(it))
        if not items:
            print(C["d"] + "  (none yet)" + C["x"])
        print("\\n  " + C["g"] + "a" + C["x"] + " add   "
              + C["y"] + "e" + C["x"] + " edit   "
              + C["r"] + "d" + C["x"] + " delete   "
              + C["d"] + "b back" + C["x"])
        c = ask("\\n  > ").lower()
        if c in ("b", "q", ""):
            return
        if c == "a":
            data = {}
            for f, prompt in fields:
                v = ask("  " + prompt + ": ")
                if v:
                    data[f] = v
            if data:
                api("create", entity=entity, data=data)
        elif c == "e":
            it = pick(items, label)
            if it:
                data = {}
                for f, prompt in fields:
                    cur = str(it.get(f, "") or "")
                    v = ask("  " + prompt + " [" + cur + "]: ")
                    if v:
                        data[f] = v
                if data:
                    api("update", entity=entity, id=it["id"], data=data)
        elif c == "d":
            it = pick(items, label)
            if it and ask("  delete? (y/N): ").lower() == "y":
                api("delete", entity=entity, id=it["id"])

def topics():
    while True:
        header("DISCUSSION TOPICS")
        items = [t for t in api("list", entity="DiscussionTopic").get("items", []) if not t.get("archived")]
        for i, t in enumerate(items, 1):
            mark = C["g"] + "[x]" + C["x"] if t.get("completed") else "[ ]"
            print("  " + C["b"] + str(i).rjust(2) + C["x"] + "  " + mark + " " + str(t.get("title"))
                  + C["d"] + "  — " + str(t.get("submitted_by", "?")) + C["x"])
        if not items:
            print(C["d"] + "  (none yet)" + C["x"])
        print("\\n  " + C["g"] + "a" + C["x"] + " add   "
              + C["y"] + "t" + C["x"] + " toggle done   "
              + C["r"] + "d" + C["x"] + " delete   "
              + C["d"] + "b back" + C["x"])
        c = ask("\\n  > ").lower()
        if c in ("b", "q", ""):
            return
        if c == "a":
            title = ask("  title: ")
            if not title:
                continue
            api("create", entity="DiscussionTopic", data={
                "title": title,
                "description": ask("  description: "),
                "submitted_by": ask("  your name: ", "CLI")})
        elif c == "t":
            t = pick(items, lambda x: str(x.get("title")))
            if t:
                api("update", entity="DiscussionTopic", id=t["id"],
                    data={"completed": not t.get("completed")})
        elif c == "d":
            t = pick(items, lambda x: str(x.get("title")))
            if t and ask("  delete? (y/N): ").lower() == "y":
                api("delete", entity="DiscussionTopic", id=t["id"])

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

def jobs():
    while True:
        header("JOBS")
        items = api("list", entity="JobAssignment").get("items", [])
        weeks = sorted({j.get("week_label", "") for j in items}, reverse=True)[:1]
        items = [j for j in items if j.get("week_label") in weeks]
        for i, j in enumerate(items, 1):
            done = ",".join(d[:3] for d in (j.get("days_completed") or [])) or "-"
            miss = ",".join(d[:3] for d in (j.get("not_done_days") or [])) or "-"
            print("  " + C["b"] + str(i).rjust(2) + C["x"] + "  " + str(j.get("job_title", "")).ljust(26)
                  + str(j.get("assigned_to_name", "?")).ljust(16)
                  + C["g"] + " done:" + done + C["x"] + C["r"] + "  missed:" + miss + C["x"])
        if not items:
            print(C["d"] + "  (no assignments this week)" + C["x"])
        print("\\n  " + C["g"] + "m" + C["x"] + " mark a day   "
              + C["r"] + "d" + C["x"] + " delete   "
              + C["d"] + "b back" + C["x"])
        c = ask("\\n  > ").lower()
        if c in ("b", "q", ""):
            return
        if c == "m":
            j = pick(items, lambda x: str(x.get("job_title")) + " — " + str(x.get("assigned_to_name")))
            if not j:
                continue
            for i, d in enumerate(DAYS, 1):
                print("   " + str(i) + " " + d)
            di = ask("  day number: ")
            if not di.isdigit() or not (1 <= int(di) <= 5):
                continue
            day = DAYS[int(di) - 1]
            st = ask("  (y)done / (n)not done / (c)clear: ").lower()
            done = [d for d in (j.get("days_completed") or []) if d != day]
            miss = [d for d in (j.get("not_done_days") or []) if d != day]
            if st == "y":
                done.append(day)
            elif st == "n":
                miss.append(day)
            api("update", entity="JobAssignment", id=j["id"],
                data={"days_completed": done, "not_done_days": miss,
                      "not_done": len(miss) > 0})
        elif c == "d":
            j = pick(items, lambda x: str(x.get("job_title")))
            if j and ask("  delete? (y/N): ").lower() == "y":
                api("delete", entity="JobAssignment", id=j["id"])

def main():
    global BASE, KEY
    if not BASE:
        BASE = ask("App URL (e.g. https://myapp.base44.app): ").rstrip("/")
    if not KEY:
        KEY = ask("Access key: ")
    while True:
        header("COMMUNITY MEETING")
        print("  " + C["b"] + "1" + C["x"] + "  Board (full read-only view)")
        print("  " + C["b"] + "2" + C["x"] + "  Announcements")
        print("  " + C["b"] + "3" + C["x"] + "  News")
        print("  " + C["b"] + "4" + C["x"] + "  Discussion topics")
        print("  " + C["b"] + "5" + C["x"] + "  Jobs")
        print("  " + C["b"] + "6" + C["x"] + "  Calendar events")
        print("  " + C["b"] + "7" + C["x"] + "  Members")
        print("  " + C["b"] + "8" + C["x"] + "  Lost & found")
        print("\\n  " + C["d"] + "q  quit" + C["x"])
        c = ask("\\n  > ").lower()
        if c == "q":
            print()
            return
        elif c == "1":
            show_board()
        elif c == "2":
            manage("Announcement", "ANNOUNCEMENTS",
                   lambda a: ("[PIN] " if a.get("pinned") else "") + str(a.get("title"))
                             + C["d"] + "  — " + str(a.get("author_name", "?")) + C["x"],
                   [("title", "title"), ("body", "body"), ("author_name", "author")])
        elif c == "3":
            manage("NewsItem", "NEWS",
                   lambda n: str(n.get("title")) + C["d"] + "  — " + str(n.get("author_name", "?")) + C["x"],
                   [("title", "title"), ("body", "body"), ("author_name", "author")])
        elif c == "4":
            topics()
        elif c == "5":
            jobs()
        elif c == "6":
            manage("CalendarEvent", "CALENDAR",
                   lambda e: str(e.get("date")) + "  " + str(e.get("title"))
                             + C["d"] + "  [" + str(e.get("type", "event")) + "]" + C["x"],
                   [("title", "title"), ("date", "date YYYY-MM-DD"), ("time", "time HH:mm"),
                    ("type", "type (event/holiday/meeting/birthday/other)"),
                    ("description", "description")], sort="date")
        elif c == "7":
            manage("Member", "MEMBERS",
                   lambda m: str(m.get("name")).ljust(22)
                             + C["d"] + str(m.get("role", "student")) + "  " + str(m.get("email", "")) + C["x"],
                   [("name", "name"), ("email", "email"),
                    ("role", "role (student/teacher/chair/minutes/admin/editor)")], sort="name")
        elif c == "8":
            manage("MissingItem", "LOST & FOUND",
                   lambda i: str(i.get("item_name")) + C["d"] + "  " + str(i.get("colors", ""))
                             + " — " + str(i.get("reported_by_name", "?")) + C["x"],
                   [("item_name", "item"), ("colors", "colours"), ("last_seen", "last seen"),
                    ("date_lost", "date lost YYYY-MM-DD"), ("reported_by_name", "your name")])

if __name__ == "__main__":
    main()
`;

export default async function (req: Request): Promise<Response> {
  try {
    // the script itself is not secret — it asks for the key at runtime
    void secrets;
    return new Response(SCRIPT, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename=mabis',
      },
    });
  } catch (error) {
    return new Response('error: ' + error.message + '\n', {
      status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}