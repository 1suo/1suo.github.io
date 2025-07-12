window.$docsify = {
  auto2top: true,
  loadSidebar: false,
  hideSidebar: true,
  homepage: "_index.md",
  maxLevel: 0,
  latex: {
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [["$$", "$$"]],
  },
  markdown: {
    renderer: {
      //render checkbox as emoji
      checkbox: function (checked) {
        return checked ? "☑️" : "🔲";
      },
      paragraph: function (text) {
        text = text.replace(/\n/g, "<br>");
        return `<p>${text}</p>`;
      },
    },
  },
};
