loadCSS("css/awsm.css");
loadCSS("css/style.css");
// loadCSS("https://cdnjs.cloudflare.com/ajax/libs/fotorama/4.6.4/fotorama.css");
// loadCSS("css/zoom.css");

// loadCSS('https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap');
loadCSS(
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,200;0,400;0,800;1,200;1,400;1,800&family=Space+Grotesk:wght@300;500;700&display=swap"
);

// loadScript("https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js");
// loadScript("https://cdnjs.cloudflare.com/ajax/libs/fotorama/4.6.4/fotorama.js");
// loadScript("js/zoom.js");
// loadScript('https://kit.fontawesome.com/6d26624811.js')
loadScript("https://unpkg.com/htmx.org@1.9.10");

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
