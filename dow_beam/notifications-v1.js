/* In-app activity inbox plus optional same-device system notifications. */
(() => {
  const MAX_NOTICES = 100;
  let toastTimer;

  function stamp() {
    return new Intl.DateTimeFormat('ko-KR', { month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date());
  }
  function snapshot() {
    return {
      orders: (data.orders || []).map(o => ({ id:o.id, company:o.company, orderDate:o.orderDate, dueDate:o.dueDate, lines:(o.lines || []).map(l => ({ id:l.id, productId:l.productId, name:l.name, spec:l.spec, unit:l.unit, quantity:n(l.quantity), planned:n(l.planned), produced:n(l.orderProduced), shipped:n(l.shipped), lineDue:l.dueDate || '' })) })),
      products: (data.products || []).map(p => ({ id:p.id, name:p.name, spec:p.spec, unit:p.unit, opening:n(p.opening), produced:n(p.produced), shipped:n(p.shipped), adjustment:n(p.adjustment) }))
    };
  }
  function notice(type, text, ref='') {
    return { id:id(), type, text, ref, at:stamp(), unread:true, createdAt:Date.now() };
  }
  function changed(before, after) {
    const events = [], oldOrders = new Map(before.orders.map(x => [x.id, x])), newOrders = new Map(after.orders.map(x => [x.id, x]));
    after.orders.forEach(order => {
      const old = oldOrders.get(order.id);
      if (!old) {
        const first = order.lines[0];
        events.push(notice('발주 등록', `${order.company} 발주 ${order.lines.length}개 품목이 등록되었습니다.`, first ? `${order.id}|${first.id}` : ''));
        return;
      }
      const oldLines = new Map(old.lines.map(x => [x.id, x]));
      order.lines.forEach(line => {
        const previous = oldLines.get(line.id);
        if (!previous) {
          events.push(notice('품목 추가', `${order.company} · ${line.name} 품목이 발주에 추가되었습니다.`, `${order.id}|${line.id}`));
          return;
        }
        const fields = [
          ['quantity','발주수량'], ['planned','생산예정'], ['produced','생산완료'], ['shipped','출고완료']
        ].filter(([key]) => previous[key] !== line[key]).map(([key, label]) => `${label} ${q(previous[key])}${line.unit} → ${q(line[key])}${line.unit}`);
        if (previous.lineDue !== line.lineDue) fields.push(`제품 납기 ${previous.lineDue || '미입력'} → ${line.lineDue || '미입력'}`);
        if (fields.length) events.push(notice('수량 변경', `${order.company} · ${line.name}: ${fields.join(' · ')}으로 변경되었습니다.`, `${order.id}|${line.id}`));
      });
    });
    before.orders.forEach(order => { if (!newOrders.has(order.id)) events.push(notice('발주 삭제', `${order.company} 발주 1건이 삭제되었습니다.`)); });
    const touchedProducts = new Set(events.map(event => {
      const ref = event.ref.split('|');
      return after.orders.find(o => o.id === ref[0])?.lines.find(l => l.id === ref[1])?.productId;
    }).filter(Boolean));
    const oldProducts = new Map(before.products.map(x => [x.id, x]));
    after.products.forEach(product => {
      const old = oldProducts.get(product.id);
      if (!old || touchedProducts.has(product.id)) return;
      const oldStock = old.opening + old.produced - old.shipped + old.adjustment;
      const newStock = product.opening + product.produced - product.shipped + product.adjustment;
      if (oldStock !== newStock) events.push(notice('재고 변경', `${product.name} · ${product.spec}: 공장 재고 ${q(oldStock)}${product.unit} → ${q(newStock)}${product.unit}으로 변경되었습니다.`));
    });
    return events;
  }
  function persist() { localStorage.setItem(KEY, JSON.stringify(data)); }
  function renderBell() {
    const bell = document.querySelector('#notificationBell');
    const unread = (data.notifications || []).some(x => x.unread);
    bell?.classList.toggle('has-unread', unread);
    const list = document.querySelector('#notificationList');
    if (!list) return;
    const rows = data.notifications || [];
    list.innerHTML = rows.length ? rows.map(item => `<button type="button" class="notice-item ${item.unread ? 'unread' : ''}" data-notice-id="${esc(item.id)}"><span class="notice-type">${esc(item.type)}</span><strong>${esc(item.text)}</strong><small>${esc(item.at)}</small></button>`).join('') : '<p class="empty">아직 변경 알림이 없습니다.</p>';
    const setting = document.querySelector('#notificationPermission');
    if (setting) setting.textContent = ('Notification' in window && Notification.permission === 'granted') ? '시스템 알림 켜짐' : '휴대폰 알림 켜기';
  }
  function openNotice(ref) {
    if (!ref) return;
    const tab = document.querySelector('.tab[data-view="orders"]');
    tab?.click();
    const show = () => window.restoreOrderContext?.(ref);
    setTimeout(show, 0); setTimeout(show, 220); setTimeout(show, 600);
  }
  async function systemNotice(item) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const registration = await navigator.serviceWorker?.ready;
      const url = `${location.pathname}${location.search ? `${location.search}&` : '?'}notice=${encodeURIComponent(item.id)}`;
      if (registration?.showNotification) registration.showNotification('다우 재고관리', { body:item.text, tag:`dow-${item.id}`, data:{ url, noticeId:item.id }, renotify:false });
    } catch (_) {}
  }
  async function requestSystemNotification() {
    if (!('Notification' in window) || !navigator.serviceWorker) return toast('이 기기에서는 시스템 알림을 지원하지 않습니다.');
    try {
      await navigator.serviceWorker.register('notification-sw.js');
      const permission = await Notification.requestPermission();
      renderBell();
      toast(permission === 'granted' ? '휴대폰 알림을 켰습니다.' : '휴대폰 알림 권한이 허용되지 않았습니다.');
    } catch (_) { toast('휴대폰 알림을 설정하지 못했습니다.'); }
  }
  function setupUi() {
    if (document.querySelector('#notificationBell')) return;
    const style = document.createElement('style');
    style.textContent = `.topbar-actions{display:flex;align-items:center;gap:2px}.notification-bell{position:relative;width:38px;height:38px;border:0;background:transparent;color:#255646;padding:8px;display:grid;place-items:center}.notification-bell svg{width:21px;height:21px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}.notification-bell.has-unread:after{content:'';position:absolute;right:5px;top:5px;width:7px;height:7px;border:2px solid #f5f8f6;border-radius:50%;background:#d8483e}.topbar-actions .icon{padding:0 3px}.notification-dialog{max-width:520px}.notification-dialog form{min-width:min(92vw,440px)}.notification-list{max-height:min(65vh,540px);overflow:auto}.notice-item{display:block;width:100%;padding:13px 11px;border:0;border-bottom:1px solid #e4ece7;background:#fff;text-align:left;font:inherit;color:#173128}.notice-item.unread{background:#f0f7f3}.notice-item strong,.notice-item small{display:block}.notice-item strong{font-size:.9rem;line-height:1.4;margin:4px 0}.notice-item small{font-size:.78rem;color:#60766d}.notice-type{display:inline-block;font-size:.75rem;color:#235342;font-weight:800}.notice-actions{display:flex;gap:8px;margin-top:10px}.notice-actions button{margin:0}`;
    document.head.append(style);
    const menu = document.querySelector('#menuButton');
    if (menu) {
      const actions = document.createElement('div');
      actions.className = 'topbar-actions';
      menu.before(actions);
      actions.innerHTML = '<button id="notificationBell" class="notification-bell" type="button" aria-label="변경 알림"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg></button>';
      actions.append(menu);
    }
    document.body.insertAdjacentHTML('beforeend', `<dialog id="notificationDialog" class="dialog notification-dialog"><form method="dialog"><div class="dialog-head"><h2>변경 알림</h2><button class="close" type="button" data-close>×</button></div><div id="notificationList" class="notification-list"></div><div class="notice-actions"><button id="notificationPermission" type="button" class="secondary">휴대폰 알림 켜기</button><button id="noticeReadAll" type="button" class="secondary">모두 읽음</button></div></form></dialog>`);
    document.querySelector('#notificationBell').onclick = () => { renderBell(); show('#notificationDialog'); };
    document.querySelector('#notificationPermission').onclick = requestSystemNotification;
    document.querySelector('#noticeReadAll').onclick = () => { (data.notifications || []).forEach(x => x.unread = false); persist(); renderBell(); };
    document.querySelector('#notificationList').onclick = event => {
      const row = event.target.closest('[data-notice-id]'); if (!row) return;
      const item = (data.notifications || []).find(x => x.id === row.dataset.noticeId); if (!item) return;
      item.unread = false; persist(); renderBell(); hide('#notificationDialog'); openNotice(item.ref);
    };
    renderBell();
  }
  function install() {
    setupUi();
    if (save.__notificationWrapped) return;
    let previous = snapshot();
    const baseSave = save;
    const wrappedSave = () => {
      const next = snapshot();
      const events = changed(previous, next);
      previous = next;
      if (events.length) {
        data.notifications = [...events.reverse(), ...(data.notifications || [])].slice(0, MAX_NOTICES);
      }
      baseSave();
      renderBell();
      events.forEach(systemNotice);
    };
    wrappedSave.__notificationWrapped = true;
    save = wrappedSave;
  }
  const previousToast = toast;
  toast = text => { const box = document.querySelector('#toast'); if (!box) return previousToast(text); clearTimeout(toastTimer); box.textContent = text; box.classList.remove('hidden'); toastTimer = setTimeout(() => box.classList.add('hidden'), 3000); };
  [0, 2000, 7000, 14000].forEach(delay => setTimeout(install, delay));
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type !== 'dow-notice') return;
    const item = (data.notifications || []).find(x => x.id === event.data.id);
    if (item) openNotice(item.ref);
  });
  window.addEventListener('load', () => { const id = new URLSearchParams(location.search).get('notice'); const item = (data.notifications || []).find(x => x.id === id); if (item) openNotice(item.ref); });
})();
