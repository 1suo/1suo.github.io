let theme = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";
let body = document.documentElement;

let nav = document.getElementById("nav");
let button = document.createElement("button");
button.innerText = theme == "dark" ? "light" : "dark";
button.style.float = "right";
nav.appendChild(button);
setTheme(theme);

button.addEventListener("click", () => {
  setTheme(theme == "dark" ? "light" : "dark");
});

function setTheme(target) {
  if (target === "dark") {
    theme = "dark";
    body.style.backgroundColor = "black";
    body.style.color = "white";

    const links = document.querySelectorAll("a");
    links.forEach((link) => {
      link.style.color = "red";
    });

    button.style.backgroundColor = "black";
    button.style.color = "white";
    button.innerText = "light";
  } else {
    theme = "light";
    body.style.backgroundColor = "white";
    body.style.color = "black";

    const links = document.querySelectorAll("a");
    links.forEach((link) => {
      link.style.color = "blue";
    });

    button.style.backgroundColor = "white";
    button.style.color = "black";
    button.innerText = "dark";
  }
}
