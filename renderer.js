// Canvas renderer for the Huffman tree with animated merge highlighting.
class TreeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => { this.resize(); if (this.root) this.draw(); });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = 480 * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = rect.width;
    this.h = 480;
  }

  // highlight: set of node references to draw glowing (last merged / new node)
  layout(root) {
    this.root = root;
    this.highlight = new Set();
    if (!root) return;
    let leafX = 0;
    const gap = 34;
    const assign = (node, depth) => {
      if (node.leaf) { node._x = leafX; leafX += gap; }
      else {
        assign(node.left, depth + 1);
        node._x = (node.left._x + node.right._x) / 2;
        assign(node.right, depth + 1);
      }
      node._depth = depth;
    };
    assign(root, 0);
    const total = leafX - gap;
    const pad = 24;
    const scale = total > 0 ? (this.w - pad * 2) / total : 1;
    const maxDepth = Math.max(...(function* walk(n) { yield n._depth; if (!n.leaf) { yield* walk(n.left); yield* walk(n.right); } })(root));
    const yGap = maxDepth > 0 ? (this.h - 70) / maxDepth : 0;
    const place = n => {
      n._px = pad + n._x * scale;
      n._py = 30 + n._depth * yGap;
      if (!n.leaf) { place(n.left); place(n.right); }
    };
    place(root);
  }

  draw(highlightSet) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    if (!this.root) {
      ctx.fillStyle = '#8b90a5';
      ctx.font = '14px monospace';
      ctx.fillText('Press "Build Tree" to forge a code.', 20, 40);
      return;
    }
    const hl = highlightSet || this.highlight;
    // edges
    const drawEdges = n => {
      if (n.leaf) return;
      this.edge(n, n.left, '0');
      this.edge(n, n.right, '1');
      drawEdges(n.left); drawEdges(n.right);
    };
    drawEdges(this.root);
    // nodes
    const drawNodes = n => {
      this.node(n, hl.has(n));
      if (!n.leaf) { drawNodes(n.left); drawNodes(n.right); }
    };
    drawNodes(this.root);
  }

  edge(a, b, bit) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#3a3f55';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a._px, a._py);
    ctx.lineTo(b._px, b._py);
    ctx.stroke();
    const mx = (a._px + b._px) / 2, my = (a._py + b._py) / 2 - 4;
    ctx.fillStyle = '#8b90a5';
    ctx.font = '11px monospace';
    ctx.fillText(bit, mx, my);
  }

  node(n, glow) {
    const ctx = this.ctx;
    const r = n.leaf ? 15 : 11;
    if (glow) {
      ctx.shadowColor = '#ffb347';
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(n._px, n._py, r, 0, Math.PI * 2);
    ctx.fillStyle = n.leaf ? '#ffb347' : '#2f3448';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = n.leaf ? '#141210' : '#6ee7b7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = n.leaf ? '#141210' : '#e8e9f0';
    ctx.font = `${n.leaf ? 11 : 10}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const txt = n.leaf ? printable(n.ch) : String(n.freq);
    if (txt.length <= 2) ctx.fillText(txt, n._px, n._py);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8b90a5';
    ctx.font = '10px monospace';
    const label = n.leaf ? `${printable(n.ch)} w=${n.freq}` : `Σ${n.freq}`;
    ctx.fillText(label, n._px - 14, n._py - r - 5);
  }
}

function printable(ch) {
  if (ch === ' ') return '␠';
  if (ch === '\n') return '⏎';
  if (ch === '\t') return '⇥';
  return ch;
}
