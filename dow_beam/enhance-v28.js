/* 발주수량은 자유 수정, 생산·출고 이력은 보존 */
document.addEventListener('submit',e=>{
  if(e.target?.id!=='lineEditForm')return;
  e.preventDefault();e.stopImmediatePropagation();
  const f=$('#lineEditForm'),o=data.orders.find(x=>x.id===f.dataset.orderId),l=o?.lines.find(x=>x.id===f.dataset.lineId);
  if(!o||!l)return;
  const next={name:$('#editLineName').value.trim(),spec:$('#editLineSpec').value.trim(),unit:$('#editLineUnit').value.trim(),quantity:n($('#editLineQuantity').value),planned:n($('#editLinePlanned').value),produced:n($('#editLineProduced').value),shipped:n($('#editLineShipped').value)};
  if(!next.name||!next.spec||!next.unit)return toast('제품명, 규격 및 단위를 입력하세요.');
  const before=JSON.stringify(data),source=data.products.find(x=>x.id===l.productId)||findOrCreateProduct16(l.name,l.spec,l.unit);
  const same=source.name===next.name&&source.spec===next.spec,target=same?source:findOrCreateProduct16(next.name,next.spec,next.unit);
  const prev={quantity:n(l.quantity),planned:n(l.planned),produced:n(l.orderProduced),shipped:n(l.shipped),stock:n(stock(target))};
  if(!same){source.produced=n(source.produced)-prev.produced;source.shipped=n(source.shipped)-prev.shipped;target.produced=n(target.produced)+prev.produced;target.shipped=n(target.shipped)+prev.shipped;l.productId=target.id;}
  const maximumPlan=Math.max(0,next.quantity-next.produced);
  const plannedAdjusted=next.planned>maximumPlan;
  if(plannedAdjusted)next.planned=maximumPlan;
  target.name=next.name;target.spec=next.spec;target.unit=next.unit;
  target.produced=n(target.produced)+(next.produced-prev.produced);target.shipped=n(target.shipped)+(next.shipped-prev.shipped);
  l.name=next.name;l.spec=next.spec;l.unit=next.unit;l.quantity=next.quantity;l.planned=next.planned;l.orderProduced=next.produced;l.shipped=next.shipped;
  const due=$('#editLineDue19')?.value;if(due!==undefined)l.dueDate=due||'';
  const changes=[];if(prev.quantity!==next.quantity)changes.push(`발주수량 ${q(prev.quantity)} → ${q(next.quantity)}${next.unit}`);if(prev.planned!==next.planned)changes.push(`생산예정 ${q(prev.planned)} → ${q(next.planned)}${next.unit}`);
  if(prev.produced!==next.produced)changes.push('생산완료 수정');if(prev.shipped!==next.shipped)changes.push('출고완료 수정');
  record(target,`제품·수량 수정: ${changes.join(', ')||'제품 정보 변경'}`);
  hide('#lineEditDialog');save();
  toast(plannedAdjusted?`발주수량 변경에 맞춰 생산예정을 ${q(next.planned)}${next.unit}로 조정했습니다.`:'제품·수량을 수정했습니다.');
},true);
