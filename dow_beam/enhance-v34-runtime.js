/* 엑셀 제품 마스터 반영 및 전체 제품 보기 */
const norm34=s=>String(s||'').toLowerCase().replace(/[\s×*]/g,'');
const code34=c=>c.startsWith('S1')?'S1 레진빔':c.startsWith('S2')?'S2 프레스빔':c.startsWith('S3')?'S3 레드빔':'부자재';
const unique34=[]; const seen34=new Set();
MASTER34.forEach((x,i)=>{let k=[x.category,x.kind,norm34(x.spec)].join('|');if(!seen34.has(k)){seen34.add(k);unique34.push({...x,key:k,code:`M-${String(i+1).padStart(3,'0')}`})}});
function installMaster34(){
 data.products??=[];
 unique34.forEach(m=>{let p=data.products.find(x=>x.masterKey===m.key)||data.products.find(x=>norm34(x.spec)===norm34(m.spec)&&code34(x.category||x.name)===m.category);
  if(p){p.masterKey=m.key;p.category=m.category;p.kind=m.kind;p.code=m.code;p.name=m.category; p.spec=m.spec;p.unit=m.unit||p.unit||'개';}
  else data.products.push({id:`master34-${m.code}`,masterKey:m.key,name:m.category,spec:m.spec,category:m.category,kind:m.kind,code:m.code,unit:m.unit||'개',opening:0,produced:0,shipped:0,adjustment:0});
 }); save();
}
installMaster34();
const style34=document.createElement('style');style34.textContent=`.master-kind34{padding:12px 15px;border-top:1px solid #e4ece7;font-weight:800}.master-spec34{padding:9px 15px 9px 25px;border-top:1px solid #edf2ef;font-size:.92rem}.master-spec34 small{display:block;color:#60766d;margin-top:3px}`;document.head.append(style34);
function master34(){let groups={};data.products.filter(p=>!p.deleted).forEach(p=>((groups[p.category||'기타·미분류']??=[]).push(p)));return Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0],'ko')).map(([cat,ps])=>{let kinds={};ps.forEach(p=>((kinds[p.kind||'기타']??=[]).push(p)));return `<details class="stock-group"><summary>${esc(cat)} <span class="order-meta">${ps.length}개 제품</span></summary>${Object.entries(kinds).sort((a,b)=>a[0].localeCompare(b[0],'ko')).map(([kind,rows])=>`<details><summary class="master-kind34">${esc(kind)} <span class="order-meta">${rows.length}개</span></summary>${rows.sort((a,b)=>a.spec.localeCompare(b.spec,'ko',{numeric:true})).map(p=>`<button class="product-order-link" data-product-orders="${p.id}"><strong>${esc(p.spec)}</strong><span>코드 ${esc(p.code||'')} · 현재 재고 ${q(stock(p))}${unit(p)}</span></button>`).join('')}</details>`).join('')}</details>`}).join('')}
master=master34;render();
