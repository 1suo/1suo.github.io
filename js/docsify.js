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
      listitem: function (text) {
        //render list item as div element
        return `<div class="list-item">${text}</div>`;
      },
      paragraph: function (text) {
        //if has "kanban:settings" or "kanban-plugin" in the text, don't render
        if (text.includes("kanban") || text.includes("%%")) {
          return "";
        }
      },
      code: function (code, lang) {
        //if has "kanban:settings" or "kanban-plugin" in the text, don't render
        if (code.includes("kanban")) {
	  return "";
        }
      },
    },
  },
};
