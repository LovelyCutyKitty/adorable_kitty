/* Keep completed shipments in shipping history, not in the default active order list. */
(() => {
  let showCompleted = false;
  const complete = line => n(line?.shipped) >= n(line?.quantity) && n(line?.quantity) > 0;
  const lineForCard = card => {
    const ref = card.querySelector('[data-line-edit],[data-line]')?.dataset;
    const value = ref?.lineEdit || ref?.line || '';
    const [orderId, lineId] = value.split('|');
    return data.orders.find(order => order.id === orderId)?.lines.find(line => line.id === lineId) || null;
  };
  function addToggle() {
    const search = document.querySelector('#orderSearch');
    if (!search || document.querySelector('#completedOrderToggle')) return;
    const wrap = document.createElement('div');
    wrap.className = 'quick-filters completed-order-toggle';
    wrap.innerHTML = '<button id="completedOrderToggle" type="button">출고 완료 발주 보기</button>';
    search.before(wrap);
    wrap.querySelector('button').onclick = event => {
      showCompleted = !showCompleted;
      event.currentTarget.classList.toggle('active', showCompleted);
      apply();
    };
  }
  function apply() {
    const root = document.querySelector('#orderGroups');
    if (!root) return;
    root.querySelectorAll('.order-complete-hidden').forEach(node => node.classList.remove('order-complete-hidden'));
    if (showCompleted) return;
    root.querySelectorAll('.line-card').forEach(card => {
      if (complete(lineForCard(card))) card.classList.add('order-complete-hidden');
    });
    root.querySelectorAll('details.period').forEach(orderCard => {
      const lines = [...orderCard.querySelectorAll(':scope > .line-card')];
      if (lines.length && lines.every(line => line.classList.contains('order-complete-hidden'))) orderCard.classList.add('order-complete-hidden');
    });
    [...root.querySelectorAll(':scope > details')].forEach(vendor => {
      const orders = [...vendor.querySelectorAll(':scope > details.period')];
      if (orders.length && orders.every(order => order.classList.contains('order-complete-hidden'))) vendor.classList.add('order-complete-hidden');
    });
  }
  function installStyle() {
    if (document.querySelector('#completedOrderHideStyle')) return;
    document.head.insertAdjacentHTML('beforeend', `<style id="completedOrderHideStyle">.order-complete-hidden{display:none!important}.completed-order-toggle{margin:0 0 10px}.completed-order-toggle button{border-color:#c9dbd3;color:#245447}.completed-order-toggle button.active{background:#12493f;border-color:#12493f;color:#fff}</style>`);
  }
  function install() {
    installStyle(); addToggle(); apply();
    const root = document.querySelector('#orderGroups');
    if (root) new MutationObserver(() => requestAnimationFrame(() => { addToggle(); apply(); })).observe(root, {childList:true, subtree:true});
    const oldRender = render;
    render = () => { oldRender(); requestAnimationFrame(() => { addToggle(); apply(); }); };
  }
  setTimeout(install, 900);
})();
