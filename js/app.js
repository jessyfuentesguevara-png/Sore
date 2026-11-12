// Referencias a los elementos de la página que vamos a usar
const aviso = document.getElementById('aviso');
const formLogin = document.getElementById('form-login');
const btnOlvide = document.getElementById('btn-olvide');

// Muestra un mensaje flotante y lo oculta a los 3 segundos
function mostrarAviso(texto) {
  aviso.textContent = texto; // pone el texto del mensaje
  aviso.hidden = false;      // lo hace visible
  // Pasados 3 segundos lo vuelve a esconder
  setTimeout(() => { aviso.hidden = true; }, 3000);
}

// Al enviar el formulario evitamos recargar la página
formLogin.addEventListener('submit', (e) => {
  e.preventDefault();
  mostrarAviso('Inicio de sesión pendiente de conectar'); // aún no hay servidor
});

// Al pulsar "¿Olvidaste tu contraseña?" mostramos un aviso de ejemplo
btnOlvide.addEventListener('click', () => {
  mostrarAviso('Recuperación de contraseña pendiente de conectar');
});

// Registra el service worker (permite usar la app sin conexión)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}
