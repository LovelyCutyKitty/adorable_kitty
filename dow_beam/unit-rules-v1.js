/* Permanent unit rules for products whose quantity is not counted by pieces. */
(() => {
  const isPieceBeam = row => /조각\s*빔/i.test([row?.name, row?.kind, row?.spec].filter(Boolean).join(' '));
  const applyUnitRules = () => {
    if (typeof data === 'undefined' || !Array.isArray(data.products) || !Array.isArray(data.orders)) return;
    const pieceBeamIds = new Set();
    let changed = false;
    data.products.forEach(product => {
      if (!isPieceBeam(product)) return;
      pieceBeamIds.add(product.id);
      if (product.unit !== 'kg') { product.unit = 'kg'; changed = true; }
    });
    data.orders.forEach(order => order.lines.forEach(line => {
      if (!pieceBeamIds.has(line.productId) && !isPieceBeam(line)) return;
      if (line.unit !== 'kg') { line.unit = 'kg'; changed = true; }
    }));
    if (changed) {
      localStorage.setItem(KEY, JSON.stringify(data));
      if (typeof render === 'function') render();
    }
  };
  applyUnitRules();
  setTimeout(applyUnitRules, 1500);
})();
