/* 분류 필요 제품: 현장용 카드 목록으로 정리 */
const classifyStyle25=document.createElement('style');
classifyStyle25.textContent=`
.classification-needed{margin-top:18px}.classification-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 7px}.classification-title h3{margin:0;font-size:1.06rem}.classification-count{display:inline-block;padding:4px 9px;border-radius:999px;background:#fff0ed;color:#b53f31;font-size:.8rem;font-weight:850}.classification-help{margin:0 0 10px;color:#60766d;font-size:.87rem}.classification-needed details{background:#fff}.classification-needed summary{padding:13px 15px}.classification-list{padding:3px 10px 10px}.classification-card{display:block;width:100%;margin:7px 0;padding:13px 14px;border:1px solid #d9e6df;border-radius:12px;background:#fff;text-align:left;font:inherit;color:#173128;box-shadow:0 2px 7px #173a2b08}.classification-card:active{background:#f0f6f2}.classification-card strong{display:block;font-size:.97rem;line-height:1.35}.classification-card .classification-meta{display:block;margin-top:5px;color:#60766d;font-size:.84rem}.classification-card .classification-action{display:inline-block;margin-top:8px;color:#245b49;font-size:.83rem;font-weight:850}.classification-card .classification-action:after{content:' ›';font-size:1rem}.classification-needed .stock-group{border-color:#d9e6df}
`;
document.head.append(classifyStyle25);

function classificationNeeded25(){
  const products=data.products.filter(needsClassification19);
  if(!products.length)return '<div class="empty">분류가 필요한 제품이 없습니다.</div>';
  return `<section class="classification-needed"><div class="classification-title"><h3>분류 필요 제품</h3><span class="classification-count">${products.length}개</span></div><p class="classification-help">제품 하나를 눌러 제품코드·종류·규격을 정리하세요.</p><details class="stock-group" open><summary>제품 목록 보기 <span class="order-meta">${products.length}개</span></summary><div class="classification-list">${products.map(p=>`<button type="button" class="classification-card" data-edit-product="${p.id}"><strong>${esc(p.name)} · ${esc(p.spec)}</strong><span class="classification-meta">${esc(p.code||'코드 미입력')} · ${esc(p.kind||'종류 미확정')} · ${unit(p)}</span><span class="classification-action">제품 정보 수정</span></button>`).join('')}</div></details></section>`;
}
master=()=>catalogHtml22()+classificationNeeded25();
render();
