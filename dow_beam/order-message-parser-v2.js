/* Parse Kakao order text before legacy parsers receive the click. */
(() => {
  const categoryByCode = { S1: 'S1 레진빔', S2: 'S2 프레스빔', S3: 'S3 레드빔', B1: 'B1 튜브형 본드', B2: 'B2 카트리지형 본드', W1: 'W1 왁스', CB: 'CB 카본', MB: 'MB 마보' };
  const aliases = [
    [/^성진(?:세미테크)?(?:\s+.*)?$/i, '성진세미테크'],
    [/^에스엠지(?:\s+.*)?$/i, '에스엠지머티리얼즈'],
    [/^비씨앤?씨(?:\s+.*)?$/i, '비씨엔씨'],
    [/^에이엠테크(?:\s+.*)?$/i, '에이엠테크'],
    [/^실트로닉\s*-?\s*독일(?:\s+.*)?$/i, '실트로닉-독일'],
    [/^실트로닉\s*-?\s*싱가폴(?:\s+.*)?$/i, '실트로닉-싱가폴'],
  ];
  const escText = (value) => String(value || '').replace(/\s*[＊*×]\s*/g, ' × ').replace(/\s+/g, ' ').trim();
  const unitFor = (code, fallback) => code === 'CB' ? '장' : fallback || '개';
  const dateFromText = (value) => {
    const m = value.match(/(?:^|\s)(?:(\d{2})[./-])?(\d{1,2})[./-](\d{1,2})(?:\s|$)/);
    if (!m) return '';
    const year = m[1] ? 2000 + Number(m[1]) : new Date().getFullYear();
    return `${year}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  };
  const codeIn = (text, current) => {
    const direct = text.match(/(?:^|\s)(S[123]|B[12]|W1|CB|MB)\s*(?:[-:]|\b)/i);
    if (direct) return direct[1].toUpperCase();
    if (/카트리지|1%\s*본드/i.test(text)) return 'B2';
    if (/200\s*ml/i.test(text)) return 'B2';
    if (/튜브\s*본드|본드\s*튜브/i.test(text)) return 'B1';
    if (/400\s*ml/i.test(text)) return 'B1';
    if (/왁스/i.test(text)) return 'W1';
    if (/카본/i.test(text)) return 'CB';
    if (/FLAT|조각빔|가이드빔|쫄대빔/i.test(text)) return current || 'S1';
    return current;
  };
  const companyName = (raw) => {
    let name = raw.replace(/[（(].*?[)）]/g, '').trim();
    name = name.replace(/\b(S[123]|B[12]|W1|CB|MB)\b.*$/i, '').replace(/[-–:]\s*$/, '').trim();
    for (const [pattern, replacement] of aliases) if (pattern.test(name)) return replacement;
    return name;
  };
  const specFrom = (before, code, fallback) => {
    let spec = before
      .replace(/^\s*(S[123]|B[12]|W1|CB|MB)\s*[-:]?\s*/i, '')
      .replace(/^\s*(?:제작\s*)?수량\s*[:=-]?\s*/i, '')
      .replace(/\([^)]*(?:포장|주문|발주처)[^)]*\)/g, '')
      .replace(/(?:우일|동방카본)\s*(?:이)?\s*(?:주문|발주).*$/i, '')
      .replace(/->/g, ' ')
      .trim();
    if (/^\d{2}[./-]\d{1,2}[./-]\d{1,2}$/.test(spec)) spec = '';
    return escText(spec || fallback || '규격 확인 필요');
  };
  const defaultSpec = (text, code) => {
    if (code === 'B2' && /1%|카트리지/i.test(text)) return '1% 카트리지 200ml';
    if (code === 'B1') return '튜브형 본드';
    if (code === 'W1') return '왁스';
    if (code === 'CB') return '카본';
    return '';
  };

  function parseMessage(raw) {
    const rows = [], notes = [];
    let company = '', code = '', fallbackSpec = '', defaultDue = '';
    const lines = String(raw || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
    for (const original of lines) {
      let line = original.replace(/^[-•]\s*/, '').trim();
      const header = line.match(/^(.+?)\s*발주요\b/i);
      if (header) {
        company = companyName(header[1]);
        code = codeIn(line, code);
        fallbackSpec = defaultSpec(line, code) || fallbackSpec;
        continue;
      }
      const statedDue = dateFromText(line);
      if (/출하희망일|납기|배송\s*요청|발송.*(?:월요일|화요일|수요일|목요일|금요일)/.test(line) && !/\d+(?:\.\d+)?\s*(?:개|kg|세트|장)/i.test(line)) {
        defaultDue = statedDue || defaultDue;
        notes.push(line);
        continue;
      }
      const nextCode = codeIn(line, code);
      if (nextCode !== code) {
        code = nextCode;
        fallbackSpec = defaultSpec(line, code) || fallbackSpec;
      }
      const quantity = line.match(/(?:=|:|(?<!\d)-)\s*(\d+(?:\.\d+)?)\s*(개|kg|세트|장)\b/i);
      if (!quantity || /도합|합계|노즐|박스/.test(line)) {
        if (!/^(?:S[123]|B[12]|W1|CB|MB)\s*[-:]?\s*$/i.test(line) && !/^[\d"'×* .wWtTlLrRcC/]+$/i.test(line)) notes.push(line);
        continue;
      }
      if (!code) {
        notes.push(line);
        continue;
      }
      const before = line.slice(0, quantity.index).replace(/[=:\-\s]+$/, '');
      const rowDue = statedDue || defaultDue;
      rows.push({
        id: id(), code, name: code, category: '기타·미분류', kind: '',
        spec: specFrom(before, code, fallbackSpec), quantity: n(quantity[1]),
        unit: unitFor(code, quantity[2]), dueDate: rowDue, planned: 0, orderProduced: 0, shipped: 0, unmatched: true,
      });
    }
    return { company, rows, notes };
  }

  function draw(rows) {
    const head = document.querySelector('#lineEditor .line-head');
    if (head) head.innerHTML = '<span>제품 코드</span><span>제품 규격</span><span>수량</span><span>제품별 납기</span>';
    document.querySelector('#parsedLines').innerHTML = rows.map((row, index) => `<div class="edit-line"><input data-f="code" data-i="${index}" value="${esc(row.code)}"><input data-f="spec" data-i="${index}" value="${esc(row.spec)}"><input data-f="quantity" data-i="${index}" type="number" min="0" step="0.01" value="${n(row.quantity)}"><input data-f="dueDate" data-i="${index}" type="date" value="${esc(row.dueDate)}"><button class="remove" data-remove="${index}" type="button">×</button></div>`).join('');
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('#parseButton')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const result = parseMessage(document.querySelector('#messageInput').value);
    parsed = result.rows;
    document.querySelector('#companyInput').value = result.company;
    document.querySelector('#orderMemoInput').value = result.notes.join(' / ');
    document.querySelector('#lineEditor').classList.toggle('hidden', !parsed.length);
    const notice = document.querySelector('#parseNotice');
    notice.textContent = parsed.length ? `${parsed.length}개 품목을 읽었습니다. 코드·규격·수량·납기를 확인해 저장하세요.` : '수량이 있는 제품 줄을 읽지 못했습니다.';
    notice.classList.remove('hidden');
    draw(parsed);
  }, true);

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'orderForm') return;
    document.querySelectorAll('#parsedLines input[data-f]').forEach((input) => {
      const row = parsed[n(input.dataset.i)];
      row[input.dataset.f] = input.dataset.f === 'quantity' ? n(input.value) : input.value.trim();
      row.code = String(row.code || '').toUpperCase();
      row.name = row.code;
      row.category = '기타·미분류';
      row.unmatched = true;
    });
  }, true);
})();
