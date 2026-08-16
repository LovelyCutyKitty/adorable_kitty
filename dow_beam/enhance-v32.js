/* 현황 빠른 필터와 납기달력 동기화 */
let calendarFilter32='';
const dueRows32=dueRows31;
dueRows31=()=>{
 const rows=dueRows32();
 if(calendarFilter32==='soon')return rows.filter(x=>{const d=Math.ceil((new Date(x.dueDate)-new Date(today()))/86400000);return d<=7;});
 if(calendarFilter32==='plan'){
   const gaps=new Set(orderGaps().filter(x=>x.planGap>0).map(x=>x.o.id+'|'+x.l.id));
   return rows.filter(x=>gaps.has(x.o.id+'|'+x.l.id));
 }
 return rows;
};
const calendarHtml32=calendarHtml31;
calendarHtml31=()=>calendarHtml32().replace('납기 달력 · ','납기 달력'+(calendarFilter32==='soon'?' · 납기 7일 이내 · ':calendarFilter32==='plan'?' · 생산 계획 필요 · ':' · '));
document.addEventListener('click',e=>{
 const btn=e.target.closest('#dashboardView .quick-filters button');if(!btn)return;
 setTimeout(()=>{const active=$('#dashboardView .quick-filters button.active');const text=active?.textContent.trim()||'';calendarFilter32=text.includes('납기 7일')?'soon':text.includes('생산 계획 필요')?'plan':'';priority();},0);
});
