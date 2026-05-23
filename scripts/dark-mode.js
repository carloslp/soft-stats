/* =========================================================
   dark-mode.js — Dark / Light mode toggle with persistence
   ========================================================= */
(function () {
  var btn = document.getElementById('dark-mode-toggle');
  if (!btn) return;

  function updateUI() {
    var isDark = document.documentElement.classList.contains('dark');
    btn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    btn.setAttribute('title', isDark ? 'Modo claro' : 'Modo oscuro');
    var sunIcon  = btn.querySelector('.dm-sun');
    var moonIcon = btn.querySelector('.dm-moon');
    if (sunIcon)  sunIcon.hidden  = !isDark;
    if (moonIcon) moonIcon.hidden =  isDark;
  }

  // Sync button state with whatever the anti-flash script already applied
  updateUI();

  btn.addEventListener('click', function () {
    var isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateUI();
  });
})();
