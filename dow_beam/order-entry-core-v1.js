/* One order-entry state: manual entry is primary; Kakao only fills it. */
(() => {
  let drafts = [];
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const n0 = v => Number(v) || 0;
  const now = () => typeof today === 'function' ? today() : new Date().toISOString().slice(0,10);
  const uid = () => typeof id === 'function' ? id() : `${Date.now()}-${Math.random()}`;
  const clean = v => String(v || '').replace(/[＊*×]/g, ' × ').replace(/\s+/g, ' ').trim();
  const emptyLine = () => ({id:uid(),code:'',spec:'',quantity:'',due:'',unit:'개'});
  const emptyDraft = (dates={}) => ({id:uid(),company:'',orderDate:dates.orderDate || now(),due:dates.dueDate || '',memo:'',lines:[]});
  const detectCode = (text, prior='') => {
    const found = String(text).match(/\b(S[123]|B[12]|W1|CB|MB)\b/i);
    if (found) return found[1].toUpperCase();
    if (/카트리지|200\s*ml|1%/.test(text)) return 'B2';
    if (/튜브\s*본드|본드\s*튜브|400\s*ml/.test(text)) return 'B1';
    if (/카본/.test(text)) return 'CB'; if (/왁스/.test(text)) return 'W1';
    if (/조각빔|쫄대빔|가이드빔|flat/i.test(text)) return prior || 'S1';
    return prior;
  };
  const getForm = () => document.querySelector('#orderForm');
  function parse(raw, dates) {
    const out=[], ensure=d=>{if(!out.includes(d))out.push(d);return d;}; let draft=emptyDraft(dates), company='', code='';
    String(raw||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach(text=>{
      const head=text.match(/^(.+?)\s*발주요/i);
      if(head){company=head[1].replace(/[（(].*?[)）]/g,'').trim();draft=emptyDraft(dates);draft.company=company;code=detectCode(text);return;}
      const q=text.match(/(?:=|:|-|\s)\s*(\d+(?:\.\d+)?)\s*(개|kg|세트|장)\b/i);
      if(!q||/도합|합계|노즐|박스/.test(text))return; code=detectCode(text,code); if(!code)return;
      const spec=clean(text.slice(0,q.index).replace(new RegExp(`^${code}\\s*[-:]?\\s*`,'i'),'').replace(/[=:\-\s]+$/,'')) || '규격 확인 필요';
      ensure(draft).company ||= company; draft.lines.push({id:uid(),code,spec,quantity:q[1],due:draft.due,unit:q[2]});
    });
    return out.length ? out : [emptyDraft(dates)];
  }
  function read() {
    getForm().querySelectorAll('[data-draft]').forEach(x=>drafts[n0(x.dataset.di)][x.dataset.draft]=x.value.trim());
    getForm().querySelectorAll('[data-line]').forEach(x=>drafts[n0(x.dataset.di)].lines[n0(x.dataset.li)][x.dataset.line]=x.value.trim());
  }
  function render(mode='manual') {
    const form=getForm(); if(!form)return; if(!drafts.length)drafts=[emptyDraft()]; form.dataset.mode=mode;
    form.innerHTML=`<div class="dialog-head"><h2>발주 추가</h2><button class="close" type="button" data-close>×</button></div><div class="order-entry-tabs"><button type="button" data-mode="kakao" class="${mode==='kakao'?'active':''}">카톡 메시지 입력</button><button type="button" data-mode="manual" class="${mode==='manual'?'active':''}">수동 입력</button></div>${mode==='kakao'?`<label>카톡 발주 메시지 (선택)<textarea id="unifiedMessage" rows="6" placeholder="카톡 메시지를 붙여넣으세요. 입력하지 않아도 직접 추가할 수 있습니다."></textarea></label><button type="button" id="unifiedParse" class="secondary full">내용 읽어오기</button>`:`<p class="edit-note">전화·유선 주문은 아래에서 직접 입력해 저장합니다.</p>`}<section id="unifiedDraftOrders" class="groups">${drafts.map((d,di)=>`<details class="stock-group" open><summary>발주 초안 ${di+1} · ${esc(d.company||'발주처 입력')} <span class="order-meta">${d.lines.length}개 품목</span>${drafts.length>1?`<button type="button" class="draft-delete-x" data-remove-draft="${di}">×</button>`:''}</summary><div class="draft-fields"><label>발주처<input data-draft="company" data-di="${di}" value="${esc(d.company)}" placeholder="발주처"></label><div class="two"><label>발주 접수일<input type="date" data-draft="orderDate" data-di="${di}" value="${esc(d.orderDate)}"></label><label>납기일<input type="date" data-draft="due" data-di="${di}" value="${esc(d.due)}"></label></div><div class="line-head"><span>제품 코드</span><span>제품 규격</span><span>수량</span><span>제품별 납기</span></div>${d.lines.map((l,li)=>`<div class="edit-line"><input data-line="code" data-di="${di}" data-li="${li}" value="${esc(l.code)}" placeholder="S1"><input data-line="spec" data-di="${di}" data-li="${li}" value="${esc(l.spec)}" placeholder="규격"><input data-line="quantity" data-di="${di}" data-li="${li}" type="number" min="0" step="0.01" value="${esc(l.quantity)}"><input data-line="due" data-di="${di}" data-li="${li}" type="date" value="${esc(l.due||d.due)}"><button type="button" class="remove" data-remove-line="${di}|${li}">×</button></div>`).join('')}<button type="button" class="secondary full" data-add-line="${di}">+ 제품 한 줄 추가</button></div></details>`).join('')}</section><button type="button" id="unifiedAddDraft" class="secondary full">+ 발주 한 건 추가</button><div class="actions"><button class="secondary" data-close type="button">취소</button><button class="primary" type="submit">발주 저장</button></div>`;
    form.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>render(b.dataset.mode));
    form.querySelector('#unifiedParse')?.addEventListener('click',()=>{drafts=parse(form.querySelector('#unifiedMessage').value,drafts[0]);render('kakao');});
    form.querySelectorAll('[data-add-line]').forEach(b=>b.onclick=()=>{read();drafts[n0(b.dataset.addLine)].lines.push(emptyLine());render(mode);});
    form.querySelector('#unifiedAddDraft').onclick=()=>{read();drafts.push(emptyDraft());render(mode);};
    form.querySelectorAll('[data-remove-draft]').forEach(b=>b.onclick=()=>{read();drafts.splice(n0(b.dataset.removeDraft),1);render(mode);});
    form.querySelectorAll('[data-remove-line]').forEach(b=>b.onclick=()=>{read();const [di,li]=b.dataset.removeLine.split('|').map(n0);drafts[di].lines.splice(li,1);render(mode);});
  }
  function submit(event) {
    event.preventDefault(); read(); const valid=drafts.filter(d=>d.company&&d.lines.some(l=>l.code&&l.spec&&n0(l.quantity)>0));
    if(!valid.length)return toast('발주처와 제품 코드·규격·수량을 입력하세요.');
    valid.forEach(d=>data.orders.push({id:uid(),company:d.company,orderDate:d.orderDate||now(),dueDate:d.due||'',memo:d.memo||'',lines:d.lines.filter(l=>l.code&&l.spec&&n0(l.quantity)>0).map(l=>{const code=l.code.toUpperCase(),unit=l.unit||(code==='CB'?'장':'개'),p=typeof product==='function'?product(code,clean(l.spec),unit):null;return{id:uid(),code,name:code,category:'기타·미분류',spec:clean(l.spec),quantity:n0(l.quantity),unit,dueDate:l.due||d.due||'',planned:0,orderProduced:0,shipped:0,productId:p?.id||'',unmatched:true};})}));
    hide('#orderDialog');save();toast(`${valid.length}개 발주를 저장했습니다.`);
  }
  window.openUnifiedOrder=(mode='manual',dates={})=>{drafts=[emptyDraft(dates)];render(mode);getForm().onsubmit=submit;show('#orderDialog');};
})();
