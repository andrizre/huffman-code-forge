// Huffman coding core: frequency analysis, tree build, code table, encode/decode.
// The build is exposed as a sequence of steps so the UI can animate it.

function buildFrequencies(text) {
  const map = new Map();
  for (const ch of text) map.set(ch, (map.get(ch) || 0) + 1);
  return [...map.entries()].map(([ch, freq]) => ({ ch, freq }));
}

function sortedKey(n) {
  // Stable, deterministic ordering: (weight, depth-ish, symbol string)
  return [n.freq, n.minChar];
}

function buildStepList(freqs) {
  // Returns { steps, root } where steps is an array of { desc, queueSnapshot, newNode }
  const steps = [];
  let nodes = freqs
    .map(f => ({ leaf: true, ch: f.ch, freq: f.freq, left: null, right: null, minChar: f.ch }))
    .sort((a, b) => a.freq - b.freq || a.minChar.localeCompare(b.minChar));
  steps.push({
    desc: `Start: ${nodes.length} leaf nodes, one per distinct character.`,
    queue: nodes.map(n => labelOf(n)),
  });
  if (nodes.length === 0) return { steps, root: null };

  let mergeCount = 0;
  while (nodes.length > 1) {
    const a = nodes.shift();
    const b = nodes.shift();
    const parent = {
      leaf: false, ch: null, freq: a.freq + b.freq,
      left: a, right: b, minChar: a.minChar.localeCompare(b.minChar) < 0 ? a.minChar : b.minChar,
    };
    mergeCount++;
    nodes.push(parent);
    nodes.sort((x, y) => x.freq - y.freq || x.minChar.localeCompare(y.minChar));
    steps.push({
      desc: `Merge #${mergeCount}: (${labelOf(a)}) + (${labelOf(b)}) → weight ${parent.freq}`,
      queue: nodes.map(labelOf),
    });
  }
  return { steps, root: nodes[0] };
}

function labelOf(n) {
  return n.leaf ? `${JSON.stringify(n.ch)}·${n.freq}` : `Σ${n.freq}`;
}

function buildCodeTable(root) {
  const table = new Map();
  if (!root) return table;
  if (root.leaf) { table.set(root.ch, '0'); return table; }
  const walk = (node, prefix) => {
    if (node.leaf) { table.set(node.ch, prefix || '0'); return; }
    walk(node.left, prefix + '0');
    walk(node.right, prefix + '1');
  };
  walk(root, '');
  return table;
}

function encode(text, table) {
  let bits = '';
  for (const ch of text) bits += table.get(ch);
  return bits;
}

function decode(bits, root) {
  if (!root) return '';
  if (root.leaf) return root.ch.repeat(bits.length);
  let out = '', node = root;
  for (const b of bits) {
    node = b === '0' ? node.left : node.right;
    if (!node) return out;
    if (node.leaf) { out += node.ch; node = root; }
  }
  return out;
}

function treeDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(treeDepth(root.left), treeDepth(root.right));
}

function avgBitsPerChar(text, table) {
  let total = 0, chars = 0;
  for (const ch of text) { total += table.get(ch).length; chars++; }
  return chars ? total / chars : 0;
}
