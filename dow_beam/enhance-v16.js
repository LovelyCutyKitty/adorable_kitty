/* 발주·제품 정보와 누적 수량을 안전하게 수정하는 기능 */
const editStyle16=document.createElement('style');
editStyle16.textContent=`
.order-edit{margin:8px 0 0;border:1px solid #cbdcd3;border-radius:9px;padding:8px 10px;background:#fff;color:#235342;font:inherit;font-size:.86rem;font-weight:800}
.line-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.line-actions button{margin-top:0!important}
.edit-note{font-size:.86rem;color:#60766d;margin:8px 0 0}
`;
document.head.append(editStyle16);

document.body.insertAdjacentHTML('beforeend',`
<dialog id="orderEditDialog" class="dialog"><form id="orderEditForm">
  <div class="dialog-head"><h2>발주 정보 수정</h2><button class="close" type="button" data-close>×</button></div>
  <label>발주처<input id="editCompany" required></label>
  <div class="two"><label>발주일<input id="editOrderDate" type="date" required></label><label>납기일<input id="editDueDate" type="date"></label></div>
  <label>발송 요청 / 공통 메모<input id="editOrderMemo"></label>
  <p class="edit-note">납기일을 나중에 입력하거나 바꾸면 현황의 D-day가 자동으로 다시 계산됩니다.</p>
  <div class="actions"><button class="secondary" type="button" data-close>취소</button><button class="primary" type="submit">변경하기</button></div>
</form></dialog>
<dialog id="lineEditDialog" class="dialog"><form id="lineEditForm">
  <div class="dialog-head"><h2>제품·수량 수정</h2><button class="close" type="button" data-close>×</button></div>
  <label>제품명<input id="editLineName" required></label>
  <label>규격 및 용량<input id="editLineSpec" required></label>
  <label>단위<input id="editLineUnit" required placeholder="예: 개, kg, 세트, 장"></label>
  <div class="two"><label>발주수량<input id="editLineQuantity" type="number" min="0" step="0.01" required></label><label>생산예정 수량<input id="editLinePlanned" type="number" min="0" step="0.01" required></label></div>
  <div class="two"><label>누적 생산완료<input id="editLineProduced" type="number" min="0" step="0.01" required></label><label>누적 출고완료<input id="editLineShipped" type="number" min="0" step="0.01" required></label></div>
  <p class="edit-note">생산완료·출고완료를 수정하면 공장 전체 재고도 함께 다시 계산됩니다.</p>
  <div class="actions"><button class="secondary" type="button" data-close>취소</button><button class="primary" type="submit">변경하기</button></div>
</form></dialog>`);

const clearDialogs16=clearDialog;
clearDialog=()=>{clearDialogs16();['#orderEditDialog','#lineEditDialog'].forEach(hide)};

const beforeOrderHtml16=orderHtml;
orderHtml=(o,dash=false)=>beforeOrderHtml16(o,dash).replace('</summary>',`</summary><button class="order-edit" type="button" data-order-edit="${o.id}">발주 정보 수정</button>`);

const beforeLineCard16=lineCard;
lineCard=(o,l)=>beforeLineCard16(o,l).replace(/<button data-line="([^"]+)">생산 · 출고 입력<\/button>/,`<div class="line-actions"><button data-line="$1">생산 · 출고 입력</button><button type="button" data-line-edit="${o.id}|${l.id}">제품·수량 수정</button></div>`);

function openOrderEdit16(orderId){
  const o=data.orders.find(x=>x.id===orderId);
  if(!o)return;
  const f=$('#orderEditForm');
  f.dataset.orderId=o.id;
  $('#editCompany').value=o.company||'';
  $('#editOrderDate').value=o.orderDate||today();
  $('#editDueDate').value=o.dueDate||'';
  $('#editOrderMemo').value=o.memo||'';
  show('#orderEditDialog');
}

function openLineEdit16(ref){
  const [orderId,lineId]=ref.split('|');
  const o=data.orders.find(x=>x.id===orderId);
  const l=o?.lines.find(x=>x.id===lineId);
  if(!o||!l)return;
  const f=$('#lineEditForm');
  f.dataset.orderId=orderId;
  f.dataset.lineId=lineId;
  $('#editLineName').value=l.name||'';
  $('#editLineSpec').value=l.spec||'';
  $('#editLineUnit').value=l.unit||'개';
  $('#editLineQuantity').value=n(l.quantity);
  $('#editLinePlanned').value=n(l.planned);
  $('#editLineProduced').value=n(l.orderProduced);
  $('#editLineShipped').value=n(l.shipped);
  show('#lineEditDialog');
}

$('#orderEditForm').onsubmit=e=>{
  e.preventDefault();
  const o=data.orders.find(x=>x.id===$('#orderEditForm').dataset.orderId);
  if(!o)return;
  const next={company:$('#editCompany').value.trim(),orderDate:$('#editOrderDate').value,dueDate:$('#editDueDate').value,memo:$('#editOrderMemo').value.trim()};
  if(!next.company||!next.orderDate)return toast('발주처와 발주일을 입력하세요.');
  const changed=[];
  if(o.company!==next.company)changed.push(`발주처 ${o.company} → ${next.company}`);
  if(o.orderDate!==next.orderDate)changed.push(`발주일 ${o.orderDate||'미입력'} → ${next.orderDate}`);
  if(o.dueDate!==next.dueDate)changed.push(`납기일 ${o.dueDate||'미정'} → ${next.dueDate||'미정'}`);
  if(o.memo!==next.memo)changed.push('공통 메모 변경');
  if(!changed.length){hide('#orderEditDialog');return toast('변경된 내용이 없습니다.');}
  if(!confirm(`${changed.join('\n')}\n\n발주 정보를 변경할까요?`))return;
  const before=JSON.stringify(data);
  Object.assign(o,next);
  hide('#orderEditDialog');
  save();
  undo(before,`발주 정보가 변경되었습니다. (${changed[0]})`);
};

function findOrCreateProduct16(name,spec,unit){
  let p=data.products.find(x=>x.name===name&&x.spec===spec);
  if(!p){p={id:id(),name,spec,unit,opening:0,produced:0,shipped:0,adjustment:0};data.products.push(p)}
  return p;
}

$('#lineEditForm').onsubmit=e=>{
  e.preventDefault();
  const f=$('#lineEditForm');
  const o=data.orders.find(x=>x.id===f.dataset.orderId);
  const l=o?.lines.find(x=>x.id===f.dataset.lineId);
  if(!o||!l)return;
  const next={
    name:$('#editLineName').value.trim(),
    spec:$('#editLineSpec').value.trim(),
    unit:$('#editLineUnit').value.trim(),
    quantity:n($('#editLineQuantity').value),
    planned:n($('#editLinePlanned').value),
    produced:n($('#editLineProduced').value),
    shipped:n($('#editLineShipped').value)
  };
  if(!next.name||!next.spec||!next.unit)return toast('제품명, 규격 및 용량, 단위를 입력하세요.');
  if(next.shipped>next.quantity)return toast('누적 출고완료 수량은 발주수량보다 클 수 없습니다.');
  const source=data.products.find(x=>x.id===l.productId)||findOrCreateProduct16(l.name,l.spec,l.unit);
  const before=JSON.stringify(data);
  const sameProduct=source.name===next.name&&source.spec===next.spec;
  let target=source;
  if(!sameProduct){
    target=findOrCreateProduct16(next.name,next.spec,next.unit);
    source.produced=n(source.produced)-n(l.orderProduced);
    source.shipped=n(source.shipped)-n(l.shipped);
    target.produced=n(target.produced)+n(l.orderProduced);
    target.shipped=n(target.shipped)+n(l.shipped);
    l.productId=target.id;
  }
  const previous={quantity:n(l.quantity),planned:n(l.planned),produced:n(l.orderProduced),shipped:n(l.shipped),stock:n(stock(target))};
  target.name=next.name; target.spec=next.spec; target.unit=next.unit;
  if(sameProduct)data.orders.forEach(order=>order.lines.forEach(line=>{if(line.productId===target.id){line.name=next.name;line.spec=next.spec;line.unit=next.unit}}));
  target.produced=n(target.produced)+(next.produced-previous.produced);
  target.shipped=n(target.shipped)+(next.shipped-previous.shipped);
  l.name=next.name; l.spec=next.spec; l.unit=next.unit; l.quantity=next.quantity; l.planned=next.planned; l.orderProduced=next.produced; l.shipped=next.shipped;
  const afterStock=n(stock(target));
  const changed=[];
  if(previous.quantity!==next.quantity)changed.push(`발주수량 ${q(previous.quantity)} → ${q(next.quantity)}${next.unit}`);
  if(previous.planned!==next.planned)changed.push(`생산예정 ${q(previous.planned)} → ${q(next.planned)}${next.unit}`);
  if(previous.produced!==next.produced)changed.push(`생산완료 ${q(previous.produced)} → ${q(next.produced)}${next.unit}`);
  if(previous.shipped!==next.shipped)changed.push(`출고완료 ${q(previous.shipped)} → ${q(next.shipped)}${next.unit}`);
  if(source!==target)changed.push('제품 정보 변경');
  if(afterStock<0&&!confirm(`수정 후 ${next.name} 공장 재고가 ${q(afterStock)}${next.unit}가 됩니다.\n그래도 변경할까요?`)){data=JSON.parse(before);return}
  if(!changed.length){hide('#lineEditDialog');return toast('변경된 내용이 없습니다.');}
  if(!confirm(`${changed.join('\n')}\n공장 전체 재고: ${q(previous.stock)} → ${q(afterStock)}${next.unit}\n\n제품·수량을 변경할까요?`)){data=JSON.parse(before);return}
  record(target,`제품·수량 수정: ${changed.join(', ')}`);
  hide('#lineEditDialog');
  save();
  undo(before,`${next.name} 수량이 수정되었습니다.`);
};

document.addEventListener('click',e=>{
  const d=e.target.closest('[data-order-edit],[data-line-edit]')?.dataset||{};
  if(d.orderEdit)openOrderEdit16(d.orderEdit);
  if(d.lineEdit)openLineEdit16(d.lineEdit);
});

/* 생산 계획 화면에서도 해당 제품을 바로 수정 */
const oldPlanOrderHtml16=planOrderHtml;
planOrderHtml=()=>oldPlanOrderHtml16().replace(/<button data-line="([^"]+)">생산 · 출고 입력<\/button>/g,'<div class="line-actions"><button data-line="$1">생산 · 출고 입력</button><button type="button" data-line-edit="$1">제품·수량 수정</button></div>');
