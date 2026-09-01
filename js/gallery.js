import PhotoSwipeLightbox from "./photoswipe-lightbox.esm.min.js";

new PhotoSwipeLightbox({
  gallery: "body", // docsify replaces #app with <main>, body is stable
  children: "a.pswp-zoom",
  wheelToZoom: true,
  pswpModule: () => import("./photoswipe.esm.min.js"),
}).init();
