import{e as t,m as ke,L as Ee,w as P,Y as Ce,P as se,O as we,Q as de,I as q,f as a,J as l,S as A,R as H,g as ie,G as _e,F as ce,t as J}from"./index-Bg8mKLht.js";import{n as K,s as ge,j as Ae}from"./JobsWidget-rc1XQzMK.js";import{B as D,I as De,T as Be,W as $e}from"./ui-RA-_KImi.js";import{x as je}from"./x-M974sJac.js";import{d as me}from"./download-B_5JkRhJ.js";import{I as Se}from"./Icon-QbIlkpJL.js";import{l as O}from"./loader-circle-C-wcFMVZ.js";import{s as Pe}from"./save-VzhKthjI.js";import{t as Ie}from"./trash-2-Dv3PZpsq.js";import"./names-Be6cvtAd.js";import"./isFriday-D7g-M1su.js";import"./format-u15WN3Ub.js";import"./nextFriday-ZmQMN10p.js";import"./startOfMonth-CuZ2RanL.js";import"./user-plus-DsQdOWlR.js";import"./select-BXbzTDLX.js";import"./index-CmkXFWqq.js";import"./chevron-down-CSRKYyhi.js";import"./check-D55mOcZF.js";import"./circle-check-BXr8JkjW.js";import"./maximize-2-BTMiA3ii.js";import"./plus-0LZNIu1C.js";var Je=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]],Te=e=>t(Se,ke(e,{iconNode:Je,name:"file-text"})),Ue=Te;const Le=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆ヵヶー]/gu,U="MABIS Jobs",E=e=>String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"),I=(e,n="")=>String(e??"").replace(Le," ").replace(/\s+/g," ").trim()||n,p=(e,n)=>String(e||"").replace(/[{};]/g,"").trim()||n,fe=e=>I(e,U).replace(/[^a-z0-9._ -]+/gi,"").replace(/\s+/g," ").trim().slice(0,80)||U,b=(e,n)=>{const r=p(e,"");return r?/^(?:#|rgb|hsl|oklch|color\()/i.test(r)?r:`hsl(${r})`:n},he=(e,n)=>{const r=p(e,"");return r&&/^linear-gradient\([^<>"']*\)$/i.test(r)?r:n},Me=e=>(e||[]).map(n=>`<link rel="stylesheet" href="${E(n)}">`).join("");function ze(e=document){const n=getComputedStyle(e.documentElement),r=s=>n.getPropertyValue(s).trim();return{primary:b(r("--primary"),"#951e3a"),primaryForeground:b(r("--primary-foreground"),"#fffaf2"),secondary:b(r("--secondary"),"#eace54"),secondaryForeground:b(r("--secondary-foreground"),"#241b05"),background:b(r("--background"),"#f8f4ea"),foreground:b(r("--foreground"),"#24191c"),border:b(r("--border"),"#c9bdaf"),muted:b(r("--muted"),"#eee6d9"),mutedForeground:b(r("--muted-foreground"),"#6c6161"),paletteStripes:he(r("--palette-stripes"),""),fontFamily:p(r("--font-body"),"'GNUFreeMonoUI', monospace"),stylesheetUrls:Array.from(e.querySelectorAll('link[rel="stylesheet"]')).map(s=>s.href).filter(Boolean),baseUrl:e.baseURI}}function Ne(e,n={}){const r=Array.isArray(e==null?void 0:e.items)?e.items:[],s={primary:p(n.primary,"#951e3a"),primaryForeground:p(n.primaryForeground,"#fffaf2"),secondary:p(n.secondary,"#eace54"),secondaryForeground:p(n.secondaryForeground,"#241b05"),background:p(n.background,"#f8f4ea"),foreground:p(n.foreground,"#24191c"),border:p(n.border,"#c9bdaf"),muted:p(n.muted,"#eee6d9"),mutedForeground:p(n.mutedForeground,"#6c6161")},g=he(n.paletteStripes,""),f=p(n.fontFamily,"'GNUFreeMonoUI', monospace"),C=U,y=I(e==null?void 0:e.notes),x=r.map((d,w)=>{const v=(Array.isArray(d==null?void 0:d.schedule_days)?d.schedule_days:[]).map($=>I($)).filter(Boolean).join(", ");return`
      <tr>
        <td class="pdf-number">${String(w+1).padStart(2,"0")}</td>
        <td><strong>${E(I(d==null?void 0:d.job_title,"Job"))}</strong></td>
        <td>${E(I(d==null?void 0:d.assigned_to_name,"Unassigned"))}</td>
        <td>${E(v||"As scheduled")}</td>
      </tr>`}).join("");return`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <base href="${E(n.baseUrl||"/")}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${E(fe(C))}</title>
  ${Me(n.stylesheetUrls)}
  <style>
    @page { size: A4 portrait; margin: 14mm 13mm 17mm; }
    :root {
      color-scheme: light;
      --pdf-primary: ${s.primary};
      --pdf-primary-foreground: ${s.primaryForeground};
      --pdf-secondary: ${s.secondary};
      --pdf-secondary-foreground: ${s.secondaryForeground};
      --pdf-background: ${s.background};
      --pdf-foreground: ${s.foreground};
      --pdf-border: ${s.border};
      --pdf-muted: ${s.muted};
      --pdf-muted-foreground: ${s.mutedForeground};
      --pdf-palette-stripes: ${g||"none"};
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--pdf-background); }
    body {
      color: var(--pdf-foreground);
      font-family: ${f};
      font-size: 10.5pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pdf-page { width: 100%; margin: 0 auto; }
    .pdf-brand {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10mm;
      align-items: end;
      border-top: 4px solid var(--pdf-primary);
      border-bottom: 1px solid var(--pdf-foreground);
      padding: 7mm 0 5mm;
    }
    .pdf-kicker, .pdf-label, th, .pdf-number, .pdf-footer {
      font-family: ${f};
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .pdf-kicker { color: var(--pdf-primary); }
    h1 {
      max-width: 145mm;
      margin: 2mm 0 0;
      font-family: ${f};
      font-size: 25pt;
      line-height: 1.02;
      letter-spacing: -.035em;
      overflow-wrap: anywhere;
    }
    .pdf-mark {
      width: 22mm;
      height: 22mm;
      display: grid;
      place-items: center;
      border: 1px solid var(--pdf-foreground);
      background: var(--pdf-primary);
      color: var(--pdf-primary-foreground);
      font-size: 15pt;
      font-weight: 800;
    }
    /* print-color-adjust keeps the bar in the output. Browsers strip background
       colours from printed pages by default, which would drop the flag entirely
       \u2014 the one thing this stripe exists for. */
    .pdf-stripe {
      display: grid;
      grid-template-columns: 3fr 1fr;
      height: 3mm;
      margin: 3mm 0 6mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pdf-stripe span:first-child { background: var(--pdf-primary); }
    .pdf-stripe span:last-child { background: var(--pdf-secondary); }
    /* A themed palette replaces the two-tone split with the whole flag. */
    .pdf-stripe--palette {
      display: block;
      background: var(--pdf-palette-stripes);
    }
    .pdf-label { display: block; margin-bottom: 1mm; color: var(--pdf-muted-foreground); }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th {
      padding: 2.6mm 2mm;
      text-align: left;
      border: 1px solid var(--pdf-foreground);
      background: var(--pdf-foreground);
      color: var(--pdf-background);
    }
    td {
      padding: 3.2mm 2mm;
      vertical-align: top;
      border: 1px solid var(--pdf-border);
      overflow-wrap: anywhere;
    }
    tbody tr:nth-child(even) { background: var(--pdf-muted); }
    th:nth-child(1), td:nth-child(1) { width: 9%; text-align: center; }
    th:nth-child(2), td:nth-child(2) { width: 31%; }
    th:nth-child(3), td:nth-child(3) { width: 27%; }
    th:nth-child(4), td:nth-child(4) { width: 33%; }
    .pdf-empty { padding: 12mm; text-align: center; border: 1px solid var(--pdf-border); }
    .pdf-notes {
      margin-top: 6mm;
      padding: 4mm;
      border-top: 2px solid var(--pdf-secondary);
      border-bottom: 1px solid var(--pdf-border);
      white-space: pre-wrap;
    }
    .pdf-footer {
      display: flex;
      justify-content: space-between;
      gap: 8mm;
      margin-top: 8mm;
      padding-top: 3mm;
      border-top: 1px solid var(--pdf-foreground);
      color: var(--pdf-muted-foreground);
    }
  </style>
</head>
<body>
  <main class="pdf-page">
    <header class="pdf-brand">
      <div>
        <div class="pdf-kicker">Montessori Academy Bangkok International School</div>
        <h1>${E(C)}</h1>
      </div>
      <div class="pdf-mark" aria-label="MABIS">M</div>
    </header>
    <div class="pdf-stripe${g?" pdf-stripe--palette":""}" aria-hidden="true">${g?"":"<span></span><span></span>"}</div>
    ${x?`
      <table aria-label="Jobs">
        <thead><tr><th>No.</th><th>Job</th><th>Person</th><th>Schedule</th></tr></thead>
        <tbody>${x}</tbody>
      </table>`:'<div class="pdf-empty">No jobs were included in this list.</div>'}
    ${y?`<section class="pdf-notes"><span class="pdf-label">Notes</span>${E(y)}</section>`:""}
    <footer class="pdf-footer"><span>MABIS Community Job List</span><span>${r.length} job${r.length===1?"":"s"}</span></footer>
  </main>
</body>
</html>`}async function qe(e,n=document){var y;const r=window.open("","_blank","width=980,height=760");if(!r)throw new Error("POPUP_BLOCKED");const s=ze(n);r.document.open(),r.document.write(Ne(e,s)),r.document.close();const g=Array.from(r.document.querySelectorAll('link[rel="stylesheet"]'));await Promise.all(g.map(x=>x.sheet?Promise.resolve():new Promise(d=>{const w=()=>d();x.addEventListener("load",w,{once:!0}),x.addEventListener("error",w,{once:!0}),window.setTimeout(w,1800)}))),await((y=r.document.fonts)==null?void 0:y.ready);const f=n.defaultView||window,C=()=>{r.closed||r.close(),f.focus()};r.addEventListener("afterprint",C,{once:!0}),r.addEventListener("pagehide",()=>f.focus(),{once:!0}),r.document.title=fe(U),r.focus(),r.print()}var He=J('<div class="divide-y divide-border">'),Oe=J('<section class="job-list-studio border-y-2 border-foreground bg-background text-foreground font-body"aria-labelledby=job-list-studio-title><header class="grid gap-5 border-b border-foreground px-3 py-5 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><div></div></header><div class="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]"><div class="border-b border-foreground/35 p-3 sm:p-5 lg:border-b-0 lg:border-r"><div class="grid gap-4 sm:grid-cols-2"><label class="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2"></label><label class="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2"></label></div><div class="mt-6 flex flex-col gap-3 border-t border-foreground/35 pt-4 sm:flex-row sm:items-end sm:justify-between"><div></div><div class="flex flex-wrap gap-2"></div></div><div data-cursor-lite class="mt-3 divide-y divide-border border-y border-foreground/35"></div><div class="mt-4 grid gap-2 sm:grid-cols-2"></div></div><aside class="p-3 sm:p-5"><div class="border-b border-foreground pb-3">'),Ke=J('<label class="grid min-h-14 cursor-pointer grid-cols-[auto_2rem_minmax(0,1fr)] items-center gap-3 px-2 py-2 hover:bg-muted/60 sm:px-3"><input type=checkbox class="h-4 w-4 shrink-0 accent-primary"><span class="text-[10px] font-bold tabular-nums text-primary"></span><span class=min-w-0><span class="block truncate text-sm font-bold"></span><span class="block truncate text-xs text-muted-foreground"> \xB7 '),Qe=J('<p class="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">'),Re=J('<article class=py-4><div class="flex items-start gap-3"><div class="min-w-0 flex-1"><h5 class="break-words text-sm font-bold leading-snug"></h5></div></div><div class="mt-3 flex flex-wrap gap-2">');const B={saved:{en:"Job list saved. You can export it again from Saved lists.",ja:"\u4FC2\u30EA\u30B9\u30C8\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u300C\u4FDD\u5B58\u6E08\u307F\u30EA\u30B9\u30C8\u300D\u304B\u3089\u3044\u3064\u3067\u3082\u518D\u51FA\u529B\u3067\u304D\u307E\u3059\u3002"},deleted:{en:"Saved job list deleted.",ja:"\u4FDD\u5B58\u6E08\u307F\u306E\u4FC2\u30EA\u30B9\u30C8\u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002"},saveError:{en:"The job list could not be saved. Please try again.",ja:"\u4FC2\u30EA\u30B9\u30C8\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"},deleteError:{en:"The saved list could not be deleted.",ja:"\u4FDD\u5B58\u6E08\u307F\u30EA\u30B9\u30C8\u3092\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002"},pdfReady:{en:"The print dialog is open. Choose Save as PDF.",ja:"\u5370\u5237\u753B\u9762\u304C\u958B\u304D\u307E\u3057\u305F\u3002\u300CPDF\u3068\u3057\u3066\u4FDD\u5B58\u300D\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002"},popupBlocked:{en:"Allow pop-ups for this site, then choose Save as PDF again.",ja:"\u3053\u306E\u30B5\u30A4\u30C8\u306E\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u3092\u8A31\u53EF\u3057\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u300CPDF\u3068\u3057\u3066\u4FDD\u5B58\u300D\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002"},pdfError:{en:"The PDF could not be prepared. Please try again.",ja:"PDF\u3092\u6E96\u5099\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"}},Ge=e=>e||"Current assignments",Ve=e=>({job_title:K(e.job_title),assigned_to_name:e.assigned_to_name||"Unassigned",assignment_period:Ae(e),schedule_days:ge(e)}),pe=e=>String((e==null?void 0:e.created_date)||(e==null?void 0:e.createdDate)||"").slice(0,10)||"Saved";function yt(e){const n=Ee(),r=()=>e.assignments||[],s=()=>"MABIS Jobs",[g,f]=P(s()),[C,y]=P(""),[x,d]=P([]),[w,v]=P(null),[$,Q]=P("");let R=!1;Ce(()=>{const u=new Set(r().map(o=>o.id));if(!R){R=!0,d([...u]);return}d(o=>o.filter(c=>u.has(c)))});const G=se(()=>new Set(x())),F=se(()=>r().filter(u=>G().has(u.id))),V=we(()=>({queryKey:["job-lists"],queryFn:()=>q.entities.JobList.list("-created_date",100)})),W=()=>{var u,o,c;return{title:g().trim()||s(),notes:C().trim(),period_label:Ge(e.periodLabel),items:F().map(Ve),created_by_name:((u=e.currentUser)==null?void 0:u.full_name)||((o=e.currentUser)==null?void 0:o.email)||"MABIS Community",created_by_email:((c=e.currentUser)==null?void 0:c.email)||"",created_date:new Date().toISOString().slice(0,10)}},T=de(()=>({mutationFn:u=>q.entities.JobList.create(u),onSuccess:()=>{n.invalidateQueries({queryKey:["job-lists"]}),v(B.saved),f(s()),y(""),d(r().map(u=>u.id))},onError:()=>v(B.saveError)})),Y=de(()=>({mutationFn:u=>q.entities.JobList.delete(u),onSuccess:()=>{n.invalidateQueries({queryKey:["job-lists"]}),v(B.deleted)},onError:()=>v(B.deleteError)})),be=u=>{d(o=>o.includes(u)?o.filter(c=>c!==u):[...o,u])},ye=()=>{!g().trim()||F().length===0||T.isPending||T.mutate(W())},xe=u=>{var c;const o=u.created_by_email&&u.created_by_email===((c=e.currentUser)==null?void 0:c.email);!e.isAdmin&&!o||window.confirm(`Delete "${u.title}"? This cannot be undone.
\u300C${u.title}\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F\u3053\u306E\u64CD\u4F5C\u306F\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002`)&&Y.mutate(u.id)},X=async(u,o)=>{if(!(!Array.isArray(u==null?void 0:u.items)||u.items.length===0)){Q(o);try{await qe(u),v(B.pdfReady)}catch(c){v((c==null?void 0:c.message)==="POPUP_BLOCKED"?B.popupBlocked:B.pdfError)}finally{Q("")}}},ve=u=>{var o;return e.isAdmin||u.created_by_email&&u.created_by_email===((o=e.currentUser)==null?void 0:o.email)};return(()=>{var u=Oe(),o=u.firstChild,c=o.firstChild,Z=o.nextSibling,L=Z.firstChild,ee=L.firstChild,M=ee.firstChild,te=M.nextSibling,re=ee.nextSibling,z=re.firstChild,ue=z.nextSibling,ne=re.nextSibling,ae=ne.nextSibling,oe=L.nextSibling,le=oe.firstChild;return a(c,t(l,{as:"p",ja:"\u6587\u66F8\u4F5C\u6210",class:"text-[10px] font-bold uppercase tracking-[0.18em] text-primary",japaneseClass:"ml-1.5 inline font-normal tracking-normal",layout:"inline",children:"N\xB0 04 / Document Studio"}),null),a(c,t(l,{as:"h3",id:"job-list-studio-title",ja:"\u4FC2\u30EA\u30B9\u30C8\u4F5C\u6210",class:"mt-1 block font-display text-2xl font-bold leading-none tracking-[-0.035em] sm:text-3xl",japaneseClass:"mt-2 block text-sm font-normal tracking-normal text-muted-foreground",children:"Job List Studio"}),null),a(c,t(l,{as:"p",ja:"\u73FE\u5728\u306E\u62C5\u5F53\u304B\u3089\u5FC5\u8981\u306A\u9805\u76EE\u3092\u9078\u3073\u3001\u5171\u6709\u30EA\u30B9\u30C8\u3068\u3057\u3066\u4FDD\u5B58\u3057\u305F\u308A\u3001\u30C6\u30FC\u30DE\u306B\u5408\u3063\u305FPDF\u306B\u51FA\u529B\u3057\u305F\u308A\u3067\u304D\u307E\u3059\u3002",class:"mt-3 block max-w-2xl text-sm leading-relaxed text-muted-foreground",japaneseClass:"mt-1 block text-[0.86em] leading-relaxed",children:"Choose from the current assignments, save a reusable shared list, or export a theme-matched PDF."}),null),a(o,t(D,{type:"button",variant:"outline",get onClick(){return e.onClose},class:"min-h-10 justify-self-start rounded-sm border-foreground/40 md:justify-self-end",get children(){return[t(je,{class:"h-4 w-4"}),t(l,{ja:"\u9589\u3058\u308B",layout:"inline",children:"Close"})]}}),null),a(u,t(A,{get when(){return w()},children:i=>t(l,{as:"p",role:"status",get ja(){return i().ja},class:"block border-b border-border bg-secondary/15 px-3 py-3 text-sm font-semibold sm:px-5",japaneseClass:"mt-1 block text-[0.82em] font-normal text-muted-foreground",get children(){return i().en}})}),Z),a(M,t(l,{ja:"\u30EA\u30B9\u30C8\u540D",children:"List title"}),null),a(M,t(De,{get value(){return g()},onInput:i=>f(i.currentTarget.value),maxlength:120,class:"mt-1 min-h-11 rounded-sm border-foreground/35 bg-card text-base normal-case tracking-normal text-foreground"}),null),a(te,t(l,{ja:"\u30E1\u30E2\uFF08\u4EFB\u610F\uFF09",children:"Notes (optional)"}),null),a(te,t(Be,{get value(){return C()},onInput:i=>y(i.currentTarget.value),maxlength:1e3,class:"mt-1 min-h-24 rounded-sm border-foreground/35 bg-card text-sm font-normal normal-case tracking-normal text-foreground"}),null),a(z,t(l,{as:"h4",ja:"\u542B\u3081\u308B\u4FC2",class:"block text-xs font-bold uppercase tracking-[0.16em]",japaneseClass:"mt-1 block text-[0.82em] font-normal tracking-normal text-muted-foreground",children:"Jobs to include"}),null),a(z,t(l,{as:"p",get ja(){return`${F().length}\u4EF6\u9078\u629E\u4E2D`},class:"mt-1 block text-xs text-muted-foreground",japaneseClass:"ml-1.5 inline text-[0.86em]",layout:"inline",get children(){return[H(()=>F().length)," selected"]}}),null),a(ue,t(D,{type:"button",size:"sm",variant:"outline",onClick:()=>d(r().map(i=>i.id)),get disabled(){return F().length===r().length},class:"min-h-9 rounded-sm",get children(){return t(l,{ja:"\u3059\u3079\u3066\u9078\u629E",layout:"inline",children:"Select all"})}}),null),a(ue,t(D,{type:"button",size:"sm",variant:"outline",onClick:()=>d([]),get disabled(){return F().length===0},class:"min-h-9 rounded-sm",get children(){return t(l,{ja:"\u9078\u629E\u89E3\u9664",layout:"inline",children:"Clear"})}}),null),a(ne,t(ce,{get each(){return r()},get fallback(){return t(l,{as:"p",ja:"\u73FE\u5728\u306E\u62C5\u5F53\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u5148\u306B\u30DB\u30A4\u30FC\u30EB\u3067\u4FC2\u3092\u5272\u308A\u5F53\u3066\u3066\u304F\u3060\u3055\u3044\u3002",class:"block px-3 py-8 text-center text-sm text-muted-foreground",japaneseClass:"mt-1 block text-[0.86em]",children:"There are no current assignments. Assign jobs with the wheel first."})},children:(i,m)=>(()=>{var j=Ke(),k=j.firstChild,_=k.nextSibling,N=_.nextSibling,S=N.firstChild,h=S.nextSibling,Fe=h.firstChild;return k.addEventListener("change",()=>be(i.id)),a(_,()=>String(m()+1).padStart(2,"0")),a(S,()=>K(i.job_title)),a(h,()=>i.assigned_to_name,Fe),a(h,()=>ge(i).join(", "),null),ie(()=>_e(k,"aria-label",`Include ${K(i.job_title)}`)),ie(()=>k.checked=G().has(i.id)),j})()})),a(ae,t(D,{type:"button",onClick:ye,get disabled(){return!g().trim()||F().length===0||T.isPending},class:"min-h-11 rounded-sm",get children(){return[t(A,{get when(){return T.isPending},get fallback(){return t(Pe,{class:"h-4 w-4"})},get children(){return t(O,{class:"h-4 w-4 animate-spin"})}}),t(l,{ja:"\u30EA\u30B9\u30C8\u3092\u4FDD\u5B58",layout:"inline",children:"Save Job List"})]}}),null),a(ae,t(D,{type:"button",variant:"outline",onClick:()=>X(W(),"draft"),get disabled(){return F().length===0||$()==="draft"},class:"min-h-11 rounded-sm border-primary/45 text-primary",get children(){return[t(A,{get when(){return $()==="draft"},get fallback(){return t(me,{class:"h-4 w-4"})},get children(){return t(O,{class:"h-4 w-4 animate-spin"})}}),t(l,{ja:"PDF\u3068\u3057\u3066\u4FDD\u5B58",layout:"inline",children:"Save as PDF"})]}}),null),a(L,t(l,{as:"p",ja:"PDF\u306B\u306F\u65E5\u672C\u8A9E\u3092\u542B\u3081\u305A\u3001\u73FE\u5728\u306E\u30C6\u30FC\u30DE\u8272\u3068\u9078\u629E\u4E2D\u306EUI\u30D5\u30A9\u30F3\u30C8\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002\u7BA1\u7406\u8005\u3067\u306A\u304F\u3066\u3082\u3001\u8AB0\u3067\u3082\u51FA\u529B\u3067\u304D\u307E\u3059\u3002",class:"mt-2 block text-[11px] leading-relaxed text-muted-foreground",japaneseClass:"mt-1 block text-[0.86em]",children:"The PDF is English-only and uses the current theme colors and selected UI font. Anyone can export it; admin access is not required."}),null),a(le,t(l,{as:"p",ja:"\u4FDD\u5B58\u4E00\u89A7",class:"text-[10px] font-bold uppercase tracking-[0.18em] text-primary",japaneseClass:"ml-1.5 inline font-normal tracking-normal",layout:"inline",children:"Archive"}),null),a(le,t(l,{as:"h4",ja:"\u4FDD\u5B58\u6E08\u307F\u30EA\u30B9\u30C8",class:"mt-1 block font-display text-xl font-bold tracking-[-0.025em]",japaneseClass:"mt-1 block text-xs font-normal tracking-normal text-muted-foreground",children:"Saved lists"}),null),a(oe,t(A,{get when(){return!V.isLoading},get fallback(){return t($e,{label:"Loading saved job lists / \u4FDD\u5B58\u6E08\u307F\u4FC2\u30EA\u30B9\u30C8\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D"})},get children(){var i=He();return a(i,t(ce,{get each(){return V.data||[]},get fallback(){return t(l,{as:"p",ja:"\u4FDD\u5B58\u6E08\u307F\u306E\u4FC2\u30EA\u30B9\u30C8\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002",class:"block py-8 text-sm text-muted-foreground",japaneseClass:"mt-1 block text-[0.86em]",children:"No saved job lists yet."})},children:m=>(()=>{var j=Re(),k=j.firstChild,_=k.firstChild,N=_.firstChild,S=k.nextSibling;return a(k,t(Ue,{class:"mt-0.5 h-4 w-4 shrink-0 text-primary"}),_),a(N,()=>m.title),a(_,t(l,{as:"p",get ja(){return`${pe(m)}\u30FB${(m.items||[]).length}\u4EF6`},class:"mt-1 block text-[10px] uppercase tracking-[0.1em] text-muted-foreground",japaneseClass:"ml-1.5 inline normal-case tracking-normal",layout:"inline",get children(){return[H(()=>pe(m))," \xB7 ",H(()=>(m.items||[]).length)," jobs"]}}),null),a(_,t(A,{get when(){return m.notes},get children(){var h=Qe();return a(h,()=>m.notes),h}}),null),a(S,t(D,{type:"button",size:"sm",variant:"outline",onClick:()=>X(m,m.id),get disabled(){var h;return!((h=m.items)!=null&&h.length)||$()===m.id},class:"min-h-9 rounded-sm border-primary/40 text-primary",get children(){return[t(A,{get when(){return $()===m.id},get fallback(){return t(me,{class:"h-3.5 w-3.5"})},get children(){return t(O,{class:"h-3.5 w-3.5 animate-spin"})}}),t(l,{ja:"PDF\u3068\u3057\u3066\u4FDD\u5B58",layout:"inline",children:"Save as PDF"})]}}),null),a(S,t(A,{get when(){return ve(m)},get children(){return t(D,{type:"button",size:"sm",variant:"ghost",onClick:()=>xe(m),get disabled(){return Y.isPending},class:"min-h-9 rounded-sm text-primary hover:bg-primary/10",get children(){return[t(Ie,{class:"h-3.5 w-3.5"}),t(l,{ja:"\u524A\u9664",layout:"inline",children:"Delete"})]}})}}),null),j})()})),i}}),null),u})()}export{yt as default};
