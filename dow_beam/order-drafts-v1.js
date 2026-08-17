/* One deterministic Kakao parser: message -> editable order drafts -> save. */
(() => {
  const codes = { S1: 'S1 레진빔', S2: 'S2 프레스빔', S3: 'S3 레드빔', B1: 'B1 튜브형 본드', B2: 'B2 카트리지형 본드', W1: 'W1 왁스', CB: 'CB 카본', MB: 'MB 마보' };
  const knownCompanies = new Set(['나오에츠','나가노전자','부르크하우젠','빌스트러프','우일','동방카본','실트로닉독일','실트로닉싱가폴','솔믹스','성진','뉴마테크','삼성전자','알케미스트','에이엠테크','하나','진테크','그린코드','지큐엘','에스엠지','웨이퍼웍스','가온에스티','비씨앤씨','마루젠']);
  let drafts = [];
  document.querySelector('#companyInput')?.removeAttribute('required');
  const clean = (v) => String(v || '').replace(/\s*[＊*×]\s*/g, ' × ').replace(/\s+/g, ' ').trim();
  const dateValue = (v) => { const m = String(v).match(/(?:^|\s)(?:(\d{2})[./-])?(\d{1,2})[./-](\d{1,2})(?:\s|$)/); return m ? `${m[1] ? 2000 + Number(m[1]) : new Date().getFullYear()}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}` : ''; };
  const codeOf = (v, current='') => {
    const m = String(v).match(/(?:^|\s)(S[123]|B[12]|W1|CB|MB)\s*(?:[-:]|\b)/i);
    if (m) return m[1].toUpperCase();
    if (/1%\s*카트리지|카트리지|200\s*ml/i.test(v)) return 'B2';
    if (/튜브\s*본드|본드\s*튜브|400\s*ml/i.test(v)) return 'B1';
    if (/카본/i.test(v)) return 'CB';
    if (/왁스/i.test(v)) return 'W1';
    if (/조각빔|가이드빔|쫄대빔|FLAT/i.test(v)) return current || 'S1';
    return current;
  };
  const unitOf = (code, unit) => code === 'CB' ? '장' : unit || '개';
  const newDraft = (company='', parent='', due='', dueText='', orderDate=today()) => ({ id: id(), company, parent, orderDate, due, dueText, memo: '', lines: [] });
  const newLine = (code='', spec='', quantity=0, unit='개', due='') => ({ id: id(), code, spec, quantity, unit, due });
  function inferSpec(before, code, fallback='') {
    let out = String(before || '').replace(/^\s*(S[123]|B[12]|W1|CB|MB)\s*[-:]?\s*/i,'').replace(/^\s*(?:제작\s*)?수량\s*[:=-]?\s*/i,'').replace(/->/g,' ').trim();
    if (/^\d{2}[./-]\d{1,2}[./-]\d{1,2}$/.test(out)) out = '';
    if (!out) out = fallback || (code === 'B2' ? '1% 카트리지 본드 200ml' : code === 'B1' ? '튜브 타입' : code === 'CB' ? '카본' : '규격 확인 필요');
    return clean(out);
  }
  function parse(raw) {
    const result = [], notes = [];
    let parent = '', company = '', code = '', defaultDue = '', dueText = '', pendingSpec = '', current = null;
    const start = (name) => { current = newDraft(name || company || '', parent, defaultDue, dueText); result.push(current); return current; };
    const ensure = () => current || start(company);
    String(raw || '').split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach((original) => {
      let line = original.replace(/^[-•]\s*/, '');
      const header = line.match(/^(.+?)\s*발주요/i);
      if (header) {
        let head = header[1].replace(/[（(].*?[)）]/g,'').trim();
        const headerCode = codeOf(head, '');
        if (headerCode) head = head.replace(/\b(S[123]|B[12]|W1|CB|MB)\b.*$/i,'').trim();
        company = head || company; parent = ''; code = codeOf(line, headerCode); current = null;
        return;
      }
      const exactDate = dateValue(line);
      if (/출하희망일|납기일/.test(line) && !/\d+(?:\.\d+)?\s*(개|kg|세트|장)/i.test(line)) {
        defaultDue = exactDate; dueText = exactDate ? '' : clean(line); notes.push(line); return;
      }
      if (/^(?:9|10|11|12)월\s*(?:초|중순|말)\s*[:：-]/.test(line)) dueText = clean(line.split(/[:：-]/)[0]);
      const companyOnly = line.replace(/[（(].*?[)）]/g,'').trim();
      if (knownCompanies.has(companyOnly) && !/\d/.test(companyOnly)) {
        if (company && companyOnly !== company) parent = company;
        company = companyOnly; current = null; return;
      }
      const recipient = line.match(/^(.+?)\s*:\s*\d+(?:\.\d+)?\s*(?:개|kg|세트|장)/i);
      if (recipient && knownCompanies.has(recipient[1].trim())) {
        if (company && recipient[1].trim() !== company) parent = company;
        company = recipient[1].trim(); current = null;
        line = line.slice(recipient[0].indexOf(':'));
      }
      code = codeOf(line, code);
      const quantity = line.match(/(?:=|:|(?<!\d)-|\s)\s*(\d+(?:\.\d+)?)\s*(개|kg|세트|장)/i);
      if (!quantity || /도합|합계|노즐|박스/.test(line)) {
        if (code && /FLAT|조각빔|가이드빔|쫄대빔/i.test(line)) pendingSpec = line;
        notes.push(line); return;
      }
      if (!code) { notes.push(line); return; }
      const before = line.slice(0, quantity.index).replace(/[=:\-\s]+$/, '');
      const rowDue = exactDate || defaultDue;
      const draft = ensure();
      draft.lines.push(newLine(code, inferSpec(before, code, pendingSpec), n(quantity[1]), unitOf(code, quantity[2]), rowDue));
      pendingSpec = '';
    });
    result.forEach(d => { d.memo = notes.filter(note => !/^\s*(?:S[123]|B[12]|W1|CB|MB)/i.test(note)).join(' / '); });
    return result.filter(d => d.lines.length);
  }
  function panel() {
    let el = document.querySelector('#draftOrders');
    if (!el) { el = document.createElement('section'); el.id = 'draftOrders'; el.className = 'groups'; document.querySelector('#lineEditor').after(el); }
    return el;
  }
  function render() {
    const el = panel();
    if (!document.querySelector('#draftOrderLayoutFix')) {
      document.head.insertAdjacentHTML('beforeend', '<style id="draftOrderLayoutFix">#orderDialog #draftOrders .two{display:grid!important}</style>');
    }
    if (!drafts.length) drafts = [newDraft()];
    el.innerHTML = `<style>#orderDialog #lineEditor,#orderDialog label:has(#companyInput),#orderDialog .two,#orderDialog label:has(#orderMemoInput),#orderDialog #mergeOptions{display:none!important}</style><p class="edit-note">카톡 결과를 발주 초안으로 확인한 뒤 저장합니다. 입력하지 않아도 제품 줄과 발주 한 건을 직접 추가할 수 있습니다.</p>${drafts.map((draft, di) => `<details class="stock-group" open><summary>발주 초안 ${di + 1} · ${esc(draft.company || '발주처 입력')} <span class="order-meta">${draft.lines.length}개 품목</span></summary><div class="draft-fields"><label>발주처<input data-draft="company" data-di="${di}" value="${esc(draft.company)}" placeholder="발주처"></label><div class="two"><label>발주 접수일<input data-draft="orderDate" data-di="${di}" type="date" value="${esc(draft.orderDate || today())}"></label><label>납기일<input data-draft="due" data-di="${di}" type="date" value="${esc(draft.due)}"></label></div>${draft.dueText ? `<p class="muted">원문 납기: ${esc(draft.dueText)} (날짜 확인 필요)</p>` : ''}${draft.parent ? `<p class="muted">상위 발주: ${esc(draft.parent)}</p>` : ''}<div class="line-head"><span>제품 코드</span><span>제품 규격</span><span>수량</span><span>제품별 납기</span></div><div>${draft.lines.map((line, li) => `<div class="edit-line"><input data-line="code" data-di="${di}" data-li="${li}" value="${esc(line.code)}"><input data-line="spec" data-di="${di}" data-li="${li}" value="${esc(line.spec)}"><input data-line="quantity" data-di="${di}" data-li="${li}" type="number" min="0" step="0.01" value="${n(line.quantity)}"><input data-line="due" data-di="${di}" data-li="${li}" type="date" value="${esc(line.due || draft.due)}"><button class="remove" data-drop-line="${di}|${li}" type="button">×</button></div>`).join('')}</div><button class="secondary full" data-add-line="${di}" type="button">+ 제품 한 줄 추가</button><button class="secondary full" data-drop-draft="${di}" type="button">발주 삭제</button></div></details>`).join('')}<button class="secondary full" id="addDraft" type="button">+ 발주 한 건 추가</button>`;
    document.querySelector('#lineEditor').classList.add('hidden');
  }
  function readInputs() {
    document.querySelectorAll('[data-draft]').forEach(input => { drafts[n(input.dataset.di)][input.dataset.draft] = input.value.trim(); });
    document.querySelectorAll('[data-line]').forEach(input => { const line = drafts[n(input.dataset.di)].lines[n(input.dataset.li)]; line[input.dataset.line] = input.dataset.line === 'quantity' ? n(input.value) : input.value.trim(); });
  }
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-new-order]')) { drafts = [newDraft()]; render(); }
    if (event.target.closest('#parseButton')) {
      event.preventDefault(); event.stopImmediatePropagation();
      drafts = parse(document.querySelector('#messageInput').value);
      const first = drafts[0];
      document.querySelector('#companyInput').value = first?.company || '';
      document.querySelector('#orderMemoInput').value = '';
      const notice = document.querySelector('#parseNotice');
      notice.textContent = drafts.length ? `${drafts.length}개 발주 초안을 읽었습니다. 내용을 확인해 저장하세요.` : '수량이 있는 제품 줄을 읽지 못했습니다. 아래에서 직접 추가할 수 있습니다.';
      notice.classList.remove('hidden'); render();
    }
    const add = event.target.closest('[data-add-line]');
    if (add) { readInputs(); drafts[n(add.dataset.addLine)].lines.push(newLine()); render(); }
    if (event.target.closest('#addDraft')) { readInputs(); drafts.push(newDraft()); render(); }
    const dropDraft = event.target.closest('[data-drop-draft]');
    if (dropDraft) { event.preventDefault(); event.stopImmediatePropagation(); readInputs(); drafts.splice(n(dropDraft.dataset.dropDraft), 1); render(); }
    const drop = event.target.closest('[data-drop-line]');
    if (drop) { readInputs(); const [di,li] = drop.dataset.dropLine.split('|').map(n); drafts[di].lines.splice(li,1); render(); }
  }, true);
  document.addEventListener('input', (event) => {
    const input = event.target.closest('[data-draft="company"]');
    if (input && n(input.dataset.di) === 0) document.querySelector('#companyInput').value = input.value.trim();
  });
  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'orderForm' || !document.querySelector('#draftOrders')) return;
    event.preventDefault(); event.stopImmediatePropagation(); readInputs();
    const usable = drafts.filter(d => d.company && d.lines.some(l => l.code && l.spec && n(l.quantity) > 0));
    if (!usable.length) return toast('발주처와 제품 코드·규격·수량을 입력하세요.');
    usable.forEach(draft => {
      const lines = draft.lines.filter(l => l.code && l.spec && n(l.quantity) > 0).map(line => {
        const unit = unitOf(line.code.toUpperCase(), line.unit);
        const p = product(line.code.toUpperCase(), line.spec, unit);
        return { id: id(), code: line.code.toUpperCase(), name: line.code.toUpperCase(), category: '기타·미분류', spec: clean(line.spec), quantity: n(line.quantity), unit, dueDate: line.due || draft.due || '', planned: 0, orderProduced: 0, shipped: 0, productId: p.id, unmatched: true };
      });
      data.orders.push({ id: id(), company: draft.company, orderDate: draft.orderDate || today(), dueDate: draft.due || '', memo: [draft.parent && `상위 발주: ${draft.parent}`, draft.memo].filter(Boolean).join(' / '), lines });
    });
    hide('#orderDialog'); save(); toast(`${usable.length}개 발주를 저장했습니다.`);
  }, true);
})();
