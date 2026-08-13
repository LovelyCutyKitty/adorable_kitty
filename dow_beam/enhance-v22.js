/* 제품분류도에서 실제 제품을 바로 정리한다. */
const catalogEditStyle22=document.createElement('style');
catalogEditStyle22.textContent=`
.catalog-product-entry{display:block;width:100%;border:0;background:transparent;text-align:left;padding:7px 0;color:#47675c;font:inherit;cursor:pointer}
.catalog-product-entry:hover{background:#f2f7f4}.catalog-product-entry strong{display:block;color:#102b25;font-size:.95rem}
.catalog-empty-edit{margin:7px 0 0;padding:7px 9px;border:1px solid #cbdcd3;border-radius:8px;background:#fff;color:#235342;font:inherit;font-size:.83rem}
#mergeCurrentProduct{width:100%;margin:0 0 10px;border:1px solid #cbdcd3;border-radius:9px;padding:10px;background:#fff;color:#235342;font:inherit;font-weight:800}
`;
document.head.append(catalogEditStyle22);

function productsForCatalog22(code,kind,spec){
  return data.products.filter(p=>code18(p)===code&&inferKind18(p,code)===kind&&p.spec===spec);
}
function catalogHtml22(){
  const html=Object.entries(data.catalog).map(([code,x])=>`<details class="stock-group"><summary><span class="catalog-code">${esc(x.label)}</span><span class="order-meta">${Object.keys(x.types).length}개 종류</span></summary>${Object.entries(x.types).map(([kind,specs])=>`<div class="line-card"><div class="catalog-kind">${esc(kind)}</div>${specs.length?specs.map(spec=>{const ps=productsForCatalog22(code,kind,spec);return ps.length?ps.map(p=>`<button type="button" class="catalog-product-entry" data-edit-product="${p.id}"><strong>${esc(spec)}</strong><span>제품 정보 수정</span></button>`).join(''):`<div class="catalog-spec">${esc(spec)}</div>`}).join(''):`<div class="catalog-spec">등록 규격 없음</div>`}<button type="button" class="catalog-empty-edit" data-catalog-edit="${code}|${encodeURIComponent(kind)}">종류·규격 관리</button></div>`).join('')}</details>`).join('');
  return `<section class="catalog-tools"><button type="button" class="primary" id="openCatalog">제품분류도 관리</button><p class="catalog-note">규격을 누르면 해당 제품 정보를 바로 수정할 수 있습니다. 등록 규격이 없는 종류는 ‘종류·규격 관리’에서 추가·삭제합니다.</p>${html}</section>`;
}

/* 아래 분류 필요 제품은 수정만 남기고, 합치기는 수정창 안으로 넣는다. */
function classificationNeeded22(){
  const products=data.products.filter(needsClassification19);
  if(!products.length)return '<div class="empty">분류가 필요한 제품이 없습니다.</div>';
  return `<section class="classification-needed"><h3 class="priority-title">분류 필요 제품 <span class="order-meta">${products.length}개</span></h3><p class="catalog-note">제품을 눌러 제품코드·종류·규격을 정리하세요.</p><details class="stock-group"><summary>제품 목록 보기</summary>${products.map(p=>`<button type="button" class="catalog-product-entry" data-edit-product="${p.id}"><strong>${esc(p.name)} · ${esc(p.spec)}</strong><span>${esc(p.code||'코드 미입력')} · ${esc(p.kind||'종류 미입력')} · 제품 정보 수정</span></button>`).join('')}</details></section>`;
}
master=()=>catalogHtml22()+classificationNeeded22();

/* 제품 정보 수정 창 안의 같은 제품 합치기 버튼 */
const productActions22=$('#productForm .actions');
if(productActions22&&!$('#mergeCurrentProduct'))productActions22.insertAdjacentHTML('beforebegin','<button type="button" id="mergeCurrentProduct" class="hidden">같은 제품으로 합치기</button>');

document.addEventListener('click',e=>{
  const catalogRef=e.target.closest('[data-catalog-edit]')?.dataset.catalogEdit;
  if(catalogRef){
    const [code,kindRaw]=catalogRef.split('|');
    $('#catalogCode').value=code;
    $('#catalogKind').value=decodeURIComponent(kindRaw||'');
    fillCatalogInputs18();
    show('#catalogDialog');
  }
  if(e.target.id==='mergeCurrentProduct'){
    const id=$('#productForm').dataset.edit;
    if(id)linkDialog(id);
  }
});

/* 제품 편집을 열 때, 이미 등록된 제품만 합치기 버튼을 표시 */
document.addEventListener('click',e=>{
  const id=e.target.closest('[data-edit-product]')?.dataset.editProduct;
  if(id)setTimeout(()=>{
    const merge=$('#mergeCurrentProduct');
    if(merge)merge.classList.toggle('hidden',!$('#productForm').dataset.edit);
  },0);
  if(e.target.id==='newProduct')$('#mergeCurrentProduct')?.classList.add('hidden');
});

render();
