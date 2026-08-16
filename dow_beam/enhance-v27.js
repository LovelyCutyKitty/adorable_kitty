/* 발주 오입력 정정: 기존 수정 기능과 분리한 삭제 기능 */
const deleteStyle27=document.createElement('style');
deleteStyle27.textContent=`.delete-action27{margin:8px 0 0;border:1px solid #efb7ad!important;color:#b53f31!important;background:#fff;border-radius:9px;padding:8px 10px;font:inherit;font-size:.86rem;font-weight:800}.line-delete27{margin-top:10px}`;
document.head.append(deleteStyle27);

const orderHtmlDelete27=orderHtml;
orderHtml=(o,dash=false)=>orderHtmlDelete27(o,dash).replace('</summary>',`</summary><button type="button" class="delete-action27" data-order-delete="${o.id}">발주 삭제</button>`);

const lineCardDelete27=lineCard;
lineCard=(o,l)=>lineCardDelete27(o,l).replace('</article>',`<button type="button" class="delete-action27 line-delete27" data-line-delete="${o.id}|${l.id}">제품 삭제</button></article>`);

function deleteOrder27(id){
  const o=data.orders.find(x=>x.id===id);if(!o)return;
  if(!confirm(`${o.company} · ${o.orderDate} 발주를 삭제할까요?\n생산·출고 수량이 있으면 공장 재고도 함께 되돌립니다.`))return;
  o.lines.forEach(l=>{const p=data.products.find(x=>x.id===l.productId);if(p){p.produced=n(p.produced)-n(l.orderProduced);p.shipped=n(p.shipped)-n(l.shipped);}});
  data.orders=data.orders.filter(x=>x.id!==id);save();toast('발주를 삭제했습니다.');
}
function deleteLine27(ref){
  const [oid,lid]=ref.split('|'),o=data.orders.find(x=>x.id===oid),l=o?.lines.find(x=>x.id===lid);if(!o||!l)return;
  if(!confirm(`${l.name} · ${l.spec} 품목을 삭제할까요?\n생산·출고 수량이 있으면 공장 재고도 함께 되돌립니다.`))return;
  const p=data.products.find(x=>x.id===l.productId);if(p){p.produced=n(p.produced)-n(l.orderProduced);p.shipped=n(p.shipped)-n(l.shipped);}
  o.lines=o.lines.filter(x=>x.id!==lid);if(!o.lines.length)data.orders=data.orders.filter(x=>x.id!==oid);save();toast('발주 품목을 삭제했습니다.');
}
document.addEventListener('click',e=>{const d=e.target.closest('[data-order-delete],[data-line-delete]')?.dataset||{};if(d.orderDelete)deleteOrder27(d.orderDelete);if(d.lineDelete)deleteLine27(d.lineDelete);});
render();

/* 발주 묶음과 개별 제품 작업의 시각적 구분 */
const scopeStyle27=document.createElement('style');
scopeStyle27.textContent=`.scope27{display:flex;align-items:center;gap:7px;margin:11px 0 8px;font-size:.78rem;font-weight:850;letter-spacing:.02em}.scope27:before{content:'';width:4px;height:16px;border-radius:4px}.scope27-order{color:#235342}.scope27-order:before{background:#235342}.scope27-line{color:#60766d;border-top:1px dashed #cbdcd3;padding-top:13px;margin-top:15px}.scope27-line:before{background:#8aa69a}.period>.order-edit,.period>.delete-action27{margin-top:0!important}.line-card .delete-action27{margin-top:8px!important}`;
document.head.append(scopeStyle27);
const orderHtmlScope27=orderHtml;
orderHtml=(o,dash=false)=>orderHtmlScope27(o,dash).replace('</summary>','</summary><div class="scope27 scope27-order">전체 발주 정보</div>');
const lineCardScope27=lineCard;
lineCard=(o,l)=>lineCardScope27(o,l).replace('<h3>','<div class="scope27 scope27-line">제품별 작업</div><h3>');
render();
