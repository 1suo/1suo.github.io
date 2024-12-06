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
        // if text contains words that are hastags start with "#", insert a divs in their place with class "tag"
	// split the text into words, split by space and html special characters
        let words = text.split(/(\s|&lt;|&gt;)/);
        let newText = "";
        words.forEach((word) => {
          if (word.startsWith("#")) {
            newText += `<mark><small>${word}</small></mark>`;
          } else {
            newText += word + " ";
          }
        });
        //render list item as div element
        return `<div class="list-item">${newText}</div>`;
      },
      paragraph: function (text) {
        //if has "kanban:settings" or "kanban-plugin" in the text, don't render
        if (text.includes("kanban") || text.includes("%%")) {
          return "";
        } else {
          return text;
        }
      },
      code: function (code, lang) {
        //if has "kanban:settings" or "kanban-plugin" in the text, don't render
        if (code.includes("kanban")) {
          return "";
        } else {
          return `<pre><code class="language-${lang}">${code}</code></pre>`;
        }
      },
    },
  },
};
