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
  closeButton.textContent = "×";
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
      if (themeSwitcher) actions.insertBefore(themeSwitcher, closeButton);
    } else {
      sidebar.removeAttribute("role");
      sidebar.removeAttribute("aria-modal");
      sidebar.removeAttribute("aria-label");
      setSidebarOpen(false, false);
      if (themeSwitcher && inputWrap) {
        inputWrap.appendChild(themeSwitcher);
      }
    }
  }

  closeButton.addEventListener("click", function () {
    setSidebarOpen(false);
  });

  if (sidebarToggle) {
    if (!sidebar.id) sidebar.id = "site-sidebar";
    sidebarToggle.replaceChildren("📄");
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
