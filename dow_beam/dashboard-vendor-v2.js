/* Immediate vendor drill-down for all dashboard cards. */
(()=>{
  function showVendorSummary(type){
    const labels={urgent:'납기 임박',active:'처리 중 발주',ready:'즉시 출고 가능',short:'발주 잔량 부족'};
    const groups={};
    data.orders.forEach(o=>(o.lines||[]).forEach(l=>{
      const p=data.products.find(x=>x.id===l.productId), remain=Math.max(0,n(l.quantity)-n(l.shipped));
      const d=o.dueDate?Math.ceil((new Date(o.dueDate)-new Date())/864e5):null;
      const ok=type==='active'?!done(l):type==='urgent'?!done(l)&&d!==null&&d<=7:type==='ready'?!done(l)&&p&&stock(p)>=remain:type==='short'?p&&stock(p)<remain:false;
      if(ok)(groups[o.company||'발주처 미입력']??=[]).push({o,l,remain,d});
    }));
    $('#summaryTitle').textContent=labels[type]||'발주 현황';
    $('#summaryList').innerHTML=Object.keys(groups).length?Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0],'ko')).map(([company,rows])=>`<details class="stock-group" open><summary>${esc(company)} <span class="order-meta">${rows.length}개 품목</span></summary>${rows.map(({o,l,remain,d})=>`<details class="line-card"><summary><strong>${esc(l.code||l.name)}</strong><span class="spec">${esc(l.spec)}</span></summary><p class="muted">발주 ${q(l.quantity)}${esc(l.unit)} · 잔량 ${q(remain)}${esc(l.unit)}${o.dueDate?` · 납기 ${esc(o.dueDate)}${d!==null?` (D-${d})`:''}`:''}</p><button data-line="${o.id}|${l.id}">제품 수량 입력</button></details>`).join('')}</details>`).join(''):'<div class="empty">해당 항목이 없습니다.</div>';
    show('#summaryDialog');
  }
  openSummary=showVendorSummary;
  document.addEventListener('click',e=>{const card=e.target.closest('[data-summary]');if(!card)return;e.preventDefault();e.stopImmediatePropagation();showVendorSummary(card.dataset.summary)},true);
})();
