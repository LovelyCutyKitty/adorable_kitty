/* 제품분류도 표준 코드: 제품군 → 제품 종류 → 제품 규격 */
function group36(m){
 if(m.category!=='부자재')return m.category;
 if(/^튜브형 본드/.test(m.kind))return 'B1 튜브형 본드';
 if(/^카트리지형 본드/.test(m.kind))return 'B2 카트리지형 본드';
 if(m.kind==='왁스')return 'W1 왁스'; if(m.kind==='카본')return 'CB 카본'; return 'MB 마보';
}
function kind36(m){
 if(/^튜브형 본드 - /.test(m.kind))return m.kind.replace('튜브형 본드 - ','');
 if(/^카트리지형 본드 - /.test(m.kind))return m.kind.replace('카트리지형 본드 - ','');
 if(m.category==='부자재'&&m.kind==='MABOR')return '마보'; return m.kind;
}
data.products.forEach(p=>{const m=MASTER34.find(x=>x.category===p.category&&norm34(x.spec)===norm34(p.spec)&&(x.kind===p.kind||!p.kind));if(m){p.category=group36(m);p.kind=kind36(m);}});save();
const master36=()=>{const g={};data.products.filter(p=>!p.deleted).forEach(p=>((g[p.category||'기타·미분류']??=[]).push(p)));return Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0],'ko',{numeric:true})).map(([cat,ps])=>{const ks={};ps.forEach(p=>((ks[p.kind||'기타']??=[]).push(p)));return `<details class="stock-group"><summary>${esc(cat)} <span class="order-meta">${ps.length}개 제품</span></summary>${Object.entries(ks).sort((a,b)=>a[0].localeCompare(b[0],'ko',{numeric:true})).map(([kind,rows])=>`<details><summary class="master-kind34">${esc(kind)} <span class="order-meta">${rows.length}개</span></summary>${rows.sort((a,b)=>a.spec.localeCompare(b.spec,'ko',{numeric:true})).map(p=>`<button class="product-order-link" data-product-orders="${p.id}"><strong>${esc(p.spec)}</strong><span>현재 재고 ${q(stock(p))}${unit(p)}</span></button>`).join('')}</details>`).join('')}</details>`}).join('')};setTimeout(()=>{master=master36;render()},2500);
