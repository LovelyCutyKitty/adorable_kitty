/* 생산완료 입력 시 생산예정 잔량 자동 차감 */
const saveLine29=saveLine;
saveLine=e=>{
  const beforePlanned=selectedLine?.l? n(selectedLine.l.planned):0;
  const beforeProduced=selectedLine?.l? n(selectedLine.l.orderProduced):0;
  const completing=n($('#producedInput').value);
  saveLine29(e);
  if(!selectedLine||!completing)return;
  const l=selectedLine.l;
  /* 기존 데이터 중 완료·예정이 같은 수량으로 중복된 경우도 정리 */
  if(n(l.orderProduced)>0&&n(l.planned)===n(l.orderProduced)&&n(l.planned)===beforePlanned&&n(l.orderProduced)===beforeProduced+completing){
    l.planned=0;save();toast(`생산완료 ${q(completing)}${l.unit} 반영: 생산예정을 0${l.unit}로 정리했습니다.`);
  }
};
$('#lineForm').onsubmit=saveLine;

/* 제품·수량 수정창에서 생산완료 누적값을 늘린 경우에도 예정분을 차감 */
const quantitySubmit29=$('#lineEditForm').onsubmit;
$('#lineEditForm').onsubmit=e=>{
  const f=$('#lineEditForm'),o=data.orders.find(x=>x.id===f.dataset.orderId),l=o?.lines.find(x=>x.id===f.dataset.lineId);
  const prevProduced=l?n(l.orderProduced):0,prevPlanned=l?n(l.planned):0;
  const input=$('#editLineProduced');
  const delta=Math.max(0,n(input?.value)-prevProduced);
  if(delta&&$('#editLinePlanned'))$('#editLinePlanned').value=Math.max(0,n($('#editLinePlanned').value)-delta);
  quantitySubmit29(e);
};
