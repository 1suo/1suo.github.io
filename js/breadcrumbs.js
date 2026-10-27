// Breadcrumb trail above the content: the site is flat, so the trail is
// "home › current page" — a way back for readers deep in the newspaper
// columns (and on mobile, where the sidebar hides behind a toggle).
//
// The current page's title comes from the sidebar — the canonical labels,
// and the only source for pages titled with h2 — falling back to the
// page's first heading, then to the route's last segment prettified.
//
// The nav carries .breadcrumbs, which js/columns.js skips when capturing
// blocks: the trail belongs above the columns, never inside one. Load
// after js/docsify.js (appends itself to $docsify.plugins).

(function () {
  "use strict";

  var HOME_LABEL = "Главная";

  // "#/md/foo.md?id=x" and "/md/foo/" → "/md/foo": sidebar link hrefs
  // keep the .md docsify's route.path strips, so compare through this.
  function normalize(href) {
    var hashAt = href.indexOf("#");
    var path = hashAt >= 0 ? href.slice(hashAt + 1) : href;
    path = path.split("?")[0].replace(/\.md$/i, "");
    if (path.length > 1) path = path.replace(/\/+$/, "");
    return path || "/";
  }

  function sidebarTitle(path) {
    var links = document.querySelectorAll(".sidebar-nav a");
    for (var i = 0; i < links.length; i++) {
      // section links of the page outline (.app-sub-sidebar) share the
      // page's route — only real nav links name the page
      if (links[i].closest(".app-sub-sidebar")) continue;
      if (normalize(links[i].getAttribute("href") || "") === path)
        return links[i].textContent.trim();
    }
    return null;
  }

  function pageTitle(path, article) {
    var title = sidebarTitle(path);
    if (!title) {
      var heading = article.querySelector("h1, h2");
      if (heading) title = heading.textContent.trim();
    }
    if (!title) title = path.split("/").pop().replace(/[-_]+/g, " ");
    return title;
  }

  function render(path, article) {
    var stale = article.querySelector(":scope > .breadcrumbs");
    if (stale) stale.remove();

    var nav = document.createElement("nav");
    nav.className = "breadcrumbs";
    nav.setAttribute("aria-label", "Breadcrumb");

    var ol = document.createElement("ol");

    var homeItem = document.createElement("li");
    var homeLink = document.createElement("a");
    homeLink.href = "#/";
    homeLink.textContent = HOME_LABEL;
    homeItem.appendChild(homeLink);

    var current = document.createElement("li");
    current.textContent = pageTitle(path, article);
    current.setAttribute("aria-current", "page");

    ol.appendChild(homeItem);
    ol.appendChild(current);
    nav.appendChild(ol);
    article.insertBefore(nav, article.firstChild);
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(
    function (hook, vm) {
      hook.doneEach(function () {
        var article = document.querySelector(".markdown-section");
        if (!article) return;
        var path = normalize(vm.route.path);
        if (path === "/") return; // the trail is "home › page": none on the home page
        render(path, article);
      });
    }
  );
})();
