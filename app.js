// UI wiring: build, step, auto-play, code table, encoded bits, stats.

const $ = id => document.getElementById(id);
const input = $('text-input');
const renderer = new TreeRenderer($('tree-canvas'));

let state = null; // { steps, root, table, bits, text, stepIndex }
let timer = null;

function currentQueueNodes(stepIndex) {
  // Recompute the actual node objects present in the queue after stepIndex merges,
  // so the renderer can highlight the freshly created node.
  return state.steps[stepIndex];
}

function render(stepIndex) {
  const st = state;
  const step = st.steps[stepIndex];
  renderer.draw(st.pendingHighlights || new Set());
  $('step-log').innerHTML = st.steps
    .slice(0, stepIndex + 1)
    .slice(-8)
    .map((s, i, arr) => `<div class="${i === arr.length - 1 ? 'latest' : ''}">${s.desc}</div>`)
    .join('') + (step.queue.length ? `<div>queue: ${step.queue.join(' | ')}</div>` : '');
  $('step-log').scrollTop = $('step-log').scrollHeight;
}

function build() {
  stopPlay();
  const text = input.value;
  if (!text) { alert('Type some text first.'); return; }
  const freqs = buildFrequencies(text);
  const { steps, root } = buildStepList(freqs);
  const table = buildCodeTable(root);
  const bits = encode(text, table);
  state = { steps, root, table, bits, text, stepIndex: 0, pendingHighlights: new Set() };
  renderer.layout(null);
  renderer.draw();
  $('btn-step').disabled = false;
  $('btn-play').disabled = false;
  $('btn-reset').disabled = false;
  showFinalResults();
  render(0);
  updateStats();
}

function advanceStep() {
  const st = state;
  if (!st || st.stepIndex >= st.steps.length - 1) { stopPlay(); return; }
  st.stepIndex++;
  rebuildUpTo(st.stepIndex);
}

function rebuildUpTo(stepIndex) {
  // Re-run the merges up to stepIndex to get real node objects for layout+highlight.
  const freqs = buildFrequencies(state.text);
  let nodes = freqs
    .map(f => ({ leaf: true, ch: f.ch, freq: f.freq, left: null, right: null, minChar: f.ch }))
    .sort((a, b) => a.freq - b.freq || a.minChar.localeCompare(b.minChar));
  const mergesDone = stepIndex - 1; // step 0 is "start", steps 1..N are merges
  let lastNew = null;
  for (let m = 0; m < mergesDone; m++) {
    const a = nodes.shift(), b = nodes.shift();
    const parent = {
      leaf: false, ch: null, freq: a.freq + b.freq,
      left: a, right: b,
      minChar: a.minChar.localeCompare(b.minChar) < 0 ? a.minChar : b.minChar,
    };
    nodes.push(parent);
    nodes.sort((x, y) => x.freq - y.freq || x.minChar.localeCompare(y.minChar));
    lastNew = parent;
  }
  const isFinal = stepIndex >= state.steps.length - 1;
  const root = isFinal ? nodes[0] : null;
  state.pendingHighlights = lastNew ? new Set([lastNew]) : new Set();
  renderer.layout(root);
  renderer.draw(state.pendingHighlights);
  state.stepIndex = stepIndex;
  render(stepIndex);
  if (isFinal) { showFinalResults(); stopPlay(); }
}

function showFinalResults() {
  const st = state;
  const rows = [...st.table.entries()]
    .sort((a, b) => a[1].length - b[1].length || a[0].localeCompare(b[0]))
    .map(([ch, code]) => `<span class="sym">${escapeHtml(printCh(ch))}</span><span class="bits">${code}</span>`)
    .join('');
  $('code-table').innerHTML = `<div class="code-table">${rows}</div>`;
  $('encoded').textContent = st.bits.match(/.{1,64}/g)?.join('\n') || '';
  const rawBits = st.text.length * 8;
  const huffBits = st.bits.length;
  const pct = rawBits ? Math.round((1 - huffBits / rawBits) * 100) : 0;
  $('compression').innerHTML =
    `Raw: <b>${rawBits}</b> bits · Huffman: <b>${huffBits}</b> bits · saved <b>${pct}%</b><br>` +
    `Avg ${avgBitsPerChar(st.text, st.table).toFixed(2)} bits/char · round-trip check: ${decode(st.bits, rebuildRoot()) === st.text ? '✓ decodes back to original' : '✗ mismatch'}`;

  function rebuildRoot() {
    // decode check uses the final tree; recompute quickly
    const { root } = buildStepList(buildFrequencies(st.text));
    return root;
  }
}

function printCh(ch) {
  if (ch === ' ') return '␠';
  if (ch === '\n') return '⏎';
  if (ch === '\t') return '⇥';
  return ch;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updateStats() {
  const text = input.value;
  const freqs = buildFrequencies(text);
  const distinct = freqs.length;
  $('stats').innerHTML =
    `Length: <b>${text.length}</b> chars · distinct: <b>${distinct}</b><br>` +
    `Tree merges needed: <b>${Math.max(0, distinct - 1)}</b>`;
}

function play() {
  if (!state) return;
  if (timer) { stopPlay(); return; }
  $('btn-play').textContent = '⏸ Pause';
  const tick = () => {
    if (!state || state.stepIndex >= state.steps.length - 1) { stopPlay(); return; }
    advanceStep();
  };
  const speed = +$('speed').value;
  timer = setInterval(tick, 700 / speed);
}

function stopPlay() {
  if (timer) { clearInterval(timer); timer = null; }
  $('btn-play').textContent = '▶ Auto';
}

$('btn-build').addEventListener('click', build);
$('btn-step').addEventListener('click', () => { stopPlay(); advanceStep(); });
$('btn-play').addEventListener('click', play);
$('btn-reset').addEventListener('click', () => {
  stopPlay();
  state = null;
  renderer.layout(null);
  renderer.draw();
  $('code-table').innerHTML = '';
  $('encoded').textContent = '';
  $('compression').innerHTML = '';
  $('step-log').innerHTML = '';
  $('btn-step').disabled = true;
  $('btn-play').disabled = true;
  $('btn-reset').disabled = true;
});
input.addEventListener('input', updateStats);
renderer.draw();
updateStats();
