window.onload = function () {
  let dark = "🌚";
  let light = "🌞";
  // let dark = "☾";
  // let light = "☀ ";
  // let dark = "dark";
  // let light = "light";
  let theme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? dark
    : "light";
  let body = document.documentElement;
  let button = document.getElementById("theme-switcher");
  button.hidden = false;
  button.style.cursor = "pointer";
  button.innerText = theme == dark ? light : dark;
  setTheme(theme);

  button.addEventListener("click", () => {
    setTheme(theme == dark ? light : dark);
  });

  function setTheme(target) {
    body.style.colorScheme = target === dark ? "dark" : "light";
    if (target === dark) {
      theme = dark;
      body.style.backgroundColor = "black";
      body.style.setProperty("--sidebar-background", "black");
      body.style.setProperty("--body-color", "gainsboro");
      body.style.color = "gainsboro";
      body.style.setProperty("--color", "gold");
      body.style.setProperty("--hover", "yellow");
      body.style.setProperty("--visited", "darkkhaki");
      // h2.style.color = "red";
      button.innerText = light;
      button.setAttribute("aria-label", "Use light theme");
    } else {
      theme = light;
      body.style.backgroundColor = "gainsboro";
      body.style.setProperty("--sidebar-background", "gainsboro");
      body.style.setProperty("--body-color", "black");
      body.style.color = "black";
      body.style.setProperty("--color", "mediumblue");
      body.style.setProperty("--hover", "dodgerblue");
      body.style.setProperty("--visited", "darkorchid");
      button.innerText = dark;
      button.setAttribute("aria-label", "Use dark theme");
    }
  }
};
