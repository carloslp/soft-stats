/* =========================================================
   lms-shell.js — Toggle del menú de navegación (móvil)
   Ahora controla el nav-bar horizontal que se convierte en
   drawer lateral en pantallas pequeñas.
   Sin dependencias. Se carga en las 7 páginas tras dark-mode.js.
   ========================================================= */
(function () {
  'use strict';

  var toggle = document.getElementById('lms-sidebar-toggle');
  var navBar = document.getElementById('lms-nav-bar');
  // Fallback: si no existe el nav-bar, intentar con el sidebar viejo
  var target = navBar || document.getElementById('lms-sidebar');
  if (!toggle || !target) return;

  var backdrop = document.createElement('div');
  backdrop.className = 'lms-backdrop';
  backdrop.hidden = true;
  document.body.appendChild(backdrop);

  function open() {
    document.body.classList.add('lms-sidebar-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Cerrar menú de navegación');
    backdrop.hidden = false;
    requestAnimationFrame(function () {
      backdrop.classList.add('lms-backdrop--visible');
    });
  }

  function close() {
    document.body.classList.remove('lms-sidebar-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú de navegación');
    backdrop.classList.remove('lms-backdrop--visible');
    backdrop.hidden = true;
  }

  function isOpen() {
    return document.body.classList.contains('lms-sidebar-open');
  }

  toggle.addEventListener('click', function () {
    if (isOpen()) close();
    else open();
  });

  // Cerrar al elegir un link de navegación
  target.querySelectorAll('.lms-nav-link, .lms-module').forEach(function (link) {
    link.addEventListener('click', close);
  });

  // Cerrar con Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) close();
  });

  // Cerrar al hacer clic en el backdrop
  backdrop.addEventListener('click', close);

  // Al volver a un ancho de escritorio, quitar el estado de abierto
  var mq = window.matchMedia('(min-width: 901px)');
  mq.addEventListener('change', function (ev) {
    if (ev.matches) close();
  });
})();