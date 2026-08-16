/* 현황 탭 납기 달력: 회사 선택 시 해당 발주 상세 펼치기 */
const calStyle31=document.createElement('style');
calStyle31.textContent=`.due-cal31{margin:4px 0 20px;padding:14px;background:#fff;border:1px solid #d9e6df;border-radius:14px}.due-cal31-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.due-cal31-head strong{font-size:1.03rem}.due-cal31-head button{border:1px solid #cbdcd3;border-radius:8px;background:#fff;padding:5px 9px;color:#235342;font:inherit}.due-cal31-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.due-cal31-dayname{text-align:center;font-size:.72rem;color:#60766d;padding:3px 0}.due-cal31-cell{min-height:68px;border:1px solid #e2ece6;border-radius:8px;padding:5px;overflow:hidden}.due-cal31-cell.empty{border:0}.due-cal31-date{display:block;font-size:.77rem;font-weight:800;color:#597268;margin-bottom:3px}.due-cal31-cell.today{border-color:#235342;background:#f3f8f5}.due-cal31-cell.alert{background:#fff7f5;border-color:#efb7ad}.due-cal31-company{display:block;width:100%;border:0;background:#edf4f0;color:#235342;border-radius:5px;padding:3px 4px;margin:2px 0;text-align:left;font:inherit;font-size:.68rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.due-cal31-company.alert{background:#fff0ed;color:#b53f31}.due-cal31-more{font-size:.68rem;color:#60766d;padding:2px}.due-detail31{margin:0 0 14px}.due-detail31 h3{margin:12px 0 7px;font-size:1rem}.due-detail31 .line-card{margin:7px 0}`;
document.head.append(calStyle31);
let calendarMonth31=null,calendarPick31=null;
function dateKey31(d){return d.toISOString().slice(0,10)}
function dueRows31(){
 const rows=[];data.orders.filter(o=>!done(o)).forEach(o=>o.lines.filter(l=>n(l.shipped)<n(l.quantity)).forEach(l=>{const dueDate=l.dueDate||o.dueDate;if(dueDate)rows.push({o,l,dueDate});}));return rows;
}
function calendarHtml31(){
 const base=calendarMonth31?new Date(calendarMonth31+'T00:00:00'):new Date(today()+'T00:00:00');const first=new Date(base.getFullYear(),base.getMonth(),1),last=new Date(base.getFullYear(),base.getMonth()+1,0),rows=dueRows31(),now=today();
 const events={};rows.forEach(x=>(events[x.dueDate]??=[]).push(x));
 const cells=[];for(let i=0;i<first.getDay();i++)cells.push('<div class="due-cal31-cell empty"></div>');
 for(let d=1;d<=last.getDate();d++){const key=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,es=events[key]||[],companies=[...new Map(es.map(x=>[x.o.company,x])).values()],alert=key<=now&&companies.length;cells.push(`<div class="due-cal31-cell ${key===now?'today':''} ${alert?'alert':''}"><span class="due-cal31-date">${d}</span>${companies.slice(0,2).map(x=>`<button type="button" class="due-cal31-company ${key<=now?'alert':''}" data-due-company31="${key}|${esc(x.o.company)}">${esc(x.o.company)}</button>`).join('')}${companies.length>2?`<div class="due-cal31-more">+${companies.length-2}개사</div>`:''}</div>`);}
 const label=`${base.getFullYear()}년 ${base.getMonth()+1}월`;
 return `<section class="due-cal31"><div class="due-cal31-head"><button type="button" data-cal-month31="-1">‹</button><strong>납기 달력 · ${label}</strong><button type="button" data-cal-month31="1">›</button></div><div class="due-cal31-grid">${['일','월','화','수','목','금','토'].map(x=>`<div class="due-cal31-dayname">${x}</div>`).join('')}${cells.join('')}</div></section>`;
}
function pickedHtml31(){
 if(!calendarPick31)return '';const [date,company]=calendarPick31.split('|'),rows=dueRows31().filter(x=>x.dueDate===date&&x.o.company===company);return `<section class="due-detail31"><h3>${esc(date)} · ${esc(company)} 납기 상세</h3>${rows.map(x=>lineCard(x.o,x.l)).join('')}</section>`;
}
const priority31=priority;
priority=()=>{priority31();const p=$('#priorityList');if(!p)return;p.querySelectorAll('.due-cal31,.due-detail31').forEach(x=>x.remove());p.insertAdjacentHTML('afterbegin',calendarHtml31()+pickedHtml31());};
document.addEventListener('click',e=>{const b=e.target.closest('[data-cal-month31],[data-due-company31]');if(!b)return;if(b.dataset.calMonth31){const now=calendarMonth31?new Date(calendarMonth31+'T00:00:00'):new Date(today()+'T00:00:00');now.setMonth(now.getMonth()+n(b.dataset.calMonth31));calendarMonth31=dateKey31(new Date(now.getFullYear(),now.getMonth(),1));calendarPick31=null;render();}if(b.dataset.dueCompany31){calendarPick31=b.dataset.dueCompany31;render();}});
render();
