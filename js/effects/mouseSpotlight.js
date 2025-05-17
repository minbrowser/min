// js/effects/mouseSpotlight.js

function updateMousePosition(event) {
  const x = event.clientX;
  const y = event.clientY;
  document.documentElement.style.setProperty('--mouse-x', `${x}px`);
  document.documentElement.style.setProperty('--mouse-y', `${y}px`);
}

function activateSpotlightEffect() {
  // Solo activar en tema oscuro y si el efecto está "habilitado" (podrías añadir un setting para esto luego)
  if (document.body.classList.contains('dark-theme')) {
    window.addEventListener('mousemove', updateMousePosition);
  }
}

function deactivateSpotlightEffect() {
  window.removeEventListener('mousemove', updateMousePosition);
}

// Observador para cambios en la clase del body (para detectar cambio de tema)
const themeObserver = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      if (document.body.classList.contains('dark-theme')) {
        activateSpotlightEffect();
      } else {
        deactivateSpotlightEffect();
      }
    }
  }
});

// Iniciar la observación de cambios en el body
themeObserver.observe(document.body, { attributes: true });

// Activar inicialmente si ya está en tema oscuro al cargar la página
if (document.body.classList.contains('dark-theme')) {
  activateSpotlightEffect();
} 