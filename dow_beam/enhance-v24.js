/* 이미 등록된 발주: 제품별 납기일만 빠르게 수정 */
const dueEditStyle24=document.createElement('style');
dueEditStyle24.textContent=`.line-due-edit{margin-left:7px!important}.line-due-info{margin-top:10px}`;
document.head.append(dueEditStyle24);

document.body.insertAdjacentHTML('beforeend',`<dialog id="productDueDialog" class="dialog"><form id="productDueForm"><div class="dialog-head"><h2>제품별 납기 수정</h2><button class="close" type="button" data-close>×</button></div><div id="productDueInfo" class="info line-due-info"></div><label>이 제품 납기일<input id="productDueInput" type="date"></label><p class="edit-note">비워두면 발주 전체 납기일을 사용합니다.</p><div class="actions"><button class="secondary" type="button" data-close>취소</button><button class="primary" type="submit">납기일 저장</button></div></form></dialog>`);

const lineCard24=lineCard;
lineCard=(o,l)=>lineCard24(o,l).replace('</article>',`<button type="button" class="line-due-edit" data-line-due-edit="${o.id}|${l.id}">제품별 납기 수정</button></article>`);

function openProductDue24(ref){
  const [orderId,lineId]=ref.split('|');
  const order=data.orders.find(o=>o.id===orderId);
  const line=order?.lines.find(l=>l.id===lineId);
  if(!order||!line)return;
  const form=$('#productDueForm');
  form.dataset.orderId=orderId;
  form.dataset.lineId=lineId;
  $('#productDueInfo').textContent=`${line.name} · ${line.spec} · 발주 전체 납기 ${order.dueDate||'미입력'}`;
  $('#productDueInput').value=line.dueDate||'';
  show('#productDueDialog');
}

document.addEventListener('click',e=>{
  const ref=e.target.closest('[data-line-due-edit]')?.dataset.lineDueEdit;
  if(ref)openProductDue24(ref);
});

$('#productDueForm').onsubmit=e=>{
  e.preventDefault();
  const form=$('#productDueForm');
  const order=data.orders.find(o=>o.id===form.dataset.orderId);
  const line=order?.lines.find(l=>l.id===form.dataset.lineId);
  if(!order||!line)return;
  const next=$('#productDueInput').value||'';
  const previous=line.dueDate||'';
  if(next===previous){hide('#productDueDialog');return toast('변경된 납기일이 없습니다.');}
  line.dueDate=next;
  localStorage.setItem(KEY,JSON.stringify(data));
  hide('#productDueDialog');
  render();
  toast(next?`${line.name} 제품별 납기일을 저장했습니다.`:`${line.name}은 발주 전체 납기를 사용합니다.`);
};

render();
