const mobileMenu = document.querySelector(".mobile-menu");

if (mobileMenu) {
  const closeMenu = () => mobileMenu.removeAttribute("open");

  mobileMenu.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  const desktopMedia = window.matchMedia("(min-width: 901px)");
  desktopMedia.addEventListener("change", ({ matches }) => {
    if (matches) closeMenu();
  });
}
