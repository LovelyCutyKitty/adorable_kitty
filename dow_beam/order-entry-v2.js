/* Choose Kakao or manual entry first; manual entry is always available. */
(() => {
  let launching = false;
  let sourceButton = null;
  let pending = null;
  function applyMode(mode, dates={}) {
    const form = document.querySelector('#orderDialog'); if (!form) return;
    form.dataset.entryMode = mode;
    document.querySelectorAll('#orderEntryModes button').forEach(button => button.classList.toggle('active', button.dataset.orderEntryMode === mode));
    const label = $('#messageInput')?.closest('label'); const parse = $('#parseButton');
    if (label) label.classList.toggle('hidden', mode === 'manual');
    if (parse) parse.classList.toggle('hidden', mode === 'manual');
    const note = document.querySelector('#draftOrders .edit-note');
    if (note) note.textContent = mode === 'manual' ? '전화·유선 주문도 발주처와 제품 정보를 직접 입력해 저장할 수 있습니다.' : '카톡 결과를 발주 초안으로 확인한 뒤 저장합니다. 직접 제품 줄도 추가할 수 있습니다.';
    if (dates.orderDate) $('#orderDateInput').value = dates.orderDate;
    setTimeout(() => {
      if (dates.dueDate) {
        document.querySelectorAll('#draftOrders [data-draft="due"]').forEach(input => input.value = dates.dueDate);
        document.querySelectorAll('#draftOrders [data-line="due"]').forEach(input => input.value = dates.dueDate);
      }
    }, 80);
  }
  function openChoice(prefill=null) {
    pending = prefill;
    show('#orderEntryDialog');
  }
  function launch(mode) {
    hide('#orderEntryDialog');
    launching = true;
    (sourceButton || document.querySelector('[data-new-order]'))?.click();
    setTimeout(() => { applyMode(mode, pending || {}); launching = false; pending = null; }, 120);
  }
  function setup() {
    if (document.querySelector('#orderEntryDialog')) return;
    const style = document.createElement('style');
    style.textContent = `.order-entry-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}.order-entry-tabs button{border:0;border-radius:12px;padding:13px 9px;background:#e6eeea;color:#537267;font:inherit;font-weight:800}.order-entry-tabs button.active{background:#123c39;color:#fff}.entry-choice{display:block;width:100%;padding:16px;margin:9px 0;border:1px solid #d9e6df;border-radius:13px;background:#fff;text-align:left;color:#173128;font:inherit}.entry-choice strong,.entry-choice span{display:block}.entry-choice span{margin-top:4px;color:#60766d;font-size:.85rem}`;
    document.head.append(style);
    document.body.insertAdjacentHTML('beforeend', `<dialog id="orderEntryDialog" class="dialog"><div><div class="dialog-head"><h2>발주 추가</h2><button class="close" type="button" data-close>×</button></div><button type="button" class="entry-choice" data-entry-choice="kakao"><strong>카톡 메시지 입력</strong><span>카톡 원문을 읽어 발주 초안을 만듭니다.</span></button><button type="button" class="entry-choice" data-entry-choice="manual"><strong>수동 입력</strong><span>전화·유선 주문을 발주처와 제품 정보로 직접 입력합니다.</span></button></div></dialog>`);
    const head = document.querySelector('#orderDialog .dialog-head');
    if (head) head.insertAdjacentHTML('afterend', `<div id="orderEntryModes" class="order-entry-tabs"><button type="button" data-order-entry-mode="kakao">카톡 메시지 입력</button><button type="button" data-order-entry-mode="manual">수동 입력</button></div>`);
    document.addEventListener('click', event => {
      const add = event.target.closest('[data-new-order]');
      if (add && !launching) { event.preventDefault(); event.stopImmediatePropagation(); sourceButton = add; openChoice(); return; }
      const choice = event.target.closest('[data-entry-choice]')?.dataset.entryChoice;
      if (choice) launch(choice);
      const tab = event.target.closest('[data-order-entry-mode]')?.dataset.orderEntryMode;
      if (tab) applyMode(tab);
    }, true);
  }
  window.openOrderEntry = prefill => { sourceButton = document.querySelector('[data-new-order]'); openChoice(prefill || {}); };
  [0, 3000, 9000].forEach(delay => setTimeout(setup, delay));
})();
