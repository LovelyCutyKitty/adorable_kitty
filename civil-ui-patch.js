(() => {
  const WRONG_POOL_KEY = 'wrongPoolV5';
  const WRONG_MIGRATION_KEY = 'wrongPoolV5Migrated';

  function wrongPool() { return new Set(store.get(WRONG_POOL_KEY, [])); }
  function saveWrongPool(set) { store.set(WRONG_POOL_KEY, [...set]); }
  function addWrong(q) {
    if (!q) return;
    const pool = wrongPool();
    pool.add(keyOf(q));
    saveWrongPool(pool);
  }
  function removeWrong(q) {
    if (!q) return;
    const pool = wrongPool();
    pool.delete(keyOf(q));
    saveWrongPool(pool);
  }

  if (!store.get(WRONG_MIGRATION_KEY, false)) {
    const pool = wrongPool();
    const log = store.get('log', {});
    Object.entries(log).forEach(([k, v]) => {
      if (v?.result === '오답' && byKey(k)) pool.add(k);
    });
    saveWrongPool(pool);
    store.set(WRONG_MIGRATION_KEY, true);
  }

  activeWrongs = function activeWrongsV5() {
    const pool = wrongPool();
    const mem = memorized();
    return state.questions.filter((q) => pool.has(keyOf(q)) && !mem.has(keyOf(q)));
  };

  const baseLogAttempt = logAttempt;
  logAttempt = function logAttemptV5(q, result, gradeResult, user, countAttempt = true) {
    baseLogAttempt(q, result, gradeResult, user, countAttempt);
    if (result === '오답') addWrong(q);
  };

  const baseSubmit = submit;
  submit = function submitV5() {
    const q = state.quiz[state.index];
    baseSubmit();
    if (!q || state.mode === 'round-exam') return;
    const result = state.results[state.index];
    if (!result) return;
    if (!result.correct) addWrong(q);
    const box = $('#resultBox');
    if (!box) return;
    box.textContent = result.correct
      ? `정답입니다. (${result.count}/${result.total})`
      : `오답입니다. (${result.count}/${result.total} 맞음)\n\n정답\n${q.answer}`;
  };
  $('#submitButton').onclick = submit;

  const baseManualCorrect = manualCorrect;
  manualCorrect = function manualCorrectV5() {
    const q = state.quiz[state.index];
    baseManualCorrect();
    removeWrong(q);
    if (q) {
      const attempts = store.get('attempts', {});
      const k = keyOf(q);
      const arr = attempts[k] || [];
      if (arr.length) {
        arr[arr.length - 1] = { ...arr[arr.length - 1], correct: true };
        attempts[k] = arr;
        store.set('attempts', attempts);
      }
    }
    updateStats();
  };
  $('#correctButton').onclick = manualCorrect;

  const baseMarkMemorized = markMemorized;
  markMemorized = function markMemorizedV5() {
    const q = state.quiz[state.index];
    baseMarkMemorized();
    removeWrong(q);
    updateStats();
  };
  $('#memorizedButton').onclick = markMemorized;

  const baseSaveSession = saveSession;
  saveSession = function saveSessionV5(scored = true) {
    baseSaveSession(scored);
    const sessions = store.get('sessions', []);
    const s = sessions[0];
    if (!s) return;
    s.items = state.quiz.map((q, i) => ({
      key: keyOf(q),
      user: state.answers[i] || '',
      correct: scored ? !!state.results[i]?.correct : null
    }));
    store.set('sessions', sessions);
  };

  weakQuestionKeys = function weakQuestionKeysV5() {
    const attempts = store.get('attempts', {});
    const mem = memorized();
    const out = [];
    Object.entries(attempts).forEach(([k, arr]) => {
      if (mem.has(k) || !Array.isArray(arr) || arr.length < 3) return;
      const last = arr.slice(-3);
      if (last.filter((x) => !x.correct).length >= 2 && byKey(k)) out.push(k);
    });
    return out;
  };

  renderSetsPanel = function renderSetsPanelV5() {
    const sets = store.get('studySets', []);
    const weak = weakQuestionKeys();
    let html = `<div class="card panel-card"><div class="picker-head"><h3>내 학습세트</h3><button class="small-button" data-new-set type="button">+ 새 세트</button></div>`;
    html += `<div class="set-row auto-set-row"><div class="row-main"><div class="row-title">⚡ 취약문제 <span class="chip">자동</span></div><div class="row-sub">3회 이상 풀어본 문제 중 최근 3회에서 2회 이상 오답 · ${weak.length}문제</div></div><div class="row-actions"><button data-run-weak type="button" ${weak.length ? '' : 'disabled'}>풀기</button></div></div>`;
    html += sets.length
      ? sets.map((s) => `<div class="set-row"><div class="row-main"><div class="row-title">${escapeHTML(s.name)}</div><div class="row-sub">${s.questionKeys.filter((k) => byKey(k)).length}문제</div></div><div class="row-actions"><button data-run-set="${escapeAttr(s.id)}">풀기</button><button data-edit-set="${escapeAttr(s.id)}">수정</button><button data-delete-set="${escapeAttr(s.id)}">삭제</button></div></div>`).join('')
      : '<div class="empty-state compact-empty">직접 만든 학습세트는 아직 없습니다.</div>';
    $('#panelContent').innerHTML = html + '</div>';
  };

  function sessionQuestionKeys(s) {
    if (Array.isArray(s.questionKeys) && s.questionKeys.length) return s.questionKeys.filter((k) => byKey(k));
    if (Array.isArray(s.items) && s.items.length) return s.items.map((x) => x.key).filter((k) => byKey(k));
    const round = String(s.label || '').match(/\b(\d{2,4}-\d)\b/)?.[1];
    if (round) return state.questions.filter((q) => String(q.round) === round).map(keyOf);
    return (s.wrongKeys || []).filter((k) => byKey(k));
  }

  function sessionItem(s, key) {
    return Array.isArray(s.items) ? s.items.find((x) => x.key === key) : null;
  }

  renderHistoryPanel = function renderHistoryPanelV5() {
    const sessions = store.get('sessions', []);
    $('#panelContent').innerHTML = `<div class="card panel-card">${sessions.length ? sessions.map((s) => {
      const score = s.scored === false ? '해설' : `${Number(s.correct || 0)}/${Number(s.total || 0)} · ${Number(s.rate || 0)}%`;
      return `<button class="history-row history-clickable" type="button" data-history-session="${escapeAttr(s.id)}"><div class="row-main"><div class="row-title">${escapeHTML(s.label || s.mode || '학습 기록')}</div><div class="row-sub">${formatDateTime(s.date)} · ${Number(s.total || 0)}문제</div></div><div class="row-actions"><strong>${score}</strong></div></button>`;
    }).join('') : '<div class="empty-state">아직 저장된 시험 이력이 없습니다.</div>'}</div><p class="muted">기록을 누르면 당시 문제를 확인하고 같은 세트를 다시 풀 수 있습니다.</p>`;
  };

  function openHistoryDetail(id) {
    const s = store.get('sessions', []).find((x) => x.id === id);
    if (!s) return;
    const keys = sessionQuestionKeys(s);
    const wrongSet = new Set(s.wrongKeys || []);
    const score = s.scored === false ? '해설' : `${Number(s.correct || 0)} / ${Number(s.total || 0)} · ${Number(s.rate || 0)}%`;
    const rows = keys.map((k, i) => {
      const q = byKey(k);
      if (!q) return '';
      const snap = sessionItem(s, k);
      const status = s.scored === false ? '해설' : (snap?.correct === false || wrongSet.has(k) ? '오답' : '정답');
      const statusClass = status === '오답' ? 'wrong-status' : status === '정답' ? 'correct-status' : '';
      return `<details class="history-question"><summary><span>${i + 1}. ${escapeHTML(q.question)}</span><em class="${statusClass}">${status}</em></summary><div class="history-question-body">${snap?.user ? `<p><b>내 답</b><br>${escapeHTML(snap.user)}</p>` : ''}<p><b>정답</b></p><pre>${escapeHTML(q.answer)}</pre></div></details>`;
    }).join('');
    const wrongKeys = keys.filter((k) => {
      const snap = sessionItem(s, k);
      return s.scored !== false && (snap?.correct === false || wrongSet.has(k));
    });
    $('#panelContent').innerHTML = `
      <button class="text-button history-back" type="button" data-history-back>‹ 시험 이력</button>
      <div class="card panel-card history-detail-card">
        <div class="history-detail-head"><div><h3>${escapeHTML(s.label || s.mode || '학습 기록')}</h3><p>${formatDateTime(s.date)} · ${keys.length || Number(s.total || 0)}문제</p></div><strong>${score}</strong></div>
        ${keys.length ? '' : '<div class="history-note">이전 버전에서 저장된 기록이라 문제 목록을 복원할 수 없습니다.</div>'}
        <div class="history-detail-actions">
          <button class="primary" type="button" data-history-retry="${escapeAttr(s.id)}" ${keys.length ? '' : 'disabled'}>이 시험 다시 풀기</button>
          <button class="secondary" type="button" data-history-retry-wrong="${escapeAttr(s.id)}" ${wrongKeys.length ? '' : 'disabled'}>오답만 다시 풀기${wrongKeys.length ? ` (${wrongKeys.length})` : ''}</button>
        </div>
        <div class="history-question-list">${rows || '<div class="empty-state">확인할 문제 정보가 없습니다.</div>'}</div>
      </div>`;
  }

  document.addEventListener('click', (e) => {
    const history = e.target.closest('[data-history-session]');
    if (history) {
      openHistoryDetail(history.dataset.historySession);
      return;
    }
    if (e.target.closest('[data-history-back]')) {
      renderHistoryPanel();
      return;
    }
    const retry = e.target.closest('[data-history-retry]');
    if (retry) {
      const s = store.get('sessions', []).find((x) => x.id === retry.dataset.historyRetry);
      if (!s) return;
      const list = sessionQuestionKeys(s).map(byKey).filter(Boolean);
      if (!list.length) return alert('다시 풀 문제를 복원할 수 없습니다.');
      const mode = s.scored === false || s.mode === 'round-explain' ? 'round-explain' : 'history-retry';
      start(mode, list, `${s.label || '시험 이력'} · 다시 풀기`);
      return;
    }
    const retryWrong = e.target.closest('[data-history-retry-wrong]');
    if (retryWrong) {
      const s = store.get('sessions', []).find((x) => x.id === retryWrong.dataset.historyRetryWrong);
      if (!s) return;
      const wrongSet = new Set(s.wrongKeys || []);
      const list = sessionQuestionKeys(s).filter((k) => {
        const snap = sessionItem(s, k);
        return snap?.correct === false || wrongSet.has(k);
      }).map(byKey).filter(Boolean);
      if (!list.length) return alert('이 시험에는 다시 풀 오답이 없습니다.');
      start('wrong', list, '시험 이력 오답 재시험');
    }
  });

  const review = { keys: [], index: 0 };

  function ensureReviewModal() {
    if ($('#wrongReviewModal')) return;
    const modal = document.createElement('div');
    modal.id = 'wrongReviewModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-card wrong-review-card" role="dialog" aria-modal="true" aria-labelledby="wrongReviewTitle">
        <div class="picker-head review-head">
          <div><strong id="wrongReviewTitle">이번 풀이 오답 복습</strong><div id="wrongReviewCount" class="muted"></div></div>
          <button id="closeWrongReview" class="text-button" type="button">닫기</button>
        </div>
        <div class="wrong-review-layout">
          <div id="wrongReviewList" class="wrong-review-list" aria-label="틀린 문제 목록"></div>
          <section id="wrongReviewDetail" class="wrong-review-detail"></section>
        </div>
        <button id="retryReviewedWrongs" class="primary wide" type="button">이 오답들 다시 풀기</button>
      </div>`;
    document.body.appendChild(modal);

    $('#closeWrongReview').onclick = closeWrongReview;
    $('#retryReviewedWrongs').onclick = () => {
      const list = review.keys.map(byKey).filter(Boolean);
      closeWrongReview();
      if (list.length) start('wrong', list, '이번 풀이 오답 재시험');
    };
    $('#wrongReviewList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-review-index]');
      if (!btn) return;
      review.index = Number(btn.dataset.reviewIndex) || 0;
      renderWrongReview();
    });
    $('#wrongReviewDetail').addEventListener('click', (e) => {
      const q = currentReviewQuestion();
      if (!q) return;
      if (e.target.closest('[data-review-prev]')) {
        review.index = Math.max(0, review.index - 1); renderWrongReview(); return;
      }
      if (e.target.closest('[data-review-next]')) {
        review.index = Math.min(review.keys.length - 1, review.index + 1); renderWrongReview(); return;
      }
      if (e.target.closest('[data-review-favorite]')) {
        const fav = favorites(); const k = keyOf(q);
        if (fav.has(k)) fav.delete(k); else fav.add(k);
        store.set('favorites', [...fav]); updateStats(); renderWrongReview(); return;
      }
      if (e.target.closest('[data-review-correct]')) { markReviewCorrect(q); renderWrongReview(); return; }
      if (e.target.closest('[data-review-memorized]')) {
        const mem = memorized(); mem.add(keyOf(q)); store.set('memorized', [...mem]);
        removeWrong(q); updateStats(); renderWrongReview();
      }
    });
  }

  function currentReviewQuestion() { return byKey(review.keys[review.index]); }
  function reviewQuizIndex(q) { return state.quiz.findIndex((x) => keyOf(x) === keyOf(q)); }
  function reviewResult(q) {
    const i = reviewQuizIndex(q);
    const user = i >= 0 ? (state.answers[i] || '') : (store.get('log', {})[keyOf(q)]?.user || '');
    const result = i >= 0 && state.results[i] ? state.results[i] : grade(q, user);
    return { i, user, result };
  }
  function markReviewCorrect(q) {
    const { i, user, result } = reviewResult(q);
    const all = store.get('log', {});
    all[keyOf(q)] = { ...result, correct: true, result: '정답', user, date: new Date().toISOString() };
    store.set('log', all);
    if (i >= 0 && state.results[i] && !state.results[i].correct) state.results[i] = { ...state.results[i], correct: true };
    const mem = memorized(); mem.delete(keyOf(q)); store.set('memorized', [...mem]);
    removeWrong(q); updateStats();
  }
  function renderWrongReview() {
    const q = currentReviewQuestion(); if (!q) return;
    const { user } = reviewResult(q);
    const fav = favorites().has(keyOf(q));
    const mem = memorized().has(keyOf(q));
    const isWrong = wrongPool().has(keyOf(q)) && !mem;
    $('#wrongReviewCount').textContent = `${review.keys.length}문제 · 문제를 누르면 정답을 바로 확인할 수 있습니다.`;
    $('#wrongReviewList').innerHTML = review.keys.map((k, i) => {
      const item = byKey(k); if (!item) return '';
      return `<button type="button" class="wrong-review-item ${i === review.index ? 'selected' : ''}" data-review-index="${i}"><span>${i + 1}. ${escapeHTML(item.question)}</span><small>${Number(item.frequency || 1)}회${favorites().has(k) ? ' ★' : ''}</small></button>`;
    }).join('');
    $('#wrongReviewDetail').innerHTML = `
      <div class="review-position">오답 ${review.index + 1} / ${review.keys.length}</div>
      <div class="review-section review-question"><span class="meta-title">문제</span><p>${escapeHTML(q.question)}</p></div>
      <div class="review-section"><span class="meta-title">내 답</span><p>${escapeHTML(user || '(미입력)')}</p></div>
      <div class="review-section correct-answer"><span class="meta-title">정답</span><p>${escapeHTML(q.answer)}</p></div>
      <div class="review-status">${mem ? '✓ 확실히 암기 처리됨' : isWrong ? '현재 오답으로 기록됨' : '✓ 정답으로 처리됨'}</div>
      <div class="review-actions">
        <button type="button" data-review-favorite>${fav ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기'}</button>
        <button type="button" data-review-correct>정답으로 처리</button>
        <button type="button" data-review-memorized>확실히 암기</button>
      </div>
      <div class="review-nav">
        <button type="button" class="secondary" data-review-prev ${review.index === 0 ? 'disabled' : ''}>이전 오답</button>
        <button type="button" class="secondary" data-review-next ${review.index === review.keys.length - 1 ? 'disabled' : ''}>다음 오답</button>
      </div>`;
  }
  function openWrongReview(keys) {
    ensureReviewModal();
    review.keys = [...new Set((keys || []).filter((k) => byKey(k)))];
    review.index = 0;
    if (!review.keys.length) return alert('이번 풀이에는 오답이 없습니다.');
    $('#wrongReviewModal').classList.remove('hidden'); renderWrongReview();
  }
  function closeWrongReview() { $('#wrongReviewModal')?.classList.add('hidden'); }

  ensureReviewModal();
  $('#summaryWrongButton').onclick = () => openWrongReview(state.summaryWrongKeys);

  const style = document.createElement('style');
  style.textContent = `
    .history-clickable{width:100%;appearance:none;-webkit-appearance:none;text-align:left;cursor:pointer;font:inherit;color:inherit;background:#fff}
    .history-clickable:hover{border-color:#b9cbe0;background:#f9fbfe}
    .history-detail-card{display:block}.history-back{margin-bottom:12px}
    .history-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
    .history-detail-head h3{margin:0 0 5px}.history-detail-head p{margin:0;color:#73849a;font-size:.84rem}.history-detail-head>strong{white-space:nowrap}
    .history-note{margin:14px 0;padding:12px 14px;border-radius:12px;background:#f5f7fb;color:#64758a;font-size:.86rem;line-height:1.45}
    .history-detail-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0}.history-detail-actions>button{width:100%;max-width:none}
    .history-question-list{display:grid;gap:10px}.history-question{border:1px solid #dce6f1;border-radius:14px;background:#fff;overflow:hidden}
    .history-question summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;cursor:pointer;font-weight:700;list-style:none}.history-question summary::-webkit-details-marker{display:none}
    .history-question summary em{font-style:normal;font-size:.76rem;font-weight:800;color:#60758e;white-space:nowrap}.history-question summary em.wrong-status{color:#b13b3b}.history-question summary em.correct-status{color:#25724a}
    .history-question-body{padding:0 15px 15px;border-top:1px solid #edf1f6}.history-question-body p{white-space:pre-wrap;line-height:1.62}.history-question-body pre{margin:8px 0 0;white-space:pre-wrap;word-break:break-word;font:inherit;line-height:1.62}
    @media(max-width:520px){.history-detail-head{gap:10px}.history-detail-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  updateStats();
})();
