/* 유연한 증감 입력과 변경 메시지 */
const changeStyle30=document.createElement('style');
changeStyle30.textContent=`.change-actions30{display:flex;gap:7px;flex-wrap:wrap;margin:11px 0}.change-actions30 button{margin:0!important}.change-log30{margin-top:10px;padding:9px 11px;background:#f5f8f6;border-radius:9px;color:#526d61;font-size:.82rem;line-height:1.55}.change-log30 strong{color:#235342}`;
document.head.append(changeStyle30);
document.body.insertAdjacentHTML('beforeend',`<dialog id="changeDialog30" class="dialog"><form id="changeForm30"><div class="dialog-head"><h2 id="changeTitle30">수량 변경</h2><button class="close" type="button" data-close>×</button></div><p id="changeInfo30" class="info"></p><label>변경 수량 <input id="changeAmount30" type="number" step="0.01" required placeholder="증가: 양수 / 감소·정정: 음수"></label><label>변경 사유 (선택)<input id="changeReason30" placeholder="예: 추가 발주, 수량 정정"></label><p class="edit-note">양수는 증가, 음수는 감소·정정으로 처리됩니다.</p><div class="actions"><button class="secondary" type="button" data-close>취소</button><button class="primary" type="submit">변경 반영</button></div></form></dialog>`);
const lineCard30=lineCard;
lineCard=(o,l)=>{
 const logs=(l.changeLog||[]).slice(-3).reverse();
 const body=`<div class="change-actions30"><button type="button" class="small-action" data-change30="${o.id}|${l.id}|order">발주수량 ± 변경</button><button type="button" class="small-action" data-change30="${o.id}|${l.id}|plan">생산예정 ± 변경</button><button type="button" class="small-action" data-change30="${o.id}|${l.id}|produced">생산완료 ± 정정</button><button type="button" class="small-action" data-change30="${o.id}|${l.id}|shipped">출고완료 ± 정정</button></div>${logs.length?`<div class="change-log30"><strong>최근 변경</strong><br>${logs.map(x=>esc(x)).join('<br>')}</div>`:''}`;
 return lineCard30(o,l).replace('</article>',body+'</article>');
};
let changeTarget30=null;
const labels30={order:'발주수량',plan:'생산예정',produced:'누적 생산완료',shipped:'누적 출고완료'};
function openChange30(ref){
 const [oid,lid,type]=ref.split('|'),o=data.orders.find(x=>x.id===oid),l=o?.lines.find(x=>x.id===lid);if(!o||!l)return;
 changeTarget30={o,l,type};const current=type==='order'?n(l.quantity):type==='plan'?n(l.planned):type==='produced'?n(l.orderProduced):n(l.shipped);
 $('#changeTitle30').textContent=`${labels30[type]} 변경`;$('#changeInfo30').textContent=`${l.name} · 현재 ${q(current)}${l.unit}`;$('#changeAmount30').value='';$('#changeReason30').value='';show('#changeDialog30');
}
document.addEventListener('click',e=>{const ref=e.target.closest('[data-change30]')?.dataset.change30;if(ref)openChange30(ref);});
$('#changeForm30').onsubmit=e=>{
 e.preventDefault();if(!changeTarget30)return;const {o,l,type}=changeTarget30,delta=n($('#changeAmount30').value),reason=$('#changeReason30').value.trim();if(!delta)return toast('변경 수량을 입력하세요.');
 const p=data.products.find(x=>x.id===l.productId),key=type==='order'?'quantity':type==='plan'?'planned':type==='produced'?'orderProduced':'shipped',before=n(l[key]),after=before+delta;
 if(type==='order')l.quantity=after;
 if(type==='plan')l.planned=Math.max(0,after);
 if(type==='produced'){l.orderProduced=after;p.produced=n(p.produced)+delta;l.planned=Math.max(0,n(l.planned)-delta);record(p,`생산완료 정정 ${delta>0?'+':''}${q(delta)}${l.unit}`);}
 if(type==='shipped'){l.shipped=after;p.shipped=n(p.shipped)+delta;record(p,`출고완료 정정 ${delta>0?'+':''}${q(delta)}${l.unit}`);}
 const actual=type==='plan'?n(l.planned):type==='order'?n(l.quantity):type==='produced'?n(l.orderProduced):n(l.shipped);
 const msg=`${labels30[type]}: ${q(before)}${l.unit} → ${q(actual)}${l.unit} (${delta>0?'+':''}${q(delta)}${l.unit})${reason?` · ${reason}`:''}`;
 (l.changeLog??=[]).push(msg);hide('#changeDialog30');save();toast(msg);
};
render();
