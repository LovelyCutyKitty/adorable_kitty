/* Never show a negative order balance; keep change history oldest-to-newest. */
(() => {
  window.restoreOrderContext = (ref) => {
    const active = document.querySelector('.tab.active')?.dataset.view;
    const container = active === 'orders' ? document.querySelector('#orderGroups')
      : active === 'dashboard' ? document.querySelector('#dashboardGroups')
      : document.querySelector('#orderGroups');
    const restore = () => {
      const trigger = container?.querySelector(`[data-line-edit="${ref}"],[data-line="${ref}"]`);
      let parent = trigger;
      while (parent) {
        if (parent.tagName === 'DETAILS') parent.open = true;
        parent = parent.parentElement;
      }
      trigger?.closest('.line-card')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    requestAnimationFrame(() => setTimeout(restore, 0));
    setTimeout(restore, 180);
    setTimeout(restore, 500);
  };

  function install() {
    if (typeof lineCard !== 'function') return;
    if (lineCard.__safeOrderBalance) return;
    const previous = lineCard;
    const safe = (order, line) => {
      const displayLine = Object.assign({}, line, { changeLog: [...(line.changeLog || [])].reverse() });
      const remain = Math.max(0, n(line.quantity) - n(line.shipped));
      return previous(order, displayLine)
        .replace(/(발주 잔량<strong>)[^<]*(<\/strong>)/, `$1${q(remain)}${esc(line.unit || '개')}$2`);
    };
    safe.__safeOrderBalance = true;
    lineCard = safe;

    const form = document.querySelector('#changeForm30');
    if (form) {
      form.onsubmit = (event) => {
        event.preventDefault();
        if (!changeTarget30) return;
        const { o, l, type } = changeTarget30;
        const delta = n($('#changeAmount30').value);
        const reason = $('#changeReason30').value.trim();
        if (!delta) return toast('변경 수량을 입력하세요.');
        const p = data.products.find(item => item.id === l.productId);
        const key = type === 'order' ? 'quantity' : type === 'plan' ? 'planned' : type === 'produced' ? 'orderProduced' : 'shipped';
        const before = Math.max(0, n(l[key]));
        let after = Math.max(0, before + delta);
        if (type === 'order') after = Math.max(after, n(l.shipped));
        if (type === 'shipped') after = Math.min(after, n(l.quantity), Math.max(0, n(stock(p)) + n(l.shipped)));
        const actualDelta = after - before;
        if (!actualDelta) return toast('0보다 작은 수량이나 발주수량을 넘는 출고는 반영할 수 없습니다.');
        if (type === 'order') l.quantity = after;
        if (type === 'plan') l.planned = after;
        if (type === 'produced') { l.orderProduced = after; p.produced = n(p.produced) + actualDelta; }
        if (type === 'shipped') { l.shipped = after; p.shipped = n(p.shipped) + actualDelta; }
        const label = type === 'order' ? '발주수량' : type === 'plan' ? '생산예정' : type === 'produced' ? '생산완료' : '출고완료';
        const msg = `${label}: ${q(before)}${l.unit} → ${q(after)}${l.unit} (${actualDelta > 0 ? '+' : ''}${q(actualDelta)}${l.unit})${reason ? ` · ${reason}` : ''}`;
        (l.changeLog ??= []).push(msg);
        const ref = `${o.id}|${l.id}`;
        hide('#changeDialog30'); save();
        window.restoreOrderContext(ref);
        toast(msg);
      };
    }
    render();
  }
  [12000, 16000, 22000].forEach(delay => setTimeout(install, delay));
})();
