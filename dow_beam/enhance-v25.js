/* 분류 필요 제품: 현장용 카드 목록으로 정리 */
const classifyStyle25=document.createElement('style');
classifyStyle25.textContent=`
.classification-needed{margin-top:18px}.classification-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 7px}.classification-title h3{margin:0;font-size:1.06rem}.classification-count{display:inline-block;padding:4px 9px;border-radius:999px;background:#fff0ed;color:#b53f31;font-size:.8rem;font-weight:850}.classification-help{margin:0 0 10px;color:#60766d;font-size:.87rem}.classification-needed details{background:#fff}.classification-needed summary{padding:13px 15px}.classification-list{padding:3px 10px 10px}.classification-card{display:block;width:100%;margin:7px 0;padding:13px 14px;border:1px solid #d9e6df;border-radius:12px;background:#fff;text-align:left;font:inherit;color:#173128;box-shadow:0 2px 7px #173a2b08}.classification-card:active{background:#f0f6f2}.classification-card strong{display:block;font-size:.97rem;line-height:1.35}.classification-card .classification-meta{display:block;margin-top:5px;color:#60766d;font-size:.84rem}.classification-actions{display:flex;gap:7px;margin-top:10px}.classification-actions button{margin:0}.product-delete{border-color:#efb7ad!important;color:#b53f31!important}.product-order-link{display:block;width:100%;padding:10px 0;border:0;background:transparent;text-align:left;font:inherit;color:#173128}.product-order-link strong{display:block}.product-order-link span{display:block;margin-top:3px;color:#60766d;font-size:.84rem}.product-order-link:after{content:'발주 정보 보기 ›';display:block;margin-top:6px;color:#245b49;font-size:.83rem;font-weight:850}.product-order-path{margin:0 0 10px;color:#60766d;font-size:.87rem}.product-order-period{margin:10px 0;border:1px solid #d9e6df;border-radius:11px;padding:10px}.product-order-period h3{margin:0 0 4px;font-size:1rem}.product-order-period p{margin:3px 0;color:#60766d;font-size:.86rem}
`;
document.head.append(classifyStyle25);

function productLines25(productId){return data.orders.flatMap(o=>o.lines.filter(l=>l.productId===productId).map(l=>({o,l})));}
function openProductOrders25(productId){const p=data.products.find(x=>x.id===productId);if(!p)return;const rows=productLines25(productId);$('#productOrderTitle25').textContent=`${p.name} 발주 정보`;$('#productOrderBody25').innerHTML=`<p class="product-order-path">${esc(p.spec)} · 현재 공장 재고 ${q(stock(p))}${unit(p)}</p>${rows.length?rows.map(({o,l})=>`<section class="product-order-period"><h3>${esc(o.company)}</h3><p>발주기간 ${esc(o.orderDate||'미입력')}${l.dueDate||o.dueDate?` · 납기 ${esc(l.dueDate||o.dueDate)}`:''}</p>${lineCard(o,l)}</section>`).join(''):'<div class="empty">연결된 발주 정보가 없습니다.</div>'}`;show('#productOrderDialog25');}
function deleteProduct25(productId){const p=data.products.find(x=>x.id===productId);if(!p)return;if(!confirm(`${p.name} · ${p.spec} 제품을 제품 목록에서 삭제할까요?\n\n발주·생산·출고 기록은 그대로 보존됩니다.`))return;p.deleted=true;save();toast('제품 목록에서 삭제했습니다. 발주 기록은 유지됩니다.');}
function classificationNeeded25(){
  const products=data.products.filter(p=>!p.deleted&&needsClassification19(p));
  if(!products.length)return '<div class="empty">분류가 필요한 제품이 없습니다.</div>';
  return `<section class="classification-needed"><div class="classification-title"><h3>분류 필요 제품</h3><span class="classification-count">${products.length}개</span></div><p class="classification-help">중복 등록된 제품은 관련 발주까지 함께 삭제할 수 있습니다.</p><details class="stock-group" open><summary>제품 목록 보기 <span class="order-meta">${products.length}개</span></summary><div class="classification-list">${products.map(p=>`<article class="classification-card"><strong>${esc(p.name)} · ${esc(p.spec)}</strong><span class="classification-meta">${esc(p.code||'코드 미입력')} · ${esc(p.kind||'종류 미확정')} · ${unit(p)}</span><div class="classification-actions"><button type="button" class="small-action" data-edit-product="${p.id}">제품 정보 수정</button><button type="button" class="small-action product-delete" data-delete-product="${p.id}">삭제</button></div></article>`).join('')}</div></details></section>`;
}
function catalogHtml25(){const body=Object.entries(data.catalog).map(([code,x])=>`<details class="stock-group"><summary><span class="catalog-code">${esc(x.label)}</span><span class="order-meta">${Object.keys(x.types).length}개 종류</span></summary>${Object.entries(x.types).map(([kind,specs])=>`<div class="line-card"><div class="catalog-kind">${esc(kind)}</div>${specs.length?specs.map(spec=>{const ps=productsForCatalog22(code,kind,spec).filter(p=>!p.deleted);return ps.length?ps.map(p=>`<button type="button" class="product-order-link" data-product-orders="${p.id}"><strong>${esc(p.spec)}</strong><span>${esc(p.name)} · 발주 ${productLines25(p.id).length}건</span></button>`).join(''):`<div class="catalog-spec">${esc(spec)}</div>`}).join(''):'<div class="catalog-spec">등록 규격 없음</div>'}<button type="button" class="catalog-empty-edit" data-catalog-edit="${code}|${encodeURIComponent(kind)}">종류·규격 관리</button></div>`).join('')}</details>`).join('');return `<section class="catalog-tools"><button type="button" class="primary" id="openCatalog">제품분류도 관리</button><p class="catalog-note">규격을 누르면 연결된 발주 정보를 확인할 수 있습니다.</p>${body}</section>`;}
const stockList25=stockList;stockList=()=>stockList25().replace(/(<button class="small-action" data-adjust="([^"]+)">재고 수정<\/button>)/g,'<button class="small-action" data-product-orders="$2">발주 정보 보기</button>$1');
master=()=>catalogHtml25()+classificationNeeded25();
document.body.insertAdjacentHTML('beforeend','<dialog id="productOrderDialog25" class="dialog"><div><div class="dialog-head"><h2 id="productOrderTitle25">제품 발주 정보</h2><button class="close" type="button" data-close>×</button></div><div id="productOrderBody25"></div></div></dialog>');
document.addEventListener('click',e=>{const b=e.target.closest('[data-product-orders],[data-delete-product]');if(!b)return;if(b.dataset.productOrders)openProductOrders25(b.dataset.productOrders);if(b.dataset.deleteProduct)deleteProduct25(b.dataset.deleteProduct);});
render();

/* 현재 배포본에서도 발주 정정 기능을 불러온다. */
if(!document.querySelector('script[data-order-correction]')){const s=document.createElement('script');s.dataset.orderCorrection='1';s.async=false;s.src='enhance-v27.js?rev=5';document.body.append(s);}

const flexibleQuantityScript=document.createElement('script');
flexibleQuantityScript.async=false;
flexibleQuantityScript.src='enhance-v28.js?rev=2';
document.body.append(flexibleQuantityScript);

const productionPlanScript=document.createElement('script');
productionPlanScript.async=false;
productionPlanScript.src='enhance-v29.js?rev=1';
document.body.append(productionPlanScript);

const flexibleChangeScript=document.createElement('script');
flexibleChangeScript.async=false;
flexibleChangeScript.src='enhance-v30.js?rev=1';
document.body.append(flexibleChangeScript);

const dueCalendarScript=document.createElement('script');
dueCalendarScript.async=false;
dueCalendarScript.src='enhance-v31.js?rev=1';
document.body.append(dueCalendarScript);
