window.onload = function () {
  let theme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "🌚"
    : "🌞";
  let body = document.documentElement;

  let button = document.getElementById("theme-switcher");
  button.style.cursor = "pointer";
  button.innerText = theme == "🌚" ? "🌞" : "🌚";
  button.style.float = "right";
  setTheme(theme);

  button.addEventListener("click", () => {
    setTheme(theme == "🌚" ? "🌞" : "🌚");
  });

  function setTheme(target) {
    if (target === "🌚") {
      theme = "🌚";
      body.style.backgroundColor = "black";
      body.style.color = "white";

      const links = document.querySelectorAll("a");
      links.forEach((link) => {
        link.style.setProperty("--color", "springgreen");
        link.style.setProperty("--hover", "yellow");
        link.style.setProperty("--visited", "magenta");
      });
      button.innerText = "🌞";
    } else {
      theme = "🌞";
      body.style.backgroundColor = "whitesmoke";
      body.style.color = "black";

      const links = document.querySelectorAll("a");
      links.forEach((link) => {
        link.style.setProperty("--color", "blue");
        link.style.setProperty("--hover", "cyan");
        link.style.setProperty("--visited", "magenta");
      });
      button.innerText = "🌚";
    }
  }
};
