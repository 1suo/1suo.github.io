window.$docsify = {
  auto2top: true,
  loadSidebar: true,
  hideSidebar: false,
  homepage: "_index.md",
  maxLevel: 0,
  subMaxLevel: 3,
  search: {
    paths: [
      "/",
      "/md/lector",
      "/md/markdown-cheat-sheet",
      "/md/rowgasm",
      "/md/rowmance",
      "/md/rstv",
      "/md/site",
    ],
    placeholder: "Search",
    noData: "No results",
  },
  plugins: [
    function (hook) {
      hook.beforeEach(function (markdown) {
        const route = window.location.hash.split("?")[0] || "#/";
        return window.MarkdownExtensions.transform(markdown, { route: route });
      });

      hook.ready(function () {
        const search = document.querySelector(".search");
        const sidebar = document.querySelector(".sidebar");
        const sidebarToggle = document.querySelector(".sidebar-toggle");
        const themeSwitcher = document.querySelector("#theme-switcher");
        const footer = document.querySelector("body > footer");
        if (sidebar && themeSwitcher) {
          const actions = document.createElement("div");
          const closeButton = document.createElement("button");
          actions.className = "sidebar-actions";
          closeButton.className = "sidebar-close";
          closeButton.type = "button";
          closeButton.setAttribute("aria-label", "Close sidebar");
          closeButton.textContent = "×";
          actions.appendChild(themeSwitcher);
          actions.appendChild(closeButton);
          sidebar.insertBefore(actions, search || sidebar.firstChild);

          closeButton.addEventListener("click", function () {
            setSidebarOpen(false);
          });
        }

        if (sidebar && footer) {
          const mobileFooter = window.matchMedia("(max-width: 768px)");
          const placeFooter = function () {
            if (mobileFooter.matches) {
              document.body.insertBefore(footer, document.body.querySelector("script"));
            } else {
              sidebar.appendChild(footer);
            }
          };
          placeFooter();
          mobileFooter.addEventListener("change", placeFooter);
        }

        function setSidebarOpen(open) {
          if (!sidebar) return;
          sidebar.classList.toggle("sidebar-open", open);
          document.body.classList.toggle("sidebar-is-open", open);
        }

        if (sidebar && sidebarToggle) {
          sidebarToggle.replaceChildren("🏠");
          sidebarToggle.setAttribute("aria-label", "Open sidebar");
          sidebarToggle.addEventListener("click", function () {
            setSidebarOpen(!sidebar.classList.contains("sidebar-open"));
          });
          sidebar.addEventListener("click", function (event) {
            if (event.target.closest("a") && window.matchMedia("(max-width: 768px)").matches) {
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
              !sidebarToggle.contains(event.target) &&
              !event.target.closest("button.hashtag")
            ) {
              setSidebarOpen(false);
            }
          });
        }

        document.addEventListener("click", function (event) {
          const hashtag = event.target.closest("button.hashtag");
          if (!hashtag) return;

          const input = search && search.querySelector("input");
          if (!input) return;
          if (window.matchMedia("(max-width: 768px)").matches) {
            setSidebarOpen(true);
          }
          input.value = hashtag.dataset.hashtag;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
        });
      });
    },
    // wrap content images in <a> for photoswipe (js/gallery.js)
    function (hook) {
      hook.doneEach(function () {
        document.querySelectorAll("main img").forEach(function (img) {
          if (img.parentElement.tagName === "A") return;
          const a = document.createElement("a");
          a.href = img.src;
          a.className = "pswp-zoom";
          img.replaceWith(a);
          a.appendChild(img);
          const size = () => {
            a.dataset.pswpWidth = img.naturalWidth;
            a.dataset.pswpHeight = img.naturalHeight;
          };
          img.complete ? size() : img.addEventListener("load", size, { once: true });
        });
      });
    },
  ],
  latex: {
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [["$$", "$$"]],
  },
  markdown: {
    breaks: true,
    renderer: {
      //render checkbox as emoji
      // checkbox: function (checked) {
      //   return checked ? "☑️" : "🔲";
      // },
    },
  },
};
