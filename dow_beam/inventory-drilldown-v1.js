/* Factory inventory drill-down: code -> kind -> inch/thickness -> specification. */
(() => {
  const familyOrder = ['S1 레진빔', 'S2 프레스빔', 'S3 레드빔', 'B1 튜브형 본드', 'B2 카트리지형 본드', 'W1 왁스', 'CB 카본', 'MB 마보'];
  const escText = value => typeof esc === 'function' ? esc(String(value ?? '')) : String(value ?? '');
  const compare = (a, b) => String(a).localeCompare(String(b), 'ko', {numeric: true});
  const n0 = value => typeof n === 'function' ? n(value) : Number(value || 0);
  const unitOf = product => typeof unit === 'function' ? unit(product) : (product.unit || '개');
  const amount = value => typeof q === 'function' ? q(value) : String(value);
  const total = product => typeof stock === 'function' ? stock(product) : n0(product.opening) + n0(product.produced) - n0(product.shipped) + n0(product.adjustment);
  const remain = product => (data.orders || []).flatMap(order => order.lines || []).filter(line => line.productId === product.id).reduce((sum, line) => sum + Math.max(0, n0(line.quantity) - n0(line.shipped)), 0);
  const active = product => (data.orders || []).some(order => (order.lines || []).some(line => line.productId === product.id && n0(line.shipped) < n0(line.quantity)));
  const kindFacet = (kind, spec) => {
    if (/곡면|양면/.test(kind || '')) return {label: '인치', value: String(spec || '').match(/^\s*(\d+(?:\.\d+)?)\s*"/)?.[1] || '기타', suffix: '"'};
    if (/FLAT|탭|블록|블럭/i.test(kind || '')) return {label: '두께', value: String(spec || '').match(/FLAT\s*(\d+(?:\.\d+)?(?:\([^)]*\))?)\s*t/i)?.[1] || '기타', suffix: 't'};
    return null;
  };
  const totals = products => {
    const values = products.reduce((out, product) => { const key = unitOf(product); out[key] = (out[key] || 0) + total(product); return out; }, {});
    return Object.entries(values).map(([unit, value]) => `${amount(value)}${unit}`).join(' · ') || '0개';
  };
  const card = product => {
    const open = n0(product.opening), produced = n0(product.produced), shipped = n0(product.shipped), balance = remain(product), current = total(product);
    return `<details class="line-card"><summary><strong>${escText(product.spec)}</strong><span class="stock-now ${current < balance ? 'urgent' : ''}">현재 총재고 ${amount(current)}${escText(unitOf(product))}</span></summary><p class="muted">${escText(product.category)} · ${escText(product.kind)}</p><div class="numbers stock-detail"><div>초기재고<strong>${amount(open)}${escText(unitOf(product))}</strong></div><div>누적 생산완료<strong>${amount(produced)}${escText(unitOf(product))}</strong></div><div>누적 출고<strong>${amount(shipped)}${escText(unitOf(product))}</strong></div><div>발주 잔량<strong>${amount(balance)}${escText(unitOf(product))}</strong></div></div><button class="small-action" data-adjust="${escText(product.id)}">재고 수정</button></details>`;
  };
  function matchingProducts() {
    const query = (document.querySelector('#inventorySearch')?.value || '').trim().toLowerCase();
    const activeOnly = document.querySelector('#activeInventory')?.classList.contains('active');
    const shortageOnly = document.querySelector('#shortageInventory')?.classList.contains('active');
    return (data.products || []).filter(product => {
      if (product.legacy) return false;
      if (query && !`${product.category} ${product.kind} ${product.spec}`.toLowerCase().includes(query)) return false;
      if (activeOnly && !active(product)) return false;
      if (shortageOnly && total(product) >= remain(product)) return false;
      return true;
    });
  }
  function drawInventory() {
    const content = document.querySelector('#inventoryContent');
    if (!content || !document.querySelector('[data-stock-mode="all"]')?.classList.contains('active')) return;
    const products = matchingProducts();
    if (!products.length) { content.innerHTML = '<div class="empty">조건에 맞는 제품이 없습니다.</div>'; return; }
    const byFamily = {};
    products.forEach(product => ((byFamily[product.category] ||= {})[product.kind || '기타'] ||= []).push(product));
    const ordered = [...familyOrder.filter(family => byFamily[family]), ...Object.keys(byFamily).filter(family => !familyOrder.includes(family)).sort(compare)];
    content.innerHTML = ordered.map(family => {
      const kinds = byFamily[family];
      return `<details class="stock-group"><summary>${escText(family)} <span class="order-meta">${Object.values(kinds).flat().length}개 제품 · 재고 ${totals(Object.values(kinds).flat())}</span></summary>${Object.keys(kinds).sort(compare).map(kind => {
        const productsInKind = kinds[kind].slice().sort((a, b) => compare(a.spec, b.spec));
        const facet = kindFacet(kind, productsInKind[0]?.spec);
        if (!facet) return `<details class="period"><summary>${escText(kind)} <span class="order-meta">${productsInKind.length}개 규격 · 재고 ${totals(productsInKind)}</span></summary>${productsInKind.map(card).join('')}</details>`;
        const groups = {};
        productsInKind.forEach(product => ((groups[kindFacet(kind, product.spec).value] ||= []).push(product)));
        const facets = Object.keys(groups).sort((a, b) => a === '기타' ? 1 : b === '기타' ? -1 : compare(a, b));
        return `<details class="period"><summary>${escText(kind)} <span class="order-meta">${productsInKind.length}개 규격 · 재고 ${totals(productsInKind)}</span></summary>${facets.map(value => `<details class="inventory-facet"><summary>${escText(value)}${facet.suffix} <span class="order-meta">${groups[value].length}개 규격 · 재고 ${totals(groups[value])}</span></summary>${groups[value].map(card).join('')}</details>`).join('')}</details>`;
      }).join('')}</details>`;
    }).join('');
  }
  function installStyle() {
    if (document.querySelector('#inventoryDrilldownStyle')) return;
    document.head.insertAdjacentHTML('beforeend', `<style id="inventoryDrilldownStyle">.inventory-facet{margin:6px 0 6px 12px;border:1px solid #d6e4de;border-radius:12px;background:#fbfdfc}.inventory-facet>summary{padding:11px 13px;font-weight:700}.inventory-facet .line-card{margin:6px}</style>`);
  }
  function install() {
    installStyle();
    const baseRender = render;
    render = () => { baseRender(); drawInventory(); };
    document.addEventListener('input', event => {
      if (event.target?.id !== 'inventorySearch') return;
      event.stopImmediatePropagation(); drawInventory();
    }, true);
    drawInventory();
  }
  setTimeout(install, 750);
})();
