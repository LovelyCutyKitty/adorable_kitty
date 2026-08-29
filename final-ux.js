(() => {
  const isMaterial = location.pathname.includes('/construction_material/');
  document.body.classList.toggle('construction-material-app', isMaterial);

  const copy = {
    intro: '기출을 내 계획에 맞게 반복하고, 오답·빈출·취약문제를 압축해 복습하세요.',
    status: isMaterial ? '2012-1 ~ 2026-2 · 179문제' : '2014-1 ~ 2026-2 · 443문제'
  };

  const viewIds = ['homeView', 'quizView', 'summaryView', 'panelView'];
  const pickerIds = ['randomPicker', 'frequentPicker', 'roundPicker', 'listPicker'];
  let selectedRoundMode = '';
  let launchingRound = false;
  let restoring = false;
  let revertingBack = false;
  let lastRouteKey = '';
  let lastPanelType = '';
  let exitArmedUntil = 0;
  let exitToastTimer = 0;

  const el = (id) => document.getElementById(id);
  const isVisible = (node) => !!node && !node.classList.contains('hidden');

  function applyCopy() {
    const intro = document.querySelector('#homeView .intro > p');
    if (intro) intro.textContent = copy.intro;
    const status = el('dataStatus');
    if (status) status.textContent = copy.status;
    const statLabels = document.querySelectorAll('.home-stats > div > span');
    if (statLabels.length) statLabels[statLabels.length - 1].textContent = '전체 문제';
  }

  function appReady() {
    const select = el('roundSelect');
    const status = el('dataStatus');
    if (!select || !select.options.length || !status) return false;
    const text = status.textContent || '';
    return !text.includes('불러오는 중') && !text.includes('불러오지 못');
  }

  function ensureRoundUI() {
    const picker = el('roundPicker');
    const grid = picker?.querySelector('.round-mode-grid');
    if (!picker || !grid) return false;

    if (!picker.querySelector('.round-mode-label')) {
      const label = document.createElement('span');
      label.className = 'field-label round-mode-label';
      label.textContent = '풀이 방식';
      grid.before(label);
    }

    if (!el('roundStartButton')) {
      const start = document.createElement('button');
      start.id = 'roundStartButton';
      start.className = 'primary wide';
      start.type = 'button';
      start.textContent = '문제 풀기';
      start.disabled = true;
      grid.after(start);
      start.addEventListener('click', () => {
        if (!selectedRoundMode || !appReady()) return;
        const target = el(selectedRoundMode === 'explain' ? 'startRoundExplainButton' : 'startRoundExamButton');
        if (!target) return;
        launchingRound = true;
        try { target.click(); } finally { launchingRound = false; }
      });
    }
    updateRoundUI();
    return true;
  }

  function selectRoundMode(mode) {
    selectedRoundMode = mode;
    updateRoundUI();
  }

  function resetRoundMode() {
    selectedRoundMode = '';
    updateRoundUI();
  }

  function updateRoundUI() {
    const explain = el('startRoundExplainButton');
    const exam = el('startRoundExamButton');
    explain?.classList.toggle('round-choice-selected', selectedRoundMode === 'explain');
    exam?.classList.toggle('round-choice-selected', selectedRoundMode === 'exam');
    explain?.setAttribute('aria-pressed', selectedRoundMode === 'explain' ? 'true' : 'false');
    exam?.setAttribute('aria-pressed', selectedRoundMode === 'exam' ? 'true' : 'false');
    const start = el('roundStartButton');
    if (start) start.disabled = !selectedRoundMode || !appReady();
  }

  function setView(id) {
    viewIds.forEach((viewId) => el(viewId)?.classList.toggle('hidden', viewId !== id));
  }

  function hidePickersDirect() {
    pickerIds.forEach((id) => el(id)?.classList.add('hidden'));
  }

  function hideModalsDirect() {
    document.querySelectorAll('.modal').forEach((modal) => modal.classList.add('hidden'));
  }

  function panelTypeFromTitle() {
    const title = (el('panelTitle')?.textContent || '').trim();
    return ({ '나만의 학습세트': 'sets', '학습 통계': 'stats', '시험 이력': 'history', '일별 학습': 'daily' })[title] || lastPanelType || '';
  }

  function detectBaseRoute() {
    if (isVisible(el('quizView'))) return { kind: 'quiz' };
    if (isVisible(el('summaryView'))) return { kind: 'summary' };
    if (isVisible(el('panelView'))) {
      const panel = panelTypeFromTitle();
      const retry = document.querySelector('#panelContent [data-history-retry]');
      return { kind: 'panel', panel, detail: retry?.dataset.historyRetry || '' };
    }
    const openPicker = pickerIds.find((id) => isVisible(el(id)));
    if (openPicker) return { kind: 'picker', picker: openPicker };
    return { kind: 'home' };
  }

  function detectRoute() {
    const openModal = [...document.querySelectorAll('.modal')].find(isVisible);
    if (openModal) return { kind: 'modal', modal: openModal.id || '', base: detectBaseRoute() };
    return detectBaseRoute();
  }

  const routeKey = (route) => JSON.stringify(route || { kind: 'home' });

  function tryRenderPanel(type) {
    if (!type) return false;
    try {
      if (typeof renderPanel === 'function') {
        renderPanel(type);
        return true;
      }
    } catch (_) {}
    const btn = document.querySelector(`.mode-card[data-panel="${type}"]`);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  function restoreRoute(route) {
    if (!route) return;
    restoring = true;
    hideModalsDirect();

    if (route.kind === 'modal') {
      restoreRoute(route.base || { kind: 'home' });
      const modal = el(route.modal);
      if (modal) modal.classList.remove('hidden');
      restoring = false;
      return;
    }

    if (route.kind === 'home') {
      hidePickersDirect();
      setView('homeView');
    } else if (route.kind === 'picker') {
      setView('homeView');
      hidePickersDirect();
      el(route.picker)?.classList.remove('hidden');
    } else if (route.kind === 'quiz') {
      hidePickersDirect();
      setView('quizView');
    } else if (route.kind === 'summary') {
      hidePickersDirect();
      setView('summaryView');
    } else if (route.kind === 'panel') {
      hidePickersDirect();
      lastPanelType = route.panel || lastPanelType;
      setView('panelView');
      if (route.panel) tryRenderPanel(route.panel);
      if (route.detail) {
        setTimeout(() => {
          const selector = `[data-history-session="${CSS.escape(String(route.detail))}"]`;
          const row = document.querySelector(selector);
          if (row) row.click();
          setTimeout(() => {
            restoring = false;
            lastRouteKey = routeKey(detectRoute());
          }, 0);
        }, 0);
        return;
      }
    }

    try { if (typeof updateStats === 'function') updateStats(); } catch (_) {}
    restoring = false;
  }

  function liveHomeState(route = { kind: 'home' }) {
    return {
      ...(history.state || {}),
      __malddaUx: true,
      __malddaHomeExitGuard: false,
      __malddaHomeLive: true,
      malddaDepth: 0,
      malddaRoute: route
    };
  }

  function guardHomeState(route = { kind: 'home' }) {
    return {
      ...(history.state || {}),
      __malddaUx: true,
      __malddaHomeExitGuard: true,
      __malddaHomeLive: false,
      malddaDepth: 0,
      malddaRoute: route
    };
  }

  function installInitialHistory() {
    const route = detectRoute();

    // Android/Chrome PWA 재실행 시 history.state는 복원되지만 그 이전 엔트리가
    // 사라질 수 있다. 따라서 매 로드마다 현재 엔트리를 가드로 바꾸고
    // 실제 화면 엔트리를 새로 하나 추가해 첫 뒤로가기를 항상 잡는다.
    history.replaceState(guardHomeState(route), '');
    history.pushState(liveHomeState(route), '');
    lastRouteKey = routeKey(route);
  }

  function pushRouteIfChanged() {
    if (restoring || revertingBack) return;
    const route = detectRoute();
    const key = routeKey(route);
    if (key === lastRouteKey) return;

    if (route.kind !== 'home') exitArmedUntil = 0;

    const current = history.state?.__malddaUx ? history.state.malddaRoute : null;
    if (current?.kind === 'modal' && routeKey(current.base) === key) {
      history.back();
      return;
    }

    const depth = Number(history.state?.malddaDepth || 0) + 1;
    history.pushState({
      ...(history.state || {}),
      __malddaUx: true,
      __malddaHomeExitGuard: false,
      __malddaHomeLive: false,
      malddaDepth: depth,
      malddaRoute: route
    }, '');
    lastRouteKey = key;
  }

  function goHome() {
    const depth = Number(history.state?.malddaDepth || 0);
    if (depth > 0) history.go(-depth);
    else restoreRoute({ kind: 'home' });
  }

  function ensureExitToast() {
    let toast = el('malddaExitToast');
    if (toast) return toast;
    toast = document.createElement('div');
    toast.id = 'malddaExitToast';
    toast.className = 'maldda-exit-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = '한 번 더 뒤로가면 종료됩니다.';
    document.body.appendChild(toast);
    return toast;
  }

  function showExitToast() {
    const toast = ensureExitToast();
    clearTimeout(exitToastTimer);
    toast.classList.add('show');
    exitToastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const roundChoice = target.closest('#startRoundExplainButton,#startRoundExamButton');
    if (roundChoice && !launchingRound) {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectRoundMode(roundChoice.id === 'startRoundExplainButton' ? 'explain' : 'exam');
      return;
    }

    if (target.closest('.close-picker')) {
      const depth = Number(history.state?.malddaDepth || 0);
      if (depth > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        history.back();
      }
      return;
    }

    if (target.closest('#closeSetModal,#closeWrongReview')) {
      const depth = Number(history.state?.malddaDepth || 0);
      if (depth > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        history.back();
      }
      return;
    }

    if (target.closest('[data-history-back]')) {
      const depth = Number(history.state?.malddaDepth || 0);
      if (depth > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        history.back();
      }
      return;
    }

    if (target.closest('#backButton')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (confirm('풀이를 종료하고 처음 화면으로 돌아갈까요?')) goHome();
      return;
    }

    if (target.closest('#summaryHomeButton,#panelBackButton')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      goHome();
    }
  }, true);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const panelBtn = target.closest('.mode-card[data-panel]');
    if (panelBtn) lastPanelType = panelBtn.dataset.panel || '';
    const roundMenu = target.closest('.mode-card[data-mode="round"]');
    if (roundMenu) setTimeout(resetRoundMode, 0);
    setTimeout(pushRouteIfChanged, 0);
  });

  document.addEventListener('change', () => setTimeout(pushRouteIfChanged, 0));

  window.addEventListener('popstate', (event) => {
    if (revertingBack) {
      revertingBack = false;
      lastRouteKey = routeKey(detectRoute());
      return;
    }

    const currentRoute = detectRoute();

    if (event.state?.__malddaHomeExitGuard && currentRoute.kind === 'home') {
      const now = Date.now();
      if (now < exitArmedUntil) {
        exitArmedUntil = 0;
        history.back();
        return;
      }

      exitArmedUntil = now + 2200;
      showExitToast();
      restoreRoute({ kind: 'home' });
      history.pushState(liveHomeState({ kind: 'home' }), '');
      lastRouteKey = routeKey({ kind: 'home' });
      return;
    }

    const targetRoute = event.state?.__malddaUx ? event.state.malddaRoute : null;

    if (currentRoute.kind === 'quiz' && targetRoute && targetRoute.kind !== 'quiz') {
      if (!confirm('풀이를 종료하고 이전 화면으로 돌아갈까요?')) {
        revertingBack = true;
        history.forward();
        return;
      }
    }

    if (!targetRoute) return;
    restoreRoute(targetRoute);
    lastRouteKey = routeKey(targetRoute);
  });

  ensureRoundUI();
  installInitialHistory();

  let tries = 0;
  const readyTimer = setInterval(() => {
    tries += 1;
    ensureRoundUI();
    if (appReady()) {
      clearInterval(readyTimer);
      applyCopy();
      updateRoundUI();
    } else if (tries > 200) {
      clearInterval(readyTimer);
    }
  }, 60);
})();
