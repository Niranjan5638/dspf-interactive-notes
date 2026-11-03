# DSPF — Interactive Textbook

An interactive digital textbook for **Data Structures and Programming Fundamentals** (CS213/293), built from the ten lecture sessions that make up the course, with Cormen et al. and Balagurusamy as references.

Ten chapters, each teaching from first principles: what the structure is for, why it exists, how it is built in C and Python, what it costs, and where it breaks. Six live visualizers, a graded question bank with worked solutions, and a full glossary.

## Contents

| Chapter | Topic |
|---|---|
| 01 | Measuring cost: complexity and asymptotic notation |
| 02 | Stacks, queues and linked lists |
| 03 | Trees and traversals |
| 04 | Binary search trees |
| 05 | AVL trees and rotations |
| 06 | Heaps and heapsort |
| 07 | Graphs: terminology and representation |
| 08 | Breadth-first search |
| 09 | Depth-first search |
| 10 | Minimum spanning trees |

Plus **visualizers.html** (six interactive demos), **practice.html** (graded questions with solutions) and **glossary.html**.

## Course scope

The course is defined by ten lecture sessions: 01, 03, 05, 06, 08, 10, 13, 14, 15 and 16. Lectures 02, 04, 07, 09, 11 and 12 do not exist for this course.

Two consequences: there is **no general sorting chapter** (the only sorting taught is heapsort, inside chapter 6) and **no hashing chapter** (hash tables appear once as a passing mention in the BST material). Material outside this scope is marked as supplementary wherever it appears.

## Architecture

```
.
├── index.html              Homepage and course dashboard
├── topics/
│   ├── 01-complexity.html
│   ├── 02-stacks-queues.html
│   ├── 03-trees.html
│   ├── 04-bst.html
│   ├── 05-avl.html
│   ├── 06-heaps.html
│   ├── 07-graphs.html
│   ├── 08-bfs.html
│   ├── 09-dfs.html
│   └── 10-mst.html
├── visualizers.html        Interactive demos
├── practice.html           Question bank with solutions
├── glossary.html           Term reference
├── assets/
│   ├── style.css           All styling, light and dark, plus print
│   └── app.js              Search, progress, quizzes, visualizers
├── content/                Source fragments the pages are built from
└── build.py                Generator: wraps fragments in the page shell
```

`build.py` reads `content/*.html`, splits on `<!--TOPIC:slug|title|desc-->` markers, and writes each page wrapped in the shared header, sidebar, pager and footer. It also builds the client-side search index from the chapter titles and every `<h2>` anchor.

To rebuild after editing content:

```bash
python3 build.py
```

## Features

- **Pseudocode for every algorithm** — each chapter gives representation-neutral pseudocode before the C and Python implementations, with complexity annotated on each procedure.
- **Search** — press `/` or click the box. Indexes chapter titles and every section heading.
- **Progress tracking** — each chapter has a *Mark this chapter complete* checkbox; state is stored in `localStorage` and reflected on the dashboard, in the sidebar and on the home cards. A reset control clears it.
- **Six visualizers** — stack/queue operations, BST construction, heap insert and extract, BFS/DFS on a graph, growth-rate explorer, and a live quiz engine.
- **Copy buttons** on every code block.
- **Light and dark themes** driven by `prefers-color-scheme`.
- **Print / export to PDF** — print stylesheet hides navigation, expands every collapsed section, and appends URLs to external links.
- **Responsive** — sidebar becomes a horizontal scroll bar below 1000px.

## Dependencies

All three are loaded from CDN and all three degrade gracefully if unavailable:

| Library | Used for | Fallback |
|---|---|---|
| Google Fonts (Newsreader, Public Sans, JetBrains Mono) | Typography | System serif / sans / mono |
| MathJax 3 | LaTeX equations | Equations appear as readable notation |
| Prism 1.29 | Syntax highlighting | Code appears unstyled but correct |

No build step, no framework, no npm. The site is static HTML, one CSS file and one JavaScript file.

## Verification

- All internal links and TOC anchors resolve.
- Every page passes HTML tag-balance checks.
- C and Python listings were traced by hand against the outputs shown in the comments.

## Sources

- Lecture decks: CS213/293, IIT Gandhinagar (Ashutosh Gupta), lectures 1, 3, 5, 6, 8, 10, 13, 14, 15, 16.
- T. H. Cormen, C. E. Leiserson, R. L. Rivest, C. Stein, *Introduction to Algorithms*, 3rd ed. — for proofs and formal analysis.
- E. Balagurusamy, *Data Structures Using C* — for C implementation conventions and solved problems.
