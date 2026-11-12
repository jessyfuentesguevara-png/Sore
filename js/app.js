// ===== Referencias a los elementos de la página =====
const pantallas = {
  splash: document.getElementById('pantalla-splash'),
  login: document.getElementById('pantalla-login'),
  config: document.getElementById('pantalla-config'),
  listo: document.getElementById('pantalla-listo'),
  inicio: document.getElementById('pantalla-inicio')
};
const aviso = document.getElementById('aviso');
const formLogin = document.getElementById('form-login');
const campoCorreo = document.getElementById('correo');
const campoClave = document.getElementById('clave');
const btnVerClave = document.getElementById('btn-ver-clave');
const btnEntrar = document.getElementById('btn-entrar');
const btnOlvide = document.getElementById('btn-olvide');
const btnSalir = document.getElementById('btn-salir');
const msgError = document.getElementById('login-error');

// Muestra solo la pantalla indicada y oculta las demás
function mostrarPantalla(nombre) {
  for (const [clave, el] of Object.entries(pantallas)) {
    el.hidden = clave !== nombre;
  }
  window.scrollTo(0, 0); // vuelve arriba al cambiar de pantalla
}

// Después de iniciar sesión: si falta la configuración inicial va ahí; si no, al inicio
function entrarALaApp() {
  if (hayConfiguracion()) {
    mostrarPantalla('inicio');
  } else {
    iniciarConfiguracion();   // deja la configuración en el paso 1
    mostrarPantalla('config');
  }
}

// Muestra un mensaje flotante 3 segundos
let temporizadorAviso;
function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, 3000);
}

// Muestra u oculta el mensaje de error del login y marca los campos en rojo
function mostrarError(texto) {
  msgError.textContent = texto || '';
  msgError.hidden = !texto;
  campoCorreo.closest('.campo').classList.toggle('campo--error', !!texto);
  campoClave.closest('.campo').classList.toggle('campo--error', !!texto);
}

// Ojo: alterna entre ver y ocultar la contraseña
btnVerClave.addEventListener('click', () => {
  const oculta = campoClave.type === 'password';
  campoClave.type = oculta ? 'text' : 'password';
  btnVerClave.setAttribute('aria-label', oculta ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

// Al escribir se quita el error anterior
[campoCorreo, campoClave].forEach((c) => c.addEventListener('input', () => mostrarError('')));

// Envío del formulario de login
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault(); // evita que la página se recargue

  // Validación básica antes de "llamar al servidor"
  if (!campoCorreo.value.trim() || !campoClave.value) {
    mostrarError('Escribe tu correo y tu contraseña.');
    return;
  }
  if (!campoCorreo.checkValidity()) {
    mostrarError('Revisa que el correo esté bien escrito.');
    return;
  }

  // Estado "cargando": botón desactivado con texto de espera
  btnEntrar.disabled = true;
  btnEntrar.textContent = 'Entrando...';

  const resultado = await iniciarSesion(campoCorreo.value, campoClave.value);

  // Vuelve el botón a la normalidad
  btnEntrar.disabled = false;
  btnEntrar.textContent = 'Iniciar sesión';

  if (resultado.ok) {
    formLogin.reset();
    entrarALaApp();
  } else {
    mostrarError(resultado.mensaje);
  }
});

// Enlace de contraseña: la pantalla aún no está diseñada
btnOlvide.addEventListener('click', () => {
  mostrarAviso('Restablecer contraseña estará disponible pronto.');
});

// Cerrar sesión desde la pantalla provisional
btnSalir.addEventListener('click', () => {
  cerrarSesion();
  mostrarPantalla('login');
});

// Arranque: splash 2 segundos y luego login (o inicio si ya había sesión)
setTimeout(() => {
  if (haySesion()) entrarALaApp(); else mostrarPantalla('login');
}, 2000);

// Solo para pruebas: borra la configuración y vuelve a mostrar los 3 pasos
document.getElementById('btn-repetir-config').addEventListener('click', () => {
  borrarConfiguracion();
  entrarALaApp();
});

// Registra el service worker (permite abrir sin conexión)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}
