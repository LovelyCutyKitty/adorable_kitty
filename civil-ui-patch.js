(() => {
  window.renderSetsPanel = function renderSetsPanel() {
    const sets = store.get('studySets', []);
    const weak = weakQuestionKeys();

    let html = `<div class="card panel-card"><div class="picker-head"><h3>내 학습세트</h3><button class="small-button" data-new-set type="button">+ 새 세트</button></div>`;

    html += `<div class="set-row auto-set-row"><div class="row-main"><div class="row-title">⚡ 취약문제 <span class="chip">자동</span></div><div class="row-sub">3회 이상 풀어본 문제 중 최근 3회에서 2회 이상 오답 · ${weak.length}문제</div></div><div class="row-actions"><button data-run-weak type="button" ${weak.length ? '' : 'disabled'}>풀기</button></div></div>`;

    html += sets.length
      ? sets.map((s) => `<div class="set-row"><div class="row-main"><div class="row-title">${escapeHTML(s.name)}</div><div class="row-sub">${s.questionKeys.filter((k) => byKey(k)).length}문제</div></div><div class="row-actions"><button data-run-set="${escapeAttr(s.id)}">풀기</button><button data-edit-set="${escapeAttr(s.id)}">수정</button><button data-delete-set="${escapeAttr(s.id)}">삭제</button></div></div>`).join('')
      : '<div class="empty-state compact-empty">직접 만든 학습세트는 아직 없습니다.</div>';

    $('#panelContent').innerHTML = html + '</div>';
  };
})();
