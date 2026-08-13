/* 제품·수량 수정 창에 제품별 납기일을 확실히 연결 */
function ensureLineDue20(ref){
  const [orderId,lineId]=String(ref||'').split('|');
  const line=data.orders.find(o=>o.id===orderId)?.lines.find(l=>l.id===lineId);
  const form=$('#lineEditForm');
  if(!line||!form)return;
  $('#lineDueLabel18')?.remove();
  $('#lineDueLabel19')?.remove();
  $('#lineDueLabel20')?.remove();
  const label=document.createElement('label');
  label.id='lineDueLabel20';
  label.textContent='이 제품 납기일';
  const input=document.createElement('input');
  input.id='editLineDue20';
  input.type='date';
  input.value=line.dueDate||'';
  label.append(input);
  form.querySelector('.edit-note')?.before(label);
}

/* 기존 클릭 처리와 별개로, 제품 수정 창을 열 때 날짜칸을 직접 만든다. */
const openLineEdit20=openLineEdit16;
openLineEdit16=ref=>{
  openLineEdit20(ref);
  ensureLineDue20(ref);
};

const submitLineEdit20=$('#lineEditForm').onsubmit;
$('#lineEditForm').onsubmit=e=>{
  const form=$('#lineEditForm');
  const orderId=form.dataset.orderId;
  const lineId=form.dataset.lineId;
  const nextDue=$('#editLineDue20')?.value||'';
  submitLineEdit20(e);
  if(!$('#lineEditDialog').open){
    const line=data.orders.find(o=>o.id===orderId)?.lines.find(l=>l.id===lineId);
    if(line){
      line.dueDate=nextDue;
      localStorage.setItem(KEY,JSON.stringify(data));
      render();
      toast(nextDue?'제품별 납기일을 저장했습니다.':'제품별 납기를 발주 전체 납기로 되돌렸습니다.');
    }
  }
};

/* 발주 전체 납기와 다른 경우 제품 카드에도 보인다. */
const lineCard20=lineCard;
lineCard=(o,l)=>lineCard20(o,l).replace('</p><div class="numbers">',`${l.dueDate?` · <span class="inline-due">제품 납기 ${l.dueDate}</span>`:''}</p><div class="numbers">`);

render();
