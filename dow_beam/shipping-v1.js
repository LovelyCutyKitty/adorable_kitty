/* Shipping workspace: pending orders and immutable shipment records. */
(() => {
  let mode = 'pending';
  let range = 'month';
  let from = '', to = '';
  const dateText = value => value || '날짜 미입력';
  const unitTotals = rows => Object.entries(rows.reduce((out,row) => { out[row.unit || '개'] = n(out[row.unit || '개']) + n(row.quantity); return out; }, {})).map(([unit,value]) => `${q(value)}${unit}`).join(' · ');
  const productFor = line => data.products.find(product => product.id === line.productId) || product(line.name || line.code, line.spec, line.unit);
  const lineFor = shipment => data.orders.find(order => order.id === shipment.orderId)?.lines.find(line => line.id === shipment.lineId);
  const activeShipments = () => {
    const all = data.shipments || [];
    if (range === 'all') return all;
    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    const start = range === 'week' ? new Date(todayDate.getTime() - ((todayDate.getDay() + 6) % 7) * 86400000) : new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const end = range === 'week' ? new Date(start.getTime() + 7 * 86400000) : new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
    return all.filter(item => {
      if (from || to) return (!from || item.date >= from) && (!to || item.date <= to);
      return item.date >= start.toISOString().slice(0,10) && item.date < end.toISOString().slice(0,10);
    });
  };
  const status = (line, item) => {
    const remain = Math.max(0, n(line.quantity) - n(line.shipped));
    const available = Math.max(0, stock(item));
    if (!available) return ['생산 진행', remain, available];
    if (available >= remain) return ['출고 가능', remain, available];
    return ['부분 출고 가능', remain, available];
  };
  function pendingHtml() {
    const groups = {};
    data.orders.forEach(order => order.lines.forEach(line => {
      const item = productFor(line); const [label, remain, available] = status(line, item);
      if (!remain) return;
      (groups[order.company || '발주처 미입력'] ||= []).push({order,line,item,label,remain,available});
    }));
    const cards = Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0], 'ko')).map(([company, rows]) => `<details class="stock-group"><summary>${esc(company)} <span class="order-meta">${rows.length}개 품목</span></summary>${rows.map(({order,line,item,label,remain,available}) => `<article class="line-card shipping-line"><h3>${esc(line.code || line.name)}</h3><p class="spec">${esc(line.spec)}</p><p class="muted">발주 잔량 ${q(remain)}${esc(line.unit)} · 공장 재고 ${q(available)}${esc(item.unit)} · 납기 ${esc(order.dueDate || line.dueDate || '미입력')}</p><div class="shipping-row"><span class="shipping-state ${label === '출고 가능' ? 'ready' : ''}">${label}</span>${available ? `<button type="button" data-shipping-line="${order.id}|${line.id}">출고 처리</button>` : ''}</div></article>`).join('')}</details>`).join('');
    return cards || '<div class="empty">출고 대기 중인 제품이 없습니다.</div>';
  }
  function historyHtml() {
    const grouped = {};
    activeShipments().forEach(record => (grouped[record.company || '발주처 미입력'] ||= []).push(record));
    const records = Object.entries(grouped).sort((a,b) => a[0].localeCompare(b[0], 'ko')).map(([company, rows]) => {
      const dates = {};
      rows.sort((a,b) => b.date.localeCompare(a.date)).forEach(row => (dates[row.date] ||= []).push(row));
      return `<details class="stock-group"><summary>${esc(company)} <span class="order-meta">${rows.length}건 · ${unitTotals(rows)}</span></summary>${Object.entries(dates).map(([date, entries]) => `<details class="period"><summary>${esc(dateText(date))} 출고 <span class="order-meta">${entries.length}개 품목 · ${unitTotals(entries)}</span></summary>${entries.map(record => { const line = lineFor(record); return `<article class="line-card"><h3>${esc(record.code || line?.code || line?.name || '제품')}</h3><p class="spec">${esc(record.spec || line?.spec || '')}</p><p class="muted">${q(record.quantity)}${esc(record.unit)}${record.dueDate ? ` · 납기 ${esc(record.dueDate)}` : ''}${record.memo ? ` · ${esc(record.memo)}` : ''}</p><button type="button" class="danger-outline" data-cancel-shipment="${record.id}">출고 취소</button></article>`; }).join('')}</details>`).join('')}</details>`;
    }).join('');
    const legacy = data.orders.flatMap(order => order.lines.filter(line => n(line.shipped) > 0)).length;
    return `${records || '<div class="empty">선택한 기간의 출고 기록이 없습니다.</div>'}${legacy ? '<p class="muted shipping-note">기존 출고 누계는 재고에 유지되어 있으며, 이 화면에는 새로 처리한 출고부터 기록됩니다.</p>' : ''}`;
  }
  function renderShipping() {
    const view = $('#productsView'); if (!view) return;
    view.innerHTML = `<input id="productSearch" hidden><section id="productContent" hidden></section><div class="page-head"><div><h2>출고 관리</h2><p>발주처별로 출고 대기 제품과 출고 기록을 확인합니다.</p></div></div><div class="subtabs"><button class="subtab ${mode === 'pending' ? 'active' : ''}" data-shipping-mode="pending">출고 대기</button><button class="subtab ${mode === 'history' ? 'active' : ''}" data-shipping-mode="history">출고 기록</button></div>${mode === 'history' ? `<div class="shipping-filter"><button type="button" data-shipping-range="week" class="${range === 'week' ? 'active' : ''}">이번 주</button><button type="button" data-shipping-range="month" class="${range === 'month' ? 'active' : ''}">이번 달</button><button type="button" data-shipping-range="all" class="${range === 'all' ? 'active' : ''}">전체</button><label>기간<input id="shippingFrom" type="date" value="${esc(from)}"> ~ <input id="shippingTo" type="date" value="${esc(to)}"></label></div>` : '<p class="edit-note">출고 가능 제품을 발주처별로 확인한 뒤 출고 처리하세요.</p>'}<section id="shippingContent" class="groups">${mode === 'pending' ? pendingHtml() : historyHtml()}</section>`;
    view.querySelectorAll('[data-shipping-mode]').forEach(button => button.onclick = () => { mode = button.dataset.shippingMode; renderShipping(); });
    view.querySelectorAll('[data-shipping-range]').forEach(button => button.onclick = () => { range = button.dataset.shippingRange; from = ''; to = ''; renderShipping(); });
    view.querySelector('#shippingFrom')?.addEventListener('change', event => { from = event.target.value; range = 'custom'; renderShipping(); });
    view.querySelector('#shippingTo')?.addEventListener('change', event => { to = event.target.value; range = 'custom'; renderShipping(); });
  }
  function openShipment(reference) {
    const [orderId, lineId] = reference.split('|'); const order = data.orders.find(row => row.id === orderId); const line = order?.lines.find(row => row.id === lineId); if (!line) return;
    const item = productFor(line); const remain = Math.max(0, n(line.quantity) - n(line.shipped)); const available = Math.max(0, stock(item));
    let dialog = $('#shippingDialog');
    if (!dialog) { document.body.insertAdjacentHTML('beforeend', '<dialog id="shippingDialog" class="dialog"></dialog>'); dialog = $('#shippingDialog'); }
    dialog.innerHTML = `<form id="shippingForm"><div class="dialog-head"><h2>출고 처리</h2><button class="close" type="button" data-close>×</button></div><p class="info"><strong>${esc(order.company)}</strong><br>${esc(line.code || line.name)} · ${esc(line.spec)}<br>발주 잔량 ${q(remain)}${esc(line.unit)} · 출고 가능 ${q(available)}${esc(item.unit)}</p><label>출고일<input id="shipmentDate" type="date" value="${today()}"></label><label>출고 수량<input id="shipmentQuantity" type="number" min="0.01" max="${Math.min(remain, available)}" step="0.01" value="${Math.min(remain, available)}"></label><label>메모 (선택)<input id="shipmentMemo" placeholder="택배·차량·수령 메모"></label><div class="actions"><button class="secondary" type="button" data-close>취소</button><button class="primary" type="submit">출고 완료</button></div></form>`;
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault(); const quantity = n($('#shipmentQuantity').value); const date = $('#shipmentDate').value;
      if (!date || quantity <= 0 || quantity > remain || quantity > available) return toast('출고 가능 수량 안에서 입력하세요.');
      if (!confirm(`${q(quantity)}${line.unit}를 출고 처리하시겠습니까?`)) return;
      (data.shipments ||= []).push({id:id(),date,company:order.company,orderId:order.id,lineId:line.id,code:line.code || line.name,spec:line.spec,quantity,unit:line.unit,dueDate:line.dueDate || order.dueDate || '',memo:$('#shipmentMemo').value.trim(),createdAt:new Date().toISOString()});
      line.shipped = n(line.shipped) + quantity; item.shipped = n(item.shipped) + quantity; hide('#shippingDialog'); save(); toast(`${q(quantity)}${line.unit} 출고를 기록했습니다.`);
    };
    show('#shippingDialog');
  }
  function cancelShipment(recordId) {
    const record = (data.shipments || []).find(row => row.id === recordId); if (!record || !confirm('이 출고 기록을 취소하고 재고와 발주 잔량을 복원할까요?')) return;
    const line = lineFor(record); const item = line && productFor(line);
    if (line) line.shipped = Math.max(0, n(line.shipped) - n(record.quantity));
    if (item) item.shipped = Math.max(0, n(item.shipped) - n(record.quantity));
    data.shipments = data.shipments.filter(row => row.id !== recordId); save(); toast('출고를 취소했습니다.');
  }
  function init() {
    const tab = document.querySelector('[data-view="products"]'); if (tab) tab.textContent = '출고';
    data.shipments ||= [];
    const oldRender = render; render = () => { oldRender(); renderShipping(); }; render();
    const view = $('#productsView');
    new MutationObserver(() => {
      if (!view.querySelector('#shippingContent')) setTimeout(renderShipping, 0);
    }).observe(view, { childList: true });
    document.addEventListener('click', event => {
      const ship = event.target.closest('[data-shipping-line]'); if (ship) { event.preventDefault(); event.stopImmediatePropagation(); openShipment(ship.dataset.shippingLine); }
      const cancel = event.target.closest('[data-cancel-shipment]'); if (cancel) { event.preventDefault(); event.stopImmediatePropagation(); cancelShipment(cancel.dataset.cancelShipment); }
    }, true);
  }
  setTimeout(init, 300);
})();
