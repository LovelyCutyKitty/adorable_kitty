(() => {
  const baseSubmit = submit;

  submit = function submitWithCorrectAnswer() {
    baseSubmit();

    // 회차 실전모드는 회차 종료 전까지 정답을 공개하지 않는다.
    if (state.mode === 'round-exam') return;

    const q = state.quiz[state.index];
    const result = state.results[state.index];
    if (!q || !result?.correct) return;

    const box = $('#resultBox');
    if (!box) return;
    box.innerHTML = `<h3>정답입니다. (${result.count}/${result.total})</h3><div class="answer-block"><b>정답</b><pre>${esc(q.answer)}</pre></div>`;
  };

  $('#submitButton').onclick = submit;
})();
