import{c as s,m as K,I as U,g as C,A as J,d as r,a6 as q,n as E,h as B,j as V,aN as Q,T as z,u as X,y as L,q as Z,w as S,t as $,l as ee}from"./index-ZCbwsc5i.js";import{a as te}from"./geminiClient-BVqZFwhM.js";import{g as ne,f as R}from"./weeks-aJhN0HD0.js";import{m as ae}from"./minimize-2-DaW9VVZh.js";import{s as se}from"./send-CZpOKA9R.js";var le=[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],ie=o=>s(U,K(o,{iconNode:le,name:"sparkles"})),W=ie,re=$('<button title="MABIS Omni AI Assistant"style=background:hsl(var(--primary))>'),oe=$('<div class="flex gap-3"><div class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"style=background:hsl(var(--primary))></div><div class="flex items-center gap-1 h-6"><span class="w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce"style=animation-delay:0ms></span><span class="w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce"style=animation-delay:150ms></span><span class="w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce"style=animation-delay:300ms>'),ce=$('<div class="max-w-[46rem] mx-auto w-full px-5 py-6 space-y-6"><div>'),de=$('<div class="assistant-pop mobile-assistant-panel fixed bottom-24 right-6 z-[60] rounded-2xl shadow-2xl border border-black/10 flex flex-col overflow-hidden"style=background:#F5F4EE;padding-bottom:env(safe-area-inset-bottom)><div class="px-4 h-12 flex items-center gap-2 shrink-0 border-b border-black/5"><img src=https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp alt=MABIS class="w-6 h-6 object-contain"><p class="flex-1 text-[13px] font-medium text-[#3D3929]">MABIS Assistant</p><button class="text-[#3D3929]/50 hover:text-[#3D3929] p-1"></button><button class="text-[#3D3929]/50 hover:text-[#3D3929] p-1"></button></div><div class="flex-1 overflow-y-auto"></div><div class="shrink-0 px-4 pb-4 pt-1"><div class="max-w-[46rem] mx-auto w-full rounded-2xl bg-card border border-black/10 shadow-sm p-2.5 focus-within:border-black/20 transition-colors"><textarea rows=2 placeholder="Reply to MABIS Assistant…"class="w-full resize-none bg-transparent px-1.5 text-[14px] leading-relaxed text-[#3D3929] placeholder:text-[#3D3929]/40 focus:outline-none disabled:opacity-50"></textarea><div class="flex justify-end"><button class="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground shrink-0 disabled:opacity-30 transition-opacity"style=background:hsl(var(--primary))>'),he=$('<div class="h-full flex flex-col justify-center px-6 max-w-[46rem] mx-auto w-full"><div class="flex items-center gap-2.5 mb-6"><h2 class="text-[26px] leading-none text-[#3D3929]"style=font-family:var(--font-heading)>How can I help?</h2></div><div class="flex flex-col divide-y divide-black/5 border-y border-black/5">'),ue=$('<button class="text-left text-[13px] text-[#3D3929]/75 hover:text-[#3D3929] px-1 py-3 transition-colors">'),fe=$('<div class="flex justify-end"><div class="max-w-[80%] rounded-xl bg-card border border-black/5 px-3.5 py-2.5 text-[14px] leading-relaxed text-[#3D3929] whitespace-pre-wrap">'),pe=$('<div class="flex gap-3"><div class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"style=background:hsl(var(--primary))></div><div class="flex-1 text-[14.5px] leading-[1.7] text-[#3D3929] whitespace-pre-wrap">');const me=["What's on the agenda this week?","What did we discuss last meeting?","Who's on jobs this week?","Any announcements I should know about?"],O=o=>(o||"").replace(/<[^>]+>/g,"");function ge(o,N,w,I,b,y,x){const v=ne(new Date),m=o.filter(e=>e.week_label===v&&!e.archived&&e.title!=="__meeting_notes__"),D=o.filter(e=>e.archived&&e.title!=="__meeting_ended__"),g=[...new Set(D.map(e=>e.week_label))].sort().reverse(),_=w.filter(e=>e.week_label===v),M=o.find(e=>e.week_label===v&&e.title==="__meeting_notes__");let t=`Current Week: ${R(v)}

`;if(t+=`MEMBERS (${N.length}):
`,N.forEach(e=>{t+=`- ${e.name} (${e.role||"student"})
`}),t+=`
THIS WEEK'S TOPICS (${m.length}):
`,m.length===0&&(t+=`  None yet.
`),m.forEach(e=>{t+=`- [${e.completed?"DONE":"PENDING"}] "${e.title}" (by ${e.submitted_by}, priority ${e.priority||3})
`,e.description&&(t+=`    ${O(e.description).slice(0,300)}
`)}),M&&M.description&&(t+=`
THIS WEEK'S MEETING NOTES:
${O(M.description).slice(0,1e3)}
`),t+=`
JOB ASSIGNMENTS THIS WEEK (${_.length}):
`,_.length===0&&(t+=`  None yet.
`),_.forEach(e=>{const l=(e.days_completed||[]).length,p=(e.not_done_days||[]).length;t+=`- ${e.job_title} -> ${e.assigned_to_name} (done: ${l} days, not done: ${p} days)
`}),t+=`
ANNOUNCEMENTS (${I.length}):
`,I.length===0&&(t+=`  None.
`),I.slice(0,10).forEach(e=>{t+=`- "${e.title}" by ${e.author_name}${e.pinned?" [PINNED]":""}
`}),y&&y.length>0&&(t+=`
NEWS (${y.length}):
`,y.slice(0,10).forEach(e=>{t+=`- "${e.title}" by ${e.author_name}
`})),x&&x.length>0){const e=x.filter(l=>!l.found);e.length>0&&(t+=`
MISSING ITEMS (${e.length} still lost):
`,e.slice(0,10).forEach(l=>{t+=`- ${l.item_name} (${l.colors||"unknown color"}) reported by ${l.reported_by_name}
`}))}return t+=`
=== PAST MEETING HISTORY (${g.length} archived weeks) ===
`,g.length===0&&(t+=`  None yet.
`),g.forEach(e=>{const l=D.filter(a=>a.week_label===e),p=o.find(a=>a.week_label===e&&a.title==="__meeting_notes__");t+=`  ${R(e)} (${l.length} topics):
`,l.forEach(a=>{t+=`    - [${a.completed?"DONE":"PENDING"}] "${a.title}" (by ${a.submitted_by})
`,a.description&&(t+=`      ${O(a.description).slice(0,200)}
`)}),p&&p.description&&(t+=`    Notes: ${O(p.description).slice(0,500)}
`)}),b.length>0&&(t+=`
SCHEDULED MEETINGS (${b.length}):
`,b.forEach(e=>{t+=`- ${e.title} (${e.date}) [${e.status}]
`})),t}function ve(){const[o,N]=C(!1),[w,I]=C(!1),[b,y]=C([]),[x,v]=C(""),[m,D]=C(!1);let g;J(()=>{b(),m(),g==null||g.scrollIntoView({behavior:"smooth"})});const _=async e=>{const l=e.trim();if(!l||m())return;const p=b().slice(-10);y(a=>[...a,{role:"user",content:l}]),v(""),D(!0);try{const a=await Promise.allSettled([S.entities.DiscussionTopic.list("-created_date",1e3),S.entities.Member.list("name",200),S.entities.JobAssignment.list("-created_date",500),S.entities.Announcement.list("-created_date",50),S.entities.Meeting.list("-date",50),S.entities.NewsItem.list("-created_date",50),S.entities.MissingItem.list("-created_date",50)]),h=c=>a[c].status==="fulfilled"?a[c].value:[],T=ge(h(0),h(1),h(2),h(3),h(4),h(5),h(6)),j=p.map(c=>`${c.role==="user"?"User":"You"}: ${c.content}`).join(`
`),G=`You are the MABIS assistant for the weekly community meeting platform at Montessori Academy Bangkok International School. You think and write exactly like Claude.

VOICE — write the way Claude does, without exception:
- Warm, direct and genuinely curious. You have opinions and share them, but you hold them lightly.
- Lead with the answer. No preamble, no "Great question!", no "Certainly!", no restating what was asked.
- Plain, precise prose. Contractions throughout. No corporate filler, no hype words like "delve", "dive in", "unlock", "seamless", "elevate".
- Match length to the question: a one-line question gets a one-line answer; something genuinely complex gets a few short paragraphs. Never pad.
- Prose by default. Only use bullets or headings when the content is genuinely a list, and never for two or three items.
- No emoji unless the person uses them first. No exclamation marks stacked on for enthusiasm.
- Be honest about uncertainty — say "I'm not sure" or "I don't have that in the data" rather than guessing, and never invent names, dates or decisions that aren't in the platform data.
- Push back politely when something looks wrong, and say so plainly rather than agreeing to be agreeable.
- Don't moralise, don't lecture, don't close every reply with "let me know if you need anything else".
- Ask a clarifying question only when you truly can't answer without it — otherwise make a reasonable assumption and say what you assumed.
- You can talk about anything, not just this platform.

=== PLATFORM DATA ===
${T}

=== RECENT CHAT ===
${j||"(just started)"}`,A=await te({prompt:l,systemInstruction:G,history:p,useSearch:!0});y(c=>[...c,{role:"assistant",content:typeof A=="string"?A:String(A)}])}catch{y(a=>[...a,{role:"assistant",content:"Sorry, something went wrong on my end. Give me a sec and try again?"}])}D(!1)},M=()=>w()?720:420,t=()=>w()?"82vh":"620px";return[(()=>{var e=re();return e.$$click=()=>N(!o()),r(e,s(E,{get when(){return o()},get fallback(){return s(W,{class:"w-6 h-6"})},get children(){return s(q,{class:"w-6 h-6"})}})),B(()=>V(e,`assistant-fab mobile-fab mobile-fab-right fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-primary-foreground border-2 border-primary-foreground ${o()?"mobile-fab-open":""}`)),e})(),s(E,{get when(){return o()},get children(){var e=de(),l=e.firstChild,p=l.firstChild,a=p.nextSibling,h=a.nextSibling,T=h.nextSibling,j=l.nextSibling,G=j.nextSibling,A=G.firstChild,c=A.firstChild,Y=c.nextSibling,P=Y.firstChild;return h.$$click=()=>I(!w()),r(h,s(E,{get when(){return w()},get fallback(){return s(Q,{class:"w-4 h-4"})},get children(){return s(ae,{class:"w-4 h-4"})}})),T.$$click=()=>N(!1),r(T,s(q,{class:"w-4 h-4"})),r(j,s(E,{get when(){return b().length>0},get fallback(){return(()=>{var n=he(),u=n.firstChild,k=u.firstChild,f=u.nextSibling;return r(u,s(W,{class:"w-5 h-5",style:{color:"hsl(var(--primary))"}}),k),r(f,s(z,{each:me,children:i=>(()=>{var d=ue();return d.$$click=()=>_(i()),r(d,i),d})()})),n})()},get children(){var n=ce(),u=n.firstChild;r(n,s(z,{get each(){return b()},children:f=>s(E,{get when(){return f().role==="user"},get fallback(){return(()=>{var i=pe(),d=i.firstChild,H=d.nextSibling;return r(d,s(W,{class:"w-3 h-3 text-primary-foreground"})),r(H,()=>f().content),i})()},get children(){var i=fe(),d=i.firstChild;return r(d,()=>f().content),i}})}),u),r(n,s(E,{get when(){return m()},get children(){var f=oe(),i=f.firstChild,d=i.nextSibling,H=d.firstChild,F=H.nextSibling;return F.nextSibling,r(i,s(W,{class:"w-3 h-3 text-primary-foreground"})),f}}),u);var k=g;return typeof k=="function"?X(k,u):g=u,n}})),c.$$keydown=n=>{n.key==="Enter"&&!n.shiftKey&&(n.preventDefault(),_(x()))},c.$$input=n=>v(n.currentTarget.value),P.$$click=()=>_(x()),r(P,s(se,{class:"w-3.5 h-3.5"})),B(n=>{var u=`min(${M()}px, calc(100vw - 3rem))`,k=`min(${t()}, 78vh)`,f=w()?"Shrink":"Expand",i=m(),d=m()||!x().trim();return u!==n.e&&L(e,"width",n.e=u),k!==n.t&&L(e,"height",n.t=k),f!==n.a&&Z(h,"title",n.a=f),i!==n.o&&(c.disabled=n.o=i),d!==n.i&&(P.disabled=n.i=d),n},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0}),B(()=>c.value=x()),e}})]}ee(["click","input","keydown"]);export{ve as default};
