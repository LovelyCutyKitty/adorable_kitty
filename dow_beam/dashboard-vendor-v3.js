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

  function isMatch(type, order, line, product) {
    const remain = Math.max(0, n(line.quantity) - n(line.shipped));
    const due = lineDue(order, line);
    const days = due ? Math.ceil((new Date(due) - new Date()) / 864e5) : null;
    if (type === 'active') return !done(line);
    if (type === 'urgent') return !done(line) && days !== null && days <= 7;
    if (type === 'ready') return !done(line) && product && stock(product) >= remain;
    if (type === 'short') return product && stock(product) < remain;
    return false;
  }

  function render(type) {
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
      ? companies.map(([company, rows]) => `
          <details class="stock-group vendor-summary">
            <summary>${esc(company)} <span class="order-meta">${rows.length}개 품목</span></summary>
            <div class="vendor-lines">
              ${rows.map(({ order, line, product }) => {
                const remain = Math.max(0, n(line.quantity) - n(line.shipped));
                const due = lineDue(order, line);
                const code = line.code || line.name || product?.name || '미분류 제품';
                const spec = line.spec || product?.spec || '';
                return `<article class="line-card">
                  <strong>${esc(code)}</strong>
                  ${spec ? `<span class="spec">${esc(spec)}</span>` : ''}
                  <p class="muted">발주 ${q(line.quantity)}${esc(line.unit || product?.unit || '개')} · 잔량 ${q(remain)}${esc(line.unit || product?.unit || '개')}${due ? ` · 납기 ${esc(due)}` : ''}</p>
                  <button type="button" data-line="${order.id}|${line.id}">제품 수량 입력</button>
                </article>`;
              }).join('')}
            </div>
          </details>`).join('')
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
