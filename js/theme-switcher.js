(function () {
  const root = document.documentElement;
  const themes = {
    dark: {
      background: "black",
      body: "gainsboro",
      color: "gold",
      hover: "yellow",
      visited: "darkkhaki",
      icon: "🌞",
      label: "Use light theme",
    },
    light: {
      background: "gainsboro",
      body: "black",
      color: "mediumblue",
      hover: "dodgerblue",
      visited: "darkorchid",
      icon: "🌚",
      label: "Use dark theme",
    },
  };
  const savedTheme = localStorage.getItem("theme");
  let theme =
    savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  let button;

  function setTheme(name, persist) {
    const values = themes[name];
    theme = name;
    root.dataset.theme = name;
    root.style.colorScheme = name;
    root.style.backgroundColor = values.background;
    root.style.color = values.body;
    root.style.setProperty("--sidebar-background", values.background);
    root.style.setProperty("--body-color", values.body);
    root.style.setProperty("--link-color", values.color);
    root.style.setProperty("--link-hover", values.hover);
    root.style.setProperty("--link-visited", values.visited);

    if (button) {
      button.textContent = values.icon;
      button.setAttribute("aria-label", values.label);
    }
    if (persist) localStorage.setItem("theme", name);
  }

  setTheme(theme, false);

  document.addEventListener("DOMContentLoaded", function () {
    button = document.getElementById("theme-switcher");
    if (!button) return;
    button.hidden = false;
    button.addEventListener("click", function () {
      setTheme(theme === "dark" ? "light" : "dark", true);
    });
    setTheme(theme, false);
  });
})();
