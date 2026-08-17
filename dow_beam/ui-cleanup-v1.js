/* Last-resort presentation cleanup for stray legacy text and duplicate order controls. */
(() => {
  const isStray = value => /^(?:wn\s*)+$/i.test(String(value || '').trim());

  function clean() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const remove = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (isStray(node.nodeValue)) remove.push(node);
    }
    remove.forEach(node => node.remove());
    document.querySelectorAll('.order-delete-x').forEach(node => node.remove());
  }

  const style = document.createElement('style');
  style.textContent = '.order-delete-x{display:none!important}';
  document.head.append(style);
  clean();
  new MutationObserver(() => requestAnimationFrame(clean)).observe(document.body, { childList: true, subtree: true });
  [300, 1500, 5000].forEach(delay => setTimeout(clean, delay));
})();
