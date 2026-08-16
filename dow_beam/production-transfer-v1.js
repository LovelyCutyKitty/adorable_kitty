/* Production completion is transferred to factory stock, not kept on the order line. */
(() => {
  function install() {
    const form = document.querySelector('#lineEditForm');
    if (!form || typeof findOrCreateProduct16 !== 'function') return;
    const producedLabel = document.querySelector('#editLineProduced')?.closest('label');
    if (producedLabel) producedLabel.firstChild.textContent = '이번 생산완료 수량 (재고로 이관)';
    const restoreCurrentView = (ref) => {
      const active = document.querySelector('.tab.active')?.dataset.view;
      const container = active === 'orders' ? document.querySelector('#orderGroups')
        : active === 'dashboard' ? document.querySelector('#dashboardGroups')
        : document.querySelector('#orderGroups');
      const restore = () => {
        const trigger = container?.querySelector(`[data-line-edit="${ref}"],[data-line="${ref}"]`);
        let parent = trigger;
        while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
        trigger?.closest('.line-card')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      };
      requestAnimationFrame(() => setTimeout(restore, 0));
      setTimeout(restore, 180);
    };
    form.onsubmit = (event) => {
      event.preventDefault();
      const order = data.orders.find(item => item.id === form.dataset.orderId);
      const line = order?.lines.find(item => item.id === form.dataset.lineId);
      if (!order || !line) return;
      const next = {
        name: $('#editLineName').value.trim(), spec: $('#editLineSpec').value.trim(), unit: $('#editLineUnit').value.trim(),
        quantity: Math.max(0, n($('#editLineQuantity').value)), planned: Math.max(0, n($('#editLinePlanned').value)),
        produced: Math.max(0, n($('#editLineProduced').value)), shipped: Math.max(0, n($('#editLineShipped').value)),
      };
      if (!next.name || !next.spec || !next.unit) return toast('제품명, 규격 및 단위를 입력하세요.');
      if (next.shipped > next.quantity) return toast('출고완료 수량은 발주수량보다 클 수 없습니다.');
      const source = data.products.find(item => item.id === line.productId) || findOrCreateProduct16(line.name, line.spec, line.unit);
      const same = source.name === next.name && source.spec === next.spec;
      const target = same ? source : findOrCreateProduct16(next.name, next.spec, next.unit);
      const previous = { quantity: n(line.quantity), planned: n(line.planned), produced: n(line.orderProduced), shipped: n(line.shipped), stock: n(stock(target)) };
      const plannedChanged = next.planned !== previous.planned;
      const producedChanged = next.produced !== previous.produced;
      if ((plannedChanged || producedChanged) && !confirm(`생산예정 ${q(previous.planned)} → ${q(next.planned)}${next.unit}\n생산완료 ${q(previous.produced)} → ${q(next.produced)}${next.unit}\n\n변경할까요?`)) return;
      if (!same) {
        source.produced = n(source.produced) - previous.produced;
        source.shipped = n(source.shipped) - previous.shipped;
        target.produced = n(target.produced) + previous.produced;
        target.shipped = n(target.shipped) + previous.shipped;
        line.productId = target.id;
      }
      target.name = next.name; target.spec = next.spec; target.unit = next.unit;
      target.produced = n(target.produced) + (next.produced - previous.produced);
      target.shipped = n(target.shipped) + (next.shipped - previous.shipped);
      const transferred = next.produced > 0;
      Object.assign(line, {
        name: next.name, spec: next.spec, unit: next.unit, quantity: next.quantity,
        planned: transferred ? 0 : next.planned,
        orderProduced: 0,
        shipped: next.shipped,
      });
      const due = $('#editLineDue20')?.value ?? $('#editLineDue19')?.value ?? '';
      if (due !== undefined) line.dueDate = due || '';
      hide('#lineEditDialog');
      save();
      const stockNow = n(stock(target));
      restoreCurrentView(`${order.id}|${line.id}`);
      if (transferred) toast(`생산완료 ${q(next.produced)}${next.unit}를 공장 재고로 이관했습니다. 재고 ${q(previous.stock)} → ${q(stockNow)}${next.unit}`);
      else toast('제품 수량을 변경했습니다.');
    };
  }
  [1500, 5000, 11000, 14000].forEach(delay => setTimeout(install, delay));
})();
