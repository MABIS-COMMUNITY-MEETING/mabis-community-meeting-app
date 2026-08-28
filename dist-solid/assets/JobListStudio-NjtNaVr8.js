import{e as t,m as ve,L as ke,w as S,Y as Ee,P as se,O as Ce,Q as de,I as q,f as n,J as l,S as D,R as H,g as ie,G as _e,F as ce,t as I}from"./index-Ddt12QUf.js";import{n as K,s as ge,j as Ae}from"./JobsWidget-D5C6sHL9.js";import{B as w,I as De,T as we,W as Be}from"./ui-D21uiMtj.js";import{x as $e}from"./x-8X-6uktH.js";import{d as me}from"./download-CApYkDPb.js";import{I as je}from"./Icon-B9ziyX9u.js";import{l as O}from"./loader-circle-CKmzCbO3.js";import{s as Se}from"./save-Dbw-oCO6.js";import{t as Pe}from"./trash-2-CuTPOs4E.js";import"./names-Be6cvtAd.js";import"./isFriday-D7g-M1su.js";import"./format-u15WN3Ub.js";import"./nextFriday-ZmQMN10p.js";import"./startOfMonth-CuZ2RanL.js";import"./user-plus-Di4wGSXL.js";import"./select-D4ygR47v.js";import"./index-CK2_dQU3.js";import"./chevron-down-B6iWAWAG.js";import"./check-nCHpKYKI.js";import"./circle-check-Dl2q8CKo.js";import"./maximize-2-DCiSX-8v.js";import"./plus-2_RyaeAR.js";var Ie=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]],Je=e=>t(je,ve(e,{iconNode:Ie,name:"file-text"})),Te=Je;const Ue=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆ヵヶー]/gu,U="MABIS Jobs",E=e=>String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"),P=(e,a="")=>String(e??"").replace(Ue," ").replace(/\s+/g," ").trim()||a,p=(e,a)=>String(e||"").replace(/[{};]/g,"").trim()||a,fe=e=>P(e,U).replace(/[^a-z0-9._ -]+/gi,"").replace(/\s+/g," ").trim().slice(0,80)||U,b=(e,a)=>{const r=p(e,"");return r?/^(?:#|rgb|hsl|oklch|color\()/i.test(r)?r:`hsl(${r})`:a},Le=e=>(e||[]).map(a=>`<link rel="stylesheet" href="${E(a)}">`).join("");function Me(e=document){const a=getComputedStyle(e.documentElement),r=s=>a.getPropertyValue(s).trim();return{primary:b(r("--primary"),"#951e3a"),primaryForeground:b(r("--primary-foreground"),"#fffaf2"),secondary:b(r("--secondary"),"#eace54"),secondaryForeground:b(r("--secondary-foreground"),"#241b05"),background:b(r("--background"),"#f8f4ea"),foreground:b(r("--foreground"),"#24191c"),border:b(r("--border"),"#c9bdaf"),muted:b(r("--muted"),"#eee6d9"),mutedForeground:b(r("--muted-foreground"),"#6c6161"),fontFamily:p(r("--font-body"),"'GNUFreeMonoUI', monospace"),stylesheetUrls:Array.from(e.querySelectorAll('link[rel="stylesheet"]')).map(s=>s.href).filter(Boolean),baseUrl:e.baseURI}}function ze(e,a={}){const r=Array.isArray(e==null?void 0:e.items)?e.items:[],s={primary:p(a.primary,"#951e3a"),primaryForeground:p(a.primaryForeground,"#fffaf2"),secondary:p(a.secondary,"#eace54"),secondaryForeground:p(a.secondaryForeground,"#241b05"),background:p(a.background,"#f8f4ea"),foreground:p(a.foreground,"#24191c"),border:p(a.border,"#c9bdaf"),muted:p(a.muted,"#eee6d9"),mutedForeground:p(a.mutedForeground,"#6c6161")},g=p(a.fontFamily,"'GNUFreeMonoUI', monospace"),y=U,C=P(e==null?void 0:e.notes),x=r.map((c,f)=>{const _=(Array.isArray(c==null?void 0:c.schedule_days)?c.schedule_days:[]).map(F=>P(F)).filter(Boolean).join(", ");return`
      <tr>
        <td class="pdf-number">${String(f+1).padStart(2,"0")}</td>
        <td><strong>${E(P(c==null?void 0:c.job_title,"Job"))}</strong></td>
        <td>${E(P(c==null?void 0:c.assigned_to_name,"Unassigned"))}</td>
        <td>${E(_||"As scheduled")}</td>
      </tr>`}).join("");return`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <base href="${E(a.baseUrl||"/")}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${E(fe(y))}</title>
  ${Le(a.stylesheetUrls)}
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
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--pdf-background); }
    body {
      color: var(--pdf-foreground);
      font-family: ${g};
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
      font-family: ${g};
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .pdf-kicker { color: var(--pdf-primary); }
    h1 {
      max-width: 145mm;
      margin: 2mm 0 0;
      font-family: ${g};
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
    .pdf-stripe {
      display: grid;
      grid-template-columns: 3fr 1fr;
      height: 3mm;
      margin: 3mm 0 6mm;
    }
    .pdf-stripe span:first-child { background: var(--pdf-primary); }
    .pdf-stripe span:last-child { background: var(--pdf-secondary); }
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
        <h1>${E(y)}</h1>
      </div>
      <div class="pdf-mark" aria-label="MABIS">M</div>
    </header>
    <div class="pdf-stripe" aria-hidden="true"><span></span><span></span></div>
    ${x?`
      <table aria-label="Jobs">
        <thead><tr><th>No.</th><th>Job</th><th>Person</th><th>Schedule</th></tr></thead>
        <tbody>${x}</tbody>
      </table>`:'<div class="pdf-empty">No jobs were included in this list.</div>'}
    ${C?`<section class="pdf-notes"><span class="pdf-label">Notes</span>${E(C)}</section>`:""}
    <footer class="pdf-footer"><span>MABIS Community Job List</span><span>${r.length} job${r.length===1?"":"s"}</span></footer>
  </main>
</body>
</html>`}async function Ne(e,a=document){var x;const r=window.open("","_blank","width=980,height=760");if(!r)throw new Error("POPUP_BLOCKED");const s=Me(a);r.document.open(),r.document.write(ze(e,s)),r.document.close();const g=Array.from(r.document.querySelectorAll('link[rel="stylesheet"]'));await Promise.all(g.map(c=>c.sheet?Promise.resolve():new Promise(f=>{const _=()=>f();c.addEventListener("load",_,{once:!0}),c.addEventListener("error",_,{once:!0}),window.setTimeout(_,1800)}))),await((x=r.document.fonts)==null?void 0:x.ready);const y=a.defaultView||window,C=()=>{r.closed||r.close(),y.focus()};r.addEventListener("afterprint",C,{once:!0}),r.addEventListener("pagehide",()=>y.focus(),{once:!0}),r.document.title=fe(U),r.focus(),r.print()}var qe=I('<div class="divide-y divide-border">'),He=I('<section class="job-list-studio border-y-2 border-foreground bg-background text-foreground font-body"aria-labelledby=job-list-studio-title><header class="grid gap-5 border-b border-foreground px-3 py-5 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><div></div></header><div class="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]"><div class="border-b border-foreground/35 p-3 sm:p-5 lg:border-b-0 lg:border-r"><div class="grid gap-4 sm:grid-cols-2"><label class="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2"></label><label class="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2"></label></div><div class="mt-6 flex flex-col gap-3 border-t border-foreground/35 pt-4 sm:flex-row sm:items-end sm:justify-between"><div></div><div class="flex flex-wrap gap-2"></div></div><div data-cursor-lite class="mt-3 divide-y divide-border border-y border-foreground/35"></div><div class="mt-4 grid gap-2 sm:grid-cols-2"></div></div><aside class="p-3 sm:p-5"><div class="border-b border-foreground pb-3">'),Oe=I('<label class="grid min-h-14 cursor-pointer grid-cols-[auto_2rem_minmax(0,1fr)] items-center gap-3 px-2 py-2 hover:bg-muted/60 sm:px-3"><input type=checkbox class="h-4 w-4 shrink-0 accent-primary"><span class="text-[10px] font-bold tabular-nums text-primary"></span><span class=min-w-0><span class="block truncate text-sm font-bold"></span><span class="block truncate text-xs text-muted-foreground"> \xB7 '),Ke=I('<p class="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">'),Qe=I('<article class=py-4><div class="flex items-start gap-3"><div class="min-w-0 flex-1"><h5 class="break-words text-sm font-bold leading-snug"></h5></div></div><div class="mt-3 flex flex-wrap gap-2">');const B={saved:{en:"Job list saved. You can export it again from Saved lists.",ja:"\u4FC2\u30EA\u30B9\u30C8\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u300C\u4FDD\u5B58\u6E08\u307F\u30EA\u30B9\u30C8\u300D\u304B\u3089\u3044\u3064\u3067\u3082\u518D\u51FA\u529B\u3067\u304D\u307E\u3059\u3002"},deleted:{en:"Saved job list deleted.",ja:"\u4FDD\u5B58\u6E08\u307F\u306E\u4FC2\u30EA\u30B9\u30C8\u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002"},saveError:{en:"The job list could not be saved. Please try again.",ja:"\u4FC2\u30EA\u30B9\u30C8\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"},deleteError:{en:"The saved list could not be deleted.",ja:"\u4FDD\u5B58\u6E08\u307F\u30EA\u30B9\u30C8\u3092\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002"},pdfReady:{en:"The print dialog is open. Choose Save as PDF.",ja:"\u5370\u5237\u753B\u9762\u304C\u958B\u304D\u307E\u3057\u305F\u3002\u300CPDF\u3068\u3057\u3066\u4FDD\u5B58\u300D\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002"},popupBlocked:{en:"Allow pop-ups for this site, then choose Save as PDF again.",ja:"\u3053\u306E\u30B5\u30A4\u30C8\u306E\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u3092\u8A31\u53EF\u3057\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u300CPDF\u3068\u3057\u3066\u4FDD\u5B58\u300D\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002"},pdfError:{en:"The PDF could not be prepared. Please try again.",ja:"PDF\u3092\u6E96\u5099\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"}},Re=e=>e||"Current assignments",Ve=e=>({job_title:K(e.job_title),assigned_to_name:e.assigned_to_name||"Unassigned",assignment_period:Ae(e),schedule_days:ge(e)}),pe=e=>String((e==null?void 0:e.created_date)||(e==null?void 0:e.createdDate)||"").slice(0,10)||"Saved";function bt(e){const a=ke(),r=()=>e.assignments||[],s=()=>"MABIS Jobs",[g,y]=S(s()),[C,x]=S(""),[c,f]=S([]),[_,F]=S(null),[J,Q]=S("");let R=!1;Ee(()=>{const u=new Set(r().map(o=>o.id));if(!R){R=!0,f([...u]);return}f(o=>o.filter(i=>u.has(i)))});const V=se(()=>new Set(c())),v=se(()=>r().filter(u=>V().has(u.id))),G=Ce(()=>({queryKey:["job-lists"],queryFn:()=>q.entities.JobList.list("-created_date",100)})),W=()=>{var u,o,i;return{title:g().trim()||s(),notes:C().trim(),period_label:Re(e.periodLabel),items:v().map(Ve),created_by_name:((u=e.currentUser)==null?void 0:u.full_name)||((o=e.currentUser)==null?void 0:o.email)||"MABIS Community",created_by_email:((i=e.currentUser)==null?void 0:i.email)||"",created_date:new Date().toISOString().slice(0,10)}},T=de(()=>({mutationFn:u=>q.entities.JobList.create(u),onSuccess:()=>{a.invalidateQueries({queryKey:["job-lists"]}),F(B.saved),y(s()),x(""),f(r().map(u=>u.id))},onError:()=>F(B.saveError)})),Y=de(()=>({mutationFn:u=>q.entities.JobList.delete(u),onSuccess:()=>{a.invalidateQueries({queryKey:["job-lists"]}),F(B.deleted)},onError:()=>F(B.deleteError)})),he=u=>{f(o=>o.includes(u)?o.filter(i=>i!==u):[...o,u])},be=()=>{!g().trim()||v().length===0||T.isPending||T.mutate(W())},ye=u=>{var i;const o=u.created_by_email&&u.created_by_email===((i=e.currentUser)==null?void 0:i.email);!e.isAdmin&&!o||window.confirm(`Delete "${u.title}"? This cannot be undone.
\u300C${u.title}\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F\u3053\u306E\u64CD\u4F5C\u306F\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002`)&&Y.mutate(u.id)},X=async(u,o)=>{if(!(!Array.isArray(u==null?void 0:u.items)||u.items.length===0)){Q(o);try{await Ne(u),F(B.pdfReady)}catch(i){F((i==null?void 0:i.message)==="POPUP_BLOCKED"?B.popupBlocked:B.pdfError)}finally{Q("")}}},xe=u=>{var o;return e.isAdmin||u.created_by_email&&u.created_by_email===((o=e.currentUser)==null?void 0:o.email)};return(()=>{var u=He(),o=u.firstChild,i=o.firstChild,Z=o.nextSibling,L=Z.firstChild,ee=L.firstChild,M=ee.firstChild,te=M.nextSibling,re=ee.nextSibling,z=re.firstChild,ue=z.nextSibling,ne=re.nextSibling,ae=ne.nextSibling,oe=L.nextSibling,le=oe.firstChild;return n(i,t(l,{as:"p",ja:"\u6587\u66F8\u4F5C\u6210",class:"text-[10px] font-bold uppercase tracking-[0.18em] text-primary",japaneseClass:"ml-1.5 inline font-normal tracking-normal",layout:"inline",children:"N\xB0 04 / Document Studio"}),null),n(i,t(l,{as:"h3",id:"job-list-studio-title",ja:"\u4FC2\u30EA\u30B9\u30C8\u4F5C\u6210",class:"mt-1 block font-display text-2xl font-bold leading-none tracking-[-0.035em] sm:text-3xl",japaneseClass:"mt-2 block text-sm font-normal tracking-normal text-muted-foreground",children:"Job List Studio"}),null),n(i,t(l,{as:"p",ja:"\u73FE\u5728\u306E\u62C5\u5F53\u304B\u3089\u5FC5\u8981\u306A\u9805\u76EE\u3092\u9078\u3073\u3001\u5171\u6709\u30EA\u30B9\u30C8\u3068\u3057\u3066\u4FDD\u5B58\u3057\u305F\u308A\u3001\u30C6\u30FC\u30DE\u306B\u5408\u3063\u305FPDF\u306B\u51FA\u529B\u3057\u305F\u308A\u3067\u304D\u307E\u3059\u3002",class:"mt-3 block max-w-2xl text-sm leading-relaxed text-muted-foreground",japaneseClass:"mt-1 block text-[0.86em] leading-relaxed",children:"Choose from the current assignments, save a reusable shared list, or export a theme-matched PDF."}),null),n(o,t(w,{type:"button",variant:"outline",get onClick(){return e.onClose},class:"min-h-10 justify-self-start rounded-sm border-foreground/40 md:justify-self-end",get children(){return[t($e,{class:"h-4 w-4"}),t(l,{ja:"\u9589\u3058\u308B",layout:"inline",children:"Close"})]}}),null),n(u,t(D,{get when(){return _()},children:d=>t(l,{as:"p",role:"status",get ja(){return d().ja},class:"block border-b border-border bg-secondary/15 px-3 py-3 text-sm font-semibold sm:px-5",japaneseClass:"mt-1 block text-[0.82em] font-normal text-muted-foreground",get children(){return d().en}})}),Z),n(M,t(l,{ja:"\u30EA\u30B9\u30C8\u540D",children:"List title"}),null),n(M,t(De,{get value(){return g()},onInput:d=>y(d.currentTarget.value),maxlength:120,class:"mt-1 min-h-11 rounded-sm border-foreground/35 bg-card text-base normal-case tracking-normal text-foreground"}),null),n(te,t(l,{ja:"\u30E1\u30E2\uFF08\u4EFB\u610F\uFF09",children:"Notes (optional)"}),null),n(te,t(we,{get value(){return C()},onInput:d=>x(d.currentTarget.value),maxlength:1e3,class:"mt-1 min-h-24 rounded-sm border-foreground/35 bg-card text-sm font-normal normal-case tracking-normal text-foreground"}),null),n(z,t(l,{as:"h4",ja:"\u542B\u3081\u308B\u4FC2",class:"block text-xs font-bold uppercase tracking-[0.16em]",japaneseClass:"mt-1 block text-[0.82em] font-normal tracking-normal text-muted-foreground",children:"Jobs to include"}),null),n(z,t(l,{as:"p",get ja(){return`${v().length}\u4EF6\u9078\u629E\u4E2D`},class:"mt-1 block text-xs text-muted-foreground",japaneseClass:"ml-1.5 inline text-[0.86em]",layout:"inline",get children(){return[H(()=>v().length)," selected"]}}),null),n(ue,t(w,{type:"button",size:"sm",variant:"outline",onClick:()=>f(r().map(d=>d.id)),get disabled(){return v().length===r().length},class:"min-h-9 rounded-sm",get children(){return t(l,{ja:"\u3059\u3079\u3066\u9078\u629E",layout:"inline",children:"Select all"})}}),null),n(ue,t(w,{type:"button",size:"sm",variant:"outline",onClick:()=>f([]),get disabled(){return v().length===0},class:"min-h-9 rounded-sm",get children(){return t(l,{ja:"\u9078\u629E\u89E3\u9664",layout:"inline",children:"Clear"})}}),null),n(ne,t(ce,{get each(){return r()},get fallback(){return t(l,{as:"p",ja:"\u73FE\u5728\u306E\u62C5\u5F53\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u5148\u306B\u30DB\u30A4\u30FC\u30EB\u3067\u4FC2\u3092\u5272\u308A\u5F53\u3066\u3066\u304F\u3060\u3055\u3044\u3002",class:"block px-3 py-8 text-center text-sm text-muted-foreground",japaneseClass:"mt-1 block text-[0.86em]",children:"There are no current assignments. Assign jobs with the wheel first."})},children:(d,m)=>(()=>{var $=Oe(),k=$.firstChild,A=k.nextSibling,N=A.nextSibling,j=N.firstChild,h=j.nextSibling,Fe=h.firstChild;return k.addEventListener("change",()=>he(d.id)),n(A,()=>String(m()+1).padStart(2,"0")),n(j,()=>K(d.job_title)),n(h,()=>d.assigned_to_name,Fe),n(h,()=>ge(d).join(", "),null),ie(()=>_e(k,"aria-label",`Include ${K(d.job_title)}`)),ie(()=>k.checked=V().has(d.id)),$})()})),n(ae,t(w,{type:"button",onClick:be,get disabled(){return!g().trim()||v().length===0||T.isPending},class:"min-h-11 rounded-sm",get children(){return[t(D,{get when(){return T.isPending},get fallback(){return t(Se,{class:"h-4 w-4"})},get children(){return t(O,{class:"h-4 w-4 animate-spin"})}}),t(l,{ja:"\u30EA\u30B9\u30C8\u3092\u4FDD\u5B58",layout:"inline",children:"Save Job List"})]}}),null),n(ae,t(w,{type:"button",variant:"outline",onClick:()=>X(W(),"draft"),get disabled(){return v().length===0||J()==="draft"},class:"min-h-11 rounded-sm border-primary/45 text-primary",get children(){return[t(D,{get when(){return J()==="draft"},get fallback(){return t(me,{class:"h-4 w-4"})},get children(){return t(O,{class:"h-4 w-4 animate-spin"})}}),t(l,{ja:"PDF\u3068\u3057\u3066\u4FDD\u5B58",layout:"inline",children:"Save as PDF"})]}}),null),n(L,t(l,{as:"p",ja:"PDF\u306B\u306F\u65E5\u672C\u8A9E\u3092\u542B\u3081\u305A\u3001\u73FE\u5728\u306E\u30C6\u30FC\u30DE\u8272\u3068\u9078\u629E\u4E2D\u306EUI\u30D5\u30A9\u30F3\u30C8\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002\u7BA1\u7406\u8005\u3067\u306A\u304F\u3066\u3082\u3001\u8AB0\u3067\u3082\u51FA\u529B\u3067\u304D\u307E\u3059\u3002",class:"mt-2 block text-[11px] leading-relaxed text-muted-foreground",japaneseClass:"mt-1 block text-[0.86em]",children:"The PDF is English-only and uses the current theme colors and selected UI font. Anyone can export it; admin access is not required."}),null),n(le,t(l,{as:"p",ja:"\u4FDD\u5B58\u4E00\u89A7",class:"text-[10px] font-bold uppercase tracking-[0.18em] text-primary",japaneseClass:"ml-1.5 inline font-normal tracking-normal",layout:"inline",children:"Archive"}),null),n(le,t(l,{as:"h4",ja:"\u4FDD\u5B58\u6E08\u307F\u30EA\u30B9\u30C8",class:"mt-1 block font-display text-xl font-bold tracking-[-0.025em]",japaneseClass:"mt-1 block text-xs font-normal tracking-normal text-muted-foreground",children:"Saved lists"}),null),n(oe,t(D,{get when(){return!G.isLoading},get fallback(){return t(Be,{label:"Loading saved job lists / \u4FDD\u5B58\u6E08\u307F\u4FC2\u30EA\u30B9\u30C8\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D"})},get children(){var d=qe();return n(d,t(ce,{get each(){return G.data||[]},get fallback(){return t(l,{as:"p",ja:"\u4FDD\u5B58\u6E08\u307F\u306E\u4FC2\u30EA\u30B9\u30C8\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002",class:"block py-8 text-sm text-muted-foreground",japaneseClass:"mt-1 block text-[0.86em]",children:"No saved job lists yet."})},children:m=>(()=>{var $=Qe(),k=$.firstChild,A=k.firstChild,N=A.firstChild,j=k.nextSibling;return n(k,t(Te,{class:"mt-0.5 h-4 w-4 shrink-0 text-primary"}),A),n(N,()=>m.title),n(A,t(l,{as:"p",get ja(){return`${pe(m)}\u30FB${(m.items||[]).length}\u4EF6`},class:"mt-1 block text-[10px] uppercase tracking-[0.1em] text-muted-foreground",japaneseClass:"ml-1.5 inline normal-case tracking-normal",layout:"inline",get children(){return[H(()=>pe(m))," \xB7 ",H(()=>(m.items||[]).length)," jobs"]}}),null),n(A,t(D,{get when(){return m.notes},get children(){var h=Ke();return n(h,()=>m.notes),h}}),null),n(j,t(w,{type:"button",size:"sm",variant:"outline",onClick:()=>X(m,m.id),get disabled(){var h;return!((h=m.items)!=null&&h.length)||J()===m.id},class:"min-h-9 rounded-sm border-primary/40 text-primary",get children(){return[t(D,{get when(){return J()===m.id},get fallback(){return t(me,{class:"h-3.5 w-3.5"})},get children(){return t(O,{class:"h-3.5 w-3.5 animate-spin"})}}),t(l,{ja:"PDF\u3068\u3057\u3066\u4FDD\u5B58",layout:"inline",children:"Save as PDF"})]}}),null),n(j,t(D,{get when(){return xe(m)},get children(){return t(w,{type:"button",size:"sm",variant:"ghost",onClick:()=>ye(m),get disabled(){return Y.isPending},class:"min-h-9 rounded-sm text-primary hover:bg-primary/10",get children(){return[t(Pe,{class:"h-3.5 w-3.5"}),t(l,{ja:"\u524A\u9664",layout:"inline",children:"Delete"})]}})}}),null),$})()})),d}}),null),u})()}export{bt as default};
