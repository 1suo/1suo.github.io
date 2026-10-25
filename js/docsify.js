const MOBILE_SIDEBAR_QUERY = "(max-width: 768px)";

function setupSidebar() {
  const search = document.querySelector(".search");
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.querySelector(".sidebar-toggle");
  const themeSwitcher = document.querySelector("#theme-switcher");
  if (!sidebar) return null;

  const mobileViewport = window.matchMedia(MOBILE_SIDEBAR_QUERY);
  const inputWrap = search ? search.querySelector(".input-wrap") : null;
  const actions = document.createElement("div");
  const closeButton = document.createElement("button");
  let focusBeforeSidebar;

  actions.className = "sidebar-actions";
  closeButton.className = "sidebar-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close sidebar");
  closeButton.textContent = "X";
  if (themeSwitcher) actions.appendChild(themeSwitcher);
  actions.appendChild(closeButton);

  document.body.appendChild(actions);

  function setSidebarOpen(open, restoreFocus) {
    const wasOpen = sidebar.classList.contains("sidebar-open");
    const shouldOpen = Boolean(open && mobileViewport.matches);
    if (shouldOpen && !wasOpen) focusBeforeSidebar = document.activeElement;

    sidebar.classList.toggle("sidebar-open", shouldOpen);
    document.body.classList.toggle("sidebar-is-open", shouldOpen);
    if (sidebarToggle) sidebarToggle.setAttribute("aria-expanded", String(shouldOpen));

    if (shouldOpen && !wasOpen) {
      requestAnimationFrame(function () {
        closeButton.focus();
      });
    } else if (!shouldOpen && wasOpen && restoreFocus !== false) {
      requestAnimationFrame(function () {
        const target =
          focusBeforeSidebar && document.contains(focusBeforeSidebar)
            ? focusBeforeSidebar
            : sidebarToggle;
        if (target) target.focus();
      });
    }
  }

  function syncSidebarMode() {
    if (mobileViewport.matches) {
      sidebar.setAttribute("role", "dialog");
      sidebar.setAttribute("aria-modal", "true");
      sidebar.setAttribute("aria-label", "Site navigation");
    } else {
      sidebar.removeAttribute("role");
      sidebar.removeAttribute("aria-modal");
      sidebar.removeAttribute("aria-label");
      setSidebarOpen(false, false);
    }
    // The theme switch rides the search row in BOTH modes (on mobile the
    // bottom bar is reserved for the close pill alone).
    if (themeSwitcher && inputWrap && themeSwitcher.parentNode !== inputWrap) {
      inputWrap.appendChild(themeSwitcher);
    }
  }

  closeButton.addEventListener("click", function () {
    setSidebarOpen(false);
  });

  if (sidebarToggle) {
    if (!sidebar.id) sidebar.id = "site-sidebar";
    sidebarToggle.replaceChildren("=");
    sidebarToggle.setAttribute("aria-label", "Open sidebar");
    sidebarToggle.setAttribute("aria-controls", sidebar.id);
    sidebarToggle.setAttribute("aria-expanded", "false");
    sidebarToggle.addEventListener("click", function () {
      setSidebarOpen(!sidebar.classList.contains("sidebar-open"));
    });
  }

  sidebar.addEventListener("click", function (event) {
    if (event.target.closest("a") && mobileViewport.matches) {
      setSidebarOpen(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setSidebarOpen(false);
  });

  document.addEventListener("click", function (event) {
    if (
      document.body.classList.contains("sidebar-is-open") &&
      !sidebar.contains(event.target) &&
      !actions.contains(event.target) &&
      (!sidebarToggle || !sidebarToggle.contains(event.target)) &&
      !event.target.closest("button.hashtag")
    ) {
      setSidebarOpen(false);
    }
  });

  syncSidebarMode();
  mobileViewport.addEventListener("change", syncSidebarMode);

  return {
    mobileViewport: mobileViewport,
    search: search,
    setOpen: setSidebarOpen,
    sidebar: sidebar,
  };
}

function setupSidebarFooter(sidebar) {
  const footer = document.querySelector("body > footer");
  if (footer) sidebar.appendChild(footer);
}

function setupHashtagSearch(search, setSidebarOpen, mobileViewport) {
  document.addEventListener("click", function (event) {
    const hashtag = event.target.closest("button.hashtag");
    if (!hashtag) return;

    const input = search && search.querySelector("input");
    if (!input) return;
    if (mobileViewport.matches) setSidebarOpen(true);
    input.value = hashtag.dataset.hashtag;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  });
}

function renderSidebarHashtags() {
  const nav = document.querySelector(".sidebar-nav");
  if (!nav) return;

  const test = /(^|[\s(["'“‘])#([\p{L}\p{N}_][\p{L}\p{N}_-]*)/u;
  const pattern = /(^|[\s(["'“‘])#([\p{L}\p{N}_][\p{L}\p{N}_-]*)/gu;
  const walker = document.createTreeWalker(nav, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      const parent = node.parentElement;
      if (!parent || parent.closest("a, code, button, .app-sub-sidebar")) {
        return NodeFilter.FILTER_REJECT;
      }
      return test.test(node.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(function (node) {
    const fragment = document.createDocumentFragment();
    let match;
    let last = 0;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(node.nodeValue))) {
      fragment.append(node.nodeValue.slice(last, match.index + match[1].length));
      const hashtag = document.createElement("button");
      hashtag.className = "hashtag";
      hashtag.type = "button";
      hashtag.dataset.hashtag = "#" + match[2];
      hashtag.textContent = "#" + match[2];
      fragment.append(hashtag);
      last = match.index + match[0].length;
    }
    fragment.append(node.nodeValue.slice(last));
    node.replaceWith(fragment);
  });
}

// The search plugin prints result snippets as HTML-escaped RAW markdown
// (token.text from its lexer index), so `**bold**`, code spans and link
// syntax show up literally. Re-render each hit through the same pipeline
// the page uses (MarkdownExtensions + marked), then re-apply the keyword
// highlighting the plugin baked in — this time over DOM text ranges, so
// it survives compilation.
function setupSearchMarkdown(search) {
  if (!search) return;
  const panel = search.querySelector(".results-panel");
  if (!panel || typeof MutationObserver === "undefined") return;
  const markedRef = window.marked;
  if (!markedRef || typeof markedRef.parseInline !== "function") return;

  function compileInline(text) {
    try {
      const src = window.MarkdownExtensions
        ? window.MarkdownExtensions.transform(text, {
            route: window.location.hash.split("?")[0] || "#/",
          })
        : text;
      return markedRef.parseInline(src);
    } catch (e) {
      return null;
    }
  }

  // Wrap keyword occurrences in <em class="search-keyword"> (the class the
  // plugin itself emits) by walking text nodes of the compiled snippet.
  function highlight(root, query) {
    const keywords = query.trim().split(/[\s\-，\\/]+/).filter(Boolean);
    if (!keywords.length) return;
    if (keywords.length !== 1) keywords.unshift(query.trim());
    const unique = keywords.filter(function (k, i) {
      return k && keywords.indexOf(k) === i;
    });
    const regs = [];
    unique.forEach(function (k) {
      try {
        regs.push(new RegExp(k.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"), "gi"));
      } catch (e) {
        /* skip malformed keyword */
      }
    });
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      const text = node.nodeValue;
      const spans = [];
      regs.forEach(function (re) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text)) && m[0]) {
          spans.push([m.index, m.index + m[0].length]);
        }
      });
      if (!spans.length) return;
      spans.sort(function (a, b) {
        return a[0] - b[0] || a[1] - b[1];
      });
      const kept = [];
      spans.forEach(function (s) {
        if (kept.length && s[0] < kept[kept.length - 1][1]) return; // overlap
        kept.push(s);
      });
      const frag = document.createDocumentFragment();
      let pos = 0;
      kept.forEach(function (s) {
        if (pos < s[0]) frag.append(text.slice(pos, s[0]));
        const em = document.createElement("em");
        em.className = "search-keyword";
        em.textContent = text.slice(s[0], s[1]);
        frag.append(em);
        pos = s[1];
      });
      if (pos < text.length) frag.append(text.slice(pos));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function render(el, query) {
    const html = compileInline(el.textContent);
    if (html == null) return;
    const host = document.createElement("div");
    host.innerHTML = html;
    // Each hit card is one big <a>; nested links/buttons/images would make
    // the parser close that anchor early — flatten them to their text.
    Array.from(host.querySelectorAll("a, button, img")).forEach(function (n) {
      n.replaceWith(
        document.createTextNode(
          n.tagName === "IMG" ? n.getAttribute("alt") || "" : n.textContent
        )
      );
    });
    highlight(host, query);
    el.replaceChildren.apply(el, Array.from(host.childNodes));
  }

  const processed = new WeakSet();
  const observer = new MutationObserver(function (records) {
    const input = search.querySelector("input");
    const query = input ? input.value : "";
    records.forEach(function (r) {
      Array.from(r.addedNodes).forEach(function (n) {
        if (n.nodeType !== 1) return;
        // doSearch() sets panel.innerHTML, adding whole .matching-post
        // cards at once (own rewrites only add em/text, never these).
        const posts = n.classList.contains("matching-post")
          ? [n]
          : Array.from(n.querySelectorAll(".matching-post"));
        posts.forEach(function (post) {
          if (processed.has(post)) return;
          processed.add(post);
          const h2 = post.querySelector("h2");
          const p = post.querySelector("p");
          if (h2) render(h2, query);
          if (p) render(p, query);
        });
      });
    });
  });
  observer.observe(panel, { childList: true, subtree: true });
}

// Keep the sidebar outline in step with reading: when docsify's scroll-spy
// moves the .active marker, scroll the outline just enough to reveal the
// active link — never jumps when it is already visible, never scrolls the
// page itself (only nav.scrollTop is touched).
function setupSidebarScrollSpy(sidebar) {
  const nav = sidebar.querySelector(".sidebar-nav");
  if (!nav || typeof MutationObserver === "undefined") return;

  function reveal(li) {
    const navTop = nav.getBoundingClientRect().top;
    const rect = li.getBoundingClientRect();
    const top = rect.top - navTop;
    const bottom = top + rect.height;
    const pad = 8;
    if (top < pad) nav.scrollTop += top - pad;
    else if (bottom > nav.clientHeight - pad)
      nav.scrollTop += bottom - nav.clientHeight + pad;
  }

  let pending = null;
  const observer = new MutationObserver(function (records) {
    let target = null;
    records.forEach(function (r) {
      if (r.target.nodeType === 1 && r.target.classList.contains("active"))
        target = r.target;
    });
    if (!target) return;
    const li = target.closest("li") || target;
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(function () {
      pending = null;
      if (li.isConnected) reveal(li);
    });
  });
  observer.observe(nav, {
    attributes: true,
    attributeFilter: ["class"],
    subtree: true,
  });
}

function wrapContentImages() {
  document.querySelectorAll("main img").forEach(function (img) {
    if (img.parentElement.tagName === "A") return;
    const link = document.createElement("a");
    link.href = img.src;
    link.className = "pswp-zoom";
    img.replaceWith(link);
    link.appendChild(img);

    const setSize = function () {
      link.dataset.pswpWidth = img.naturalWidth;
      link.dataset.pswpHeight = img.naturalHeight;
    };
    if (img.complete) setSize();
    else img.addEventListener("load", setSize, { once: true });
  });
}

// Docsify (v4 and v5) builds the page outline in Compiler#subSidebar with
// genTree(), whose parent lookup goes stale: when a shallower heading follows
// deeper ones (## ... # ... ###), the deep headings keep nesting under the
// previous same-level-minus-one parent, so they render above their real
// parent and the outline order breaks. Rebuild the tree with a
// nearest-shallower-parent stack, and drop a leading page-title heading of
// any level (upstream only drops h1, so pages titled with h2 leak the title
// into their own outline).
function buildSubSidebarTree(toc, maxLevel) {
  const tree = [];
  const stack = [];

  toc.forEach(function (heading) {
    if (heading.level > maxLevel) return;

    const node = {
      level: heading.level,
      title: heading.title,
      slug: heading.slug,
      children: [],
    };

    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length) stack[stack.length - 1].children.push(node);
    else tree.push(node);

    stack.push(node);
  });

  return tree;
}

function renderSubSidebarTree(nodes) {
  if (!nodes.length) return "";

  return (
    '<ul class="app-sub-sidebar">' +
    nodes
      .map(function (node) {
        const title = node.title.replace(/(<([^>]+)>)/g, "");
        return (
          '<li><a class="section-link" href="' +
          node.slug +
          '" title="' +
          title +
          '">' +
          node.title +
          "</a></li>" +
          (node.children.length ? renderSubSidebarTree(node.children) : "")
        );
      })
      .join("") +
    "</ul>"
  );
}

function fixSubSidebarOutline(compiler) {
  compiler.subSidebar = function (level) {
    if (!level) {
      this.toc = [];
      return;
    }

    const currentPath = this.router.getCurrentPath();
    const cachedTree = this.cacheTree[currentPath];
    if (!cachedTree || (!cachedTree.length && this.toc.length)) {
      const toc = this.toc;
      if (toc[0] && toc[0].ignoreAllSubs) toc.splice(0);
      if (
        toc[0] &&
        toc.every(function (heading) {
          return heading.level >= toc[0].level;
        })
      ) {
        toc.shift();
      }
      for (let i = 0; i < toc.length; i++) {
        if (toc[i].ignoreSubHeading) {
          toc.splice(i, 1);
          i--;
        }
      }
      this.cacheTree[currentPath] = buildSubSidebarTree(toc, level);
    }

    this.toc = [];
    return renderSubSidebarTree(this.cacheTree[currentPath]);
  };
}

window.$docsify = {
  alias: { "/.*/_sidebar.md": "/_sidebar.md" },
  auto2top: true,
  loadSidebar: true,
  hideSidebar: false,
  homepage: "_index.md",
  maxLevel: 0,
  subMaxLevel: 5,
  search: {
    paths: "auto",
    placeholder: "Поиск",
    noData: "No results",
  },
  plugins: [
    function (hook, vm) {
      hook.mounted(function () {
        fixSubSidebarOutline(vm.compiler);
      });

      hook.beforeEach(function (markdown) {
        const route = window.location.hash.split("?")[0] || "#/";
        return window.MarkdownExtensions.transform(markdown, { route: route });
      });

      hook.ready(function () {
        renderSidebarHashtags();
        const sidebarUi = setupSidebar();
        if (!sidebarUi) return;
        setupSidebarFooter(sidebarUi.sidebar);
        setupSidebarScrollSpy(sidebarUi.sidebar);
        setupSearchMarkdown(sidebarUi.search);
        setupHashtagSearch(
          sidebarUi.search,
          sidebarUi.setOpen,
          sidebarUi.mobileViewport
        );
      });
    },
    function (hook) {
      hook.doneEach(wrapContentImages);
    },
  ],
  markdown: {
    breaks: true,
  },
};
