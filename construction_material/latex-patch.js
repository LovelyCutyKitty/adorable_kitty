(() => {
  const ROOT_SELECTORS = [
    '#questionText',
    '#explainAnswerText',
    '#resultBox',
    '#wrongReview',
    '#panelContent'
  ];
  const processed = new WeakSet();
  const SUBSCRIPT_RE = /([A-Za-zΑ-Ωα-ω][A-Za-z0-9Α-Ωα-ω]*)_([A-Za-z0-9Α-Ωα-ω]+)/g;

  function ensureMathJax() {
    if (window.MathJax?.typesetPromise) return Promise.resolve();
    if (window.__cmMathJaxPromise) return window.__cmMathJaxPromise;
    window.MathJax = {
      tex: { inlineMath: [['\\(','\\)']], processEscapes: true },
      options: { skipHtmlTags: ['script','noscript','style','textarea','code','annotation','annotation-xml'] }
    };
    window.__cmMathJaxPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return window.__cmMathJaxPromise;
  }

  function isTargetNode(node) {
    const parent = node.parentElement;
    if (!parent) return false;
    if (parent.closest('mjx-container,script,style,textarea,code')) return false;
    return ROOT_SELECTORS.some(sel => parent.closest(sel));
  }

  function convertTextNode(node) {
    if (processed.has(node) || !isTargetNode(node)) return false;
    processed.add(node);
    const original = node.nodeValue || '';
    if (!original.includes('_') || original.includes('\\(')) return false;
    const replaced = original.replace(SUBSCRIPT_RE, (_, base, sub) => `\\(${base}_{${sub}}\\)`);
    if (replaced === original) return false;
    node.nodeValue = replaced;
    return true;
  }

  function scan(root) {
    if (!root) return false;
    let changed = false;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { if (convertTextNode(node)) changed = true; });
    return changed;
  }

  let scheduled = false;
  async function renderMath() {
    scheduled = false;
    const roots = ROOT_SELECTORS.map(sel => document.querySelector(sel)).filter(Boolean);
    roots.forEach(scan);
    try {
      await ensureMathJax();
      if (window.MathJax.startup?.promise) await window.MathJax.startup.promise;
      await window.MathJax.typesetPromise(roots);
    } catch (err) {
      console.warn('MathJax render skipped', err);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(renderMath);
  }

  const observer = new MutationObserver(mutations => {
    const relevant = mutations.some(m => {
      const el = m.target.nodeType === Node.ELEMENT_NODE ? m.target : m.target.parentElement;
      return el && !el.closest('mjx-container') && ROOT_SELECTORS.some(sel => el.closest(sel) || el.querySelector?.(sel));
    });
    if (relevant) schedule();
  });

  function boot() {
    if (document.body) observer.observe(document.body, {subtree:true, childList:true, characterData:true});
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
