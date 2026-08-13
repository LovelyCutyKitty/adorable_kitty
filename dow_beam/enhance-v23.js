/* 발주 등록 단계에서 제품별 납기일 지정 */
const orderDueStyle23=document.createElement('style');
orderDueStyle23.textContent=`
.line-head.line-head-due,.edit-line.line-due{grid-template-columns:1fr 1.35fr .62fr .94fr auto}
@media(max-width:420px){.edit-line.line-due{grid-template-columns:1fr auto}.edit-line.line-due input{grid-column:1}.edit-line.line-due input[type=date]{font-size:.92rem}}
`;
document.head.append(orderDueStyle23);

function drawLines23(){
  const box=$('#parsedLines');
  const head=$('#lineEditor .line-head');
  if(head){
    head.classList.add('line-head-due');
    head.innerHTML='<span>제품명</span><span>규격</span><span>수량</span><span>제품별 납기</span>';
  }
  box.innerHTML=parsed.map((l,i)=>`<div class="edit-line line-due"><input data-f="name" data-i="${i}" value="${esc(l.name)}"><input data-f="spec" data-i="${i}" value="${esc(l.spec)}"><input data-f="quantity" data-i="${i}" type="number" value="${l.quantity}"><input data-f="dueDate" data-i="${i}" type="date" value="${esc(l.dueDate||'')}"><button class="remove" data-remove="${i}" type="button">×</button></div>`).join('');
}
drawLines=drawLines23;

/* 새로 추가하는 한 줄도 제품별 납기 값을 가질 수 있다. */
const addLine23=$('#addLine').onclick;
$('#addLine').onclick=()=>{
  addLine23();
  parsed[parsed.length-1].dueDate='';
  drawLines23();
};

/* 발주 전체 납기는 기본값이며, 줄별 납기를 비워두면 그대로 사용한다. */
const saveOrder23=saveOrder;
saveOrder=e=>{
  saveOrder23(e);
};

const openOrder23=openOrder;
openOrder=()=>{openOrder23();drawLines23();};
render();
