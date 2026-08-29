const $ = (s) => document.querySelector(s);

const state = {
  questions: [], quiz: [], index: 0, mode: '', answers: [], results: [], score: 0,
  frequentThreshold: 2, listMode: '', listQuestions: [], setSelection: new Set(), editingSetId: null,
  appearancesById: new Map(), summaryWrongKeys: []
};

const PREFIX = 'maldda-';
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) { localStorage.setItem(PREFIX + key, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(PREFIX + key); }
};

const keyOf = (q) => `${q.round}||${q.question}`;
const byKey = (key) => state.questions.find((q) => keyOf(q) === key);

function sortRounds(rounds) {
  return [...rounds].sort((a, b) => {
    const [ay, ar] = String(a).split('-').map(Number);
    const [by, br] = String(b).split('-').map(Number);
    return by - ay || br - ar;
  });
}
function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function show(name) {
  ['homeView', 'quizView', 'summaryView', 'panelView'].forEach((id) => $(`#${id}`).classList.toggle('hidden', id !== name));
}
function hidePickers() {
  ['randomPicker', 'frequentPicker', 'roundPicker', 'listPicker'].forEach((id) => $(`#${id}`).classList.add('hidden'));
}
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}
function escapeAttr(s) {
  return String(s ?? '').replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]);
}

function buildAppearances() {
  const map = new Map();
  state.questions.forEach((q) => {
    const id = String(q.id ?? keyOf(q));
    if (!map.has(id)) map.set(id, new Set());
    map.get(id).add(String(q.round));
  });
  state.appearancesById = new Map([...map].map(([id, set]) => [id, sortRounds(set).reverse()]));
}
function appearancesOf(q) {
  return state.appearancesById.get(String(q.id ?? keyOf(q))) || [String(q.round)];
}
function appearanceText(q) { return appearancesOf(q).join(', '); }
function roundYearCode(round) { return String(round).split('-')[0]; }
function fullYear(code) {
  const n = Number(code);
  if (!Number.isFinite(n)) return String(code);
  return String(n < 100 ? 2000 + n : n);
}

function migrateLegacyData() {
  if (store.get('uxMigration20260830', false)) return;
  const oldDone = store.get('frequentDone', []);
  const byThreshold = store.get('frequentDoneByThreshold', {});
  if (oldDone.length && !(byThreshold['2'] || []).length) {
    const doneIds = new Set(oldDone.map(String));
    byThreshold['2'] = frequentQuestions(2).filter((q) => doneIds.has(String(q.id))).map(keyOf);
    store.set('frequentDoneByThreshold', byThreshold);
  }
  const log = store.get('log', {});
  const attempts = store.get('attempts', {});
  Object.entries(log).forEach(([k, v]) => {
    if ((!attempts[k] || !attempts[k].length) && v && (v.result === '정답' || v.result === '오답')) {
      attempts[k] = [{ correct: v.result === '정답', date: v.date || new Date().toISOString() }];
    }
  });
  store.set('attempts', attempts);
  store.set('uxMigration20260830', true);
}

function favorites() { return new Set(store.get('favorites', [])); }
function memorized() { return new Set(store.get('memorized', [])); }
function activeWrongs() {
  const log = store.get('log', {});
  const mem = memorized();
  return state.questions.filter((q) => log[keyOf(q)]?.result === '오답' && !mem.has(keyOf(q)));
}
function favoriteQuestions() {
  const fav = favorites();
  return state.questions.filter((q) => fav.has(keyOf(q)));
}
function frequentQuestions(threshold = state.frequentThreshold) {
  const byId = new Map();
  state.questions.filter((q) => Number(q.frequency || 1) >= threshold).forEach((q) => {
    const id = String(q.id ?? keyOf(q));
    if (!byId.has(id)) byId.set(id, q);
  });
  return [...byId.values()].sort((a, b) => Number(b.frequency || 1) - Number(a.frequency || 1) || String(a.id).localeCompare(String(b.id), 'ko', { numeric: true }));
}

function updateStats() {
  $('#wrongCount').textContent = activeWrongs().length;
  $('#favoriteCount').textContent = favorites().size;
  $('#solvedCount').textContent = `${store.get('solvedCount', 0).toLocaleString()}문제`;
  $('#uniqueCount').textContent = state.questions.length;
}

function setupFrequencyOptions() {
  const max = Math.max(2, ...state.questions.map((q) => Number(q.frequency || 1)));
  const values = [];
  for (let i = 2; i <= max; i++) values.push(i);
  $('#frequencyOptions').innerHTML = values.map((n) => `<button data-frequency="${n}" type="button">${n}회 이상</button>`).join('');
  selectFrequency(2);
}
function frequentProgress(n) {
  return store.get('frequentDoneByThreshold', {})[String(n)] || [];
}
function selectFrequency(n) {
  state.frequentThreshold = n;
  document.querySelectorAll('[data-frequency]').forEach((b) => b.classList.toggle('selected', Number(b.dataset.frequency) === n));
  const all = frequentQuestions(n);
  const done = new Set(frequentProgress(n));
  const completed = all.filter((q) => done.has(keyOf(q))).length;
  $('#frequentCountText').textContent = `${n}회 이상 출제 문제 ${all.length}개`;
  $('#frequentProgressText').textContent = `진행 ${completed} / ${all.length}`;
}
function markFrequentDone(q) {
  const all = store.get('frequentDoneByThreshold', {});
  const k = String(state.frequentThreshold);
  const arr = all[k] || [];
  if (!arr.includes(keyOf(q))) all[k] = [...arr, keyOf(q)];
  store.set('frequentDoneByThreshold', all);
}
function resetFrequentProgress(n) {
  const all = store.get('frequentDoneByThreshold', {});
  all[String(n)] = [];
  store.set('frequentDoneByThreshold', all);
  selectFrequency(n);
}

function setupSetFilters() {
  const max = Math.max(1, ...state.questions.map((q) => Number(q.frequency || 1)));
  $('#setFrequencyFilter').innerHTML = '<option value="1">출제빈도 전체</option>' +
    Array.from({ length: Math.max(0, max - 1) }, (_, i) => i + 2).map((n) => `<option value="${n}">${n}회 이상</option>`).join('');
  const years = [...new Set(state.questions.map((q) => roundYearCode(q.round)))].sort((a, b) => Number(b) - Number(a));
  $('#setYearFilter').innerHTML = '<option value="all">연도 전체</option>' + years.map((y) => `<option value="${escapeAttr(y)}">${fullYear(y)}</option>`).join('');
}

async function boot() {
  try {
    state.questions = Array.isArray(window.MALDDA_QUESTIONS) ? window.MALDDA_QUESTIONS : [];
    if (!state.questions.length) throw new Error('No question data');
    buildAppearances();
    const rounds = sortRounds(new Set(state.questions.map((q) => q.round)));
    $('#roundSelect').innerHTML = rounds.map((r) => `<option value="${escapeAttr(r)}">${escapeHTML(r)}</option>`).join('');
    $('#dataStatus').textContent = `${rounds.at(-1)} ~ ${rounds[0]} 말따먹기 기출 · ${state.questions.length}개 항목`;
    setupFrequencyOptions();
    setupSetFilters();
    migrateLegacyData();
    selectFrequency(2);
    updateStats();
  } catch (err) {
    console.error(err);
    $('#dataStatus').textContent = '문제 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.';
  }
}

function start(mode, list, label = '') {
  if (!list.length) {
    alert(mode === 'wrong' ? '현재 남아 있는 오답이 없습니다.' : '출제할 문제가 없습니다.');
    return;
  }
  state.mode = mode;
  state.quiz = list;
  state.index = 0;
  state.answers = Array(list.length).fill('');
  state.results = Array(list.length).fill(null);
  state.score = 0;
  state.summaryWrongKeys = [];
  $('#modeLabel').textContent = label || ({ random: '전체 랜덤', frequent: '빈출 문제', wrong: '오답 복습', favorite: '즐겨찾기', set: '학습세트', weak: '취약문제', 'round-explain': '회차별 · 해설모드', 'round-exam': '회차별 · 실전모드' })[mode] || '문제 풀이';
  hidePickers();
  show('quizView');
  renderQuestion();
}

function renderMeta(q) {
  $('#frequencyText').textContent = `${Number(q.frequency || 1)}회`;
  $('#appearancesText').textContent = appearanceText(q);
}
function renderFavoriteButton(q) {
  const on = favorites().has(keyOf(q));
  $('#favoriteButton').textContent = on ? '★' : '☆';
  $('#favoriteButton').classList.toggle('active', on);
  $('#favoriteButton').title = on ? '즐겨찾기 해제' : '즐겨찾기 추가';
}
function toggleFavorite(q) {
  if (!q) return;
  const fav = favorites();
  const key = keyOf(q);
  if (fav.has(key)) fav.delete(key); else fav.add(key);
  store.set('favorites', [...fav]);
  renderFavoriteButton(q);
  updateStats();
}

function renderQuestion() {
  const q = state.quiz[state.index];
  const explainMode = state.mode === 'round-explain';
  $('#roundLabel').textContent = `${q.round} 회차`;
  $('#progressLabel').textContent = `${state.index + 1} / ${state.quiz.length}`;
  $('#meterFill').style.width = `${((state.index + 1) / state.quiz.length) * 100}%`;
  renderMeta(q);
  $('#questionText').textContent = q.question;
  renderFavoriteButton(q);
  $('#explainAnswerBox').classList.toggle('hidden', !explainMode);
  $('#answerArea').classList.toggle('hidden', explainMode);
  $('#explainAnswerText').textContent = explainMode ? q.answer : '';
  $('#answerInput').value = state.answers[state.index] || '';
  $('#answerInput').disabled = false;
  $('#resultBox').className = 'result hidden';
  $('#resultBox').textContent = '';
  $('#afterAnswerActions').classList.add('hidden');
  if (explainMode) {
    $('#submitButton').classList.add('hidden');
    $('#nextButton').classList.remove('hidden');
    $('#nextButton').textContent = state.index === state.quiz.length - 1 ? '학습 완료' : '다음 문제';
  } else {
    $('#submitButton').classList.remove('hidden');
    $('#nextButton').classList.add('hidden');
    $('#nextButton').textContent = state.index === state.quiz.length - 1 ? '결과 보기' : '다음 문제';
  }
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/^\d+\.\s*/, '').replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/(및|와|과|의|을|를|은|는|이|가|에서|으로|로|에|도|만|하다|한다|하기|하는)/g, '').replace(/[^가-힣a-z0-9]/g, '');
}
function tokens(s) {
  return String(s || '').toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').split(/[\s,./:;'"“”‘’\-_/\\\r\n]+/).filter((x) => x.length > 1 && !['의', '을', '를', '은', '는', '이', '가', '과', '와', '및', '에', '에서', '으로', '로', '도', '만', '것'].includes(x));
}
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return .85;
  const A = new Set([...a].slice(0, -1).map((_, i) => a.slice(i, i + 2)));
  const B = new Set([...b].slice(0, -1).map((_, i) => b.slice(i, i + 2)));
  const U = new Set([...A, ...B]);
  return U.size ? [...A].filter((x) => B.has(x)).length / U.size : 0;
}
function variants(item) {
  const out = [item, item.replace(/\([^)]*\)/g, '')];
  (item.match(/\(([^)]*)\)/g) || []).forEach((x) => out.push(x.slice(1, -1)));
  return [...new Set(out.flatMap((x) => x.split('/')).map((x) => x.trim()).filter(Boolean))];
}
function answerItems(text) {
  const lines = String(text || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const numbered = lines.map((x) => x.match(/^\d+\.\s*(.+)$/)?.[1]).filter(Boolean);
  return numbered.length ? [...new Set(numbered)] : String(text || '').replace(/[\r\n]+/g, ',').split(',').map((x) => x.trim()).filter(Boolean);
}
function userItems(text) {
  return String(text || '').replace(/[\r\n/]+/g, ',').split(',').map((x) => x.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}
function requiredCount(question) {
  return Number(String(question || '').match(/(\d+)\s*(?:가지만|가지|개|종류|가지를)/)?.[1]) || null;
}
function grade(q, user) {
  const answers = answerItems(q.answer);
  const users = userItems(user);
  const matched = answers.filter((a) => variants(a).some((v) => users.some((u) => {
    const an = normalize(v), un = normalize(u), at = tokens(v), ut = new Set(tokens(u));
    const overlap = at.length ? at.filter((x) => ut.has(x)).length / at.length : 0;
    const sim = similarity(an, un);
    return sim >= .70 || overlap >= .60 || (sim >= .50 && overlap >= .40);
  })));
  const needed = requiredCount(q.question);
  const target = needed || answers.length;
  const correct = answers.length >= 2 ? matched.length >= target : matched.length > 0;
  return { correct, matched, missed: answers.filter((x) => !matched.includes(x)), count: matched.length, total: target };
}

function logAttempt(q, result, gradeResult, user, countAttempt = true) {
  const all = store.get('log', {});
  all[keyOf(q)] = { result, user, date: new Date().toISOString(), ...gradeResult };
  store.set('log', all);
  if (countAttempt) {
    store.set('solvedCount', store.get('solvedCount', 0) + 1);
    const attempts = store.get('attempts', {});
    const k = keyOf(q);
    const arr = attempts[k] || [];
    arr.push({ correct: result === '정답', date: new Date().toISOString() });
    attempts[k] = arr.slice(-30);
    store.set('attempts', attempts);
  }
}

function submit() {
  const q = state.quiz[state.index];
  const user = $('#answerInput').value;
  state.answers[state.index] = user;
  $('#answerInput').disabled = true;
  $('#submitButton').classList.add('hidden');
  $('#nextButton').classList.remove('hidden');
  if (state.mode === 'round-exam') {
    $('#resultBox').textContent = '답이 저장되었습니다. 정답은 회차 종료 후 한 번에 공개됩니다.';
    $('#resultBox').className = 'result';
    $('#afterAnswerActions').classList.add('hidden');
    return;
  }
  const result = grade(q, user);
  state.results[state.index] = result;
  if (result.correct) state.score += 1;
  logAttempt(q, result.correct ? '정답' : '오답', result, user);
  if (state.mode === 'frequent') markFrequentDone(q);
  $('#afterAnswerActions').classList.remove('hidden');
  $('#resultBox').textContent = result.correct
    ? `정답입니다. (${result.count}/${result.total})`
    : `오답입니다. (${result.count}/${result.total} 맞음)\n\n빠진 항목:\n${result.missed.map((x) => `- ${x}`).join('\n')}\n\n[정답]\n${q.answer}`;
  $('#resultBox').className = `result ${result.correct ? 'ok' : 'no'}`;
}

function next() {
  if (state.index < state.quiz.length - 1) {
    state.index += 1;
    renderQuestion();
  } else {
    finish();
  }
}

function saveSession(scored = true) {
  if (!state.quiz.length) return;
  const sessions = store.get('sessions', []);
  const total = state.quiz.length;
  const correct = scored ? state.results.filter((r) => r?.correct).length : null;
  const wrongKeys = scored ? state.quiz.filter((q, i) => !state.results[i]?.correct).map(keyOf) : [];
  sessions.unshift({
    id: `s-${Date.now()}`,
    date: new Date().toISOString(),
    mode: state.mode,
    label: $('#modeLabel').textContent,
    scored,
    total,
    correct,
    rate: scored ? Math.round(correct / total * 100) : null,
    questionKeys: state.quiz.map(keyOf),
    wrongKeys
  });
  store.set('sessions', sessions.slice(0, 500));
}

function finish() {
  if (state.mode === 'round-explain') {
    saveSession(false);
    $('#summaryMode').textContent = $('#modeLabel').textContent;
    $('#summaryTitle').textContent = '해설 학습 완료';
    $('#summaryScore').textContent = `${state.quiz.length}문제`;
    $('#summaryText').textContent = '선택 회차의 문제와 정답을 모두 확인했습니다.';
    $('#summaryWrongButton').classList.add('hidden');
    $('#roundResults').classList.add('hidden');
    updateStats();
    show('summaryView');
    return;
  }
  if (state.mode === 'round-exam') {
    state.results = state.quiz.map((q, i) => grade(q, state.answers[i]));
    state.score = state.results.filter((r) => r.correct).length;
    state.quiz.forEach((q, i) => {
      const r = state.results[i];
      logAttempt(q, r.correct ? '정답' : '오답', r, state.answers[i]);
    });
  }
  saveSession(true);
  $('#summaryMode').textContent = $('#modeLabel').textContent;
  $('#summaryTitle').textContent = '풀이 완료';
  $('#summaryScore').textContent = `${state.score} / ${state.quiz.length}`;
  $('#summaryText').textContent = `정답률 ${Math.round(state.score / state.quiz.length * 100)}%`;
  state.summaryWrongKeys = state.quiz.filter((q, i) => !state.results[i]?.correct).map(keyOf);
  $('#summaryWrongButton').classList.toggle('hidden', !state.summaryWrongKeys.length);
  const examMode = state.mode === 'round-exam';
  $('#roundResults').classList.toggle('hidden', !examMode);
  if (examMode) {
    $('#roundResults').innerHTML = state.quiz.map((q, i) => `<details class="round-result card"><summary>${i + 1}. ${escapeHTML(q.round)} <span class="tag">${state.results[i].correct ? '정답' : '오답'} ${state.results[i].count}/${state.results[i].total}</span></summary><div class="round-result-body"><b>빈도수</b>\n${Number(q.frequency || 1)}회\n\n<b>출제년도·회차</b>\n${escapeHTML(appearanceText(q))}\n\n<b>문제</b>\n${escapeHTML(q.question)}\n\n<b>내 답</b>\n${escapeHTML(state.answers[i] || '(미입력)')}\n\n<b>정답</b>\n${escapeHTML(q.answer)}</div></details>`).join('');
  }
  updateStats();
  show('summaryView');
}

function manualCorrect() {
  const q = state.quiz[state.index];
  const prev = state.results[state.index];
  logAttempt(q, '정답', { correct: true, count: 1, total: 1 }, state.answers[state.index] || $('#answerInput').value, false);
  if (prev && !prev.correct) {
    state.results[state.index] = { ...prev, correct: true };
    state.score += 1;
  }
  const mem = [...memorized()].filter((x) => x !== keyOf(q));
  store.set('memorized', mem);
  alert('정답으로 기록했습니다.');
  updateStats();
}
function markMemorized() {
  const q = state.quiz[state.index];
  const mem = memorized();
  mem.add(keyOf(q));
  store.set('memorized', [...mem]);
  alert('암기완료 처리했습니다.');
  updateStats();
}

function questionOption(q, i, checked = false) {
  return `<label class="question-option"><input type="checkbox" data-list-index="${i}" ${checked ? 'checked' : ''}><span class="qtext">${escapeHTML(q.question)}</span><span class="qmeta">${Number(q.frequency || 1)}회${favorites().has(keyOf(q)) ? ' ★' : ''}</span></label>`;
}
function openListPicker(mode, questions, title) {
  state.listMode = mode;
  state.listQuestions = questions;
  $('#listPickerTitle').textContent = title;
  $('#selectableQuestionList').innerHTML = questions.length ? questions.map((q, i) => questionOption(q, i, true)).join('') : '<div class="empty-state">해당 문제가 없습니다.</div>';
  hidePickers();
  $('#listPicker').classList.remove('hidden');
  updateSelectedCount();
}
function selectedListQuestions() {
  return [...document.querySelectorAll('#selectableQuestionList input[data-list-index]:checked')].map((el) => state.listQuestions[Number(el.dataset.listIndex)]).filter(Boolean);
}
function updateSelectedCount() { $('#selectedCountText').textContent = `선택 ${selectedListQuestions().length}문제`; }

function openSetModal(existing = null) {
  state.editingSetId = existing?.id || null;
  state.setSelection = new Set(existing?.questionKeys || []);
  $('#setNameInput').value = existing?.name || '';
  $('#setSearchInput').value = '';
  $('#setFrequencyFilter').value = '1';
  $('#setStatusFilter').value = 'all';
  $('#setYearFilter').value = 'all';
  $('#setModalTitle').textContent = existing ? '학습세트 수정' : '학습세트 만들기';
  $('#setModal').classList.remove('hidden');
  renderSetQuestionList();
}
function filteredSetQuestions() {
  const min = Number($('#setFrequencyFilter').value || 1);
  const status = $('#setStatusFilter').value;
  const year = $('#setYearFilter').value;
  const search = $('#setSearchInput').value.trim().toLowerCase();
  const fav = favorites();
  const wrong = new Set(activeWrongs().map(keyOf));
  const mem = memorized();
  return state.questions.filter((q) => {
    const k = keyOf(q);
    if (Number(q.frequency || 1) < min) return false;
    if (year !== 'all' && !appearancesOf(q).some((r) => roundYearCode(r) === year)) return false;
    if (search && !String(q.question).toLowerCase().includes(search)) return false;
    if (status === 'favorite' && !fav.has(k)) return false;
    if (status === 'wrong' && !wrong.has(k)) return false;
    if (status === 'memorized' && !mem.has(k)) return false;
    if (status === 'normal' && (fav.has(k) || wrong.has(k) || mem.has(k))) return false;
    return true;
  });
}
function renderSetQuestionList() {
  const list = filteredSetQuestions();
  $('#setQuestionList').innerHTML = list.map((q) => {
    const k = keyOf(q);
    return `<label class="question-option"><input type="checkbox" data-set-key="${escapeAttr(k)}" ${state.setSelection.has(k) ? 'checked' : ''}><span class="qtext">${escapeHTML(q.question)}</span><span class="qmeta">${Number(q.frequency || 1)}회${favorites().has(k) ? ' ★' : ''}</span></label>`;
  }).join('') || '<div class="empty-state">조건에 맞는 문제가 없습니다.</div>';
  $('#setSelectedCount').textContent = `선택 ${state.setSelection.size}문제`;
}
function syncSetSelection() {
  document.querySelectorAll('#setQuestionList input[data-set-key]').forEach((el) => {
    if (el.checked) state.setSelection.add(el.dataset.setKey); else state.setSelection.delete(el.dataset.setKey);
  });
  $('#setSelectedCount').textContent = `선택 ${state.setSelection.size}문제`;
}
function saveStudySet() {
  syncSetSelection();
  const name = $('#setNameInput').value.trim();
  if (!name) return alert('학습세트 이름을 입력해 주세요.');
  if (!state.setSelection.size) return alert('문제를 1개 이상 선택해 주세요.');
  const sets = store.get('studySets', []);
  if (state.editingSetId) {
    const s = sets.find((x) => x.id === state.editingSetId);
    if (s) {
      s.name = name;
      s.questionKeys = [...state.setSelection];
      s.updatedAt = new Date().toISOString();
    }
  } else {
    sets.push({ id: `set-${Date.now()}`, name, questionKeys: [...state.setSelection], createdAt: new Date().toISOString() });
  }
  store.set('studySets', sets);
  $('#setModal').classList.add('hidden');
  renderPanel('sets');
}

function weakQuestionKeys() {
  const attempts = store.get('attempts', {});
  const out = [];
  Object.entries(attempts).forEach(([k, arr]) => {
    if (!Array.isArray(arr) || arr.length < 3) return;
    const last = arr.slice(-3);
    if (last.filter((x) => !x.correct).length >= 2) out.push(k);
  });
  return out.filter((k) => byKey(k));
}

function renderPanel(type) {
  $('#panelTitle').textContent = ({ sets: '나만의 학습세트', stats: '학습 통계', history: '시험 이력', daily: '일별 학습' })[type];
  if (type === 'sets') renderSetsPanel();
  if (type === 'stats') renderStatsPanel();
  if (type === 'history') renderHistoryPanel();
  if (type === 'daily') renderDailyPanel();
  show('panelView');
}
function renderSetsPanel() {
  const sets = store.get('studySets', []);
  const weak = weakQuestionKeys();
  let html = `<div class="weak-set"><div class="row-title">⚡ 취약문제 <span class="chip">자동</span></div><div class="row-sub">3회 이상 풀어본 문제 중 최근 3회에서 2회 이상 오답 · ${weak.length}문제</div>${weak.length ? '<button class="primary wide" data-run-weak type="button">취약문제 풀기</button>' : ''}</div><div class="card panel-card"><div class="picker-head"><h3>내 학습세트</h3><button class="small-button" data-new-set type="button">+ 새 세트</button></div>`;
  html += sets.length ? sets.map((s) => `<div class="set-row"><div class="row-main"><div class="row-title">${escapeHTML(s.name)}</div><div class="row-sub">${s.questionKeys.filter((k) => byKey(k)).length}문제</div></div><div class="row-actions"><button data-run-set="${escapeAttr(s.id)}">풀기</button><button data-edit-set="${escapeAttr(s.id)}">수정</button><button data-delete-set="${escapeAttr(s.id)}">삭제</button></div></div>`).join('') : '<div class="empty-state">아직 만든 학습세트가 없습니다.</div>';
  $('#panelContent').innerHTML = html + '</div>';
}

function localDateKey(iso) {
  const d = new Date(iso);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function formatDateTime(iso) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function sessionStats() {
  const sessions = store.get('sessions', []);
  const scored = sessions.filter((s) => s.scored !== false && Number.isFinite(Number(s.correct)));
  const total = scored.reduce((a, s) => a + Number(s.total || 0), 0);
  const correct = scored.reduce((a, s) => a + Number(s.correct || 0), 0);
  const avg = total ? Math.round(correct / total * 100) : 0;
  const best = scored.length ? Math.max(...scored.map((s) => Number(s.rate || 0))) : 0;
  const daySet = new Set(sessions.map((s) => localDateKey(s.date)));
  Object.values(store.get('log', {})).forEach((v) => { if (v?.date) daySet.add(localDateKey(v.date)); });
  return { sessions, scored, avg, best, days: daySet.size };
}
function barRow(label, value) {
  return `<div class="bar-line"><b>${label}</b><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, Math.min(100, value))}%"></div></div><strong>${value}%</strong></div>`;
}
function renderStatsPanel() {
  const s = sessionStats();
  const mem = memorized().size;
  const solved = store.get('solvedCount', 0);
  $('#panelContent').innerHTML = `<div class="stat-grid"><div class="stat-box"><span>총 풀이</span><strong>${solved}</strong></div><div class="stat-box"><span>학습 일수</span><strong>${s.days}</strong></div><div class="stat-box"><span>평균 정답률</span><strong>${s.avg}%</strong></div><div class="stat-box"><span>최고 정답률</span><strong>${s.best}%</strong></div><div class="stat-box"><span>현재 오답</span><strong>${activeWrongs().length}</strong></div><div class="stat-box"><span>즐겨찾기</span><strong>${favorites().size}</strong></div><div class="stat-box"><span>확실히 암기</span><strong>${mem}</strong></div></div><div class="card panel-card compare-bars"><h3>정답률 비교</h3>${barRow('평균', s.avg)}${barRow('최고', s.best)}<p class="muted">평균·최고 정답률은 이번 업데이트 이후 완료한 채점형 풀이 세션부터 계산됩니다.</p></div>`;
}
function renderHistoryPanel() {
  const sessions = store.get('sessions', []).filter((s) => s.scored !== false);
  $('#panelContent').innerHTML = `<div class="card panel-card">${sessions.length ? sessions.map((s) => `<div class="history-row"><div class="row-main"><div class="row-title">${formatDateTime(s.date)} · ${escapeHTML(s.label || s.mode)}</div><div class="row-sub">${s.correct}/${s.total} · ${s.rate}%</div></div><div class="row-actions">${s.wrongKeys?.length ? `<button data-history-wrongs="${escapeAttr(s.id)}">틀린 문제</button>` : ''}</div></div>`).join('') : '<div class="empty-state">아직 저장된 시험 이력이 없습니다.</div>'}</div><p class="muted">시험 이력은 이번 업데이트 이후 완료한 채점형 풀이부터 저장됩니다.</p>`;
}
function dailyData() {
  const sessions = store.get('sessions', []);
  const map = {};
  sessions.forEach((s) => {
    const k = localDateKey(s.date);
    if (!map[k]) map[k] = { date: k, total: 0, scoredTotal: 0, correct: 0 };
    map[k].total += Number(s.total || 0);
    if (s.scored !== false) {
      map[k].scoredTotal += Number(s.total || 0);
      map[k].correct += Number(s.correct || 0);
    }
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-14).map((x) => ({ ...x, rate: x.scoredTotal ? Math.round(x.correct / x.scoredTotal * 100) : null }));
}
function chartHTML(data, key, max, suffix = '') {
  if (!data.length) return '<div class="empty-state">그래프를 만들 학습기록이 없습니다.</div>';
  return `<div class="daily-chart">${data.map((d) => {
    const raw = d[key];
    const hasValue = raw !== null && raw !== undefined;
    const v = hasValue ? Number(raw) : 0;
    const h = hasValue && max ? Math.max(2, Math.round(v / max * 135)) : 2;
    return `<div class="day-bar-wrap"><span class="day-value">${hasValue ? `${v}${suffix}` : '—'}</span><div class="day-bar${hasValue ? '' : ' empty-bar'}" style="height:${h}px"></div><span class="day-label">${d.date.slice(5).replace('-', '/')}</span></div>`;
  }).join('')}</div>`;
}
function renderDailyPanel() {
  const data = dailyData();
  const maxTotal = Math.max(1, ...data.map((d) => d.total));
  $('#panelContent').innerHTML = `<div class="card panel-card"><h3>일별 학습량</h3>${chartHTML(data, 'total', maxTotal)}</div><div class="card panel-card"><h3>일별 정답률</h3>${chartHTML(data, 'rate', 100, '%')}</div><p class="muted">최근 최대 14일을 표시합니다. 해설모드는 학습량에는 포함되지만 정답률에는 포함되지 않습니다.</p>`;
}

document.addEventListener('click', (e) => {
  const modeBtn = e.target.closest('.mode-card[data-mode]');
  if (modeBtn) {
    const mode = modeBtn.dataset.mode;
    hidePickers();
    if (mode === 'random') { $('#randomPicker').classList.remove('hidden'); return; }
    if (mode === 'frequent') { selectFrequency(state.frequentThreshold); $('#frequentPicker').classList.remove('hidden'); return; }
    if (mode === 'wrong') { openListPicker('wrong', activeWrongs(), '오답 선택'); return; }
    if (mode === 'favorite') { openListPicker('favorite', favoriteQuestions(), '즐겨찾기 선택'); return; }
    if (mode === 'round') { $('#roundPicker').classList.remove('hidden'); return; }
  }
  const panelBtn = e.target.closest('.mode-card[data-panel]');
  if (panelBtn) { renderPanel(panelBtn.dataset.panel); return; }
  if (e.target.closest('.close-picker')) { hidePickers(); return; }
  const countBtn = e.target.closest('[data-count]');
  if (countBtn) {
    document.querySelectorAll('[data-count]').forEach((b) => b.classList.remove('selected'));
    countBtn.classList.add('selected');
    $('#randomCountInput').value = countBtn.dataset.count === 'all' ? state.questions.length : countBtn.dataset.count;
  }
  const freqBtn = e.target.closest('[data-frequency]');
  if (freqBtn) selectFrequency(Number(freqBtn.dataset.frequency));
  if (e.target.closest('[data-new-set]')) openSetModal();
  const runSet = e.target.closest('[data-run-set]');
  if (runSet) {
    const set = store.get('studySets', []).find((s) => s.id === runSet.dataset.runSet);
    if (set) start('set', set.questionKeys.map(byKey).filter(Boolean), set.name);
  }
  const editSet = e.target.closest('[data-edit-set]');
  if (editSet) {
    const set = store.get('studySets', []).find((s) => s.id === editSet.dataset.editSet);
    if (set) openSetModal(set);
  }
  const delSet = e.target.closest('[data-delete-set]');
  if (delSet && confirm('이 학습세트를 삭제할까요?')) {
    store.set('studySets', store.get('studySets', []).filter((s) => s.id !== delSet.dataset.deleteSet));
    renderSetsPanel();
  }
  if (e.target.closest('[data-run-weak]')) start('weak', weakQuestionKeys().map(byKey).filter(Boolean), '취약문제');
  const hist = e.target.closest('[data-history-wrongs]');
  if (hist) {
    const s = store.get('sessions', []).find((x) => x.id === hist.dataset.historyWrongs);
    if (s) {
      show('homeView');
      openListPicker('wrong', s.wrongKeys.map(byKey).filter(Boolean), '이 시험에서 틀린 문제');
    }
  }
});

document.addEventListener('change', (e) => {
  if (e.target.matches('#selectableQuestionList input[data-list-index]')) updateSelectedCount();
  if (e.target.matches('#setQuestionList input[data-set-key]')) syncSetSelection();
  if (e.target.matches('#setFrequencyFilter,#setStatusFilter,#setYearFilter')) {
    syncSetSelection();
    renderSetQuestionList();
  }
});
$('#setSearchInput').addEventListener('input', () => { syncSetSelection(); renderSetQuestionList(); });
$('#randomCountInput').addEventListener('input', () => document.querySelectorAll('[data-count]').forEach((b) => b.classList.remove('selected')));

$('#startRandomButton').onclick = () => {
  const n = Math.max(1, Math.min(state.questions.length, Number($('#randomCountInput').value) || 12));
  $('#randomCountInput').value = n;
  start('random', shuffle(state.questions).slice(0, n), `랜덤 ${n}문제`);
};
$('#continueFrequentButton').onclick = () => {
  const all = frequentQuestions();
  const done = new Set(frequentProgress(state.frequentThreshold));
  const remaining = all.filter((q) => !done.has(keyOf(q)));
  if (!remaining.length) return alert('선택한 빈출 범위를 모두 풀었습니다. 처음부터 풀기를 선택해 주세요.');
  start('frequent', remaining, `빈출 ${state.frequentThreshold}회 이상`);
};
$('#restartFrequentButton').onclick = () => {
  resetFrequentProgress(state.frequentThreshold);
  start('frequent', frequentQuestions(), `빈출 ${state.frequentThreshold}회 이상`);
};
$('#startRoundExplainButton').onclick = () => {
  const round = $('#roundSelect').value;
  start('round-explain', state.questions.filter((q) => q.round === round), `${round} · 해설모드`);
};
$('#startRoundExamButton').onclick = () => {
  const round = $('#roundSelect').value;
  start('round-exam', state.questions.filter((q) => q.round === round), `${round} · 실전모드`);
};
$('#selectAllButton').onclick = () => {
  document.querySelectorAll('#selectableQuestionList input[type="checkbox"]').forEach((x) => x.checked = true);
  updateSelectedCount();
};
$('#clearAllButton').onclick = () => {
  document.querySelectorAll('#selectableQuestionList input[type="checkbox"]').forEach((x) => x.checked = false);
  updateSelectedCount();
};
$('#startSelectedButton').onclick = () => {
  const list = selectedListQuestions();
  if (!list.length) return alert('문제를 1개 이상 선택해 주세요.');
  start(state.listMode, list, state.listMode === 'favorite' ? '즐겨찾기' : '오답 복습');
};
$('#submitButton').onclick = submit;
$('#nextButton').onclick = next;
$('#favoriteButton').onclick = () => toggleFavorite(state.quiz[state.index]);
$('#correctButton').onclick = manualCorrect;
$('#memorizedButton').onclick = markMemorized;
$('#backButton').onclick = () => { updateStats(); show('homeView'); };
$('#summaryHomeButton').onclick = () => { updateStats(); show('homeView'); };
$('#panelBackButton').onclick = () => { updateStats(); show('homeView'); };
$('#summaryWrongButton').onclick = () => {
  show('homeView');
  openListPicker('wrong', state.summaryWrongKeys.map(byKey).filter(Boolean), '이번 풀이의 오답');
};
$('#closeSetModal').onclick = () => $('#setModal').classList.add('hidden');
$('#saveSetButton').onclick = saveStudySet;
$('#setSelectAllButton').onclick = () => {
  syncSetSelection();
  filteredSetQuestions().forEach((q) => state.setSelection.add(keyOf(q)));
  renderSetQuestionList();
};
$('#setClearButton').onclick = () => { state.setSelection.clear(); renderSetQuestionList(); };
$('#resetButton').onclick = () => {
  if (confirm('이 기기의 오답·빈출 진도·즐겨찾기·학습세트·시험이력·통계를 모두 초기화할까요?')) {
    ['log', 'memorized', 'frequentDone', 'frequentDoneByThreshold', 'solvedCount', 'favorites', 'studySets', 'attempts', 'sessions', 'uxMigration20260830'].forEach((x) => store.remove(x));
    updateStats();
    hidePickers();
    alert('학습기록을 초기화했습니다.');
  }
};

boot();