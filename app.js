const $ = (s) => document.querySelector(s);

const state = {
  questions: [],
  quiz: [],
  index: 0,
  mode: '',
  answers: [],
  results: [],
  score: 0
};

const PREFIX = 'materials-maldda-v2-';
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }
};

const keyOf = (q) => `row-${q.id}`;

async function loadQuestionData() {
  if (Array.isArray(window.MALDDA_QUESTIONS) && window.MALDDA_QUESTIONS.length) {
    return window.MALDDA_QUESTIONS;
  }
  if (!window.MALDDA_DATA_GZIP_B64) return [];
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('gzip decoding unsupported');
  }
  const binary = atob(window.MALDDA_DATA_GZIP_B64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [];
}

function sortRounds(rounds) {
  return [...rounds].sort((a, b) => {
    const [ay, ar] = String(a).split('-').map(Number);
    const [by, br] = String(b).split('-').map(Number);
    return by - ay || br - ar;
  });
}

async function boot() {
  try {
    state.questions = await loadQuestionData();
    if (!state.questions.length) throw new Error('No question data');

    const rounds = sortRounds(new Set(state.questions.map((q) => q.round)));
    $('#roundSelect').innerHTML = rounds
      .map((r) => `<option value="${escapeAttr(r)}">${escapeHTML(r)}</option>`)
      .join('');

    $('#dataStatus').textContent =
      `${rounds.at(-1)} ~ ${rounds[0]} · 엑셀 대문항 ${state.questions.length}개`;

    $('#uniqueCount').textContent = state.questions.length;
    updateStats();
  } catch (err) {
    console.error(err);
    $('#dataStatus').textContent = '문제 데이터를 불러오지 못했습니다. 파일을 다시 확인하세요.';
  }
}

function show(name) {
  ['homeView', 'quizView', 'summaryView'].forEach((id) => {
    $(`#${id}`).classList.toggle('hidden', id !== name);
  });
}

function updateStats() {
  $('#wrongCount').textContent = activeWrongs().length;
  $('#solvedCount').textContent = `${store.get('solvedCount', 0).toLocaleString()}문제`;
  $('#uniqueCount').textContent = state.questions.length;
}

function activeWrongs() {
  const log = store.get('log', {});
  const memorized = new Set(store.get('memorized', []));
  return state.questions.filter((q) =>
    log[keyOf(q)]?.result === '오답' && !memorized.has(keyOf(q))
  );
}

function frequentQuestions() {
  return [...state.questions]
    .filter((q) => Number(q.frequency || 1) >= 2)
    .sort((a, b) =>
      Number(b.frequency || 1) - Number(a.frequency || 1) ||
      Number(a.id) - Number(b.id)
    );
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function start(mode, list) {
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

  $('#modeLabel').textContent = ({
    random: '전체 랜덤',
    frequent: '빈출 문제',
    wrong: '누적 오답',
    round: '회차 모드'
  })[mode];

  show('quizView');
  renderQuestion();
}

function renderMeta(q) {
  $('#frequencyText').textContent = q.frequencyText || `${q.frequency || 1}회`;
  $('#appearancesText').textContent = q.appearances || q.round;
}

function renderQuestion() {
  const q = state.quiz[state.index];
  const roundMode = state.mode === 'round';

  $('#roundLabel').textContent = `${q.round} 회차`;
  $('#progressLabel').textContent = `${state.index + 1} / ${state.quiz.length}`;
  $('#meterFill').style.width = `${((state.index + 1) / state.quiz.length) * 100}%`;

  renderMeta(q);
  $('#questionText').textContent = q.question;
  $('#answerInput').value = state.answers[state.index] || '';
  $('#answerInput').disabled = false;

  $('#submitButton').classList.remove('hidden');
  $('#nextButton').classList.add('hidden');
  $('#resultBox').className = 'result hidden';
  $('#afterAnswerActions').classList.add('hidden');

  if (roundMode) {
    $('#resultBox').textContent =
      '답을 입력하고 제출하세요. 정답은 회차 종료 후 한 번에 공개됩니다.';
  }
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
    .replace(/(및|와|과|의|을|를|은|는|이|가|에서|으로|로|에|도|만|하다|한다|하기|하는)/g, '')
    .replace(/[^가-힣a-z0-9]/g, '');
}

function tokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .split(/[\s,./:;'"“”‘’\-_/\\\r\n]+/)
    .filter((x) =>
      x.length > 1 &&
      !['의','을','를','은','는','이','가','과','와','및','에','에서','으로','로','도','만','것'].includes(x)
    );
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;

  const A = new Set([...a].slice(0, -1).map((_, i) => a.slice(i, i + 2)));
  const B = new Set([...b].slice(0, -1).map((_, i) => b.slice(i, i + 2)));
  const U = new Set([...A, ...B]);
  return U.size ? [...A].filter((x) => B.has(x)).length / U.size : 0;
}

function variants(item) {
  const out = [item, item.replace(/\([^)]*\)/g, '')];
  (item.match(/\(([^)]*)\)/g) || []).forEach((x) => out.push(x.slice(1, -1)));
  return [...new Set(
    out.flatMap((x) => x.split('/')).map((x) => x.trim()).filter(Boolean)
  )];
}

function answerItems(text) {
  const lines = String(text || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const numbered = lines
    .map((x) => x.match(/^\d+\.\s*(.+)$/)?.[1])
    .filter(Boolean);

  if (numbered.length) return [...new Set(numbered)];

  const meaningful = lines.filter((x) => !/^[가-하]\.$/.test(x));
  return meaningful.length > 1
    ? meaningful
    : String(text || '').replace(/[\r\n]+/g, ',').split(',').map((x) => x.trim()).filter(Boolean);
}

function userItems(text) {
  return String(text || '')
    .replace(/[\r\n/]+/g, ',')
    .split(',')
    .map((x) => x.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

function requiredCount(question) {
  return Number(
    String(question || '').match(/(\d+)\s*(?:가지만|가지|개|종류|가지를)/)?.[1]
  ) || null;
}

function grade(q, user) {
  const answers = answerItems(q.answer);
  const users = userItems(user);

  const matched = answers.filter((a) =>
    variants(a).some((v) =>
      users.some((u) => {
        const an = normalize(v);
        const un = normalize(u);
        const at = tokens(v);
        const ut = new Set(tokens(u));
        const overlap = at.length ? at.filter((x) => ut.has(x)).length / at.length : 0;
        const sim = similarity(an, un);
        return sim >= 0.70 || overlap >= 0.60 || (sim >= 0.50 && overlap >= 0.40);
      })
    )
  );

  const needed = requiredCount(q.question);
  const target = needed || answers.length;
  const total = Math.min(target, Math.max(1, answers.length));
  const correct = answers.length >= 2
    ? matched.length >= total
    : matched.length > 0;

  return {
    correct,
    matched,
    missed: answers.filter((x) => !matched.includes(x)),
    count: matched.length,
    total
  };
}

function logAttempt(q, result, gradeResult, user, countAttempt = true) {
  const all = store.get('log', {});
  all[keyOf(q)] = {
    result,
    user,
    date: new Date().toISOString(),
    ...gradeResult
  };
  store.set('log', all);

  if (countAttempt) {
    store.set('solvedCount', store.get('solvedCount', 0) + 1);
  }
}

function submit() {
  const q = state.quiz[state.index];
  const user = $('#answerInput').value;
  state.answers[state.index] = user;

  $('#answerInput').disabled = true;
  $('#submitButton').classList.add('hidden');
  $('#nextButton').classList.remove('hidden');
  $('#afterAnswerActions').classList.remove('hidden');

  if (state.mode === 'round') {
    $('#resultBox').textContent =
      '답이 저장되었습니다. 회차 종료 후 정답과 판정이 공개됩니다.';
    $('#resultBox').className = 'result';
    return;
  }

  const result = grade(q, user);
  state.results[state.index] = result;
  if (result.correct) state.score += 1;

  logAttempt(q, result.correct ? '정답' : '오답', result, user);

  if (state.mode === 'frequent') {
    const done = store.get('frequentDone', []);
    if (!done.includes(keyOf(q))) {
      store.set('frequentDone', [...done, keyOf(q)]);
    }
  }

  const text = result.correct
    ? `정답입니다. (${result.count}/${result.total})`
    : `오답입니다. (${result.count}/${result.total} 맞음)\n\n빠진 항목:\n${result.missed.map((x) => `- ${x}`).join('\n')}\n\n[정답]\n${q.answer}`;

  $('#resultBox').textContent = text;
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

function finish() {
  if (state.mode === 'round') {
    state.results = state.quiz.map((q, i) => grade(q, state.answers[i]));
    state.score = state.results.filter((r) => r.correct).length;

    state.quiz.forEach((q, i) => {
      const r = state.results[i];
      logAttempt(q, r.correct ? '정답' : '오답', r, state.answers[i]);
    });
  }

  $('#summaryMode').textContent = $('#modeLabel').textContent;
  $('#summaryScore').textContent = `${state.score} / ${state.quiz.length}`;
  $('#summaryText').textContent =
    `정답률 ${Math.round((state.score / state.quiz.length) * 100)}%`;

  $('#roundResults').classList.toggle('hidden', state.mode !== 'round');

  if (state.mode === 'round') {
    $('#roundResults').innerHTML = state.quiz.map((q, i) => `
      <details class="round-result card">
        <summary>
          ${i + 1}. ${escapeHTML(q.round)}
          <span class="tag">
            ${state.results[i].correct ? '정답' : '오답'}
            ${state.results[i].count}/${state.results[i].total}
          </span>
        </summary>
        <p><b>빈도수</b>
${escapeHTML(q.frequencyText || `${q.frequency || 1}회`)}

<b>출제년도·회차</b>
${escapeHTML(q.appearances || q.round)}

<b>문제</b>
${escapeHTML(q.question)}

<b>내 답</b>
${escapeHTML(state.answers[i] || '(미입력)')}

<b>정답</b>
${escapeHTML(q.answer)}</p>
      </details>
    `).join('');
  }

  updateStats();
  show('summaryView');
}

function escapeHTML(s) {
  return String(s || '').replace(/[&<>]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  })[c]);
}

function escapeAttr(s) {
  return String(s || '').replace(/[&"<>]/g, (c) => ({
    '&': '&amp;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;'
  })[c]);
}

function manual(result) {
  const q = state.quiz[state.index];
  const user = state.answers[state.index] || $('#answerInput').value;

  logAttempt(q, result, { correct: result === '정답', count: 1, total: 1 }, user, false);

  if (result === '정답') {
    const memorized = store.get('memorized', []).filter((x) => x !== keyOf(q));
    store.set('memorized', memorized);
    alert('정답으로 기록했습니다.');
  } else {
    const memorized = store.get('memorized', []);
    if (!memorized.includes(keyOf(q))) {
      store.set('memorized', [...memorized, keyOf(q)]);
    }
    alert('암기완료 처리했습니다.');
  }
  updateStats();
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('.mode-card');
  const mode = button?.dataset.mode;
  if (!mode) return;

  if (mode === 'random') {
    start(mode, shuffle(state.questions).slice(0, 12));
  }

  if (mode === 'frequent') {
    const done = new Set(store.get('frequentDone', []));
    const all = frequentQuestions();
    const remaining = all.filter((q) => !done.has(keyOf(q)));
    start(mode, remaining.length ? remaining : all);
  }

  if (mode === 'wrong') {
    start(mode, activeWrongs());
  }

  if (mode === 'round') {
    $('#roundPicker').classList.remove('hidden');
  }
});

$('#startRoundButton').onclick = () => {
  const round = $('#roundSelect').value;
  start('round', state.questions.filter((q) => q.round === round));
};
$('#submitButton').onclick = submit;
$('#nextButton').onclick = next;
$('#backButton').onclick = () => {
  updateStats();
  show('homeView');
};
$('#summaryHomeButton').onclick = () => show('homeView');
$('#correctButton').onclick = () => manual('정답');
$('#memorizedButton').onclick = () => manual('암기');
$('#resetButton').onclick = () => {
  if (confirm('이 기기의 오답·빈출 진도·누적 풀이를 모두 초기화할까요?')) {
    ['log', 'memorized', 'frequentDone', 'solvedCount']
      .forEach((x) => localStorage.removeItem(PREFIX + x));
    updateStats();
  }
};

boot();
