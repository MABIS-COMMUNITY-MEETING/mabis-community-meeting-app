from pathlib import Path


def replace_many(path, replacements):
    file_path = Path(path)
    text = file_path.read_text()
    missing = []
    for old, new in replacements:
        if old not in text:
            missing.append(old[:100])
        text = text.replace(old, new)
    if missing:
        raise RuntimeError(f"Missing replacements in {path}: {missing}")
    file_path.write_text(text)


replace_many("src/pages/Home.jsx", [
    ('''          <ScrollVelocity
            text="MABIS ／ KAIGI ／ COMMUNITY ／ FRIDAY ／ BANGKOK ／ "
            className="font-display font-light tracking-[-0.035em] text-foreground/16 text-[7vw] sm:text-[4.2vw]"
          />''', '''          <ScrollVelocity
            items={["MABIS", "COMMUNITY", "FRIDAY", "BANGKOK"]}
            className="font-display font-light tracking-[-0.035em] text-foreground/16 text-[7vw] sm:text-[4.2vw]"
          />'''),
    ('        <EditorialSection index="01" label="MEETING MODE" sublabel="KAIGI">', '        <EditorialSection index="01" label="MEETING MODE">'),
    ('        <EditorialSection index="02" label="ANNOUNCEMENTS" sublabel="OSHIRASE">', '        <EditorialSection index="02" label="ANNOUNCEMENTS">'),
    ('        <EditorialSection index="03" label="DISCUSSION" sublabel="GIRON">', '        <EditorialSection index="03" label="DISCUSSION">'),
    ('        <EditorialSection index="04" label="JOBS ／ ROTATION" sublabel="TOBAN">', '        <EditorialSection index="04" label="JOBS AND ROTATION">'),
    ('        <EditorialSection index="05" label="CALENDAR" sublabel="KOYOMI">', '        <EditorialSection index="05" label="CALENDAR">'),
    ('        <EditorialSection index="06" label="SCHEDULE" sublabel="YOTEI">', '        <EditorialSection index="06" label="SCHEDULE">'),
    ('        <EditorialSection index="07" label="LOST ／ FOUND" sublabel="OTOSHIMONO">', '        <EditorialSection index="07" label="LOST AND FOUND">'),
    ('        <EditorialSection index="08" label="LUNCH MENU" sublabel="HIRUGOHAN">', '        <EditorialSection index="08" label="LUNCH MENU">'),
    ('        <EditorialSection index="09" label="NEWS" sublabel="NYUSU">', '        <EditorialSection index="09" label="NEWS">'),
    ('        <EditorialSection index="10" label="MEMBERS" sublabel="MENBA">', '        <EditorialSection index="10" label="MEMBERS">'),
])

replace_many("src/components/home/HomeMasthead.jsx", [
    ('<span className="jp-kicker">KAIGI / COMMUNITY DASHBOARD</span>', '<span className="jp-kicker">COMMUNITY DASHBOARD</span>'),
    ('<span className="jp-roman shrink-0">SHUKAI / 01</span>', '<span className="tech-label shrink-0">01</span>'),
    ('<span className="jp-kicker">BANGKOK / TH</span>', '<span className="jp-kicker">BANGKOK TH</span>'),
    ('<p className="jp-kicker">SCROLL / READ DOWN</p>', '<p className="jp-kicker">SCROLL TO CONTINUE</p>'),
])

replace_many("src/components/home/EditorialSection.jsx", [
    ('export default function EditorialSection({ index = "00", label = "", sublabel = "", children }) {', 'export default function EditorialSection({ index = "00", label = "", children }) {'),
    ('        {sublabel && <span className="jp-roman vert-text mt-5">{sublabel}</span>}\n', ''),
    ('            {sublabel && <span className="jp-roman mt-1.5 block lg:hidden">{sublabel}</span>}\n', ''),
    ('<span className="hidden sm:block jp-kicker text-right">MABIS / SECTION</span>', '<span className="hidden sm:block jp-kicker text-right">MABIS SECTION</span>'),
])

replace_many("src/components/SiteHeader.jsx", [
    ('  { label: "Home", roman: "TOP", to: "/home", n: "01" },', '  { label: "Home", to: "/home", n: "01" },'),
    ('  { label: "Meeting History", roman: "KAIGI KIROKU", to: "/history", n: "02" },', '  { label: "Meeting History", to: "/history", n: "02" },'),
    ('  { label: "Announcements", roman: "OSHIRASE", to: "/history/announcements", n: "03" },', '  { label: "Announcements", to: "/history/announcements", n: "03" },'),
    ('  { label: "News", roman: "NYUSU", to: "/history/news", n: "04" },', '  { label: "News", to: "/history/news", n: "04" },'),
    ('  { label: "Feedback Inbox", roman: "IKEN", to: "/feedback", n: "05" },', '  { label: "Feedback Inbox", to: "/feedback", n: "05" },'),
    ('<span className="tech-label text-muted-foreground">COMMUNITY ／ MEETING</span>', '<span className="tech-label text-muted-foreground">COMMUNITY MEETING</span>'),
    ('<span className="tech-label text-bone/50">SELECTED ／ NAVIGATION</span>', '<span className="tech-label text-bone/50">SELECTED NAVIGATION</span>'),
    ('                        <span className="hidden md:block jp-roman ml-2 text-bone/40">{item.roman}</span>\n', ''),
    ('                  SECONDARY COMMUNITY<br />MEETING APP ／ 2026', '                  SECONDARY COMMUNITY<br />MEETING APP 2026'),
    ('                  ／ EST. MABIS<br />BANGKOK ／ TH', '                  EST. MABIS<br />BANGKOK TH'),
])

print("Typography labels updated")
