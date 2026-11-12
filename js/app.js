// ===== Referencias a los elementos de la página =====
const pantallas = {
  splash: document.getElementById('pantalla-splash'),
  login: document.getElementById('pantalla-login'),
  config: document.getElementById('pantalla-config'),
  listo: document.getElementById('pantalla-listo'),
  inicio: document.getElementById('pantalla-inicio'),
  pedidos: document.getElementById('pantalla-pedidos'),
  clientes: document.getElementById('pantalla-clientes'),
  reportes: document.getElementById('pantalla-reportes'),
  perfil: document.getElementById('pantalla-perfil'),
  nuevo: document.getElementById('pantalla-nuevo'),
  detalle: document.getElementById('pantalla-detalle'),
  cliente: document.getElementById('pantalla-cliente'),
  notif: document.getElementById('pantalla-notif'),
  configuracion: document.getElementById('pantalla-configuracion'),
  platillos: document.getElementById('pantalla-platillos'),
  platillo: document.getElementById('pantalla-platillo')
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

// Pila de pantallas visitadas: sirve para que la flecha "atrás" regrese a donde estabas
const pila = [];
let pantallaActual = '';

// Abre una pantalla secundaria (Nuevo pedido, Detalle...) recordando la actual
function abrirPantalla(nombre) {
  if (pantallaActual) pila.push(pantallaActual);
  mostrarPantalla(nombre, true);
}

// Flecha atrás: vuelve a la pantalla anterior (o a Inicio si no hay)
function volver() {
  mostrarPantalla(pila.pop() || 'inicio', true);
}

// Muestra solo la pantalla indicada y oculta las demás
function mostrarPantalla(nombre, conservarPila) {
  if (!conservarPila) pila.length = 0; // al cambiar de pestaña se olvida el recorrido
  pantallaActual = nombre;
  for (const [clave, el] of Object.entries(pantallas)) {
    el.hidden = clave !== nombre;
  }
  window.scrollTo(0, 0); // vuelve arriba al cambiar de pantalla

  // La barra inferior solo se ve en las pantallas principales y marca la actual
  const barra = document.getElementById('barra-inferior');
  barra.hidden = !PRINCIPALES.includes(nombre);
  barra.querySelectorAll('.barra__item').forEach((b) => {
    if (b.dataset.ir === nombre) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });

  // Vuelve a dibujar el contenido de la pantalla que se abre
  if (nombre === 'inicio') renderInicio();
  if (nombre === 'pedidos') renderPedidos();
  if (nombre === 'clientes') renderClientes();
  if (nombre === 'perfil') renderPerfil();
  if (nombre === 'notif') renderNotif();
  if (nombre === 'nuevo') prepararNuevoPedido();
  if (nombre === 'detalle') renderDetalle();
  if (nombre === 'cliente') renderCliente();
  if (nombre === 'platillos') renderPlatillos();
  if (nombre === 'platillo') prepararPlatillo();
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
