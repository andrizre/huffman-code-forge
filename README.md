# Huffman Code Forge

An interactive visualizer for Huffman coding — the classic greedy algorithm that builds
an optimal prefix code from text. Paste any text, forge the tree, and watch each merge
step animate: two lowest-weight nodes combine, weights bubble up, and the final tree
yields shorter codes for frequent characters.

## Features

- Step-by-step or auto-play animation of every merge, with a live priority-queue snapshot
- Canvas-rendered tree with glowing highlight on the newest internal node
- Full code table (0 = left, 1 = right), encoded bitstream, and compression stats
- Automatic round-trip check: the bitstream is decoded back and compared to the input
- Deterministic tie-breaking (frequency, then lexicographic) so builds are reproducible

## How to run

No build step, no dependencies, no network. Just open `index.html` in any modern
browser (double-click it, or `python3 -m http.server` and visit
`http://localhost:8000` if your browser blocks `file://` scripts).

## Concept

Huffman coding is a cornerstone of data compression (DEFLATE, JPEG, MP3 all use it).
This tool makes the greedy merge process visible: leaves start as single characters
with weights, and each step merges the two cheapest nodes until one tree remains.
Characters deep in the tree get long codes; frequent characters stay near the root
and get short ones — proven optimal for symbol-by-symbol prefix coding.
