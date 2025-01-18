window.onload = function () {
  let theme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "🌚"
    : "🌞";
  let body = document.documentElement;

  let nav = document.getElementById("nav");
  let button = document.createElement("a");
  button.style.cursor = "pointer";
  button.innerText = theme == "🌚" ? "🌞" : "🌚";
  button.style.float = "right";
  nav.appendChild(button);
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
        link.style.color = "red";
      });

      button.style.backgroundColor = "black";
      button.style.color = "white";
      button.innerText = "🌞";
    } else {
      theme = "🌞";
      body.style.backgroundColor = "white";
      body.style.color = "black";

      const links = document.querySelectorAll("a");
      links.forEach((link) => {
        link.style.color = "blue";
      });

      button.style.backgroundColor = "white";
      button.style.color = "black";
      button.innerText = "🌚";
    }
  }
};
