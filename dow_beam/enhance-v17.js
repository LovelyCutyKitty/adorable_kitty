/* 수동 발주·제품 표준 분류·정확한 검색 */
const GROUPS17=['S1 레진빔','S2 프레스빔','S3 빨간빔','B1 튜브형 본드','B2 카트리지형 본드','W1 왁스','MABOR','기타·미분류'];
const CODE_BY_GROUP17={'S1 레진빔':'S1','S2 프레스빔':'S2','S3 빨간빔':'S3','B1 튜브형 본드':'B1','B2 카트리지형 본드':'B2','W1 왁스':'W1','MABOR':'MABOR'};

function signalGroup17(p){
  const signal=`${p.code||''} ${p.name||''}`.toUpperCase().replace(/\s+/g,'');
  if(/MABOR/.test(signal))return 'MABOR';
  if(/^S1(?:-|$)/.test(signal))return 'S1 레진빔';
  if(/^S2(?:-|$)/.test(signal))return 'S2 프레스빔';
  if(/^S3(?:-|$)/.test(signal))return 'S3 빨간빔';
  if(/^B1(?:-|$)/.test(signal))return 'B1 튜브형 본드';
  if(/^B2(?:-|$)/.test(signal))return 'B2 카트리지형 본드';
  if(/^W1(?:-|$)/.test(signal))return 'W1 왁스';
  return '';
}
function productGroup17(p){
  const inferred=signalGroup17(p);
  if(inferred)return inferred;
  return GROUPS17.includes(p.category)?p.category:'기타·미분류';
}
category=p=>productGroup17(p);

let normalised17=false;
function normalizeProductGroups17(){
  if(normalised17)return;
  let changed=false;
  data.products.forEach(p=>{const g=signalGroup17(p);if(g&&p.category!==g){p.category=g;changed=true}});
  if(changed)localStorage.setItem(KEY,JSON.stringify(data));
  normalised17=true;
}
normalizeProductGroups17();

function norm17(v=''){
  return String(v).toLowerCase()
    .replace(/[＂"'’‘]/g,'')
    .replace(/[×*]/g,'x')
    .replace(/\s+/g,'')
    .trim();
}
function terms17(q){return String(q||'').trim().split(/\s+/).map(norm17).filter(Boolean)}
function match17(text,terms){const t=norm17(text);return terms.every(x=>t.includes(x))}
function setHidden17(el,hidden){el.classList.toggle('hidden',hidden)}
function applySearch17(container,query){
  const terms=terms17(query);
  const roots=[...container.querySelectorAll(':scope > details')];
  if(!terms.length){
    roots.forEach(root=>{setHidden17(root,false);root.querySelectorAll('.line-card,.period').forEach(x=>setHidden17(x,false))});
    return;
  }
  roots.forEach(root=>{
    const rootSummary=root.querySelector(':scope > summary')?.textContent||'';
    const rootHit=match17(rootSummary,terms);
    const periods=[...root.querySelectorAll(':scope > .period')];
    let rootVisible=false;
    if(periods.length){
      periods.forEach(period=>{
        const periodHit=rootHit||match17(period.querySelector(':scope > summary')?.textContent||'',terms);
        const cards=[...period.querySelectorAll(':scope > .line-card')];
        let periodVisible=false;
        cards.forEach(card=>{
          const visible=periodHit||match17(card.textContent,terms);
          setHidden17(card,!visible);
          if(visible)periodVisible=true;
        });
        setHidden17(period,!periodVisible);
        if(periodVisible){period.open=true;rootVisible=true}
      });
    }else{
      const cards=[...root.querySelectorAll(':scope > .line-card')];
      cards.forEach(card=>{
        const visible=rootHit||match17(card.textContent,terms);
        setHidden17(card,!visible);
        if(visible)rootVisible=true;
      });
    }
    setHidden17(root,!rootVisible);
    if(rootVisible)root.open=true;
  });
}

function openOrder17(){
  parsed=[];
  $('#orderForm').reset();
  $('#orderDateInput').value=today();
  $('#lineEditor').classList.remove('hidden');
  $('#parseNotice').classList.add('hidden');
  $('#mergeOptions').classList.add('hidden');
  drawLines();
  show('#orderDialog');
}
openOrder=openOrder17;
$('#addLine').onclick=()=>{
  parsed.push({id:id(),name:'',spec:'',quantity:0,unit:'개',planned:0,orderProduced:0,shipped:0});
  $('#lineEditor').classList.remove('hidden');
  drawLines();
};

function syncProductCode17(){
  const group=$('#productCategory').value;
  const code=CODE_BY_GROUP17[group];
  const input=$('#productCode');
  if(code&&!input.value.trim())input.value=code;
}
$('#productCategory').addEventListener('change',syncProductCode17);

function linkDialog17(sourceId){
  const source=data.products.find(x=>x.id===sourceId);
  if(!source)return;
  const sourceGroup=productGroup17(source);
  const targets=data.products.filter(x=>x.id!==sourceId&&productGroup17(x)===sourceGroup);
  if(!targets.length)return toast(`${sourceGroup} 분류 안에 연결할 기존 제품이 없습니다.`);
  $('#linkSource').textContent=`${source.name} · ${source.spec} · 분류 ${sourceGroup}`;
  $('#linkTarget').innerHTML=targets.map(x=>`<option value="${x.id}">${esc(x.name)} · ${esc(x.spec)} (${unit(x)})</option>`).join('');
  $('#linkDialog').dataset.source=sourceId;
  show('#linkDialog');
}
linkDialog=linkDialog17;
$('#linkForm').onsubmit=e=>{
  e.preventDefault();
  const source=data.products.find(p=>p.id===$('#linkDialog').dataset.source);
  const target=data.products.find(p=>p.id===$('#linkTarget').value);
  if(!source||!target)return;
  if(productGroup17(source)!==productGroup17(target))return toast('같은 제품 분류끼리만 합칠 수 있습니다.');
  if(source.unit!==target.unit)return toast(`단위가 달라 합칠 수 없습니다. (${source.unit} / ${target.unit})`);
  if(!confirm(`정말 같은 제품으로 중복 등록된 경우에만 사용하세요.\n\n${source.name} · ${source.spec}\n→ ${target.name} · ${target.spec}\n\n재고와 발주 기록을 하나로 합칠까요?`))return;
  target.opening=n(target.opening)+n(source.opening);
  target.produced=n(target.produced)+n(source.produced);
  target.shipped=n(target.shipped)+n(source.shipped);
  target.adjustment=n(target.adjustment)+n(source.adjustment);
  data.orders.forEach(o=>o.lines.forEach(l=>{if(l.productId===source.id){l.productId=target.id;l.name=target.name;l.spec=target.spec;l.unit=target.unit}}));
  data.products=data.products.filter(p=>p.id!==source.id);
  hide('#linkDialog');
  save();
  toast('같은 제품으로 합쳤습니다.');
};

const oldMaster17=master;
master=()=>oldMaster17()
  .replaceAll('기존 제품과 연결','같은 제품으로 합치기')
  .replace('두 제품의 재고와 발주 기록을 하나로 합칩니다.','정말 같은 제품이 중복 등록된 경우에만 합칩니다.');

function installSearch17(){
  [['dashboardSearch','#dashboardGroups'],['orderSearch','#orderGroups'],['inventorySearch','#inventoryContent'],['productSearch','#productContent']].forEach(([input,box])=>{
    const el=$('#'+input);
    if(el)el.oninput=()=>applySearch17($(box),el.value);
  });
}
const render17=render;
render=()=>{render17();normalizeProductGroups17();installSearch17()};
render();
