/* ==========================================================================
   DSPF interactive textbook — shared behaviour
   Search, progress, copy buttons, quizzes, visualizers.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------- search index (built from data attributes) ------------- */
  var SEARCH_INDEX = window.DSPF_SEARCH || [];

  function initSearch() {
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    if (!input || !results) return;

    function render(q) {
      var query = q.trim().toLowerCase();
      if (query.length < 2) { results.classList.remove('open'); results.innerHTML = ''; return; }
      var hits = SEARCH_INDEX.filter(function (item) {
        return (item.title + ' ' + item.topic + ' ' + (item.keywords || '')).toLowerCase().indexOf(query) !== -1;
      }).slice(0, 12);

      if (!hits.length) {
        results.innerHTML = '<div class="sr-empty">No matches for “' + escapeHtml(q) + '”</div>';
      } else {
        results.innerHTML = hits.map(function (h) {
          return '<a href="' + h.url + '"><span class="sr-topic">' + escapeHtml(h.topic) + '</span><br>' + escapeHtml(h.title) + '</a>';
        }).join('');
      }
      results.classList.add('open');
    }

    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('focus', function () { if (input.value.trim().length >= 2) render(input.value); });
    document.addEventListener('click', function (e) {
      if (!results.contains(e.target) && e.target !== input) results.classList.remove('open');
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { results.classList.remove('open'); input.blur(); }
      if (e.key === 'Enter') {
        var first = results.querySelector('a');
        if (first) window.location.href = first.getAttribute('href');
      }
    });
    // keyboard shortcut: "/" focuses search
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault(); input.focus();
      }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* ---------------- progress tracking ------------------------------------ */
  /* Manual only: a chapter counts as complete when the reader ticks its box. */
  var PROGRESS_KEY = 'dspf-progress-v2';
  var SUPP_IDS = { 'topic-11-shortest-paths': 1 };   /* not counted in the 10 */

  function getProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function setProgress(obj) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  function refreshIndicators() {
    var p = getProgress();

    /* home page cards */
    document.querySelectorAll('[data-topic-id]').forEach(function (el) {
      el.classList.toggle('read', !!p[el.getAttribute('data-topic-id')]);
    });

    /* sidebar links */
    document.querySelectorAll('.sidebar a[data-topic-id]').forEach(function (el) {
      el.classList.toggle('done', !!p[el.getAttribute('data-topic-id')]);
    });

    /* the tick box on this page, if present */
    var box = document.querySelector('[data-complete]');
    if (box) {
      var id = box.getAttribute('data-complete');
      box.checked = !!p[id];
      var label = box.closest('.chapter-check');
      if (label) {
        label.classList.toggle('is-done', box.checked);
        var txt = label.querySelector('.cc-text');
        if (txt) txt.textContent = box.checked ? 'Chapter complete' : 'Mark this chapter complete';
      }
    }

    /* dashboard counter */
    var counter = document.getElementById('progress-count');
    if (counter) {
      var total = parseInt(counter.getAttribute('data-total'), 10) || 10;
      var done = Object.keys(p).filter(function (k) {
        return k.indexOf('topic-') === 0 && !SUPP_IDS[k];
      }).length;
      counter.textContent = done + ' of ' + total + ' chapters complete';
    }
  }

  function initProgress() {
    var box = document.querySelector('[data-complete]');
    if (box) {
      box.addEventListener('change', function () {
        var id = box.getAttribute('data-complete');
        var p = getProgress();
        if (box.checked) { p[id] = Date.now(); } else { delete p[id]; }
        setProgress(p);
        refreshIndicators();
      });
    }

    var reset = document.getElementById('reset-progress');
    if (reset) {
      reset.addEventListener('click', function () {
        setProgress({});
        refreshIndicators();
      });
    }

    refreshIndicators();
  }

  /* ---------------- copy buttons ----------------------------------------- */
  function initCopy() {
    document.querySelectorAll('.codeblock').forEach(function (block) {
      var btn = block.querySelector('.copy-btn');
      var code = block.querySelector('pre code') || block.querySelector('pre');
      if (!btn || !code) return;
      btn.addEventListener('click', function () {
        var text = code.innerText;
        var done = function () {
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = 'Copy'; }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, fallback);
        } else { fallback(); }
        function fallback() {
          var ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); done(); } catch (e) {}
          document.body.removeChild(ta);
        }
      });
    });
  }

  /* ---------------- quizzes ---------------------------------------------- */
  function initQuizzes() {
    document.querySelectorAll('.quiz').forEach(function (quiz) {
      var fb = quiz.querySelector('.fb');
      quiz.querySelectorAll('.opt').forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (quiz.dataset.answered === '1') return;
          quiz.dataset.answered = '1';
          var correct = opt.hasAttribute('data-correct');
          opt.classList.add(correct ? 'correct' : 'wrong');
          if (!correct) {
            var right = quiz.querySelector('.opt[data-correct]');
            if (right) right.classList.add('correct');
          }
          if (fb) fb.classList.add('show');
        });
      });
    });
  }

  /* ---------------- sidebar scroll-spy ----------------------------------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.sidebar a[href^="#"]'));
    if (!links.length) return;
    var sections = links.map(function (l) {
      return { link: l, el: document.getElementById(l.getAttribute('href').slice(1)) };
    }).filter(function (s) { return s.el; });
    if (!sections.length) return;

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('active'); });
        var m = sections.find(function (s) { return s.el === entry.target; });
        if (m) {
          m.link.classList.add('active');
          if (window.innerWidth <= 1000) {
            m.link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      });
    }, { rootMargin: '-8% 0px -82% 0px' });

    sections.forEach(function (s) { obs.observe(s.el); });
  }

  /* ---------------- generic visualizer engine ---------------------------- */
  /* Each visualizer defines: steps[] (array of {state, log}) and renders it. */
  function Viz(root, config) {
    var stage = root.querySelector('.viz-stage');
    var log = root.querySelector('.viz-log');
    var btnPlay = root.querySelector('[data-viz="play"]');
    var btnPrev = root.querySelector('[data-viz="prev"]');
    var btnNext = root.querySelector('[data-viz="next"]');
    var btnReset = root.querySelector('[data-viz="reset"]');
    var speedSel = root.querySelector('[data-viz="speed"]');
    var i = 0, timer = null;

    function render() {
      var step = config.steps[i];
      if (!step) return;
      config.render(stage, step, i);
      if (log) log.textContent = step.log || '';
      if (btnPrev) btnPrev.disabled = i === 0;
      if (btnNext) btnNext.disabled = i >= config.steps.length - 1;
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      if (btnPlay) btnPlay.textContent = 'Play';
    }
    function play() {
      if (timer) { stop(); return; }
      if (i >= config.steps.length - 1) i = 0;
      btnPlay.textContent = 'Pause';
      var delay = parseInt(speedSel ? speedSel.value : 700, 10);
      timer = setInterval(function () {
        if (i >= config.steps.length - 1) { stop(); return; }
        i++; render();
      }, delay);
    }
    if (btnPlay) btnPlay.addEventListener('click', play);
    if (btnNext) btnNext.addEventListener('click', function () { stop(); if (i < config.steps.length - 1) { i++; render(); } });
    if (btnPrev) btnPrev.addEventListener('click', function () { stop(); if (i > 0) { i--; render(); } });
    if (btnReset) btnReset.addEventListener('click', function () { stop(); i = 0; render(); });
    if (speedSel) speedSel.addEventListener('change', function () { if (timer) { stop(); play(); } });

    render();
    return { setSteps: function (s) { config.steps = s; i = 0; stop(); render(); } };
  }

  /* ---------------- stack / queue visualizer ----------------------------- */
  function initStackQueue() {
    var root = document.getElementById('viz-stack');
    if (!root) return;
    var model = { stack: [12, 47, 8], queue: [12, 47, 8] };

    function drawStack(stage, step) {
      var cells = model.stack.map(function (v, idx) {
        var cls = 'cell';
        if (step.hl === idx) cls += ' hl';
        if (step.hl2 === idx) cls += ' hl2';
        return '<div class="' + cls + '">' + v + '</div>';
      });
      if (step.showTop) cells.push('<div class="cell empty">↑</div>');
      stage.innerHTML = '<div class="arr">' + cells.join('') + '</div>';
    }
    function drawQueue(stage, step) {
      var cells = model.queue.map(function (v, idx) {
        var cls = 'cell';
        if (step.hl === idx) cls += ' hl';
        if (step.hl2 === idx) cls += ' hl2';
        return '<div class="' + cls + '">' + v + '</div>';
      });
      stage.innerHTML = '<div class="arr">' + cells.join('') + '</div>';
    }
    var mode = 'stack';
    var viz = Viz(root, {
      steps: [{ log: 'Stack [12, 47, 8] — top is the right-hand end.' }],
      render: function (stage, step) { (mode === 'stack' ? drawStack : drawQueue)(stage, step); }
    });

    root.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-act');
        var input = root.querySelector('[data-viz="value"]');
        var val = input && input.value !== '' ? parseInt(input.value, 10) : null;
        var steps = [];
        if (mode === 'stack') {
          if (act === 'push' && val !== null) {
            model.stack.push(val);
            steps = [{ hl: model.stack.length - 1, log: 'push(' + val + ') — appended at the top, O(1).' }];
          } else if (act === 'pop') {
            var top = model.stack[model.stack.length - 1];
            steps = [{ hl: model.stack.length - 1, log: 'pop() returns ' + top + ' — the last item pushed, LIFO.' }];
            model.stack.pop();
            steps.push({ log: 'After pop: [' + model.stack.join(', ') + ']' });
          }
        } else {
          if (act === 'enqueue' && val !== null) {
            model.queue.push(val);
            steps = [{ hl: model.queue.length - 1, log: 'enqueue(' + val + ') — added at the rear, O(1).' }];
          } else if (act === 'dequeue') {
            var front = model.queue[0];
            steps = [{ hl: 0, log: 'dequeue() returns ' + front + ' — the first item added, FIFO.' }];
            model.queue.shift();
            steps.push({ log: 'After dequeue: [' + model.queue.join(', ') + ']' });
          }
        }
        if (act === 'switch') {
          mode = mode === 'stack' ? 'queue' : 'stack';
          btn.textContent = mode === 'stack' ? 'Switch to queue' : 'Switch to stack';
          steps = [{ log: 'Now showing the ' + mode + '.' }];
        }
        if (!steps.length) return;
        viz.setSteps(steps);
        root.querySelector('.viz-log').textContent = steps[0].log;
      });
    });
  }

  /* ---------------- BST visualizer --------------------------------------- */
  function initBSTViz() {
    var root = document.getElementById('viz-bst');
    if (!root) return;
    var keys = [];

    function insert(arr, k) {
      var a = arr.slice();
      a.push(k);
      return a;
    }
    function buildTree(arr) {
      var nodes = {};
      var rootKey = null;
      arr.forEach(function (k) {
        if (rootKey === null) { rootKey = k; nodes[k] = { k: k, l: null, r: null }; return; }
        var cur = rootKey;
        while (true) {
          if (k < cur) { if (nodes[cur].l === null) { nodes[cur].l = k; nodes[k] = { k: k, l: null, r: null }; break; } cur = nodes[cur].l; }
          else if (k > cur) { if (nodes[cur].r === null) { nodes[cur].r = k; nodes[k] = { k: k, l: null, r: null }; break; } cur = nodes[cur].r; }
          else break;
        }
      });
      return { nodes: nodes, root: rootKey };
    }
    function layout(tree) {
      var pos = {}, next = 0;
      function walk(k, depth) {
        if (k === null) return;
        walk(tree.nodes[k].l, depth + 1);
        pos[k] = { x: next++, y: depth };
        walk(tree.nodes[k].r, depth + 1);
      }
      walk(tree.root, 0);
      return pos;
    }
    function draw(stage, tree, highlight) {
      if (tree.root === null) { stage.innerHTML = '<div style="color:var(--ink-3);font-size:14px">Empty tree — insert a key.</div>'; return; }
      var pos = layout(tree);
      var maxX = 0, maxY = 0;
      Object.keys(pos).forEach(function (k) { maxX = Math.max(maxX, pos[k].x); maxY = Math.max(maxY, pos[k].y); });
      var dx = 58, dy = 74, pad = 34;
      var w = maxX * dx + pad * 2, h = maxY * dy + pad * 2;
      var svg = ['<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Binary search tree">'];
      Object.keys(tree.nodes).forEach(function (k) {
        var n = tree.nodes[k];
        var p = pos[k];
        [n.l, n.r].forEach(function (c) {
          if (c === null) return;
          var q = pos[c];
          svg.push('<line x1="' + (p.x * dx + pad) + '" y1="' + (p.y * dy + pad) + '" x2="' + (q.x * dx + pad) + '" y2="' + (q.y * dy + pad) + '" stroke="var(--rule-2)" stroke-width="1.5"/>');
        });
      });
      Object.keys(tree.nodes).forEach(function (k) {
        var p = pos[k];
        var isHl = String(highlight) === String(k);
        svg.push('<circle cx="' + (p.x * dx + pad) + '" cy="' + (p.y * dy + pad) + '" r="19" fill="' + (isHl ? 'var(--accent-bg)' : 'var(--surface)') + '" stroke="' + (isHl ? 'var(--accent)' : 'var(--rule-2)') + '" stroke-width="1.5"/>');
        svg.push('<text x="' + (p.x * dx + pad) + '" y="' + (p.y * dy + pad + 5) + '" text-anchor="middle" font-family="var(--font-mono)" font-size="13" fill="' + (isHl ? 'var(--accent)' : 'var(--ink)') + '">' + k + '</text>');
      });
      svg.push('</svg>');
      stage.innerHTML = svg.join('');
    }
    function render() {
      var tree = buildTree(keys);
      draw(root.querySelector('.viz-stage'), tree, null);
      var inorder = [];
      (function walk(k) { if (k === null) return; walk(tree.nodes[k].l); inorder.push(k); walk(tree.nodes[k].r); })(tree.root);
      root.querySelector('.viz-log').textContent = keys.length
        ? 'Keys inserted: [' + keys.join(', ') + ']  ·  inorder: ' + inorder.join(' → ')
        : 'Insert a key to begin.';
    }
    root.querySelector('[data-bst="insert"]').addEventListener('click', function () {
      var inp = root.querySelector('[data-bst="value"]');
      var v = parseInt(inp.value, 10);
      if (!isNaN(v) && keys.indexOf(v) === -1) { keys = insert(keys, v); render(); }
      inp.value = '';
    });
    root.querySelector('[data-bst="random"]').addEventListener('click', function () {
      var v;
      do { v = Math.floor(Math.random() * 90) + 10; } while (keys.indexOf(v) !== -1 && keys.length < 20);
      keys = insert(keys, v); render();
    });
    root.querySelector('[data-bst="clear"]').addEventListener('click', function () { keys = []; render(); });
    root.querySelector('[data-bst="value"]').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') root.querySelector('[data-bst="insert"]').click();
    });
    render();
  }

  /* ---------------- heap visualizer -------------------------------------- */
  function initHeapViz() {
    var root = document.getElementById('viz-heap');
    if (!root) return;
    var heap = [];

    function heapifyUp(a, i) {
      while (i > 0) {
        var p = Math.floor((i - 1) / 2);
        if (a[p] < a[i]) { var t = a[p]; a[p] = a[i]; a[i] = t; i = p; } else break;
      }
      return i;
    }
    function heapifyDown(a, i, n) {
      while (true) {
        var l = 2 * i + 1, r = 2 * i + 2, big = i;
        if (l < n && a[l] > a[big]) big = l;
        if (r < n && a[r] > a[big]) big = r;
        if (big === i) break;
        var t = a[i]; a[i] = a[big]; a[big] = t; i = big;
      }
    }
    function render(hl) {
      var stage = root.querySelector('.viz-stage');
      if (!heap.length) { stage.innerHTML = '<div style="color:var(--ink-3);font-size:14px">Empty heap — insert a value.</div>'; return; }
      var cells = heap.map(function (v, i) {
        var cls = 'cell';
        if (hl && hl.indexOf(i) !== -1) cls += ' hl';
        return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px">' +
               '<div class="' + cls + '">' + v + '</div>' +
               '<div style="font-family:var(--font-mono);font-size:10px;color:var(--ink-3)">' + i + '</div></div>';
      });
      stage.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;align-items:center">' +
        '<div class="arr">' + cells.join('') + '</div>' +
        '<div style="font-family:var(--font-mono);font-size:11.5px;color:var(--ink-3)">array view · parent(i) = floor((i-1)/2) · children = 2i+1, 2i+2</div>' +
        '</div>';
      root.querySelector('.viz-log').textContent = 'Max-heap array: [' + heap.join(', ') + ']  ·  root = ' + heap[0] + ' (the maximum)';
    }
    root.querySelector('[data-heap="insert"]').addEventListener('click', function () {
      var inp = root.querySelector('[data-heap="value"]');
      var v = parseInt(inp.value, 10);
      if (isNaN(v)) return;
      heap.push(v);
      var finalPos = heapifyUp(heap, heap.length - 1);
      render([finalPos]);
      inp.value = '';
    });
    root.querySelector('[data-heap="extract"]').addEventListener('click', function () {
      if (!heap.length) return;
      var max = heap[0];
      heap[0] = heap[heap.length - 1];
      heap.pop();
      if (heap.length) heapifyDown(heap, 0, heap.length);
      render([0]);
      root.querySelector('.viz-log').textContent = 'extract-max returned ' + max + '. Last leaf moved to the root, then sifted down. Now: [' + heap.join(', ') + ']';
    });
    root.querySelector('[data-heap="clear"]').addEventListener('click', function () { heap = []; render(); });
    root.querySelector('[data-heap="build"]').addEventListener('click', function () {
      heap = [4, 10, 3, 5, 1];
      for (var i = Math.floor(heap.length / 2) - 1; i >= 0; i--) heapifyDown(heap, i, heap.length);
      render([]);
      root.querySelector('.viz-log').textContent = 'build-heap on [4, 10, 3, 5, 1] gives [' + heap.join(', ') + '] in O(n).';
    });
    render([]);
  }

  /* ---------------- graph BFS/DFS visualizer ----------------------------- */
  function initGraphViz() {
    var root = document.getElementById('viz-graph');
    if (!root) return;

    var NODES = {
      1: { x: 60,  y: 40 },
      2: { x: 190, y: 40 },
      3: { x: 320, y: 40 },
      4: { x: 120, y: 150 },
      5: { x: 250, y: 150 },
      6: { x: 380, y: 150 },
      7: { x: 60,  y: 250 },
      8: { x: 250, y: 250 }
    };
    var EDGES = [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8]];
    var ADJ = {};
    Object.keys(NODES).forEach(function (k) { ADJ[k] = []; });
    EDGES.forEach(function (e) { ADJ[e[0]].push(e[1]); ADJ[e[1]].push(e[0]); });
    Object.keys(ADJ).forEach(function (k) { ADJ[k].sort(function (a, b) { return a - b; }); });

    var mode = 'bfs';
    var steps = [], idx = 0;

    function buildSteps() {
      var out = [];
      var visited = {}, order = [], parent = {}, dist = {};
      var start = '1';
      visited[start] = true; parent[start] = null; dist[start] = 0;
      var frontier = [start];
      out.push({ visited: [], current: start, frontier: [start], log: mode.toUpperCase() + ' from vertex 1. Frontier: [1].' });

      if (mode === 'bfs') {
        var queue = [start];
        while (queue.length) {
          var u = queue.shift();
          order.push(u);
          out.push({ visited: order.slice(), current: u, frontier: queue.slice(), log: 'Dequeue ' + u + ' (distance ' + dist[u] + '). Neighbours: ' + ADJ[u].join(', ') + '.' });
          ADJ[u].forEach(function (v) {
            if (!visited[v]) { visited[v] = true; parent[v] = u; dist[v] = dist[u] + 1; queue.push(v); }
          });
          if (queue.length) out.push({ visited: order.slice(), current: null, frontier: queue.slice(), log: 'Enqueue unvisited neighbours → frontier: [' + queue.join(', ') + '].' });
        }
      } else {
        var stack = [start];
        while (stack.length) {
          var u2 = stack.pop();
          if (order.indexOf(u2) !== -1) continue;
          order.push(u2);
          out.push({ visited: order.slice(), current: u2, frontier: stack.slice(), log: 'Pop ' + u2 + '. Neighbours: ' + ADJ[u2].join(', ') + '.' });
          for (var i = ADJ[u2].length - 1; i >= 0; i--) {
            var v2 = ADJ[u2][i];
            if (order.indexOf(v2) === -1) stack.push(v2);
          }
          if (stack.length) out.push({ visited: order.slice(), current: null, frontier: stack.slice(), log: 'Push unvisited neighbours → stack: [' + stack.join(', ') + '].' });
        }
      }
      out.push({ visited: order.slice(), current: null, frontier: [], log: 'Done. Visit order: ' + order.join(' → ') });
      return out;
    }

    function draw(step) {
      var svg = ['<svg width="450" height="310" viewBox="0 0 450 310" role="img" aria-label="Graph traversal">'];
      EDGES.forEach(function (e) {
        var a = NODES[e[0]], b = NODES[e[1]];
        svg.push('<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="var(--rule-2)" stroke-width="1.6"/>');
      });
      Object.keys(NODES).forEach(function (k) {
        var n = NODES[k];
        var fill = 'var(--surface)', stroke = 'var(--rule-2)', color = 'var(--ink)';
        if (step.visited && step.visited.indexOf(k) !== -1) { fill = 'var(--ok-bg)'; stroke = 'var(--ok)'; color = 'var(--ok)'; }
        if (String(step.current) === String(k)) { fill = 'var(--accent-bg)'; stroke = 'var(--accent)'; color = 'var(--accent)'; }
        else if (step.frontier && step.frontier.indexOf(k) !== -1) { fill = 'var(--teal-bg)'; stroke = 'var(--accent-2)'; color = 'var(--accent-2)'; }
        svg.push('<circle cx="' + n.x + '" cy="' + n.y + '" r="21" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>');
        svg.push('<text x="' + n.x + '" y="' + (n.y + 5) + '" text-anchor="middle" font-family="var(--font-mono)" font-size="14" fill="' + color + '">' + k + '</text>');
      });
      svg.push('</svg>');
      root.querySelector('.viz-stage').innerHTML = svg.join('');
      root.querySelector('.viz-log').textContent = step.log;
      var prev = root.querySelector('[data-g="prev"]'), next = root.querySelector('[data-g="next"]');
      if (prev) prev.disabled = idx === 0;
      if (next) next.disabled = idx >= steps.length - 1;
    }

    function reset() { steps = buildSteps(); idx = 0; draw(steps[0]); }
    root.querySelector('[data-g="next"]').addEventListener('click', function () { if (idx < steps.length - 1) { idx++; draw(steps[idx]); } });
    root.querySelector('[data-g="prev"]').addEventListener('click', function () { if (idx > 0) { idx--; draw(steps[idx]); } });
    root.querySelector('[data-g="reset"]').addEventListener('click', reset);
    root.querySelectorAll('[data-g="mode"]').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-mode');
        root.querySelectorAll('[data-g="mode"]').forEach(function (x) { x.style.borderColor = ''; x.style.color = ''; });
        b.style.borderColor = 'var(--accent)'; b.style.color = 'var(--accent)';
        reset();
      });
    });
    reset();
  }

  /* ---------------- growth-rate explorer --------------------------------- */
  function initGrowth() {
    var root = document.getElementById('viz-growth');
    if (!root) return;
    var slider = root.querySelector('[data-gr="n"]');
    var out = root.querySelector('.viz-stage');

    function fmt(v) {
      if (v >= 1e12) return (v / 1e12).toFixed(2) + 'e12';
      if (v >= 1e9) return (v / 1e9).toFixed(2) + 'e9';
      if (v >= 1e6) return (v / 1e6).toFixed(2) + 'e6';
      if (v >= 1e3) return (v / 1e3).toFixed(2) + 'e3';
      return v.toFixed(0);
    }
    function render() {
      var n = parseInt(slider.value, 10);
      var rows = [
        ['1', 1],
        ['log2 n', Math.log2(n)],
        ['n', n],
        ['n log2 n', n * Math.log2(n)],
        ['n^2', n * n],
        ['n^3', n * n * n],
        ['2^n', Math.pow(2, Math.min(n, 40))]
      ];
      var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }));
      out.innerHTML = '<div style="width:100%;max-width:520px">' +
        '<div style="font-family:var(--font-mono);font-size:12px;color:var(--ink-3);margin-bottom:10px">n = ' + n + (n > 40 ? '  (2^n capped at 2^40)' : '') + '</div>' +
        rows.map(function (r) {
          var pct = Math.max(0.4, (Math.log10(r[1] + 1) / Math.log10(max + 1)) * 100);
          return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
            '<div style="width:74px;font-family:var(--font-mono);font-size:12px;color:var(--ink-2);text-align:right">' + r[0] + '</div>' +
            '<div style="flex:1;height:15px;background:var(--paper-2);border-radius:3px;overflow:hidden">' +
            '<div style="height:100%;width:' + pct + '%;background:var(--accent);opacity:' + (0.35 + 0.65 * pct / 100) + '"></div></div>' +
            '<div style="width:76px;font-family:var(--font-mono);font-size:12px;text-align:right">' + fmt(r[1]) + '</div></div>';
        }).join('') + '</div>';
      root.querySelector('.viz-log').textContent = 'Operation counts at n = ' + n + '. Note how quickly 2^n leaves the others behind.';
    }
    slider.addEventListener('input', render);
    render();
  }

  /* ---------------- boot -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initSearch();
    initProgress();
    initCopy();
    initQuizzes();
    initScrollSpy();
    initStackQueue();
    initBSTViz();
    initHeapViz();
    initGraphViz();
    initGrowth();
    if (window.Prism) { try { Prism.highlightAll(); } catch (e) {} }
  });
})();
