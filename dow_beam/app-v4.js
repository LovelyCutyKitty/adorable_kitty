const KEY = 'dow-beam-inventory-v1';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let data = load();
let parsed = [];

function load(){ try{return JSON.parse(localStorage.getItem(KEY)) || {products:[],orders:[]};}catch{return {products:[],orders:[]};} }
function save(){localStorage.setItem(KEY,JSON.stringify(data));render();}
function id(){return `${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function today(){return new Date().toISOString().slice(0,10);}
function esc(x=''){return String(x).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function statusName(s){return ({received:'접수',checking:'재고 확인',producing:'생산중',ready:'생산완료',shipped:'출고완료'})[s]||s;}
function statusClass(s){return ({checking:'orange',producing:'blue',shipped:'ok'})[s]||'';}
function unit(n){return Number(n||0).toLocaleString('ko-KR',{maximumFractionDigits:2});}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.remove('hidden');setTimeout(()=>e.classList.add('hidden'),2200);}
function isoFromKorean(){return '';}
function normalizeSpec(s){return s.trim().replace(/\*/g,' × ').replace(/\s*×\s*/g,' × ').replace(/\s+/g,' ').replace(/(\d)\s*([tTwWlLrR])/g,'$1$2').replace(/\(\s*/g,'(').replace(/\s*\)/g,')');}
function productKey(name,spec){return `${name}|${spec}`.toLowerCase().replace(/\s/g,'');}
function findProduct(name,spec){const k=productKey(name,spec);return data.products.find(p=>productKey(p.name,p.spec)===k);}
function open(dialog){$(dialog).showModal();}
function close(dialog){$(dialog).close();}

function parseMessage(raw){
  const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);let company='';let currentName='';let currentSpec='';let notes=[];let result=[];
  for(let i=0;i<lines.length;i++){
    let line=lines[i]; const clean=line.replace(/^\*+|\*+$/g,'').trim();
    if(/^추가\s*발주요/.test(clean)){company=(lines[i-1]||'').trim().split(/\s+/)[0]||company;continue;}
    const orderMatch=clean.match(/^(.+?)\s*(?:추가\s*)?발주요/);
    if(orderMatch){ company=orderMatch[1].replace(/\(.+?\)/g,'').trim(); const paren=clean.match(/\(([^)]+)\)/); if(paren) currentName=paren[1].trim().replace(/\s+/g,''); currentSpec=''; continue; }
    if(/^S[12]\s*[-–]/i.test(clean) && !/\d+(?:\.\d+)?\s*(개|kg|세트|장)/i.test(clean)){currentName=clean;currentSpec='';continue;}
    const flatOnly=clean.match(/^FLAT\s*[-–]\s*(.+)$/i);
    if(flatOnly && !/\d+(?:\.\d+)?\s*(개|kg|세트|장)/i.test(clean)){currentName='FLAT';currentSpec=flatOnly[1].trim();continue;}
    if(/->|→|길이\s*\d+\s*\/\s*\d+/.test(clean)){notes.push(clean);continue;}
    if(/재고\s*봐|발송|배송|주문함|잔량|짤라|가공/.test(clean) && !/\d+\s*(개|kg|세트|장)/i.test(clean)){notes.push(clean);continue;}
    const qty=clean.match(/(?:=|:|\-|→)?\s*(\d+(?:\.\d+)?)\s*(개|kg|세트|장)/i);
    if(!qty) continue;
    let before=clean.slice(0,qty.index).replace(/[=:\-–]\s*$/,'').replace(/^\*+|\*+$/g,'').trim();
    if(/^(제작\s*)?수량$/.test(before) && currentSpec) before=currentSpec;
    let name=currentName||'';
    const named=before.match(/^(S[12]\s*-[^\d]*?빔|FLAT|조각빔|튜브\s*본드|본드|알루미늄지그|카본)\s*(.*)$/i);
    if(named){name=named[1].trim();before=named[2].trim();}
    if(!name){name='미분류 제품';}
    if(!before && name==='미분류 제품'){notes.push(clean);continue;}
    result.push({name, spec:normalizeSpec(before||name), quantity:Number(qty[1]), unit:qty[2], caution:/^\*|\*\s*$|주문함|재고/.test(line), raw:clean});
  }
  return {company,lines:result,notes,due:isoFromKorean(raw)};
}
function stockFor(p){return Number(p.stock||0);}
function openOrdersFor(p){return data.orders.filter(o=>o.status!=='shipped').flatMap(o=>o.lines).filter(l=>l.productId===p.id).reduce((a,l)=>a+Number(l.quantity),0);}
function availability(p){return stockFor(p)-openOrdersFor(p);}
function dueInfo(o){if(!o.dueDate)return {label:'납기 미입력',rank:999999};const diff=Math.ceil((new Date(`${o.dueDate}T00:00`)-new Date(`${today()}T00:00`))/86400000);return {label:diff<0?`${Math.abs(diff)}일 지연`:diff===0?'오늘 납기':diff===1?'내일 납기':`D-${diff}`,rank:diff};}

function render(){
  $('#todayLabel').textContent=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date());
  const active=data.orders.filter(o=>o.status!=='shipped'); const urgent=active.filter(o=>dueInfo(o).rank<=1).length;
  const shortage=data.products.filter(p=>availability(p)<0); const ready=active.filter(o=>o.lines.every(l=>{const p=data.products.find(x=>x.id===l.productId);return p&&stockFor(p)>=l.quantity;})).length;
  $('#summaryCards').innerHTML=`<div class="summary-card ${urgent?'alert':''}"><span>납기 임박</span><strong>${urgent}건</strong></div><div class="summary-card"><span>처리 중 발주</span><strong>${active.length}건</strong></div><div class="summary-card ${shortage.length?'alert':'ok'}"><span>재고 부족 품목</span><strong>${shortage.length}개</strong></div><div class="summary-card ok"><span>즉시 출고 가능</span><strong>${ready}건</strong></div>`;
  const priority=[...active].sort((a,b)=>dueInfo(a).rank-dueInfo(b).rank).slice(0,5);
  $('#priorityList').innerHTML=priority.length?priority.map(orderCard).join(''):'<div class="empty">처리할 발주가 없습니다.</div>';
  $('#shortageList').innerHTML=shortage.length?shortage.slice(0,5).map(productCard).join(''):'<div class="empty">현재 재고 부족 품목이 없습니다.</div>';
  renderOrders();renderProducts();
}
function orderCard(o){const d=dueInfo(o);const names=o.lines.map(l=>`${l.name} ${unit(l.quantity)}${l.unit}`).join(' · ');return `<article class="item"><div class="item-top"><strong>${esc(o.company)}</strong><span class="badge ${d.rank<=1?'red':''}">${d.label}</span></div><p class="spec">${esc(names)}</p><div class="item-meta"><span>${statusName(o.status)}</span><span>발주일 ${o.orderDate}</span></div><div class="item-actions"><button data-detail="${o.id}" type="button">상세 보기</button><button class="primary" data-next="${o.id}" type="button">${o.status==='received'?'재고 확인':'상태 변경'}</button></div></article>`;}
function productCard(p){const reserved=openOrdersFor(p), available=availability(p);const badge=available<0?`${unit(Math.abs(available))}${p.unit} 부족`:`여유 ${unit(available)}${p.unit}`;return `<article class="item"><div class="item-top"><strong>${esc(p.name)}</strong><span class="badge ${available<0?'red':''}">${badge}</span></div><p class="spec">${esc(p.spec)}</p><div class="item-meta"><span>현재 ${unit(p.stock)}${p.unit}</span><span>출고예정 ${unit(reserved)}${p.unit}</span></div><div class="item-actions"><button data-product="${p.id}" type="button">수정</button><button class="primary" data-production="${p.id}" type="button">생산 완료 입력</button></div></article>`;}
function renderOrders(){const filter=$('#orderStatusFilter').value;const all=filter==='all'?data.orders:data.orders.filter(o=>o.status===filter);$('#orderList').innerHTML=all.length?all.sort((a,b)=>dueInfo(a).rank-dueInfo(b).rank).map(orderCard).join(''):'<div class="empty">등록된 발주가 없습니다.<br>새 발주를 눌러 카톡 메시지를 붙여넣으세요.</div>';}
function renderProducts(){const q=$('#productSearch').value.trim().toLowerCase();const all=data.products.filter(p=>`${p.name} ${p.spec}`.toLowerCase().includes(q));$('#productList').innerHTML=all.length?all.map(productCard).join(''):'<div class="empty">등록된 제품이 없습니다.<br>제품 추가를 눌러 현재 재고부터 입력하세요.</div>';}

function showOrderDialog(){parsed=[];$('#orderForm').reset();$('#orderDateInput').value=today();$('#parseNotice').classList.add('hidden');$('#parsedLines').innerHTML='';open('#orderDialog');}
function drawParsed(){const box=$('#parsedLines');$('#parsedHeader').classList.toggle('hidden',!parsed.length);box.innerHTML=parsed.map((p,i)=>`<div class="parsed-line"><div class="line-fields"><input data-field="name" data-index="${i}" value="${esc(p.name)}" aria-label="제품명" /><input data-field="spec" data-index="${i}" value="${esc(p.spec)}" aria-label="규격" /><input data-field="quantity" data-index="${i}" type="number" min="0" step="0.01" value="${p.quantity}" aria-label="수량" /></div><small>단위: ${p.unit}${p.caution?' · 확인 필요':''}</small></div><button class="delete-line" data-remove-parsed="${i}" type="button">×</button></div>`).join('');}
function parseNow(){const got=parseMessage($('#messageInput').value);parsed=got.lines;$('#companyInput').value=got.company;$('#dueDateInput').value=got.due;$('#orderMemoInput').value=got.notes.join(' / ');const notice=$('#parseNotice');notice.textContent=parsed.length?`${parsed.length}개 품목을 읽었습니다.${got.notes.length?' 메모도 함께 저장됩니다.':''} 제품·규격은 저장 전 꼭 확인하세요.`:'수량이 있는 품목을 읽지 못했습니다. 메시지를 확인해주세요.';notice.classList.remove('hidden');drawParsed();}
function saveOrder(e){e.preventDefault();$$('#parsedLines input').forEach(input=>{const p=parsed[Number(input.dataset.index)];p[input.dataset.field]=input.dataset.field==='quantity'?Number(input.value):input.value.trim();});if(!parsed.length){toast('먼저 카톡 내용을 읽어오세요.');return;}const company=$('#companyInput').value.trim();if(!company){toast('발주처를 입력하세요.');return;}const lines=parsed.map(l=>{let p=findProduct(l.name,l.spec);if(!p){p={id:id(),name:l.name,spec:l.spec,stock:0,unit:l.unit,safety:0};data.products.push(p);}return {...l,productId:p.id};});data.orders.push({id:id(),company,orderDate:$('#orderDateInput').value,dueDate:$('#dueDateInput').value,memo:$('#orderMemoInput').value.trim(),status:'received',lines,createdAt:Date.now()});close('#orderDialog');save();toast('발주를 저장했습니다.');}
function showProductDialog(product){$('#productForm').reset();$('#productDialogTitle').textContent=product?'제품 수정':'새 제품 추가';$('#productIdInput').value=product?.id||'';$('#productNameInput').value=product?.name||'';$('#specInput').value=product?.spec||'';$('#stockInput').value=product?.stock??0;$('#unitInput').value=product?.unit||'개';$('#safetyStockInput').value=product?.safety??0;open('#productDialog');}
function saveProduct(e){e.preventDefault();const pid=$('#productIdInput').value;const product={id:pid||id(),name:$('#productNameInput').value.trim(),spec:$('#specInput').value.trim(),stock:Number($('#stockInput').value),unit:$('#unitInput').value,safety:Number($('#safetyStockInput').value)};if(!product.name||!product.spec){return;}if(pid){data.products=data.products.map(p=>p.id===pid?product:p);}else{if(findProduct(product.name,product.spec)){toast('같은 제품이 이미 있습니다.');return;}data.products.push(product);}close('#productDialog');save();toast('제품을 저장했습니다.');}
function detailOrder(order){const lineHtml=order.lines.map(l=>{const p=data.products.find(x=>x.id===l.productId);return `<div class="detail-row"><span>${esc(l.name)}<br><small>${esc(l.spec)}</small></span><strong>${unit(l.quantity)}${l.unit}</strong><small>재고 ${p?unit(p.stock)+p.unit:'-'}</small></div>`}).join('');$('#detailContent').innerHTML=`<div class="dialog-head"><div><p class="eyebrow">${esc(order.company)}</p><h2>발주 상세</h2></div><button class="close-button" data-close-detail type="button">×</button></div><div class="detail-section"><h3>품목</h3>${lineHtml}</div><div class="detail-section"><h3>일정</h3><div class="detail-row"><span>발주일</span><strong>${order.orderDate}</strong></div><div class="detail-row"><span>납기일</span><strong>${order.dueDate||'미입력'}</strong></div></div>${order.memo?`<div class="detail-section"><h3>메모</h3><p>${esc(order.memo)}</p></div>`:''}<div class="detail-actions"><button class="produce" data-status="${order.id}" data-value="producing" type="button">생산중 처리</button><button class="ship" data-ship="${order.id}" type="button">출고 완료</button></div>`;open('#detailDialog');}
function changeStatus(order){const steps=['received','checking','producing','ready','shipped'];const current=steps.indexOf(order.status);order.status=steps[Math.min(current+1,steps.length-1)];save();toast(`${statusName(order.status)} 처리했습니다.`);}
function ship(order){for(const l of order.lines){const p=data.products.find(x=>x.id===l.productId);if(!p||p.stock<l.quantity){toast('재고가 부족합니다. 생산수량을 먼저 입력하세요.');return;}}for(const l of order.lines){data.products.find(x=>x.id===l.productId).stock-=l.quantity;}order.status='shipped';close('#detailDialog');save();toast('출고 완료: 재고를 차감했습니다.');}
function addProduction(p){const input=prompt(`${p.name}\n${p.spec}\n생산 완료 수량을 입력하세요. (${p.unit})`);if(input===null)return;const qty=Number(input);if(!Number.isFinite(qty)||qty<=0){toast('0보다 큰 숫자를 입력하세요.');return;}p.stock+=qty;save();toast(`${unit(qty)}${p.unit} 생산 완료를 반영했습니다.`);}

$$('.tab').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.view;$$('.tab').forEach(x=>x.classList.toggle('active',x===b));$$('.view').forEach(x=>x.classList.toggle('hidden',x.id!==`${v}View`));}));
$('#quickOrderButton').onclick=showOrderDialog;$('#newOrderButton').onclick=showOrderDialog;$('#newProductButton').onclick=()=>showProductDialog();$('#parseButton').onclick=parseNow;$('#orderForm').addEventListener('submit',saveOrder);$('#productForm').addEventListener('submit',saveProduct);$('#productSearch').oninput=renderProducts;$('#orderStatusFilter').onchange=renderOrders;
document.addEventListener('click',e=>{const d=e.target.dataset;if(d.go){$(`.tab[data-view="${d.go}"]`).click();}if(d.removeParsed){parsed.splice(Number(d.removeParsed),1);drawParsed();}if(d.detail){detailOrder(data.orders.find(o=>o.id===d.detail));}if(d.next){changeStatus(data.orders.find(o=>o.id===d.next));}if(d.product){const p=data.products.find(x=>x.id===d.product);showProductDialog(p);}if(d.production){addProduction(data.products.find(x=>x.id===d.production));}if(d.closeDetail)close('#detailDialog');if(d.status){const o=data.orders.find(x=>x.id===d.status);o.status=d.value;close('#detailDialog');save();toast('상태를 변경했습니다.');}if(d.ship)ship(data.orders.find(o=>o.id===d.ship));});
$('#menuButton').onclick=()=>open('#menuDialog');$('#menuClose').onclick=()=>close('#menuDialog');$('#exportButton').onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`dow-재고관리-백업-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast('백업 파일을 저장했습니다.');};$('#importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!Array.isArray(x.products)||!Array.isArray(x.orders))throw Error();data=x;save();close('#menuDialog');toast('데이터를 복원했습니다.');}catch{toast('올바른 백업 파일이 아닙니다.');}};$('#resetButton').onclick=()=>{if(confirm('모든 제품과 발주 데이터를 지울까요?\n이 작업은 되돌릴 수 없습니다.')){data={products:[],orders:[]};save();close('#menuDialog');toast('모든 데이터를 초기화했습니다.');}};
$$('.dialog-actions .secondary').forEach(b=>b.onclick=()=>b.closest('dialog').close());
render();
