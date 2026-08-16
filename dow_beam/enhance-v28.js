/* 발주수량 자유 수정: 기존 저장 함수를 직접 교체 */
$('#lineEditForm').onsubmit=e=>{
  e.preventDefault();
  const f=$('#lineEditForm'),o=data.orders.find(x=>x.id===f.dataset.orderId),l=o?.lines.find(x=>x.id===f.dataset.lineId);
  if(!o||!l)return;
  const next={name:$('#editLineName').value.trim(),spec:$('#editLineSpec').value.trim(),unit:$('#editLineUnit').value.trim(),quantity:n($('#editLineQuantity').value),planned:n($('#editLinePlanned').value),produced:n($('#editLineProduced').value),shipped:n($('#editLineShipped').value)};
  if(!next.name||!next.spec||!next.unit)return toast('제품명, 규격 및 단위를 입력하세요.');
  const beforeQty=n(l.quantity),before=JSON.stringify(data);
  const source=data.products.find(x=>x.id===l.productId)||findOrCreateProduct16(l.name,l.spec,l.unit);
  const same=source.name===next.name&&source.spec===next.spec;
  const target=same?source:findOrCreateProduct16(next.name,next.spec,next.unit);
  const prev={planned:n(l.planned),produced:n(l.orderProduced),shipped:n(l.shipped)};
  if(!same){source.produced=n(source.produced)-prev.produced;source.shipped=n(source.shipped)-prev.shipped;target.produced=n(target.produced)+prev.produced;target.shipped=n(target.shipped)+prev.shipped;l.productId=target.id;}
  const maxPlan=Math.max(0,next.quantity-next.produced);
  const plannedAdjusted=next.planned>maxPlan;
  if(plannedAdjusted)next.planned=maxPlan;
  target.name=next.name;target.spec=next.spec;target.unit=next.unit;
  target.produced=n(target.produced)+(next.produced-prev.produced);
  target.shipped=n(target.shipped)+(next.shipped-prev.shipped);
  Object.assign(l,{name:next.name,spec:next.spec,unit:next.unit,quantity:next.quantity,planned:next.planned,orderProduced:next.produced,shipped:next.shipped});
  const due=$('#editLineDue19')?.value;if(due!==undefined)l.dueDate=due||'';
  record(target,`제품·수량 수정: 발주수량 ${q(beforeQty)} → ${q(next.quantity)}${next.unit}`);
  hide('#lineEditDialog');
  save();
  const message=beforeQty!==next.quantity?`발주수량이 ${q(beforeQty)}${next.unit}에서 ${q(next.quantity)}${next.unit}으로 변경되었습니다.`:'제품 정보를 수정했습니다.';
  toast(plannedAdjusted?`${message} 생산예정은 ${q(next.planned)}${next.unit}로 조정되었습니다.`:message);
};
