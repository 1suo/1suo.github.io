loadScript("js/theme-switcher.js");

loadCSS("css/awsm.css");
loadCSS("css/style.css");

loadCSS(
  "https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap"
);
loadCSS(
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,200;0,400;0,800;1,200;1,400;1,800&family=Space+Grotesk:wght@300;500;700&display=swap"
);
loadCSS(
  "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=PT+Serif+Caption:ital@0;1&display=swap"
);

loadScript("https://cdn.jsdelivr.net/npm/docsify@4/lib/docsify.min.js");
loadScript("js/docsify.js");
loadScript("//cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js");
loadScript("//cdn.jsdelivr.net/npm/docsify-latex@0");
// loadScript("//cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js");
// loadScript('https://cdn.jsdelivr.net/npm/docsify@4/lib/plugins/zoom-image.min.js');

fetch("../html/footer.html")
  .then((response) => response.text())
  .then((footerHtml) => {
    document.body.insertAdjacentHTML("beforeend", footerHtml);
  });

fetch("../html/header.html")
  .then((response) => response.text())
  .then((headerHtml) => {
    document.body.insertAdjacentHTML("afterbegin", headerHtml);
  });

function loadCSS(url) {
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = url;
  document.head.appendChild(link);
}

function loadScript(url) {
  var script = document.createElement("script");
  script.src = url;
  document.head.appendChild(script);
}

