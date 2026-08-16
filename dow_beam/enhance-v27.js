/* 발주 오입력 정정: 발주/제품 수정·삭제 */
const orderEditStyle27=document.createElement('style');
orderEditStyle27.textContent=`.order-actions27{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.danger27{border-color:#efb7ad!important;color:#b53f31!important}.line-edit27{margin-top:9px}`;
document.head.append(orderEditStyle27);

function orderButtons27(o){
  return `<div class="order-actions27"><button type="button" class="small-action" data-order-edit="${o.id}">발주 정보 수정</button><button type="button" class="small-action danger27" data-order-delete="${o.id}">발주 삭제</button></div>`;
}
const orderHtml27=orderHtml;
orderHtml=(o,dash=false)=>orderHtml27(o,dash).replace(/(<\\/summary>)/,`$1${orderButtons27(o)}`);

const lineCard27=lineCard;
lineCard=(o,l)=>lineCard27(o,l).replace('</article>',`<div class="order-actions27 line-edit27"><button type="button" class="small-action" data-line-edit="${o.id}|${l.id}">제품·수량 수정</button><button type="button" class="small-action danger27" data-line-delete="${o.id}|${l.id}">제품 삭제</button></div></article>`);

document.body.insertAdjacentHTML('beforeend',`
<dialog id="orderEditDialog27" class="dialog"><form id="orderEditForm27"><div class="dialog-head"><h2>발주 정보 수정</h2><button class="close" type="button" data-close>×</button></div><label>발주처<input id="orderEditCompany27" required></label><div class="two"><label>발주일<input id="orderEditDate27" type="date" required></label><label>전체 납기일<input id="orderEditDue27" type="date"></label></div><label>발송 요청 / 메모<input id="orderEditMemo27"></label><div class="actions"><button class="secondary" type="button" data-close>취소</button><button class="primary" type="submit">변경 저장</button></div></form></dialog>
<dialog id="lineEditDialog27" class="dialog"><form id="lineEditForm27"><div class="dialog-head"><h2>제품·수량 수정</h2><button class="close" type="button" data-close>×</button></div><p id="lineEditInfo27" class="info"></p><label>제품명<input id="lineEditName27" required></label><label>규격 및 용량<input id="lineEditSpec27" required></label><div class="two"><label>발주수량<input id="lineEditQty27" type="number" min="0" step="0.01" required></label><label>단위<input id="lineEditUnit27" required></label></div><label>제품별 납기일<input id="lineEditDue27" type="date"></label><div class="actions"><button class="secondary" type="button" data-close>취소</button><button class="primary" type="submit">변경 저장</button></div></form></dialog>`);

function openOrderEdit27(id){
  const o=data.orders.find(x=>x.id===id); if(!o)return;
  const f=$('#orderEditForm27'); f.dataset.orderId=id;
  $('#orderEditCompany27').value=o.company||''; $('#orderEditDate27').value=o.orderDate||''; $('#orderEditDue27').value=o.dueDate||''; $('#orderEditMemo27').value=o.memo||'';
  show('#orderEditDialog27');
}
function openLineEdit27(ref){
  const [oid,lid]=ref.split('|'),o=data.orders.find(x=>x.id===oid),l=o?.lines.find(x=>x.id===lid); if(!o||!l)return;
  const f=$('#lineEditForm27'); f.dataset.orderId=oid; f.dataset.lineId=lid;
  $('#lineEditInfo27').textContent=`현재 생산완료 ${q(l.orderProduced)}${l.unit} · 출고완료 ${q(l.shipped)}${l.unit} · 생산예정 ${q(l.planned)}${l.unit}`;
  $('#lineEditName27').value=l.name||''; $('#lineEditSpec27').value=l.spec||''; $('#lineEditQty27').value=n(l.quantity); $('#lineEditUnit27').value=l.unit||'개'; $('#lineEditDue27').value=l.dueDate||'';
  show('#lineEditDialog27');
}
function deleteOrder27(id){
  const o=data.orders.find(x=>x.id===id); if(!o)return;
  if(!confirm(`${o.company} · ${o.orderDate} 발주 ${o.lines.length}개 품목을 삭제할까요?\n생산·출고가 입력된 품목은 재고 수량도 함께 되돌립니다.`))return;
  o.lines.forEach(l=>{const p=data.products.find(x=>x.id===l.productId);if(p){p.produced=n(p.produced)-n(l.orderProduced);p.shipped=n(p.shipped)-n(l.shipped);}});
  data.orders=data.orders.filter(x=>x.id!==id); save(); toast('발주를 삭제했습니다.');
}
function deleteLine27(ref){
  const [oid,lid]=ref.split('|'),o=data.orders.find(x=>x.id===oid),l=o?.lines.find(x=>x.id===lid); if(!o||!l)return;
  if(!confirm(`${l.name} · ${l.spec} 발주 품목을 삭제할까요?\n생산·출고 수량이 있다면 공장 재고도 함께 되돌립니다.`))return;
  const p=data.products.find(x=>x.id===l.productId);if(p){p.produced=n(p.produced)-n(l.orderProduced);p.shipped=n(p.shipped)-n(l.shipped);}
  o.lines=o.lines.filter(x=>x.id!==lid); if(!o.lines.length)data.orders=data.orders.filter(x=>x.id!==oid);
  save(); toast('발주 품목을 삭제했습니다.');
}
$('#orderEditForm27').onsubmit=e=>{e.preventDefault();const f=$('#orderEditForm27'),o=data.orders.find(x=>x.id===f.dataset.orderId);if(!o)return;o.company=$('#orderEditCompany27').value.trim();o.orderDate=$('#orderEditDate27').value;o.dueDate=$('#orderEditDue27').value;o.memo=$('#orderEditMemo27').value.trim();hide('#orderEditDialog27');save();toast('발주 정보를 수정했습니다.');};
$('#lineEditForm27').onsubmit=e=>{e.preventDefault();const f=$('#lineEditForm27'),o=data.orders.find(x=>x.id===f.dataset.orderId),l=o?.lines.find(x=>x.id===f.dataset.lineId);if(!o||!l)return;const qty=n($('#lineEditQty27').value),minimum=Math.max(n(l.shipped),n(l.orderProduced)+n(l.planned));if(qty<minimum)return toast(`발주수량은 생산·출고·생산예정 수량보다 작게 변경할 수 없습니다. (최소 ${q(minimum)}${l.unit})`);const name=$('#lineEditName27').value.trim(),spec=$('#lineEditSpec27').value.trim(),unitText=$('#lineEditUnit27').value.trim();if(!name||!spec||!unitText)return;const old=data.products.find(x=>x.id===l.productId),next=product(name,spec,unitText);if(old&&old.id!==next.id){old.produced=n(old.produced)-n(l.orderProduced);old.shipped=n(old.shipped)-n(l.shipped);next.produced=n(next.produced)+n(l.orderProduced);next.shipped=n(next.shipped)+n(l.shipped);}l.productId=next.id;l.name=name;l.spec=spec;l.unit=unitText;l.quantity=qty;l.dueDate=$('#lineEditDue27').value||'';hide('#lineEditDialog27');save();toast('제품·수량을 수정했습니다.');};
document.addEventListener('click',e=>{const d=e.target.closest('[data-order-edit],[data-order-delete],[data-line-edit],[data-line-delete]')?.dataset;if(!d)return;if(d.orderEdit)openOrderEdit27(d.orderEdit);if(d.orderDelete)deleteOrder27(d.orderDelete);if(d.lineEdit)openLineEdit27(d.lineEdit);if(d.lineDelete)deleteLine27(d.lineDelete);});
render();
