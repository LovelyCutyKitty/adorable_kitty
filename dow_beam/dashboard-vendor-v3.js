/* Dashboard card -> vendor -> product drill-down.  Loaded last on purpose. */
(() => {
  const labels = {
    urgent: '납기 임박',
    active: '처리 중 발주',
    ready: '즉시 출고 가능',
    short: '발주 잔량 부족',
  };

  function lineDue(order, line) {
    return line.dueDate || order.dueDate || '';
  }

  function lineDone(line) {
    return n(line.shipped) >= n(line.quantity);
  }

  function isMatch(type, order, line, product) {
    const remain = Math.max(0, n(line.quantity) - n(line.shipped));
    const due = lineDue(order, line);
    const days = due ? Math.ceil((new Date(due) - new Date()) / 864e5) : null;
    if (type === 'active') return !lineDone(line);
    if (type === 'urgent') return !lineDone(line) && days !== null && days <= 7;
    if (type === 'ready') return !lineDone(line) && product && stock(product) >= remain;
    if (type === 'short') return product && stock(product) < remain;
    return false;
  }

  function dayText(days) {
    return days < 0 ? `${Math.abs(days)}일 지연` : days === 0 ? 'D-day' : `D-${days}`;
  }

  function productLine(order, line, product) {
    const remain = Math.max(0, n(line.quantity) - n(line.shipped));
    const code = line.code || line.name || product?.name || '미분류 제품';
    const spec = line.spec || product?.spec || '';
    const unit = line.unit || product?.unit || '개';
    return `<article class="line-card">
      <strong>${esc(code)}</strong>
      ${spec ? `<span class="spec">${esc(spec)}</span>` : ''}
      <p class="muted">발주 ${q(line.quantity)}${esc(unit)} · 잔량 ${q(remain)}${esc(unit)}</p>
      <button type="button" data-line="${order.id}|${line.id}">제품 수량 입력</button>
    </article>`;
  }

  function renderShort() {
    const rows = typeof orderGaps === 'function' ? orderGaps().filter((row) => row.short > 0) : [];
    $('#summaryTitle').textContent = '발주 잔량 부족';
    $('#summaryList').innerHTML = rows.length
      ? rows.map((row) => `<div class="summary-row">${esc(row.o.company)} · ${esc(row.l.name)} · 발주 잔량 ${q(row.remain)}${esc(row.l.unit)} · 재고 ${q(row.remain - row.short)}${esc(row.l.unit)} · <strong class="urgent">${q(row.short)}${esc(row.l.unit)} 부족</strong></div>`).join('')
      : '<div class="empty">발주 잔량을 기준으로 재고가 부족한 품목이 없습니다.</div>';
    show('#summaryDialog');
  }

  function render(type) {
    if (type === 'short') return renderShort();
    const groups = {};
    (data.orders || []).forEach((order) => (order.lines || []).forEach((line) => {
      const product = (data.products || []).find((item) => item.id === line.productId);
      if (!isMatch(type, order, line, product)) return;
      const company = order.company || '발주처 미입력';
      (groups[company] ||= []).push({ order, line, product });
    }));

    $('#summaryTitle').textContent = labels[type] || '발주 현황';
    const companies = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'ko'));
    $('#summaryList').innerHTML = companies.length
      ? companies.map(([company, rows]) => {
          const orders = {};
          rows.forEach((row) => (orders[row.order.id] ||= { order: row.order, rows: [] }).rows.push(row));
          return `
          <details class="stock-group vendor-summary">
            <summary>${esc(company)} <span class="order-meta">${rows.length}개 품목</span></summary>
            <div class="vendor-lines">
              ${Object.values(orders).map(({ order, rows: orderRows }) => {
                const due = lineDue(order, orderRows[0].line);
                const days = due ? Math.ceil((new Date(due) - new Date()) / 864e5) : null;
                const dateInfo = type === 'urgent'
                  ? `${days === null ? '납기 미입력' : `${dayText(days)} · `}납기 ${due || '-'}`
                  : `납기 ${due || '미입력'}`;
                const readyInfo = type === 'ready' ? ' · 출고 가능' : '';
                return `<details class="period">
                  <summary>${esc(order.orderDate || '발주일 미입력')} · ${dateInfo}${readyInfo} <span class="order-meta">${orderRows.length}개 품목</span></summary>
                  ${orderRows.map(({ line, product }) => productLine(order, line, product)).join('')}
                </details>`;
              }).join('')}
            </div>
          </details>`;
        }).join('')
      : '<div class="empty">해당 항목이 없습니다.</div>';
    show('#summaryDialog');
  }

  function intercept(event) {
    const card = event.target.closest('[data-summary]');
    if (!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    render(card.dataset.summary);
  }

  // Pointer capture runs before legacy click handlers that are loaded later.
  document.addEventListener('pointerdown', intercept, true);
  document.addEventListener('click', intercept, true);
  openSummary = render;
})();
