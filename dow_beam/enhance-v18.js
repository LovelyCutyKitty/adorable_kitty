/* 제품분류도: 코드 → 종류 → 규격 / 제품별 납기 */
const CATALOG18={
  S1:{label:'S1 레진빔',types:{'쫄대빔':[],'조각빔':[],'FLAT 빔':[],'탭빔':[],'블럭':[],'곡면빔':[],'양면빔':[],'SAMPLE빔':[],'미확정':[]}},
  S2:{label:'S2 프레스빔',types:{'곡면빔':[],'FLAT 빔':[],'탭빔':[],'블럭':[],'미확정':[]}},
  S3:{label:'S3 빨간빔',types:{'8인치 곡면빔':['460L','410L','310L'],'미확정':[]}},
  B1:{label:'B1 튜브형 본드',types:{'주재':[],'경화재':[],'미확정':[]}},
  B2:{label:'B2 카트리지형 본드',types:{'카트리지':['200ml 일반','200ml 1%','400ml','120ml'],'미확정':[]}},
  W1:{label:'W1 왁스',types:{'왁스':['왁스']}},
  MABOR:{label:'MABOR',types:{'MABOR':['80A','90A','80B'],'미확정':[]}},
  ETC:{label:'기타·미분류',types:{'미확정':[]}}
};
const GROUP_TO_CODE18={'S1 레진빔':'S1','S2 프레스빔':'S2','S3 빨간빔':'S3','B1 튜브형 본드':'B1','B2 카트리지형 본드':'B2','W1 왁스':'W1','MABOR':'MABOR','기타·미분류':'ETC'};
const code18=p=>{let v=String(p.code||p.category||p.name||'').toUpperCase();return Object.keys(CATALOG18).find(k=>k!=='ETC'&&v.includes(k))||'ETC'};
const group18=c=>CATALOG18[c]?.label||CATALOG18.ETC.label;
function inferKind18(p,c=code18(p)){
  let v=String(p.kind||p.name||'').toLowerCase();
  if(p.kind)return p.kind;
  if(/탭/.test(v))return '탭빔';
  if(/flat/.test(v))return 'FLAT 빔';
  if(/조각/.test(v))return '조각빔';
  if(/쫄|가이드/.test(v))return '쫄대빔';
  if(/블럭|block/.test(v))return '블럭';
  if(c==='B1'&&/경화/.test(v))return '경화재';
  if(c==='B1'&&/주재/.test(v))return '주재';
  if(c==='B2')return '카트리지';
  if(c==='W1')return '왁스';
  if(c==='MABOR')return 'MABOR';
  if(c==='S3')return '8인치 곡면빔';
  return '미확정';
}
function catalog18(){
  data.catalog??=JSON.parse(JSON.stringify(CATALOG18));
  Object.entries(CATALOG18).forEach(([code,base])=>{
    data.catalog[code]??={label:base.label,types:{}};
    data.catalog[code].label=base.label;
    Object.entries(base.types).forEach(([kind,specs])=>data.catalog[code].types[kind]??=[...specs]);
  });
  data.products.forEach(p=>{
    const code=code18(p),kind=inferKind18(p,code);
    p.code=code==='ETC'?(p.code||''):code;
    p.category=group18(code);
    p.kind=kind;
    data.catalog[code].types[kind]??=[];
    if(p.spec&&!data.catalog[code].types[kind].includes(p.spec))data.catalog[code].types[kind].push(p.spec);
  });
}
catalog18();

const style18=document.createElement('style');
style18.textContent=`.catalog-tools{margin:0 0 12px}.catalog-tools button{margin:0!important}.catalog-code{font-weight:850}.catalog-kind{padding:10px 0 3px;font-weight:800}.catalog-spec{font-size:.88rem;color:#60766d;padding:3px 0 3px}.catalog-note{color:#60766d;font-size:.86rem;margin:8px 0}.inline-due{color:#b53f31;font-weight:800}.catalog-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.catalog-actions button{margin:0!important}.catalog-dialog label{margin-top:12px}`;
document.head.append(style18);

/* 기존 분류 선택지는 숨기고 제품코드·종류를 분리한다. */
const categoryLabel18=$('#productCategory')?.closest('label');
if(categoryLabel18)categoryLabel18.classList.add('hidden');
const productCodeLabel18=$('#productCode')?.closest('label');
if(productCodeLabel18)productCodeLabel18.innerHTML='제품코드<select id="productCode"></select>';
$('#productCode').innerHTML=Object.entries(CATALOG18).map(([code,x])=>`<option value="${code}">${x.label}</option>`).join('');
$('#productCode').insertAdjacentHTML('afterend','<label id="productKindLabel">제품종류<input id="productKind" list="productKindOptions" placeholder="선택하거나 직접 입력"></label><datalist id="productKindOptions"></datalist>');

function fillKinds18(code=$('#productCode').value,chosen=''){
  const types=Object.keys(data.catalog?.[code]?.types||CATALOG18[code]?.types||{});
  $('#productKindOptions').innerHTML=types.map(x=>`<option value="${esc(x)}">`).join('');
  if(chosen!==undefined)$('#productKind').value=chosen||'';
}
$('#productCode').onchange=()=>fillKinds18();
$('#productKind').addEventListener('change',()=>{
  const specs=data.catalog?.[$('#productCode').value]?.types?.[$('#productKind').value]||[];
  $('#productSpec').setAttribute('list','productSpecOptions');
  $('#productSpec').insertAdjacentHTML('afterend','<datalist id="productSpecOptions"></datalist>');
  $('#productSpecOptions').innerHTML=specs.map(x=>`<option value="${esc(x)}">`).join('');
});

/* 제품 탭에서 분류도 자체를 추가·수정·삭제한다. */
document.body.insertAdjacentHTML('beforeend',`<dialog id="catalogDialog" class="dialog"><form id="catalogForm" class="catalog-dialog"><div class="dialog-head"><h2>제품분류도 관리</h2><button type="button" class="close" data-close>×</button></div><p class="catalog-note">제품코드는 고정입니다. 제품종류와 제품규격은 선택하거나 직접 입력해 추가할 수 있습니다.</p><label>제품코드<select id="catalogCode"></select></label><label>제품종류<input id="catalogKind" list="catalogKindOptions" placeholder="예: 탭빔"></label><datalist id="catalogKindOptions"></datalist><label>제품규격<input id="catalogSpec" list="catalogSpecOptions" placeholder="예: 120w × 500L × 226R"></label><datalist id="catalogSpecOptions"></datalist><div class="catalog-actions"><button class="secondary" type="button" id="catalogAdd">종류·규격 저장</button><button class="secondary" type="button" id="catalogRemoveSpec">규격 삭제</button><button class="secondary" type="button" id="catalogRemoveKind">종류 삭제</button></div><p class="warn-note">이미 사용 중인 종류·규격은 삭제하지 않고 ‘미확정’으로 옮기는 방식이 안전합니다.</p><div class="actions"><button class="secondary" type="button" data-close>닫기</button></div></form></dialog>`);
$('#catalogCode').innerHTML=Object.entries(CATALOG18).map(([code,x])=>`<option value="${code}">${x.label}</option>`).join('');
function fillCatalogInputs18(){
  const code=$('#catalogCode').value,types=data.catalog[code]?.types||{};
  $('#catalogKindOptions').innerHTML=Object.keys(types).map(x=>`<option value="${esc(x)}">`).join('');
  const specs=types[$('#catalogKind').value]||[];
  $('#catalogSpecOptions').innerHTML=specs.map(x=>`<option value="${esc(x)}">`).join('');
}
$('#catalogCode').onchange=fillCatalogInputs18;
$('#catalogKind').oninput=fillCatalogInputs18;
$('#catalogAdd').onclick=()=>{const code=$('#catalogCode').value,kind=$('#catalogKind').value.trim(),spec=$('#catalogSpec').value.trim();if(!kind)return toast('제품종류를 입력하세요.');data.catalog[code].types[kind]??=[];if(spec&&!data.catalog[code].types[kind].includes(spec))data.catalog[code].types[kind].push(spec);localStorage.setItem(KEY,JSON.stringify(data));fillCatalogInputs18();fillKinds18();toast('제품분류도에 저장했습니다.');};
$('#catalogRemoveSpec').onclick=()=>{const code=$('#catalogCode').value,kind=$('#catalogKind').value.trim(),spec=$('#catalogSpec').value.trim();if(!spec||!data.catalog[code]?.types?.[kind]?.includes(spec))return toast('삭제할 기존 규격을 선택하세요.');const used=data.products.some(p=>code18(p)===code&&inferKind18(p,code)===kind&&p.spec===spec);if(used)return toast('이미 사용 중인 규격입니다. 제품 정보에서 먼저 다른 규격으로 수정하세요.');data.catalog[code].types[kind]=data.catalog[code].types[kind].filter(x=>x!==spec);localStorage.setItem(KEY,JSON.stringify(data));fillCatalogInputs18();toast('규격을 삭제했습니다.');};
$('#catalogRemoveKind').onclick=()=>{const code=$('#catalogCode').value,kind=$('#catalogKind').value.trim();if(!kind||!data.catalog[code]?.types?.[kind])return toast('삭제할 기존 제품종류를 선택하세요.');const used=data.products.some(p=>code18(p)===code&&inferKind18(p,code)===kind);if(used)return toast('이미 사용 중인 제품종류입니다. 제품 정보에서 먼저 미확정 또는 다른 종류로 수정하세요.');delete data.catalog[code].types[kind];localStorage.setItem(KEY,JSON.stringify(data));fillCatalogInputs18();toast('제품종류를 삭제했습니다.');};

function catalogHtml18(){
  const html=Object.entries(data.catalog).map(([code,x])=>`<details class="stock-group"><summary><span class="catalog-code">${esc(x.label)}</span><span class="order-meta">${Object.keys(x.types).length}개 종류</span></summary>${Object.entries(x.types).map(([kind,specs])=>`<div class="line-card"><div class="catalog-kind">${esc(kind)}</div>${specs.length?specs.map(s=>`<div class="catalog-spec">${esc(s)}</div>`).join(''):'<div class="catalog-spec">등록 규격 없음</div>'}</div>`).join('')}</details>`).join('');
  return `<section class="catalog-tools"><button type="button" class="primary" id="openCatalog">제품분류도 관리</button><p class="catalog-note">코드 → 종류 → 규격을 관리합니다. 등록된 제품과 발주를 통해 새 규격도 자동으로 쌓입니다.</p>${html}</section>`;
}
const master18=master;
master=()=>catalogHtml18()+master18();

/* 제품 정보 수정 화면과 분류도 연결 */
const productSubmit18=$('#productForm').onsubmit;
$('#productForm').onsubmit=e=>{
  const name=$('#productName').value.trim(),spec=$('#productSpec').value.trim(),code=$('#productCode').value,kind=$('#productKind').value.trim()||'미확정';
  productSubmit18(e);
  const p=data.products.find(x=>x.name===name&&x.spec===spec);
  if(!p)return;
  p.code=code==='ETC'?'':code;p.kind=kind;p.category=group18(code);
  data.catalog[code].types[kind]??=[];
  if(spec&&!data.catalog[code].types[kind].includes(spec))data.catalog[code].types[kind].push(spec);
  localStorage.setItem(KEY,JSON.stringify(data));render();
};
document.addEventListener('click',e=>{
  if(e.target.id==='openCatalog'){fillCatalogInputs18();show('#catalogDialog');}
  const edit=e.target.closest('[data-edit-product]')?.dataset.editProduct;
  if(edit){const p=data.products.find(x=>x.id===edit);if(p){setTimeout(()=>{const code=code18(p);$('#productCode').value=code;fillKinds18(code,inferKind18(p,code));},0)}}
});

/* 발주 등록으로 들어온 제품도 분류도에 자동 누적한다. */
const saveOrder18=saveOrder;
saveOrder=e=>{saveOrder18(e);catalog18();localStorage.setItem(KEY,JSON.stringify(data));};

/* 제품별 납기: 발주 전체 납기는 기본값, 라인 납기가 있으면 우선 사용 */
$('#lineEditForm').insertAdjacentHTML('beforeend','<input id="editLineDue" type="hidden">');
const due18=due;
due=o=>{const dates=o.lines.filter(l=>n(l.shipped)<n(l.quantity)).map(l=>l.dueDate||o.dueDate).filter(Boolean).sort();if(!dates.length)return due18(o);const date=dates[0],d=Math.ceil((new Date(date)-new Date(today()))/86400000);return{t:d<0?`${-d}일 지연`:d===0?'D-day':`D-${d}`,d};};
const lineCard18=lineCard;
lineCard=(o,l)=>lineCard18(o,l).replace('</p><div class="numbers">',`${l.dueDate?` · <span class="inline-due">납기 ${l.dueDate}</span>`:''}</p><div class="numbers">`);
const lineSubmit18=$('#lineEditForm').onsubmit;
$('#lineEditForm').onsubmit=e=>{
  const f=$('#lineEditForm'),oid=f.dataset.orderId,lid=f.dataset.lineId,nextDue=$('#editLineDue').value;
  lineSubmit18(e);
  if(!$('#lineEditDialog').open){const l=data.orders.find(o=>o.id===oid)?.lines.find(x=>x.id===lid);if(l){l.dueDate=nextDue||'';localStorage.setItem(KEY,JSON.stringify(data));render();}}
};
document.addEventListener('click',e=>{
  const ref=e.target.closest('[data-line-edit]')?.dataset.lineEdit;
  if(ref){const [oid,lid]=ref.split('|'),l=data.orders.find(o=>o.id===oid)?.lines.find(x=>x.id===lid);setTimeout(()=>{const old=$('#editLineDue');old.type='date';old.value=l?.dueDate||'';old.removeAttribute('hidden');old.closest('form').insertAdjacentHTML('beforeend','');const label=document.createElement('label');label.id='lineDueLabel18';label.textContent='이 제품 납기일 (비우면 발주 전체 납기 사용)';label.append(old);const box=$('#lineEditForm .edit-note');if($('#lineDueLabel18'))$('#lineDueLabel18').remove();box.before(label);},0)}
});

const render18=render;
render=()=>{catalog18();render18()};
render();
