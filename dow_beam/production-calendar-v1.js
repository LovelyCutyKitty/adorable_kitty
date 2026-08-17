/* Production calendar: date-click planning with direct completion to factory stock. */
(() => {
  let planDate = '';
  let planOrderId = '';
  let prodMonth = null;
  let uiReady = false;

  const css = document.createElement('style');
  css.textContent = `
    .production-calendar .due-calendar33-sub{margin-bottom:12px}.production-calendar .due-calendar33-cell{cursor:pointer;font:inherit;text-align:left;color:inherit}.production-calendar .due-calendar33-cell.has-plan{background:#f1f7f3;border-color:#9ec5b0}.production-plan-chip{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0;background:#dcece3;color:#235342;border-radius:5px;margin:4px 0 0;padding:3px 4px;font:inherit;font-size:.66rem;text-align:left}.production-plan-chip.done{background:#eef1ef;color:#6a7c73;text-decoration:line-through}.production-calendar .due-calendar33-date{pointer-events:none}.plan-day-list{display:grid;gap:8px;margin:12px 0}.plan-day-row{padding:11px;border:1px solid #d9e6df;border-radius:10px;background:#fff}.plan-day-row strong,.plan-day-row span{display:block}.plan-day-row span{font-size:.84rem;color:#60766d;margin-top:3px}.plan-day-row .plan-row-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.plan-day-row button{margin:0}.plan-delete{color:#b53f31!important;border-color:#efb7ad!important}.plan-form-note{margin:8px 0 0;color:#60766d;font-size:.84rem}.production-entry-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}.production-entry-tabs button{border:0;border-radius:11px;padding:11px 8px;background:#e6eeea;color:#537267;font:inherit;font-weight:800}.production-entry-tabs button.active{background:#123c39;color:#fff}
  `;
  document.head.append(css);

  function plans() { return data.productionPlans || (data.productionPlans = []); }
  function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-01`; }
  function activePlans(date='') { return plans().filter(p => !date || p.date === date); }
  function getOrder(id) { return data.orders.find(o => o.id === id); }
  function getLine(order, id) { return order?.lines.find(l => l.id === id); }
  function planRemaining(plan) { return Math.max(0, n(plan.quantity) - n(plan.completed)); }
  function planTitle(plan) {
    if (plan.manual) {
      const target = data.products.find(p => p.id === plan.productId) || window.product(plan.code, plan.spec, plan.unit);
      const line = { name:plan.code, spec:plan.spec, unit:plan.unit, productId:target.id };
      return { order:{ company:plan.company || '수동 생산', orderDate:plan.orderLabel || '' }, line, text:`${plan.company || '수동'} · ${plan.code} ${q(planRemaining(plan))}${plan.unit}` };
    }
    const order = getOrder(plan.orderId), line = getLine(order, plan.lineId);
    return { order, line, text: line ? `${order?.company || '발주처 미입력'} · ${line.name} ${q(planRemaining(plan))}${line.unit}` : '삭제된 발주 제품' };
  }
  function drawProductionCalendar() {
    const box = $('#priorityList'); if (!box) return;
    box.querySelector('.production-calendar')?.remove();
    const base = prodMonth ? new Date(prodMonth + 'T00:00:00') : (typeof calMonth33 !== 'undefined' && calMonth33 ? new Date(calMonth33 + 'T00:00:00') : new Date(today() + 'T00:00:00'));
    const first = new Date(base.getFullYear(), base.getMonth(), 1), last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const grouped = {};
    activePlans().forEach(plan => ((grouped[plan.date] ||= []).push(plan)));
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push('<div class="due-calendar33-cell blank"></div>');
    for (let day = 1; day <= last.getDate(); day++) {
      const date = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const rows = grouped[date] || [], visible = rows.slice(0,2);
      cells.push(`<button type="button" class="due-calendar33-cell ${rows.length ? 'has-plan' : ''} ${date === today() ? 'due-calendar33-today' : ''}" data-production-date="${date}"><span class="due-calendar33-date">${day}</span>${visible.map(p => `<span class="production-plan-chip ${planRemaining(p) <= 0 ? 'done' : ''}">${esc(planTitle(p).text)}</span>`).join('')}${rows.length > 2 ? `<small class="due-calendar33-more">+${rows.length - 2}건</small>` : ''}</button>`);
    }
    const pending = activePlans().filter(p => planRemaining(p) > 0).length;
    const html = `<section class="due-calendar33 production-calendar"><div class="due-calendar33-header"><button class="due-calendar33-nav" type="button" data-production-nav="-1" aria-label="이전 달">‹</button><strong>생산 달력 · ${base.getFullYear()}년 ${base.getMonth() + 1}월</strong><button class="due-calendar33-nav" type="button" data-production-nav="1" aria-label="다음 달">›</button></div><p class="due-calendar33-sub">생산계획 ${pending}건 · 날짜를 누르면 계획을 확인하거나 추가할 수 있습니다.</p><div class="due-calendar33-grid">${['일','월','화','수','목','금','토'].map(day => `<div class="due-calendar33-week">${day}</div>`).join('')}${cells.join('')}</div></section>`;
    const due = box.querySelector('.due-calendar33');
    if (due) due.insertAdjacentHTML('afterend', html); else box.insertAdjacentHTML('afterbegin', html);
  }
  function renderDay() {
    const rows = activePlans(planDate);
    $('#productionDayTitle').textContent = `${planDate} 생산 계획`;
    $('#productionDayRows').innerHTML = rows.length ? rows.map(plan => {
      const { order, line } = planTitle(plan); const remaining = planRemaining(plan);
      return `<article class="plan-day-row"><strong>${esc(line?.name || '삭제된 제품')} · ${q(remaining)}${esc(line?.unit || '')}</strong><span>${esc(order?.company || '발주처 미입력')} · ${esc(line?.spec || '')}</span><span>${remaining > 0 ? `생산예정 ${q(remaining)}${esc(line?.unit || '')}` : '생산완료'}</span><div class="plan-row-actions">${remaining > 0 ? `<button type="button" class="small-action" data-plan-complete="${plan.id}">생산완료 입력</button><button type="button" class="small-action plan-delete" data-plan-delete="${plan.id}">계획 삭제</button>` : ''}</div></article>`;
    }).join('') : '<p class="empty">등록된 생산계획이 없습니다.</p>';
  }
  function openDay(date) { planDate = date; renderDay(); show('#productionDayDialog'); }
  function orderOptions() {
    return data.orders.filter(o => (o.lines || []).some(l => n(l.shipped) < n(l.quantity))).map(o => `<option value="${esc(o.id)}">${esc(o.company)} · ${esc(o.orderDate || '발주일 미입력')}</option>`).join('');
  }
  function lineOptions(orderId) {
    const order = getOrder(orderId);
    return (order?.lines || []).filter(l => n(l.shipped) < n(l.quantity)).map(l => `<option value="${esc(l.id)}">${esc(l.name)} · ${esc(l.spec)} · 발주 잔량 ${q(Math.max(0,n(l.quantity)-n(l.shipped)))}${esc(l.unit)}</option>`).join('');
  }
  function setPlanMode(mode) {
    $('#productionPlanDialog').dataset.mode = mode;
    document.querySelectorAll('[data-production-mode]').forEach(button => button.classList.toggle('active', button.dataset.productionMode === mode));
    $('#productionLinkedFields').classList.toggle('hidden', mode !== 'linked');
    $('#productionManualFields').classList.toggle('hidden', mode !== 'manual');
  }
  function openPlanForm() {
    planOrderId = data.orders.find(o => (o.lines || []).some(l => n(l.shipped) < n(l.quantity)))?.id || '';
    $('#productionPlanDate').value = planDate;
    $('#productionPlanOrder').innerHTML = `<option value="">발주처·발주 건 선택</option>${orderOptions()}`;
    $('#productionPlanOrder').value = planOrderId;
    $('#productionPlanLine').innerHTML = `<option value="">제품 선택</option>${lineOptions(planOrderId)}`;
    $('#productionPlanQuantity').value = '';
    $('#productionPlanMemo').value = '';
    $('#productionManualCompany').value = '';
    $('#productionManualOrder').value = '';
    $('#productionManualCode').value = '';
    $('#productionManualSpec').value = '';
    $('#productionManualUnit').value = '개';
    setPlanMode('linked');
    show('#productionPlanDialog');
  }
  function openComplete(planId) {
    const plan = plans().find(p => p.id === planId); if (!plan) return;
    const { order, line } = planTitle(plan); const remaining = planRemaining(plan);
    $('#productionCompleteDialog').dataset.planId = planId;
    $('#productionCompleteInfo').textContent = `${order?.company || ''} · ${line?.name || ''}\n${line?.spec || ''}\n생산예정 ${q(remaining)}${line?.unit || ''}`;
    $('#productionCompleteQuantity').value = remaining;
    $('#productionCompleteQuantity').max = remaining;
    show('#productionCompleteDialog');
  }
  function savePlan(event) {
    event.preventDefault();
    const mode = $('#productionPlanDialog').dataset.mode || 'linked';
    const quantity = n($('#productionPlanQuantity').value);
    if (quantity <= 0) return toast('생산예정 수량을 입력하세요.');
    if (mode === 'manual') {
      const company=$('#productionManualCompany').value.trim(), orderLabel=$('#productionManualOrder').value.trim(), code=$('#productionManualCode').value.trim(), spec=$('#productionManualSpec').value.trim(), unit=$('#productionManualUnit').value.trim() || '개';
      if (!code || !spec) return toast('제품 코드와 규격을 직접 입력하세요.');
      const target = window.product(code, spec, unit);
      plans().push({ id:id(), date:planDate, manual:true, company, orderLabel, code, spec, unit, productId:target.id, quantity, completed:0, memo:$('#productionPlanMemo').value.trim() });
      hide('#productionPlanDialog'); save(); drawProductionCalendar(); renderDay(); toast(`${planDate} 수동 생산계획 ${q(quantity)}${unit}를 등록했습니다.`); return;
    }
    const order = getOrder($('#productionPlanOrder').value), line = getLine(order, $('#productionPlanLine').value);
    if (!order || !line) return toast('발주처·발주 건과 발주 제품을 선택하세요.');
    const balance = Math.max(0, n(line.quantity) - n(line.shipped));
    if (quantity > balance && !confirm(`발주 잔량 ${q(balance)}${line.unit}보다 많습니다.\n재고 보충 생산으로 계획할까요?`)) return;
    plans().push({ id:id(), date:planDate, orderId:order.id, lineId:line.id, quantity, completed:0, memo:$('#productionPlanMemo').value.trim() });
    line.planned = n(line.planned) + quantity;
    hide('#productionPlanDialog'); save(); drawProductionCalendar(); renderDay(); toast(`${planDate} 생산계획 ${q(quantity)}${line.unit}를 등록했습니다.`);
  }
  function completePlan(event) {
    event.preventDefault();
    const plan = plans().find(p => p.id === $('#productionCompleteDialog').dataset.planId), quantity = n($('#productionCompleteQuantity').value);
    if (!plan || quantity <= 0 || quantity > planRemaining(plan)) return toast('남은 생산예정 수량 안에서 입력하세요.');
    const { order, line } = planTitle(plan), product = data.products.find(p => p.id === line?.productId);
    if (!line || !product) return toast('연결된 제품 정보를 찾지 못했습니다.');
    if (!confirm(`${line.name} ${q(quantity)}${line.unit}를 생산완료 처리하고 공장 재고로 이관할까요?`)) return;
    plan.completed = n(plan.completed) + quantity;
    if (!plan.manual) line.planned = Math.max(0, n(line.planned) - quantity);
    product.produced = n(product.produced) + quantity;
    if (typeof record === 'function') record(product, `${order?.company || ''} 생산계획 완료 +${q(quantity)}${line.unit}`);
    hide('#productionCompleteDialog'); save(); drawProductionCalendar(); renderDay(); toast(`생산완료 ${q(quantity)}${line.unit}를 공장 재고로 이관했습니다.`);
  }
  function deletePlan(planId) {
    const index = plans().findIndex(p => p.id === planId); if (index < 0) return;
    const plan = plans()[index], { line } = planTitle(plan), remaining = planRemaining(plan);
    if (!confirm(`생산계획 ${q(remaining)}${line?.unit || ''}를 삭제할까요?`)) return;
    if (line && !plan.manual) line.planned = Math.max(0, n(line.planned) - remaining);
    plans().splice(index, 1); save(); drawProductionCalendar(); renderDay(); toast('생산계획을 삭제했습니다.');
  }
  function setup() {
    if (uiReady) {
      drawProductionCalendar();
      return;
    }
    uiReady = true;
    document.body.insertAdjacentHTML('beforeend', `<dialog id="productionDayDialog" class="dialog"><div><div class="dialog-head"><h2 id="productionDayTitle">생산 계획</h2><button class="close" type="button" data-close>×</button></div><div id="productionDayRows" class="plan-day-list"></div><button id="productionPlanAdd" type="button" class="secondary full">+ 생산 계획 추가</button></div></dialog><dialog id="productionPlanDialog" class="dialog"><form id="productionPlanForm"><div class="dialog-head"><h2>생산 계획 추가</h2><button class="close" type="button" data-close>×</button></div><label>생산일<input id="productionPlanDate" type="date" readonly></label><div class="production-entry-tabs"><button type="button" class="active" data-production-mode="linked">발주에서 선택</button><button type="button" data-production-mode="manual">직접 입력</button></div><div id="productionLinkedFields"><label>발주처·발주 건<select id="productionPlanOrder"></select></label><label>발주 제품<select id="productionPlanLine"></select></label></div><div id="productionManualFields" class="hidden"><label>발주처·발주 건 (선택)<input id="productionManualCompany" placeholder="예: 에이엠테크"></label><label>참고 발주명 (선택)<input id="productionManualOrder" placeholder="예: 8월 수동 생산"></label><div class="two"><label>제품 코드<input id="productionManualCode" placeholder="예: S1"></label><label>단위<input id="productionManualUnit" value="개"></label></div><label>제품 규격<input id="productionManualSpec" placeholder="예: 18t × 90w × 450L"></label></div><label>생산예정 수량<input id="productionPlanQuantity" type="number" min="0" step="0.01" required></label><label>메모 (선택)<input id="productionPlanMemo"></label><p class="plan-form-note">직접 입력은 발주와 연결하지 않고 생산 계획으로만 기록합니다.</p><div class="actions"><button type="button" class="secondary" data-close>취소</button><button type="submit" class="primary">생산 계획 저장</button></div></form></dialog><dialog id="productionCompleteDialog" class="dialog"><form id="productionCompleteForm"><div class="dialog-head"><h2>생산완료 입력</h2><button class="close" type="button" data-close>×</button></div><p id="productionCompleteInfo" class="info"></p><label>이번 생산완료 수량<input id="productionCompleteQuantity" type="number" min="0" step="0.01" required></label><p class="plan-form-note">완료 수량은 공장 재고로 이관되고, 생산예정에서는 차감됩니다.</p><div class="actions"><button type="button" class="secondary" data-close>취소</button><button type="submit" class="primary">생산완료 처리</button></div></form></dialog>`);
    $('#productionPlanAdd').onclick = openPlanForm;
    $('#productionPlanOrder').onchange = event => { planOrderId = event.target.value; $('#productionPlanLine').innerHTML = `<option value="">제품 선택</option>${lineOptions(planOrderId)}`; };
    $('#productionPlanForm').onsubmit = savePlan;
    $('#productionCompleteForm').onsubmit = completePlan;
    document.querySelectorAll('[data-production-mode]').forEach(button => button.onclick = () => setPlanMode(button.dataset.productionMode));
    document.addEventListener('click', event => {
      const date = event.target.closest('[data-production-date]')?.dataset.productionDate;
      const nav = event.target.closest('[data-production-nav]');
      const complete = event.target.closest('[data-plan-complete]')?.dataset.planComplete;
      const remove = event.target.closest('[data-plan-delete]')?.dataset.planDelete;
      if (date) openDay(date);
      if (nav) { const base = prodMonth ? new Date(prodMonth + 'T00:00:00') : new Date(today() + 'T00:00:00'); base.setMonth(base.getMonth() + n(nav.dataset.productionNav)); prodMonth = monthKey(base); drawProductionCalendar(); }
      if (complete) openComplete(complete);
      if (remove) deletePlan(remove);
    });
    document.addEventListener('dow:datachange', drawProductionCalendar);
    drawProductionCalendar();
  }
  setup();
})();
