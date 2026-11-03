#!/usr/bin/env python3
"""Build the DSPF interactive textbook from content fragments."""
import os, re, json, html

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(ROOT, 'content')
TOPICS_DIR = os.path.join(ROOT, 'topics')
os.makedirs(TOPICS_DIR, exist_ok=True)

TOPICS = [
    ("01-complexity",  "01", "Measuring Cost: Complexity and Asymptotic Notation", "Why we compare algorithms by growth, and how to read O, Omega, Theta, o and omega.", "Big-O, asymptotic, growth rate, amortized, recurrence, complexity"),
    ("02-stacks-queues","02", "Stacks, Queues and Linked Lists", "LIFO and FIFO containers, how they are built on arrays and pointers, and why the circular buffer exists.", "stack, queue, linked list, circular buffer, deque, LIFO, FIFO"),
    ("03-trees",       "03", "Trees and Traversals", "Tree terminology, representations, and the four ways to walk a binary tree.", "tree, binary tree, preorder, inorder, postorder, level order, traversal"),
    ("04-bst",         "04", "Binary Search Trees", "Ordering a tree so search becomes logarithmic - and the degenerate case that breaks it.", "BST, binary search tree, insert, delete, successor, height"),
    ("05-avl",         "05", "AVL Trees and Rotations", "Restoring the balance invariant with four rotation cases, and why height is guaranteed logarithmic.", "AVL, rotation, balance factor, LL, RR, LR, RL, height bound"),
    ("06-heaps",       "06", "Heaps and Heapsort", "Partial sorting in an array: priority queues, heapify, build-heap and heapsort.", "heap, priority queue, heapify, build-heap, heapsort, sift"),
    ("07-graphs",      "07", "Graphs: Terminology and Representation", "Vertices, edges, paths and cycles, and the two ways to store a graph.", "graph, adjacency matrix, adjacency list, directed, degree, cycle"),
    ("08-bfs",         "08", "Breadth-First Search", "Ring-by-ring exploration with a queue, shortest unweighted paths, components and bipartiteness.", "BFS, breadth-first, queue, shortest path, connected components, bipartite, diameter"),
    ("09-dfs",         "09", "Depth-First Search", "Going deep with a stack: discovery and finish times, cycle detection and topological sort.", "DFS, depth-first, stack, topological sort, cycle, strongly connected, finish time"),
    ("10-mst",         "10", "Minimum Spanning Trees", "Kruskal, Prim and the cut property that makes both of them correct.", "MST, minimum spanning tree, Kruskal, Prim, union-find, cut property, greedy"),
]

EXTRA_PAGES = [
    ("visualizers", "Interactive Visualizers", "Drive the algorithms yourself: stack, queue, BST, heap, BFS/DFS and growth rates."),
    ("practice",    "Practice and Examination Questions", "Graded questions with full worked solutions, from recall to exam-hard."),
    ("glossary",    "Glossary", "Every term used in the course, defined in one line."),
]

SEARCH = []


def parse_fragments():
    """Read content/*.html, split on <!--TOPIC:slug|title|desc--> markers."""
    frags = {}
    if not os.path.isdir(CONTENT):
        return frags
    for fn in sorted(os.listdir(CONTENT)):
        if not fn.endswith('.html'):
            continue
        src = open(os.path.join(CONTENT, fn), encoding='utf-8').read()
        parts = re.split(r'<!--(TOPIC|PAGE):([^>]+?)-->', src)
        # parts: ['', 'TOPIC', 'slug|title|desc', body, 'TOPIC', ...]
        i = 1
        while i < len(parts) - 2:
            kind, meta, body = parts[i], parts[i + 1], parts[i + 2]
            slug = meta.split('|')[0].strip()
            frags[slug] = body.strip()
            i += 3
    return frags


def head(title, rel, page_id, description=""):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)} · DSPF</title>
<meta name="description" content="{html.escape(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{rel}assets/style.css">
<script>
  window.MathJax = {{
    tex: {{ inlineMath: [['\\\\(', '\\\\)']], displayMath: [['\\\\[', '\\\\]']] }},
    options: {{ skipHtmlTags: ['script','noscript','style','textarea','pre','code'] }}
  }};
</script>
<script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-c.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css">
</head>
<body data-page="{page_id}">
<header class="topbar">
  <div class="topbar-in">
    <a class="brand" href="{rel}index.html">DSPF<span>.</span>Notes</a>
    <nav class="topnav">
      <a href="{rel}index.html">Home</a>
      <a href="{rel}topics/01-complexity.html">Chapters</a>
      <a href="{rel}visualizers.html">Visualizers</a>
      <a href="{rel}practice.html">Practice</a>
      <a href="{rel}glossary.html">Glossary</a>
    </nav>
    <div class="searchbox">
      <input id="search-input" type="search" placeholder="Search topics…  ( / )" autocomplete="off" aria-label="Search the textbook">
      <div class="searchresults" id="search-results"></div>
    </div>
  </div>
</header>
"""


def sidebar(rel, current):
    out = ['<nav class="sidebar" aria-label="Chapter navigation">']
    out.append('<div class="side-group">Chapters</div>')
    for slug, num, title, _short, _kw in TOPICS:
        cls = ' class="active"' if slug == current else ''
        out.append(f'<a href="{rel}topics/{slug}.html" data-topic-id="topic-{slug}"{cls}>{num} · {html.escape(title)}</a>')
    out.append('<div class="side-group">Tools</div>')
    for slug, title, _d in EXTRA_PAGES:
        cls = ' class="active"' if slug == current else ''
        out.append(f'<a href="{rel}{slug}.html"{cls}>{html.escape(title)}</a>')
    out.append('</nav>')
    return '\n'.join(out)


def pager(rel, idx):
    if idx is None:
        return ''
    prev_t = TOPICS[idx - 1] if idx > 0 else None
    next_t = TOPICS[idx + 1] if idx < len(TOPICS) - 1 else None
    out = ['<nav class="pager" aria-label="Chapter navigation">']
    if prev_t:
        out.append(f'<a href="{rel}topics/{prev_t[0]}.html"><span class="dir">← Previous</span><span class="ttl">{prev_t[1]} · {html.escape(prev_t[2])}</span></a>')
    else:
        out.append('<span style="flex:1"></span>')
    if next_t:
        out.append(f'<a class="next" href="{rel}topics/{next_t[0]}.html"><span class="dir">Next →</span><span class="ttl">{next_t[1]} · {html.escape(next_t[2])}</span></a>')
    else:
        out.append('<a class="next" href="' + rel + 'practice.html"><span class="dir">Next →</span><span class="ttl">Practice and examination questions</span></a>')
    out.append('</nav>')
    return '\n'.join(out)


def tail(rel, search_json):
    return f"""{pager(rel, TAIL_IDX)}
<footer style="margin-top:56px;padding-top:22px;border-top:1px solid var(--rule);font-size:13px;color:var(--ink-3)">
  <p style="margin:0 0 6px"><strong style="color:var(--ink-2)">Data Structures and Programming Fundamentals</strong> — an interactive textbook built from the CS213/293 lecture series, with Cormen et al. and Balagurusamy as references.</p>
  <p style="margin:0">Progress is saved in this browser only. <a href="{rel}glossary.html">Glossary</a> · <a href="{rel}practice.html">Practice</a> · <a href="{rel}visualizers.html">Visualizers</a></p>
</footer>
</main>
</div>
<script>window.DSPF_SEARCH = {search_json};</script>
<script src="{rel}assets/app.js"></script>
</body>
</html>
"""


def build():
    frags = parse_fragments()

    # search index
    for slug, num, title, short, kw in TOPICS:
        SEARCH.append({"title": f"{num} · {title}", "topic": "Chapter", "url": f"topics/{slug}.html", "keywords": kw + " " + short})
    for slug, title, desc in EXTRA_PAGES:
        SEARCH.append({"title": title, "topic": "Tool", "url": f"{slug}.html", "keywords": desc})

    # section-level entries from fragments
    for slug, num, title, _s, _k in TOPICS:
        body = frags.get(slug, '')
        for m in re.finditer(r'<h2[^>]*id="([^"]+)"[^>]*>(.*?)</h2>', body, re.S):
            anchor, text = m.group(1), re.sub(r'<[^>]+>', '', m.group(2)).strip()
            SEARCH.append({"title": text, "topic": f"Ch {num}", "url": f"topics/{slug}.html#{anchor}", "keywords": text})

    search_json = json.dumps(SEARCH, ensure_ascii=False)

    global TAIL_IDX
    written = []

    for idx, (slug, num, title, short, _kw) in enumerate(TOPICS):
        body = frags.get(slug)
        if body is None:
            print(f"  !! missing fragment for {slug}")
            continue
        TAIL_IDX = idx
        doc = head(f"{num} · {title}", "../", f"topic-{slug}", short)
        doc += '<div class="shell">\n' + sidebar("../", slug) + '\n<main>\n'
        doc += f'<div class="kicker">Chapter {num}</div>\n<h1>{html.escape(title)}</h1>\n'
        doc += f'<p class="lede">{html.escape(short)}</p>\n'
        doc += body + '\n'
        doc += tail("../", search_json)
        path = os.path.join(TOPICS_DIR, f"{slug}.html")
        open(path, 'w', encoding='utf-8').write(doc)
        written.append(path)

    for slug, title, desc in EXTRA_PAGES:
        body = frags.get(slug)
        if body is None:
            print(f"  !! missing page fragment for {slug}")
            continue
        TAIL_IDX = None
        doc = head(title, "", slug, desc)
        doc += '<div class="shell">\n' + sidebar("", slug) + '\n<main>\n'
        doc += f'<div class="kicker">Tool</div>\n<h1>{html.escape(title)}</h1>\n'
        doc += f'<p class="lede">{html.escape(desc)}</p>\n'
        doc += body + '\n'
        doc += tail("", search_json)
        path = os.path.join(ROOT, f"{slug}.html")
        open(path, 'w', encoding='utf-8').write(doc)
        written.append(path)

    # homepage
    TAIL_IDX = None
    home = head("Interactive Textbook", "", "home",
                "A complete, interactive textbook for Data Structures and Programming Fundamentals.")
    home += '<div class="shell">\n' + sidebar("", "home") + '\n<main style="max-width:1000px">\n'
    home += frags.get('home', '<p>Home content missing.</p>') + '\n'
    home += f"""<footer style="margin-top:56px;padding-top:22px;border-top:1px solid var(--rule);font-size:13px;color:var(--ink-3)">
  <p style="margin:0">Built from the CS213/293 lecture series. Supplementary material beyond the lectures is marked as such.</p>
</footer>
</main>
</div>
<script>window.DSPF_SEARCH = {search_json};</script>
<script src="assets/app.js"></script>
</body>
</html>
"""
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(home)
    written.append(os.path.join(ROOT, 'index.html'))

    print(f"built {len(written)} pages, {len(SEARCH)} search entries")
    return written


TAIL_IDX = None

if __name__ == '__main__':
    build()
