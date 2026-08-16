/* Make order number tiles the controls; remove duplicated action buttons. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .line-card .numbers > div[data-touch-line], .line-card .numbers > div[data-touch-stock] { cursor:pointer; -webkit-tap-highlight-color:transparent; }
    .line-card .numbers > div[data-touch-line]:active, .line-card .numbers > div[data-touch-stock]:active { outline:2px solid #8eb8a8; }
    .order-delete-x { float:right; margin:-4px 0 0 8px; border:0; background:transparent; color:#b53f31; font:800 1.25rem/1 inherit; padding:2px 7px; }
    .line-actions, [data-line-due-edit], button[data-line-edit], button[data-line], button[data-line-change] { display:none!important; }
  `;
  document.head.append(style);

  function lineRef(card) {
    const button = card.querySelector('[data-line-edit],[data-line]');
    return button?.dataset.lineEdit || button?.dataset.line || '';
  }
  function productId(ref) {
    const [orderId, lineId] = String(ref).split('|');
    const line = data.orders.find(order => order.id === orderId)?.lines.find(item => item.id === lineId);
    return line?.productId || '';
  }
  function decorate() {
    document.querySelectorAll('#orderGroups .line-card, #dashboardGroups .line-card').forEach(card => {
      const ref = lineRef(card);
      if (!ref) return;
      card.querySelectorAll('.numbers > div').forEach(box => {
        const label = box.firstChild?.textContent?.trim() || '';
        if (/공장 재고/.test(label)) box.dataset.touchStock = productId(ref);
        else box.dataset.touchLine = ref;
        box.setAttribute('role', 'button'); box.setAttribute('tabindex', '0');
      });
    });
    document.querySelectorAll('#orderGroups details.period, #dashboardGroups details.period').forEach(period => {
      const summary = period.querySelector(':scope > summary');
      if (!summary || summary.querySelector('[data-order-delete]')) return;
      const orderId = lineRef(period).split('|')[0];
      if (orderId) summary.insertAdjacentHTML('beforeend', `<button type="button" class="order-delete-x" aria-label="발주 삭제" title="발주 삭제" data-order-delete="${esc(orderId)}">×</button>`);
    });
  }
  function openLine(ref) {
    if (typeof openLineEdit16 !== 'function') return;
    openLineEdit16(ref);
    setTimeout(() => { const title = document.querySelector('#lineEditDialog h2'); if (title) title.textContent = '제품 수량 입력'; }, 0);
  }
  document.addEventListener('click', event => {
    const remove = event.target.closest('[data-order-delete]');
    if (remove) {
      event.preventDefault(); event.stopImmediatePropagation();
      const order = data.orders.find(item => item.id === remove.dataset.orderDelete);
      if (!order) return;
      if (!confirm(`${order.company} 발주 전체를 삭제할까요?\n제품 수량과 연결된 재고 기록은 삭제되지 않습니다.`)) return;
      data.orders = data.orders.filter(item => item.id !== order.id);
      save(); toast('발주를 삭제했습니다.'); return;
    }
    const stockTile = event.target.closest('[data-touch-stock]');
    if (stockTile?.dataset.touchStock) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (typeof openAdjust === 'function') openAdjust(stockTile.dataset.touchStock);
      return;
    }
    const lineTile = event.target.closest('[data-touch-line]');
    if (lineTile?.dataset.touchLine) {
      event.preventDefault(); event.stopImmediatePropagation(); openLine(lineTile.dataset.touchLine);
    }
  }, true);
  new MutationObserver(() => requestAnimationFrame(decorate)).observe(document.body, { childList:true, subtree:true });
  [0, 1200, 5000].forEach(delay => setTimeout(decorate, delay));
})();
