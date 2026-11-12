// ===== Configuración inicial (3 pasos) =====
// Los datos se guardan en este celular (localStorage) de forma PROVISIONAL.
// Cuando se conecte Supabase, "guardarConfiguracion" enviará los datos al servidor.

const CLAVE_CONFIG = 'sore_config';

// Datos que se van juntando mientras la persona avanza por los pasos
const datosConfig = {
  nombre: '', negocio: '', tipo: '', whatsapp: '', ciudad: '',
  dias: [], desde: '08:00', hasta: '16:00',
  entrega: [], pago: [], eventos: false
};
let pasoActual = 1;

// Atajo para buscar un elemento por su id
const $ = (id) => document.getElementById(id);

// ¿Ya se terminó la configuración en este celular?
function hayConfiguracion() {
  try { return localStorage.getItem(CLAVE_CONFIG) !== null; } catch (e) { return false; }
}

// Borra la configuración guardada (solo para pruebas)
function borrarConfiguracion() {
  try { localStorage.removeItem(CLAVE_CONFIG); } catch (e) { /* nada que borrar */ }
}

// Guarda la configuración; devuelve una promesa que simula la espera del servidor
function guardarConfiguracion() {
  return new Promise((resolve) => {
    setTimeout(() => {
      try { localStorage.setItem(CLAVE_CONFIG, JSON.stringify(datosConfig)); } catch (e) { /* sin almacenamiento */ }
      resolve({ ok: true });
    }, 700);
  });
}

// ----- Mensajes de error por campo -----
// Muestra (o quita) el mensaje debajo de un campo y pone el borde rojo
function errorCampo(idMensaje, texto, contenedor) {
  const msg = $(idMensaje);
  msg.textContent = texto || '';
  msg.hidden = !texto;
  if (contenedor) contenedor.classList.toggle(contenedor.classList.contains('opciones') ? 'opciones--error' : 'campo--error', !!texto);
}

// ----- Navegación entre pasos -----
function irAlPaso(n) {
  pasoActual = n;
  [1, 2, 3].forEach((i) => { $('paso-' + i).hidden = i !== n; });
  $('cfg-contador').textContent = n + ' de 3';
  $('cfg-relleno').style.width = (n / 3 * 100) + '%'; // el paso 3 llega al 100%
  $('cfg-atras').hidden = n === 1;                    // sin flecha en el paso 1
  window.scrollTo(0, 0);
}

// Se llama al empezar la configuración (desde app.js)
function iniciarConfiguracion() { irAlPaso(1); }

// Flecha de regreso
$('cfg-atras').addEventListener('click', () => { if (pasoActual > 1) irAlPaso(pasoActual - 1); });

// ----- Vista previa de foto y logo -----
// Muestra la imagen elegida dentro del marco (no se guarda todavía)
function vistaPrevia(inputId, imgId) {
  $(inputId).addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const img = $(imgId);
    img.src = URL.createObjectURL(archivo);
    img.hidden = false;
  });
}
vistaPrevia('foto-perfil', 'foto-perfil-vista');
vistaPrevia('logo-negocio', 'logo-vista');

// ----- Paso 1: tu perfil -----
$('paso-1').addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = $('cfg-nombre').value.trim();
  errorCampo('err-nombre', nombre ? '' : 'Escribe tu nombre.', $('cfg-nombre').closest('.campo'));
  if (!nombre) return;
  datosConfig.nombre = nombre;
  irAlPaso(2);
});

// ----- Paso 2: tu negocio -----
$('paso-2').addEventListener('submit', (e) => {
  e.preventDefault();
  const negocio = $('cfg-negocio').value.trim();
  const tipo = $('cfg-tipo').value;
  const whatsapp = $('cfg-whatsapp').value.replace(/\D/g, ''); // solo dígitos
  // El WhatsApp es opcional, pero si se escribe debe tener 10 dígitos
  const whatsappMal = whatsapp !== '' && whatsapp.length !== 10;

  errorCampo('err-negocio', negocio ? '' : 'Escribe el nombre de tu negocio.', $('cfg-negocio').closest('.campo'));
  errorCampo('err-tipo', tipo ? '' : 'Elige un tipo de negocio.', $('cfg-tipo').closest('.campo'));
  errorCampo('err-whatsapp', whatsappMal ? 'Escribe los 10 dígitos del número.' : '', $('cfg-whatsapp').closest('.campo'));
  if (!negocio || !tipo || whatsappMal) return;

  Object.assign(datosConfig, { negocio, tipo, whatsapp, ciudad: $('cfg-ciudad').value.trim() });
  irAlPaso(3);
});

// ----- Paso 3: cómo trabajan -----
// Tarjetas de opción: cada toque activa o desactiva (se pueden elegir varias)
function activarOpciones(idContenedor, clave, idError) {
  $(idContenedor).addEventListener('click', (e) => {
    const boton = e.target.closest('.opcion');
    if (!boton) return;
    const activo = boton.getAttribute('aria-pressed') === 'true';
    boton.setAttribute('aria-pressed', String(!activo));
    // Actualiza la lista de valores elegidos
    datosConfig[clave] = [...$(idContenedor).querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.valor);
    errorCampo(idError, '', $(idContenedor)); // al elegir algo se quita el error
  });
}
activarOpciones('opc-entrega', 'entrega', 'err-entrega');
activarOpciones('opc-pago', 'pago', 'err-pago');

// Interruptor de eventos
$('sw-eventos').addEventListener('click', () => {
  datosConfig.eventos = !datosConfig.eventos;
  $('sw-eventos').setAttribute('aria-checked', String(datosConfig.eventos));
});

// ----- Hoja de días y horario (provisional) -----
$('btn-horario').addEventListener('click', () => { $('hoja-horario').hidden = false; });
$('dias').addEventListener('click', (e) => {
  const d = e.target.closest('.dia');
  if (d) d.setAttribute('aria-pressed', String(d.getAttribute('aria-pressed') !== 'true'));
});
$('btn-hoja-ok').addEventListener('click', () => {
  const dias = [...$('dias').querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.dia);
  const desde = $('hora-desde').value;
  const hasta = $('hora-hasta').value;
  // Validaciones: al menos un día y la hora de cierre después de la de apertura
  if (!dias.length) { errorCampo('err-hoja', 'Elige al menos un día.'); return; }
  if (!desde || !hasta || hasta <= desde) { errorCampo('err-hoja', 'La hora final debe ser después de la inicial.'); return; }
  errorCampo('err-hoja', '');
  Object.assign(datosConfig, { dias, desde, hasta });
  $('horario-texto').textContent = dias.join(', ') + ' · ' + desde + ' a ' + hasta;
  errorCampo('err-horario', '', $('btn-horario'));
  $('hoja-horario').hidden = true;
});
// Tocar fuera de la caja cierra la hoja sin guardar
$('hoja-horario').addEventListener('click', (e) => { if (e.target === $('hoja-horario')) $('hoja-horario').hidden = true; });

// Finalizar: valida los obligatorios y guarda
$('paso-3').addEventListener('submit', async (e) => {
  e.preventDefault();
  const sinHorario = !datosConfig.dias.length;
  const sinEntrega = !datosConfig.entrega.length;
  const sinPago = !datosConfig.pago.length;
  errorCampo('err-horario', sinHorario ? 'Elige tus días y horario.' : '', $('btn-horario'));
  errorCampo('err-entrega', sinEntrega ? 'Elige al menos una opción.' : '', $('opc-entrega'));
  errorCampo('err-pago', sinPago ? 'Elige al menos una forma de pago.' : '', $('opc-pago'));
  if (sinHorario || sinEntrega || sinPago) return;

  // Botón desactivado con texto "Guardando..." mientras se guarda
  const boton = $('btn-finalizar');
  boton.disabled = true;
  boton.textContent = 'Guardando...';
  await guardarConfiguracion();
  boton.disabled = false;
  boton.textContent = 'Finalizar';
  mostrarPantalla('listo');
});

// ----- ¡Todo listo! -----
$('btn-ir-negocio').addEventListener('click', () => mostrarPantalla('inicio'));
$('btn-invitar').addEventListener('click', () => mostrarAviso('Invitar a tu socio/a estará disponible pronto.'));
