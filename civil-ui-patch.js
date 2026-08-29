(() => {
  window.weakQuestionKeys = function weakQuestionKeys() {
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

  const correctButton = $('#correctButton');
  if (correctButton && typeof correctButton.onclick === 'function') {
    const originalCorrect = correctButton.onclick;
    correctButton.onclick = () => {
      const q = state.quiz[state.index];
      originalCorrect();
      if (!q) return;
      const attempts = store.get('attempts', {});
      const k = keyOf(q);
      const arr = attempts[k] || [];
      if (arr.length) {
        arr[arr.length - 1] = { ...arr[arr.length - 1], correct: true };
        attempts[k] = arr;
        store.set('attempts', attempts);
      }
    };
  }

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
        review.index = Math.max(0, review.index - 1);
        renderWrongReview();
        return;
      }
      if (e.target.closest('[data-review-next]')) {
        review.index = Math.min(review.keys.length - 1, review.index + 1);
        renderWrongReview();
        return;
      }
      if (e.target.closest('[data-review-favorite]')) {
        const fav = favorites();
        const k = keyOf(q);
        if (fav.has(k)) fav.delete(k); else fav.add(k);
        store.set('favorites', [...fav]);
        updateStats();
        renderWrongReview();
        return;
      }
      if (e.target.closest('[data-review-correct]')) {
        markReviewCorrect(q);
        renderWrongReview();
        return;
      }
      if (e.target.closest('[data-review-memorized]')) {
        const mem = memorized();
        mem.add(keyOf(q));
        store.set('memorized', [...mem]);
        updateStats();
        renderWrongReview();
      }
    });
  }

  function currentReviewQuestion() {
    return byKey(review.keys[review.index]);
  }

  function reviewQuizIndex(q) {
    return state.quiz.findIndex((x) => keyOf(x) === keyOf(q));
  }

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
    const mem = memorized();
    mem.delete(keyOf(q));
    store.set('memorized', [...mem]);
    updateStats();
  }

  function renderWrongReview() {
    const q = currentReviewQuestion();
    if (!q) return;
    const { user, result } = reviewResult(q);
    const fav = favorites().has(keyOf(q));
    const mem = memorized().has(keyOf(q));
    const logResult = store.get('log', {})[keyOf(q)]?.result;
    const missed = Array.isArray(result?.missed) ? result.missed : [];

    $('#wrongReviewCount').textContent = `${review.keys.length}문제 · 문제를 누르면 정답을 바로 확인할 수 있습니다.`;
    $('#wrongReviewList').innerHTML = review.keys.map((k, i) => {
      const item = byKey(k);
      if (!item) return '';
      return `<button type="button" class="wrong-review-item ${i === review.index ? 'selected' : ''}" data-review-index="${i}"><span>${i + 1}. ${escapeHTML(item.question)}</span><small>${Number(item.frequency || 1)}회${favorites().has(k) ? ' ★' : ''}</small></button>`;
    }).join('');

    $('#wrongReviewDetail').innerHTML = `
      <div class="review-position">오답 ${review.index + 1} / ${review.keys.length}</div>
      <div class="review-section review-question"><span class="meta-title">문제</span><p>${escapeHTML(q.question)}</p></div>
      <div class="review-section"><span class="meta-title">내 답</span><p>${escapeHTML(user || '(미입력)')}</p></div>
      ${missed.length ? `<div class="review-section missed"><span class="meta-title">빠진 항목</span><p>${missed.map((x) => `• ${escapeHTML(x)}`).join('<br>')}</p></div>` : ''}
      <div class="review-section correct-answer"><span class="meta-title">정답</span><p>${escapeHTML(q.answer)}</p></div>
      <div class="review-status">${logResult === '정답' ? '✓ 정답으로 처리됨' : mem ? '✓ 확실히 암기 처리됨' : '현재 오답으로 기록됨'}</div>
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
    $('#wrongReviewModal').classList.remove('hidden');
    renderWrongReview();
  }

  function closeWrongReview() {
    $('#wrongReviewModal')?.classList.add('hidden');
  }

  ensureReviewModal();
  if ($('#summaryWrongButton')) {
    $('#summaryWrongButton').onclick = () => openWrongReview(state.summaryWrongKeys);
  }
})();
