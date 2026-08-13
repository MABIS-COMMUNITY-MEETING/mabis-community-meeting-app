import{r as x,j as t,X as D,b as y}from"./index-CJ78PdKL.js";import{b as G}from"./geminiClient-Drxprip6.js";import{m as E}from"./proxy-CYTxnAK-.js";import{d as v}from"./Home-Bu-PBpgV.js";import{A as P}from"./index-E9bdiC5w.js";import{M as B}from"./minimize-2-OTYu8sEN.js";import{M as H}from"./maximize-2-8JWveVpN.js";import{S as R}from"./send-D7B9C2_c.js";import{f as L}from"./format-Buwytaxw.js";import"./useQuery-CzrYsJtb.js";import"./PageFooter-B_iRR7Me.js";import"./plus-QXkVYXmA.js";import"./arrow-up-right-DzoTadwX.js";import"./use-transform-OZqpKyhf.js";import"./PasswordModal-B6sZjn5X.js";import"./lock-B1xWNkKE.js";import"./nextFriday-Bl3x0cY2.js";import"./loader-circle-BNDowO4f.js";import"./star-C365Fb7d.js";import"./trash-2-CfCiKV01.js";const Y="/images/mabis-logo-128.webp",F=["What's on the agenda this week?","What did we discuss last meeting?","Who's on jobs this week?","Any announcements I should know about?"];function z(){const o=new Date,h=o.getDay(),m=new Date(o);m.setDate(o.getDate()+(5-h+7)%7);const l=m.getFullYear(),r=new Date(l,0,4),i=new Date(r);i.setDate(r.getDate()-(r.getDay()+6)%7);const c=Math.ceil(((m-i)/864e5+1)/7);return`${l}-W${String(c).padStart(2,"0")}`}function K(o){const[h,m]=o.split("-W"),l=parseInt(m),r=new Date(parseInt(h),0,4),i=new Date(r);i.setDate(r.getDate()-(r.getDay()+6)%7);const c=new Date(i);return c.setDate(i.getDate()+(l-1)*7+4),c}function $(o){try{return L(K(o),"MMMM do, yyyy")}catch{return o}}function q(o,h,m,l,r,i,c){const u=z(),g=o.filter(e=>e.week_label===u&&!e.archived&&e.title!=="__meeting_notes__"),p=o.filter(e=>e.archived&&e.title!=="__meeting_ended__"),w=[...new Set(p.map(e=>e.week_label))].sort().reverse(),b=m.filter(e=>e.week_label===u),f=o.find(e=>e.week_label===u&&e.title==="__meeting_notes__");let a=`Current Week: ${$(u)}

`;if(a+=`MEMBERS (${h.length}):
`,h.forEach(e=>{a+=`- ${e.name} (${e.role||"student"})
`}),a+=`
THIS WEEK'S TOPICS (${g.length}):
`,g.length===0&&(a+=`  None yet.
`),g.forEach(e=>{a+=`- [${e.completed?"DONE":"PENDING"}] "${e.title}" (by ${e.submitted_by}, priority ${e.priority||3})
`,e.description&&(a+=`    ${(e.description||"").replace(/<[^>]+>/g,"").slice(0,300)}
`)}),f&&f.description&&(a+=`
THIS WEEK'S MEETING NOTES:
${(f.description||"").replace(/<[^>]+>/g,"").slice(0,1e3)}
`),a+=`
JOB ASSIGNMENTS THIS WEEK (${b.length}):
`,b.length===0&&(a+=`  None yet.
`),b.forEach(e=>{const s=(e.days_completed||[]).length,d=(e.not_done_days||[]).length;a+=`- ${e.job_title} -> ${e.assigned_to_name} (done: ${s} days, not done: ${d} days)
`}),a+=`
ANNOUNCEMENTS (${l.length}):
`,l.length===0&&(a+=`  None.
`),l.slice(0,10).forEach(e=>{a+=`- "${e.title}" by ${e.author_name}${e.pinned?" [PINNED]":""}
`}),i&&i.length>0&&(a+=`
NEWS (${i.length}):
`,i.slice(0,10).forEach(e=>{a+=`- "${e.title}" by ${e.author_name}
`})),c&&c.length>0){const e=c.filter(s=>!s.found);e.length>0&&(a+=`
MISSING ITEMS (${e.length} still lost):
`,e.slice(0,10).forEach(s=>{a+=`- ${s.item_name} (${s.colors||"unknown color"}) reported by ${s.reported_by_name}
`}))}return a+=`
=== PAST MEETING HISTORY (${w.length} archived weeks) ===
`,w.length===0&&(a+=`  None yet.
`),w.forEach(e=>{const s=p.filter(n=>n.week_label===e),d=o.find(n=>n.week_label===e&&n.title==="__meeting_notes__");a+=`  ${$(e)} (${s.length} topics):
`,s.forEach(n=>{a+=`    - [${n.completed?"DONE":"PENDING"}] "${n.title}" (by ${n.submitted_by})
`,n.description&&(a+=`      ${(n.description||"").replace(/<[^>]+>/g,"").slice(0,200)}
`)}),d&&d.description&&(a+=`    Notes: ${(d.description||"").replace(/<[^>]+>/g,"").slice(0,500)}
`)}),r.length>0&&(a+=`
SCHEDULED MEETINGS (${r.length}):
`,r.forEach(e=>{a+=`- ${e.title} (${e.date}) [${e.status}]
`})),a}function pe({defaultOpen:o=!1}){const[h,m]=x.useState(o),[l,r]=x.useState(!1),[i,c]=x.useState([]),[u,g]=x.useState(""),[p,w]=x.useState(!1),b=x.useRef(null);x.useEffect(()=>{var s;(s=b.current)==null||s.scrollIntoView({behavior:"smooth"})},[i,p]);const f=async s=>{const d=s.trim();if(!(!d||p)){c(n=>[...n,{role:"user",content:d}]),g(""),w(!0);try{const n=await Promise.allSettled([y.entities.DiscussionTopic.list("-created_date",1e3),y.entities.Member.list("name",200),y.entities.JobAssignment.list("-created_date",500),y.entities.Announcement.list("-created_date",50),y.entities.Meeting.list("-date",50),y.entities.NewsItem.list("-created_date",50),y.entities.MissingItem.list("-created_date",50)]),k=n[0].status==="fulfilled"?n[0].value:[],S=n[1].status==="fulfilled"?n[1].value:[],_=n[2].status==="fulfilled"?n[2].value:[],I=n[3].status==="fulfilled"?n[3].value:[],M=n[4].status==="fulfilled"?n[4].value:[],A=n[5].status==="fulfilled"?n[5].value:[],T=n[6].status==="fulfilled"?n[6].value:[],C=q(k,S,_,I,M,A,T),O=i.slice(-10).map(N=>`${N.role==="user"?"User":"You"}: ${N.content}`).join(`
`),W=`You are the MABIS assistant for the weekly community meeting platform at Montessori Academy Bangkok International School. You think and write exactly like Claude.

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
${C}

=== RECENT CHAT ===
${O||"(just started)"}`,j=await G({prompt:d,systemInstruction:W,history:i.slice(-10),useSearch:!0});c(N=>[...N,{role:"assistant",content:typeof j=="string"?j:String(j)}])}catch{c(k=>[...k,{role:"assistant",content:"Sorry, something went wrong on my end. Give me a sec and try again?"}])}w(!1)}},a=l?720:420,e=l?"82vh":"620px";return t.jsxs(t.Fragment,{children:[t.jsx(E.button,{onClick:()=>m(!h),whileHover:{scale:1.1},whileTap:{scale:.95},className:`mobile-fab mobile-fab-right fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white border-2 border-white ${h?"mobile-fab-open":""}`,style:{background:"hsl(var(--primary))"},title:"MABIS Omni AI Assistant",children:h?t.jsx(D,{className:"w-6 h-6"}):t.jsx(v,{className:"w-6 h-6"})}),t.jsx(P,{children:h&&t.jsxs(E.div,{initial:{opacity:0,y:20,scale:.95},animate:{opacity:1,y:0,scale:1},exit:{opacity:0,y:20,scale:.95},transition:{duration:.2},className:"mobile-assistant-panel fixed bottom-24 right-6 z-[60] rounded-2xl shadow-2xl border border-black/10 flex flex-col overflow-hidden",style:{width:`min(${a}px, calc(100vw - 3rem))`,height:`min(${e}, 78vh)`,background:"#F5F4EE",paddingBottom:"env(safe-area-inset-bottom)"},children:[t.jsxs("div",{className:"px-4 h-12 flex items-center gap-2 shrink-0 border-b border-black/5",children:[t.jsx("img",{src:Y,alt:"MABIS",className:"w-6 h-6 object-contain"}),t.jsx("p",{className:"flex-1 text-[13px] font-medium text-[#3D3929]",children:"MABIS Assistant"}),t.jsx("button",{onClick:()=>r(!l),className:"text-[#3D3929]/50 hover:text-[#3D3929] p-1",title:l?"Shrink":"Expand",children:l?t.jsx(B,{className:"w-4 h-4"}):t.jsx(H,{className:"w-4 h-4"})}),t.jsx("button",{onClick:()=>m(!1),className:"text-[#3D3929]/50 hover:text-[#3D3929] p-1",children:t.jsx(D,{className:"w-4 h-4"})})]}),t.jsx("div",{className:"flex-1 overflow-y-auto",children:i.length===0?t.jsxs("div",{className:"h-full flex flex-col justify-center px-6 max-w-[46rem] mx-auto w-full",children:[t.jsxs("div",{className:"flex items-center gap-2.5 mb-6",children:[t.jsx(v,{className:"w-5 h-5",style:{color:"hsl(var(--primary))"}}),t.jsx("h2",{className:"text-[26px] leading-none text-[#3D3929]",style:{fontFamily:"var(--font-heading)"},children:"How can I help?"})]}),t.jsx("div",{className:"flex flex-col divide-y divide-black/5 border-y border-black/5",children:F.map(s=>t.jsx("button",{onClick:()=>f(s),className:"text-left text-[13px] text-[#3D3929]/75 hover:text-[#3D3929] px-1 py-3 transition-colors",children:s},s))})]}):t.jsxs("div",{className:"max-w-[46rem] mx-auto w-full px-5 py-6 space-y-6",children:[i.map((s,d)=>s.role==="user"?t.jsx("div",{className:"flex justify-end",children:t.jsx("div",{className:"max-w-[80%] rounded-xl bg-white border border-black/5 px-3.5 py-2.5 text-[14px] leading-relaxed text-[#3D3929] whitespace-pre-wrap",children:s.content})},d):t.jsxs("div",{className:"flex gap-3",children:[t.jsx("div",{className:"w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5",style:{background:"hsl(var(--primary))"},children:t.jsx(v,{className:"w-3 h-3 text-white"})}),t.jsx("div",{className:"flex-1 text-[14.5px] leading-[1.7] text-[#3D3929] whitespace-pre-wrap",children:s.content})]},d)),p&&t.jsxs("div",{className:"flex gap-3",children:[t.jsx("div",{className:"w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5",style:{background:"hsl(var(--primary))"},children:t.jsx(v,{className:"w-3 h-3 text-white"})}),t.jsxs("div",{className:"flex items-center gap-1 h-6",children:[t.jsx("span",{className:"w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce",style:{animationDelay:"0ms"}}),t.jsx("span",{className:"w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce",style:{animationDelay:"150ms"}}),t.jsx("span",{className:"w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce",style:{animationDelay:"300ms"}})]})]}),t.jsx("div",{ref:b})]})}),t.jsx("div",{className:"shrink-0 px-4 pb-4 pt-1",children:t.jsxs("div",{className:"max-w-[46rem] mx-auto w-full rounded-2xl bg-white border border-black/10 shadow-sm p-2.5 focus-within:border-black/20 transition-colors",children:[t.jsx("textarea",{value:u,onChange:s=>g(s.target.value),onKeyDown:s=>{s.key==="Enter"&&!s.shiftKey&&(s.preventDefault(),f(u))},rows:2,placeholder:"Reply to MABIS Assistant…",disabled:p,className:"w-full resize-none bg-transparent px-1.5 text-[14px] leading-relaxed text-[#3D3929] placeholder:text-[#3D3929]/40 focus:outline-none disabled:opacity-50"}),t.jsx("div",{className:"flex justify-end",children:t.jsx("button",{onClick:()=>f(u),disabled:p||!u.trim(),className:"w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 disabled:opacity-30 transition-opacity",style:{background:"hsl(var(--primary))"},children:t.jsx(R,{className:"w-3.5 h-3.5"})})})]})})]})})]})}export{pe as default};
