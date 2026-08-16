/* Only changes the popup contents.  Card clicks and short-stock stay legacy. */
(() => {
  const previousOpenSummary = openSummary;
  const labels = { urgent: '납기 임박', active: '처리 중 발주', ready: '즉시 출고 가능' };

  function orderDone(order) {
    return (order.lines || []).length > 0 && order.lines.every((line) => n(line.shipped) >= n(line.quantity));
  }

  function dueInfo(order) {
    if (!order.dueDate) return { text: '납기 미입력', days: null };
    const days = Math.ceil((new Date(order.dueDate) - new Date(today())) / 864e5);
    return { text: days < 0 ? `${Math.abs(days)}일 지연` : days === 0 ? 'D-day' : `D-${days}`, days };
  }

  function vendorDetails(company, content, count, suffix) {
    return `<details class="stock-group"><summary>${esc(company)} <span class="order-meta">${count}${suffix}</span></summary>${content}</details>`;
  }

  function renderOrders(type) {
    const vendors = {};
    (data.orders || []).forEach((order) => {
      const due = dueInfo(order);
      const include = type === 'urgent'
        ? !orderDone(order) && due.days !== null && due.days <= 7
        : !orderDone(order) && !order.hidden;
      if (include) (vendors[order.company || '발주처 미입력'] ||= []).push({ order, due });
    });
    return Object.entries(vendors).sort(([a], [b]) => a.localeCompare(b, 'ko')).map(([company, rows]) => {
      const contents = rows.map(({ order, due }) => type === 'urgent'
        ? `<div class="summary-row">${esc(due.text)} · 납기 ${esc(order.dueDate)}</div>`
        : `<div class="summary-row">${q((order.lines || []).length)}개 품목 · ${order.dueDate ? `납기 ${esc(order.dueDate)}` : '납기 미입력'}</div>`).join('');
      return vendorDetails(company, contents, rows.length, '건');
    }).join('');
  }

  function renderReady() {
    const vendors = {};
    (data.orders || []).forEach((order) => (order.lines || []).forEach((line) => {
      const product = (data.products || []).find((item) => item.id === line.productId);
      const remain = n(line.quantity) - n(line.shipped);
      if (remain <= 0 || !product || stock(product) < remain) return;
      (vendors[order.company || '발주처 미입력'] ||= []).push({ line, remain });
    }));
    return Object.entries(vendors).sort(([a], [b]) => a.localeCompare(b, 'ko')).map(([company, rows]) => {
      const contents = rows.map(({ line, remain }) => `<div class="summary-row">${esc(line.name)} · 출고 가능 ${q(remain)}${esc(line.unit)}</div>`).join('');
      return vendorDetails(company, contents, rows.length, '개 품목');
    }).join('');
  }

  function renderShort() {
    const vendors = {};
    (typeof orderGaps === 'function' ? orderGaps() : []).filter((row) => row.short > 0).forEach((row) => {
      (vendors[row.o.company || '발주처 미입력'] ||= []).push(row);
    });
    return Object.entries(vendors).sort(([a], [b]) => a.localeCompare(b, 'ko')).map(([company, rows]) => {
      const contents = rows.map((row) => `<article class="line-card">
        <strong>${esc(row.l.name)}</strong>
        ${row.l.spec ? `<span class="spec">${esc(row.l.spec)}</span>` : ''}
        <p class="muted">발주 잔량 ${q(row.remain)}${esc(row.l.unit)} · 재고 배정 ${q(row.remain - row.short)}${esc(row.l.unit)} · <strong class="urgent">${q(row.short)}${esc(row.l.unit)} 부족</strong></p>
        <button type="button" data-line="${row.o.id}|${row.l.id}">제품 수량 입력</button>
      </article>`).join('');
      return vendorDetails(company, contents, rows.length, '개 품목');
    }).join('');
  }

  openSummary = (type) => {
    if (type === 'short') {
      const html = renderShort();
      $('#summaryTitle').textContent = '발주 잔량 부족';
      $('#summaryList').innerHTML = html || '<div class="empty">발주 잔량을 기준으로 재고가 부족한 품목이 없습니다.</div>';
      show('#summaryDialog');
      return;
    }
    if (!labels[type]) return previousOpenSummary(type);
    const html = type === 'ready' ? renderReady() : renderOrders(type);
    $('#summaryTitle').textContent = labels[type];
    $('#summaryList').innerHTML = html || '<div class="empty">해당 항목이 없습니다.</div>';
    show('#summaryDialog');
  };
})();
