/* One calendar for order receipt dates and line due dates. */
(() => {
  let selectedDate = '';
  const dateOf = (order, line) => line?.dueDate || order.dueDate || '';
  const month = () => typeof calMonth33 !== 'undefined' && calMonth33 ? new Date(calMonth33 + 'T00:00:00') : new Date(today() + 'T00:00:00');
  function rowsFor(date) {
    const receipts = data.orders.filter(order => order.orderDate === date);
    const dues = data.orders.flatMap(order => (order.lines || []).map(line => ({ order, line, date:dateOf(order,line) }))).filter(row => row.date === date);
    return { receipts, dues };
  }
  function openOrders(ref) {
    document.querySelector('.tab[data-view="orders"]')?.click();
    setTimeout(() => window.restoreOrderContext?.(ref), 100);
  }
  function drawDetail() {
    const box = $('#priorityList'); box?.querySelector('.order-calendar-detail')?.remove();
    if (!selectedDate || !box) return;
    const { receipts, dues } = rowsFor(selectedDate);
    const receiptHtml = receipts.length ? receipts.map(order => `<article class="ordercal-row"><strong>${esc(order.company)} · ${order.lines.length}개 품목</strong><span>발주 접수일 ${esc(order.orderDate)}</span><div><button type="button" data-ordercal-open="${order.id}|${order.lines[0]?.id || ''}">발주 보기</button><button type="button" data-ordercal-date-edit="order|${order.id}">접수일 수정</button></div></article>`).join('') : '<p class="muted">이 날짜에 접수된 발주가 없습니다.</p>';
    const dueHtml = dues.length ? dues.map(({order,line}) => `<article class="ordercal-row"><strong>${esc(order.company)} · ${esc(line.name)} · ${q(line.quantity)}${esc(line.unit)}</strong><span>${esc(line.spec)}</span><div><button type="button" data-ordercal-open="${order.id}|${line.id}">발주 보기</button><button type="button" data-ordercal-date-edit="due|${order.id}|${line.id}">납기 수정</button><button type="button" class="ordercal-danger" data-ordercal-due-delete="${order.id}|${line.id}">납기 삭제</button></div></article>`).join('') : '<p class="muted">이 날짜에 등록된 제품 납기가 없습니다.</p>';
    const html = `<section class="order-calendar-detail"><div class="order-calendar-detail-head"><h3>${esc(selectedDate)} 발주·납기 관리</h3></div><h4>발주 접수</h4>${receiptHtml}<h4>제품 납기</h4>${dueHtml}<div class="ordercal-add"><button type="button" class="secondary" data-ordercal-new="receipt">+ 이 날짜를 접수일로 새 발주 추가</button><button type="button" class="secondary" data-ordercal-new="due">+ 이 날짜를 납기일로 새 발주 추가</button><button type="button" class="secondary" data-ordercal-existing-due>+ 기존 발주 제품 납기 추가</button></div></section>`;
    const calendar = box.querySelector('.order-calendar');
    if (calendar) calendar.insertAdjacentHTML('afterend', html);
  }
  function drawCalendar() {
    const box = $('#priorityList'); if (!box) return;
    box.querySelectorAll('.due-calendar33,.due-calendar33-detail,.order-calendar,.order-calendar-detail').forEach(node => node.remove());
    const base = month(), first = new Date(base.getFullYear(), base.getMonth(), 1), last = new Date(base.getFullYear(), base.getMonth()+1, 0);
    const entries = {};
    data.orders.forEach(order => {
      if (order.orderDate) (entries[order.orderDate] ||= []).push({kind:'receipt', text:`접수 · ${order.company}`});
      (order.lines || []).forEach(line => { const due = dateOf(order,line); if (due) (entries[due] ||= []).push({kind:'due', text:`납기 · ${order.company}`}); });
    });
    const cells=[];
    for(let i=0;i<first.getDay();i++) cells.push('<div class="due-calendar33-cell blank"></div>');
    for(let day=1;day<=last.getDate();day++) {
      const date=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`, rows=entries[date]||[];
      cells.push(`<button type="button" class="due-calendar33-cell ordercal-cell ${rows.length?'has-event':''} ${date===today()?'due-calendar33-today':''}" data-ordercal-date="${date}"><span class="due-calendar33-date">${day}</span>${rows.slice(0,2).map(row=>`<span class="ordercal-chip ${row.kind}">${esc(row.text)}</span>`).join('')}${rows.length>2?`<small class="due-calendar33-more">+${rows.length-2}건</small>`:''}</button>`);
    }
    const html=`<section class="due-calendar33 order-calendar"><div class="due-calendar33-header"><button class="due-calendar33-nav" type="button" data-ordercal-nav="-1">‹</button><strong>발주·납기 달력 · ${base.getFullYear()}년 ${base.getMonth()+1}월</strong><button class="due-calendar33-nav" type="button" data-ordercal-nav="1">›</button></div><p class="due-calendar33-sub">접수일과 제품 납기일을 함께 확인하고, 날짜를 눌러 발주 정보를 관리할 수 있습니다.</p><div class="due-calendar33-grid">${['일','월','화','수','목','금','토'].map(day=>`<div class="due-calendar33-week">${day}</div>`).join('')}${cells.join('')}</div></section>`;
    box.insertAdjacentHTML('afterbegin', html); drawDetail();
  }
  function openDateEditor(ref) {
    const [type, orderId, lineId] = ref.split('|'), order = data.orders.find(item => item.id === orderId), line = order?.lines.find(item => item.id === lineId);
    if (!order) return;
    $('#orderCalendarDateDialog').dataset.ref = ref;
    $('#orderCalendarDateTitle').textContent = type === 'receipt' || type === 'order' ? '발주 접수일 수정' : '제품 납기일 수정';
    $('#orderCalendarDateInput').value = type === 'receipt' || type === 'order' ? order.orderDate : dateOf(order,line);
    show('#orderCalendarDateDialog');
  }
  function setup() {
    if (!document.querySelector('#orderCalendarDateDialog')) {
      const style=document.createElement('style'); style.textContent=`.ordercal-cell{font:inherit;text-align:left;color:inherit}.ordercal-chip{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:5px;margin:4px 0 0;padding:3px 4px;font-size:.66rem}.ordercal-chip.receipt{background:#edf3ef;color:#517166}.ordercal-chip.due{background:#e1f0e7;color:#235342}.order-calendar-detail{margin:0 0 16px;padding:13px;border:1px solid #cfe0d7;border-radius:14px;background:#fff}.order-calendar-detail h4{font-size:.86rem;margin:12px 0 6px;color:#537267}.ordercal-row{padding:10px 0;border-bottom:1px solid #edf2ef}.ordercal-row strong,.ordercal-row span{display:block}.ordercal-row span{font-size:.83rem;color:#60766d;margin-top:3px}.ordercal-row button,.ordercal-add button{margin:8px 5px 0 0;border:1px solid #cbdcd3;border-radius:8px;padding:7px 9px;background:#fff;color:#235342;font:inherit;font-size:.82rem;font-weight:800}.ordercal-danger{color:#b53f31!important;border-color:#efb7ad!important}.ordercal-add{display:flex;flex-wrap:wrap;gap:6px;margin-top:13px}.ordercal-add button{margin:0}`; document.head.append(style);
      document.body.insertAdjacentHTML('beforeend', `<dialog id="orderCalendarDateDialog" class="dialog"><form id="orderCalendarDateForm"><div class="dialog-head"><h2 id="orderCalendarDateTitle">날짜 수정</h2><button type="button" class="close" data-close>×</button></div><label>날짜<input id="orderCalendarDateInput" type="date" required></label><div class="actions"><button type="button" class="secondary" data-close>취소</button><button type="submit" class="primary">변경하기</button></div></form></dialog><dialog id="orderCalendarExistingDueDialog" class="dialog"><form id="orderCalendarExistingDueForm"><div class="dialog-head"><h2>기존 발주 제품 납기 추가</h2><button type="button" class="close" data-close>×</button></div><label>발주 건<select id="orderCalendarDueOrder"></select></label><label>제품<select id="orderCalendarDueLine"></select></label><label>납기일<input id="orderCalendarDueInput" type="date" required></label><div class="actions"><button type="button" class="secondary" data-close>취소</button><button type="submit" class="primary">납기 저장</button></div></form></dialog>`);
      $('#orderCalendarDateForm').onsubmit = event => { event.preventDefault(); const [type,orderId,lineId]=$('#orderCalendarDateDialog').dataset.ref.split('|'), order=data.orders.find(item=>item.id===orderId), line=order?.lines.find(item=>item.id===lineId), value=$('#orderCalendarDateInput').value; if(type==='receipt'||type==='order') order.orderDate=value; else line.dueDate=value; hide('#orderCalendarDateDialog'); save(); drawCalendar(); drawDetail(); toast('날짜를 변경했습니다.'); };
      $('#orderCalendarExistingDueForm').onsubmit = event => { event.preventDefault(); const order=data.orders.find(item=>item.id===$('#orderCalendarDueOrder').value), line=order?.lines.find(item=>item.id===$('#orderCalendarDueLine').value); if(!line) return; line.dueDate=$('#orderCalendarDueInput').value; hide('#orderCalendarExistingDueDialog'); save(); drawCalendar(); drawDetail(); toast('제품 납기일을 저장했습니다.'); };
      $('#orderCalendarDueOrder').onchange = event => { const order=data.orders.find(item=>item.id===event.target.value); $('#orderCalendarDueLine').innerHTML=(order?.lines||[]).map(line=>`<option value="${line.id}">${esc(line.name)} · ${esc(line.spec)}</option>`).join(''); };
    }
    if (!render.__orderCalendar) { const old=render; const newer=()=>{old();setTimeout(drawCalendar,100)}; newer.__orderCalendar=true; render=newer; }
    drawCalendar();
  }
  document.addEventListener('click', event => {
    const date=event.target.closest('[data-ordercal-date]')?.dataset.ordercalDate; if(date){selectedDate=date;drawCalendar();return;}
    const nav=event.target.closest('[data-ordercal-nav]'); if(nav){const base=month();base.setMonth(base.getMonth()+n(nav.dataset.ordercalNav));calMonth33=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-01`;selectedDate='';drawCalendar(); if(typeof drawProductionCalendar==='function') drawProductionCalendar();return;}
    const open=event.target.closest('[data-ordercal-open]')?.dataset.ordercalOpen; if(open) openOrders(open);
    const edit=event.target.closest('[data-ordercal-date-edit]')?.dataset.ordercalDateEdit; if(edit) openDateEditor(edit);
    const remove=event.target.closest('[data-ordercal-due-delete]')?.dataset.ordercalDueDelete; if(remove){const [orderId,lineId]=remove.split('|'),order=data.orders.find(x=>x.id===orderId),line=order?.lines.find(x=>x.id===lineId);if(!line)return;if(line.dueDate){if(confirm('이 제품의 개별 납기일을 삭제할까요?')){line.dueDate='';save();drawCalendar();drawDetail();}}else if(order?.dueDate&&confirm('이 발주의 기본 납기일입니다. 발주 전체의 기본 납기일을 삭제할까요?')){order.dueDate='';save();drawCalendar();drawDetail();}}
    const add=event.target.closest('[data-ordercal-new]')?.dataset.ordercalNew; if(add) window.openOrderEntry?.(add==='receipt'?{orderDate:selectedDate}:{dueDate:selectedDate});
    if(event.target.closest('[data-ordercal-existing-due]')){const orders=data.orders.filter(o=>(o.lines||[]).length);$('#orderCalendarDueOrder').innerHTML=orders.map(o=>`<option value="${o.id}">${esc(o.company)} · ${esc(o.orderDate)}</option>`).join('');$('#orderCalendarDueOrder').dispatchEvent(new Event('change'));$('#orderCalendarDueInput').value=selectedDate;show('#orderCalendarExistingDueDialog');}
  });
  [12000,18000,24000].forEach(delay=>setTimeout(setup,delay));
})();
