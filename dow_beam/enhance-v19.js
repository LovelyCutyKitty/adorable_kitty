/* 분류도 화면 정리 + 발주 제품별 납기 입력 */
function needsClassification19(p){
  return code18(p)==='ETC'||!p.kind||p.kind==='미확정';
}
function classificationNeeded19(){
  const products=data.products.filter(needsClassification19);
  if(!products.length)return '<div class="empty">분류가 필요한 제품이 없습니다.</div>';
  return `<section class="classification-needed"><h3 class="priority-title">분류 필요 제품 <span class="order-meta">${products.length}개</span></h3><p class="catalog-note">제품 정보 수정에서 제품코드·종류·규격을 정리하면 이 목록에서 자동으로 사라집니다.</p><details class="stock-group"><summary>제품 목록 보기</summary>${products.map(p=>`<article class="line-card"><h3>${esc(p.name)}</h3><p class="spec">${esc(p.spec)}</p><p class="muted">${esc(p.code||'코드 미입력')} · ${esc(p.kind||'종류 미입력')} · 단위 ${unit(p)}</p><button class="product-edit" data-edit-product="${p.id}">제품 정보 수정</button><button class="link-button" data-link-product="${p.id}">같은 제품으로 합치기</button></article>`).join('')}</details></section>`;
}
master=()=>catalogHtml18()+classificationNeeded19();

function lineDueField19(ref){
  const [orderId,lineId]=ref.split('|');
  const line=data.orders.find(o=>o.id===orderId)?.lines.find(l=>l.id===lineId);
  const form=$('#lineEditForm');
  if(!line||!form)return;
  $('#lineDueLabel19')?.remove();
  const label=document.createElement('label');
  label.id='lineDueLabel19';
  label.textContent='이 제품 납기일 (비우면 발주 전체 납기 사용)';
  const input=document.createElement('input');
  input.id='editLineDue19';
  input.type='date';
  input.value=line.dueDate||'';
  label.append(input);
  form.querySelector('.edit-note')?.before(label);
}
document.addEventListener('click',e=>{
  const ref=e.target.closest('[data-line-edit]')?.dataset.lineEdit;
  if(ref)setTimeout(()=>{
    $('#lineDueLabel18')?.remove();
    lineDueField19(ref);
  },20);
},true);

const lineEditSubmit19=$('#lineEditForm').onsubmit;
$('#lineEditForm').onsubmit=e=>{
  const form=$('#lineEditForm');
  const orderId=form.dataset.orderId,lineId=form.dataset.lineId;
  const lineDue=$('#editLineDue19')?.value||'';
  lineEditSubmit19(e);
  if(!$('#lineEditDialog').open){
    const line=data.orders.find(o=>o.id===orderId)?.lines.find(l=>l.id===lineId);
    if(line){line.dueDate=lineDue;localStorage.setItem(KEY,JSON.stringify(data));render();}
  }
};

const render19=render;
render=()=>render19();
render();
