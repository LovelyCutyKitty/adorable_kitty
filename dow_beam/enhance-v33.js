/* 현황 탭 납기 달력: 한 개의 카드형 달력과 업체별 상세 */
const calendarStyle33=document.createElement('style');
calendarStyle33.textContent=`
.due-calendar33{margin:0 0 18px;padding:14px;background:#fff;border:1px solid #cfe0d7;border-radius:15px;box-shadow:0 2px 8px #173a2b08}
.due-calendar33-header{display:grid;grid-template-columns:34px 1fr 34px;align-items:center;gap:8px}
.due-calendar33-header strong{font-size:1.02rem;text-align:center}
.due-calendar33-nav{height:32px;border:1px solid #cbdcd3;background:#fff;color:#235342;border-radius:9px;font:inherit;font-size:1.1rem}
.due-calendar33-sub{margin:7px 0 12px;text-align:center;color:#60766d;font-size:.78rem}
.due-calendar33-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.due-calendar33-week{text-align:center;color:#60766d;font-size:.71rem;font-weight:750;padding:1px 0 4px}
.due-calendar33-cell{min-height:61px;border:1px solid #dce8e1;border-radius:8px;padding:5px;background:#fff;overflow:hidden}
.due-calendar33-cell.blank{border-color:transparent;background:transparent}
.due-calendar33-cell.has-event{background:#f8fbf9;border-color:#c5dbcf}
.due-calendar33-date{display:block;font-size:.75rem;font-weight:800;color:#597268;line-height:1}
.due-calendar33-today{border:1.5px solid #1d5a48!important;background:#f1f7f3!important}
.due-calendar33-company{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0;background:#e8f2ec;color:#235342;border-radius:5px;margin:4px 0 0;padding:3px 4px;font:inherit;font-size:.66rem;text-align:left}
.due-calendar33-company.late{background:#fff0ed;color:#b53f31}
.due-calendar33-more{display:block;margin-top:3px;color:#60766d;font-size:.65rem}
.due-calendar33-detail{margin:0 0 16px;padding:13px;border:1px solid #cfe0d7;border-radius:14px;background:#fff}
.due-calendar33-detail-head{display:flex;align-items:center;gap:7px;padding-bottom:9px;margin-bottom:10px;border-bottom:1px dashed #cbdcd3}
.due-calendar33-detail-head:before{content:'';width:4px;height:17px;border-radius:4px;background:#235342}
.due-calendar33-detail-head h3{font-size:1rem;margin:0}.due-calendar33-detail .line-card{margin:8px 0}
`;
document.head.append(calendarStyle33);
let calMonth33=null,calPick33=null,calRows33=[];
function calendarRows33(){
 const active=document.querySelector('#dashboardView .quick-filters button.active')?.textContent.trim()||'';
 let rows=data.orders.flatMap(o=>(o.lines||[]).filter(l=>n(l.shipped)<n(l.quantity)).map(l=>({o,l,date:l.dueDate||o.dueDate}))).filter(x=>x.date);
 if(active.includes('납기 7일')) rows=rows.filter(x=>Math.ceil((new Date(x.date)-new Date(today()))/86400000)<=7);
 if(active.includes('생산 계획 필요')){
   const needs=new Set(orderGaps().filter(x=>x.planGap>0).map(x=>x.o.id+'|'+x.l.id));
   rows=rows.filter(x=>needs.has(x.o.id+'|'+x.l.id));
 }
 return rows;
}
function drawCalendar33(){
 const box=$('#priorityList');if(!box)return;
 box.querySelectorAll('.due-calendar33,.due-calendar33-detail').forEach(x=>x.remove());
 const now=new Date(today()+'T00:00:00'),base=calMonth33?new Date(calMonth33+'T00:00:00'):now,first=new Date(base.getFullYear(),base.getMonth(),1),last=new Date(base.getFullYear(),base.getMonth()+1,0);
 calRows33=calendarRows33();const groups={};
 calRows33.forEach((x,i)=>((groups[x.date]??={})[x.o.company]??=[]).push(i));
 let cells=[];for(let i=0;i<first.getDay();i++)cells.push('<div class="due-calendar33-cell blank"></div>');
 for(let d=1;d<=last.getDate();d++){
   const key=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,companies=Object.keys(groups[key]||{}),late=key<today();
   cells.push(`<div class="due-calendar33-cell ${companies.length?'has-event':''} ${key===today()?'due-calendar33-today':''}"><span class="due-calendar33-date">${d}</span>${companies.slice(0,2).map(c=>`<button type="button" class="due-calendar33-company ${late?'late':''}" data-calpick33="${key}|${encodeURIComponent(c)}">${esc(c)}</button>`).join('')}${companies.length>2?`<small class="due-calendar33-more">+${companies.length-2}개사</small>`:''}</div>`);
 }
 const companyCount=new Set(calRows33.map(x=>x.o.company)).size;
 const calendar=`<section class="due-calendar33"><div class="due-calendar33-header"><button class="due-calendar33-nav" type="button" aria-label="이전 달" data-calnav33="-1">‹</button><strong>납기 달력 · ${base.getFullYear()}년 ${base.getMonth()+1}월</strong><button class="due-calendar33-nav" type="button" aria-label="다음 달" data-calnav33="1">›</button></div><p class="due-calendar33-sub">이번 달 납기 ${companyCount}개사 · 업체명을 누르면 제품별 상세를 확인합니다.</p><div class="due-calendar33-grid">${['일','월','화','수','목','금','토'].map(x=>`<div class="due-calendar33-week">${x}</div>`).join('')}${cells.join('')}</div></section>`;
 box.insertAdjacentHTML('afterbegin',calendar);
 if(calPick33){
   const [date,encoded]=calPick33.split('|'),company=decodeURIComponent(encoded),rows=calRows33.filter(x=>x.date===date&&x.o.company===company);
   if(rows.length)box.querySelector('.due-calendar33').insertAdjacentHTML('afterend',`<section class="due-calendar33-detail"><div class="due-calendar33-detail-head"><h3>${esc(date)} · ${esc(company)} 납기 상세</h3></div>${rows.map(x=>lineCard(x.o,x.l)).join('')}</section>`);
   else calPick33=null;
 }
}
document.addEventListener('click',e=>{
 const nav=e.target.closest('[data-calnav33]'),pick=e.target.closest('[data-calpick33]');
 if(nav){const b=calMonth33?new Date(calMonth33+'T00:00:00'):new Date(today()+'T00:00:00');b.setMonth(b.getMonth()+n(nav.dataset.calnav33));calMonth33=`${b.getFullYear()}-${String(b.getMonth()+1).padStart(2,'0')}-01`;calPick33=null;drawCalendar33();}
 if(pick){calPick33=pick.dataset.calpick33;drawCalendar33();}
 const filter=e.target.closest('#dashboardView .quick-filters button');if(filter)setTimeout(drawCalendar33,0);
});
const render33=render;render=()=>{render33();setTimeout(drawCalendar33,0)};setTimeout(drawCalendar33,0);
const master34Script=document.createElement('script');master34Script.async=false;master34Script.src='enhance-v34.js?rev=1';document.body.append(master34Script);
const master34Runtime=document.createElement('script');master34Runtime.async=false;master34Runtime.src='enhance-v34-runtime.js?rev=1';document.body.append(master34Runtime);
const match35=document.createElement('script');match35.async=false;match35.src='enhance-v35.js?rev=1';document.body.append(match35);
const taxonomy36=document.createElement('script');taxonomy36.async=false;taxonomy36.src='enhance-v36.js?rev=1';document.body.append(taxonomy36);
