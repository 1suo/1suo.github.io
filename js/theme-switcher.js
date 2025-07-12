window.onload = function () {
  // let dark = "🌚";
  // let light = "🌞";
  let dark = "dark";
  let light = "light";
  let theme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? dark
    : "light";
  let body = document.documentElement;
  let nav = document.getElementsByTagName("nav")[0];

  let button = document.getElementById("theme-switcher");
  button.style.cursor = "pointer";
  button.innerText = theme == dark ? light : dark;
  button.style.float = "right";
  setTheme(theme);

  button.addEventListener("click", () => {
    setTheme(theme == dark ? light : dark);
  });

  function setTheme(target) {
    if (target === dark) {
      theme = dark;
      body.style.backgroundColor = "black";
      body.style.color = "beige";
      // nav.style.backgroundColor = "black";
      // nav.style.color = "white";
      // nav.style.borderColor = "#202020";

      const links = document.querySelectorAll("a");
      links.forEach((link) => {
        link.style.setProperty("--color", "springgreen");
        link.style.setProperty("--hover", "yellow");
        link.style.setProperty("--visited", "magenta");
      });
      button.innerText = light;
    } else {
      theme = light;
      body.style.backgroundColor = "whitesmoke";
      body.style.color = "black";
      // nav.style.backgroundColor = "whitesmoke";
      // nav.style.color = "black";
      // nav.style.borderColor = "gainsboro";

      const links = document.querySelectorAll("a");
      links.forEach((link) => {
        link.style.setProperty("--color", "blue");
        link.style.setProperty("--hover", "cyan");
        link.style.setProperty("--visited", "magenta");
      });
      button.innerText = dark;
    }
  }
};
