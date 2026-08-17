/* Initial stock selector: master product -> kind -> inch/thickness -> spec. */
(() => {
  const families = [
    ['S1', 'S1 레진빔'], ['S2', 'S2 프레스빔'], ['S3', 'S3 레드빔'],
    ['B1', 'B1 튜브형 본드'], ['B2', 'B2 카트리지형 본드'], ['W1', 'W1 왁스'],
    ['CB', 'CB 카본'], ['MB', 'MB 마보']
  ];
  const state = {code: '', kind: '', facet: '', query: '', productId: ''};
  const codeFor = product => families.find(([, category]) => category === product.category)?.[0] || '';
  const compare = (a, b) => String(a).localeCompare(String(b), 'ko', {numeric: true});
  const escText = value => typeof esc === 'function' ? esc(String(value ?? '')) : String(value ?? '');
  const eligible = () => (data.products || []).filter(product => !product.legacy && codeFor(product));
  const byCode = () => eligible().filter(product => codeFor(product) === state.code);
  const byKind = () => byCode().filter(product => !state.kind || product.kind === state.kind);
  const isInchKind = () => /곡면|양면/.test(state.kind);
  const isThicknessKind = () => /FLAT|탭|블록|블럭/i.test(state.kind);
  const facetOf = product => {
    const spec = String(product.spec || '');
    if (isInchKind()) return spec.match(/^\s*(\d+(?:\.\d+)?)\s*"/)?.[1] || '기타';
    if (isThicknessKind()) return spec.match(/FLAT\s*(\d+(?:\.\d+)?(?:\([^)]*\))?)\s*t/i)?.[1] || '기타';
    return '';
  };
  const filtered = () => byKind().filter(product => {
    const facet = facetOf(product);
    const text = `${product.spec} ${product.kind}`.toLowerCase();
    return (!state.facet || facet === state.facet) && (!state.query || text.includes(state.query.toLowerCase()));
  }).sort((a, b) => compare(a.spec, b.spec));
  const selected = () => eligible().find(product => product.id === state.productId);

  function draw() {
    const root = document.querySelector('#openingSelectorDialog');
    if (!root) return;
    const codeProducts = byCode();
    const kinds = [...new Set(codeProducts.map(product => product.kind).filter(Boolean))].sort(compare);
    if (state.kind && !kinds.includes(state.kind)) { state.kind = ''; state.facet = ''; state.productId = ''; }
    const kindProducts = byKind();
    const showFacet = isInchKind() || isThicknessKind();
    const facets = [...new Set(kindProducts.map(facetOf).filter(Boolean))].sort(compare);
    if (state.facet && !facets.includes(state.facet)) { state.facet = ''; state.productId = ''; }
    const rows = filtered();
    if (state.productId && !rows.some(product => product.id === state.productId)) state.productId = '';
    const product = selected();
    root.innerHTML = `<form id="openingSelectorForm"><div class="dialog-head"><h2>초기재고 입력</h2><button class="close" type="button" data-opening-close>×</button></div>
      <section class="opening-step"><span class="opening-label">1. 제품 코드</span><div class="opening-chips">${families.map(([code, label]) => `<button type="button" class="${state.code === code ? 'active' : ''}" data-opening-code="${code}">${code}<small>${escText(label.replace(/^S\d |^B\d |^W1 |^CB |^MB /, ''))}</small></button>`).join('')}</div></section>
      ${state.code ? `<section class="opening-step"><label class="opening-label">2. 제품 종류<select id="openingKind"><option value="">제품 종류 선택</option>${kinds.map(kind => `<option value="${escText(kind)}" ${state.kind === kind ? 'selected' : ''}>${escText(kind)} · ${codeProducts.filter(product => product.kind === kind).length}개</option>`).join('')}</select></label></section>` : '<p class="edit-note">코드를 먼저 선택하세요.</p>'}
      ${state.kind && showFacet ? `<section class="opening-step"><span class="opening-label">3. ${isInchKind() ? '인치' : '두께(t)'}</span><div class="opening-chips compact"><button type="button" class="${!state.facet ? 'active' : ''}" data-opening-facet="">전체</button>${facets.map(facet => `<button type="button" class="${state.facet === facet ? 'active' : ''}" data-opening-facet="${escText(facet)}">${escText(facet)}${isInchKind() ? '"' : 't'}</button>`).join('')}</div></section>` : ''}
      ${state.kind ? `<section class="opening-step"><label class="opening-label">4. 표준 규격 검색<input id="openingSpecSearch" value="${escText(state.query)}" placeholder="규격, R값, 길이, 가공 검색"></label><label class="opening-label">표준 규격<select id="openingSpec" size="${Math.min(Math.max(rows.length, 4), 8)}"><option value="">규격 선택 (${rows.length}개)</option>${rows.map(product => `<option value="${product.id}" ${state.productId === product.id ? 'selected' : ''}>${escText(product.spec)} (${escText(product.unit || '개')})</option>`).join('')}</select></label></section>` : ''}
      <div id="openingSelectorInfo" class="info">${product ? `${escText(product.category)} · ${escText(product.kind)} · ${escText(product.spec)} · 현재 초기재고 ${q(n(product.opening))}${escText(product.unit)} · 현재 총재고 ${q(stock(product))}${escText(product.unit)}` : '표준 규격을 선택하세요.'}</div>
      <label>초기재고 수량<input id="openingSelectorValue" type="number" min="0" step="0.01" value="${product ? n(product.opening) : ''}" ${product ? '' : 'disabled'} required></label>
      <p class="warn-note">생산·출고 기록이 있는 제품의 실제 재고를 맞추려면 ‘재고 수정’을 사용하세요.</p><div class="actions"><button class="secondary" type="button" data-opening-close>취소</button><button class="primary" type="submit" ${product ? '' : 'disabled'}>초기재고 저장</button></div>
    </form>`;
    bind(root);
  }
  function bind(root) {
    root.querySelectorAll('[data-opening-code]').forEach(button => button.onclick = () => { state.code = button.dataset.openingCode; state.kind = ''; state.facet = ''; state.query = ''; state.productId = ''; draw(); });
    root.querySelectorAll('[data-opening-facet]').forEach(button => button.onclick = () => { state.facet = button.dataset.openingFacet; state.productId = ''; draw(); });
    root.querySelector('#openingKind')?.addEventListener('change', event => { state.kind = event.target.value; state.facet = ''; state.query = ''; state.productId = ''; draw(); });
    root.querySelector('#openingSpecSearch')?.addEventListener('input', event => { state.query = event.target.value; state.productId = ''; draw(); });
    root.querySelector('#openingSpec')?.addEventListener('change', event => { state.productId = event.target.value; draw(); });
    root.querySelectorAll('[data-opening-close]').forEach(button => button.onclick = () => root.close());
    root.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const product = selected(); if (!product) return toast('표준 규격을 선택하세요.');
      const next = n(root.querySelector('#openingSelectorValue').value); const previous = n(product.opening);
      if ((n(product.produced) || n(product.shipped) || n(product.adjustment)) && !confirm(`${product.spec}은 생산·출고 기록이 있습니다.\n초기재고를 바꾸면 현재 총재고도 달라집니다. 계속할까요?`)) return;
      product.opening = next;
      if (typeof record === 'function') record(product, `초기재고 ${q(previous)}${unit(product)} → ${q(next)}${unit(product)}`);
      root.close(); save(); toast(`${product.spec} 초기재고를 ${q(next)}${unit(product)}로 저장했습니다.`);
    };
  }
  function openSelector() {
    state.code = ''; state.kind = ''; state.facet = ''; state.query = ''; state.productId = '';
    let dialog = document.querySelector('#openingSelectorDialog');
    if (!dialog) { dialog = document.createElement('dialog'); dialog.id = 'openingSelectorDialog'; dialog.className = 'dialog'; document.body.append(dialog); }
    draw(); dialog.showModal();
  }
  function installStyle() {
    if (document.querySelector('#openingSelectorStyle')) return;
    document.head.insertAdjacentHTML('beforeend', `<style id="openingSelectorStyle">
      .opening-step{display:grid;gap:7px;margin:13px 0}.opening-label{display:grid;gap:6px;font-weight:700}.opening-chips{display:flex;flex-wrap:wrap;gap:7px}.opening-chips button{min-width:67px;padding:8px 10px;border:1px solid #c9dbd3;border-radius:10px;background:#e8f0ec;color:#205446;font:inherit;font-weight:700;cursor:pointer}.opening-chips button small{display:block;margin-top:2px;font-size:.68rem;font-weight:400}.opening-chips button.active{background:#12493f;border-color:#12493f;color:#fff}.opening-chips.compact button{min-width:52px;padding:7px 10px}#openingSelectorDialog select{max-width:100%}#openingSpec{line-height:1.45}@media(max-width:480px){.opening-chips button{min-width:58px;padding:7px 8px}}
    </style>`);
  }
  function install() {
    installStyle();
    document.addEventListener('click', event => {
      const button = event.target.closest('#newProduct');
      if (!button) return;
      event.preventDefault(); event.stopImmediatePropagation(); openSelector();
    }, true);
  }
  setTimeout(install, 500);
})();
