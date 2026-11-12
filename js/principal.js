// ===== Pantallas principales: Inicio, Pedidos, Clientes, Perfil, Notificaciones =====

// Pantallas que llevan la barra inferior
const PRINCIPALES = ['inicio', 'pedidos', 'clientes', 'reportes', 'perfil'];

// Convierte texto a HTML seguro (evita que un nombre con "<" rompa la pantalla)
function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Configuración guardada (nombre de la persona, del negocio, horario, pagos...)
function leerConfig() { return leerJSON('sore_config', {}); }

// Textos de los estados y sus etiquetas de colores
const TEXTO_ESTADO = { pendiente: 'Recibido', preparando: 'En preparación', listo: 'Listo', entregado: 'Entregado' };
const TEXTO_TIPO = { comer: 'Comer aquí', llevar: 'Para llevar', domicilio: 'Domicilio' };
function etiquetaEstado(p) { return `<span class="etiqueta etiqueta--${p.estado}">${TEXTO_ESTADO[p.estado]}</span>`; }
function etiquetaPago(p) {
  return p.pagado ? '<span class="etiqueta etiqueta--pagado">Pagado</span>'
                  : '<span class="etiqueta etiqueta--cobrar">Por cobrar</span>';
}

// Estado vacío reutilizable (mascota con la olla)
function htmlVacio(titulo, texto) {
  return `<div class="vacio">
    <img src="img/mascota-olla.png" alt="">
    <h2>${esc(titulo)}</h2>
    <p>${esc(texto)}</p>
    <button type="button" class="boton boton--chico" data-abrir="nuevo">Registrar pedido</button>
  </div>`;
}

// Actualiza el número rojo de la campana
function actualizarInsignia() {
  const hay = calcularAlertas().length > 0;
  // Punto rojo en la campana de Inicio y de Pedidos
  $('ini-insignia').hidden = !hay;
  $('ped-insignia').hidden = !hay;
}

// ----- CLIENTES -----
let clienteActual = '';

function renderClientes() {
  const texto = $('cli-buscar').value.trim().toLowerCase();
  const lista = listaClientes().filter((c) => c.nombre.toLowerCase().includes(texto));
  if (!lista.length) {
    $('cli-lista').innerHTML = `<div class="vacio"><img src="img/mascota-asomada.png" alt=""><h2>${texto ? 'No encontré ese cliente' : 'Aún no tienes clientes'}</h2><p>${texto ? 'Revisa el nombre o agrégalo abajo.' : 'Cuando registres un pedido o agregues uno, aparecerá aquí.'}</p></div>`;
    return;
  }
  $('cli-lista').innerHTML = lista.map((c) => `
    <button type="button" class="tarjeta cliente-fila" data-cliente="${esc(c.nombre)}">
      <span class="avatar">${esc(iniciales(c.nombre))}</span>
      <span class="cliente-fila__datos"><b>${esc(c.nombre)}</b><small>${c.pedidos} ${c.pedidos === 1 ? 'pedido' : 'pedidos'} · ${dinero(c.total)}</small></span>
      <i>›</i>
    </button>`).join('');
}
$('cli-buscar').addEventListener('input', renderClientes);

// Detalle de un cliente: números, historial y observaciones
function renderCliente() {
  const c = listaClientes().find((x) => x.nombre === clienteActual);
  if (!c) { $('cl-contenido').innerHTML = '<p>Cliente no encontrado.</p>'; return; }
  const extra = leerClientesExtra()[c.nombre] || {};
  const historial = pedidosDeCliente(c.nombre);
  const frecuente = c.pedidos >= 3;
  $('cl-contenido').innerHTML = `
    <div class="tarjeta perfil__cabecera">
      <div class="avatar avatar--grande">${esc(iniciales(c.nombre))}</div>
      <div><div class="perfil__nombre">${esc(c.nombre)}</div><div class="suave">${c.telefono ? '📞 ' + esc(c.telefono) : 'Sin teléfono'}</div></div>
    </div>
    <div class="estadisticas">
      <div class="stat"><b>${c.pedidos}</b><small>Pedidos</small></div>
      <div class="stat"><b>${dinero(c.total)}</b><small>Total gastado</small></div>
      <div class="stat">${frecuente ? '<span class="stat__icono stat__icono--verde">✅</span><small>Cliente frecuente</small>' : '<b>—</b><small>Cliente nuevo</small>'}</div>
    </div>
    ${c.telefono ? `<a class="boton boton--sec boton--enlace" target="_blank" rel="noopener" href="https://wa.me/${esc(c.telefono)}">💬 Escribir por WhatsApp</a>` : ''}
    <p class="seccion">Historial de pedidos</p>
    <div class="tarjeta lista-menu">
      ${historial.length ? historial.map((p) => `
        <button type="button" class="fila-menu" data-detalle="${p.id}">
          <span><b>#${p.id}</b> <small class="suave">${fechaLarga(p.fecha)}</small></span><b>${dinero(totalPedido(p))}</b>
        </button>`).join('') : '<p class="suave" style="padding:12px">Todavía no tiene pedidos.</p>'}
    </div>
    <p class="seccion">Observaciones</p>
    <label class="campo campo--area"><textarea id="cl-obs" rows="3" placeholder="Ej. prefiere sin picante">${esc(extra.observaciones || '')}</textarea></label>
    <button type="button" class="boton" data-nuevo-para="${esc(c.nombre)}">+ Nuevo pedido para ${esc(c.nombre.split(' ')[0])}</button>`;
  // Las observaciones se guardan al salir del cuadro de texto
  $('cl-obs').addEventListener('change', (e) => guardarClienteExtra(c.nombre, { observaciones: e.target.value.trim() }));
}

// Hoja para agregar un cliente nuevo
$('cli-agregar').addEventListener('click', () => {
  $('hc-nombre').value = ''; $('hc-telefono').value = '';
  $('err-hc').hidden = true;
  $('hoja-cliente').hidden = false;
});
$('hc-guardar').addEventListener('click', () => {
  const nombre = $('hc-nombre').value.trim();
  const tel = $('hc-telefono').value.replace(/\D/g, '');
  if (!nombre) { $('err-hc').textContent = 'Escribe el nombre del cliente.'; $('err-hc').hidden = false; return; }
  if (tel && tel.length < 10) { $('err-hc').textContent = 'El teléfono debe tener al menos 10 dígitos.'; $('err-hc').hidden = false; return; }
  guardarClienteExtra(nombre, { telefono: tel });
  $('hoja-cliente').hidden = true;
  renderClientes();
  mostrarAviso('Cliente guardado.');
});

// ----- NOTIFICACIONES -----
function renderNotif() {
  const alertas = calcularAlertas();
  if (!alertas.length) {
    $('nt-lista').innerHTML = '<div class="vacio"><img src="img/mascota-asomada.png" alt=""><h2>Sin notificaciones</h2><p>Aquí verás entregas próximas, pedidos por cobrar y choques de horario.</p></div>';
    return;
  }
  $('nt-lista').innerHTML = alertas.map((a) => `
    <button type="button" class="tarjeta fila-notif" data-detalle="${a.pedidoId}">
      <span class="fila-notif__icono">${a.icono}</span><span>${esc(a.texto)}</span><i>›</i>
    </button>`).join('');
}

// ----- Clics: se atienden todos aquí (delegación de eventos) -----
document.addEventListener('click', (e) => {
  const t = e.target;

  // Cerrar una hoja inferior
  if (t.closest('[data-cerrar-hoja]')) { t.closest('.hoja').hidden = true; return; }
  // Tocar el fondo oscuro de una hoja también la cierra
  if (t.classList && t.classList.contains('hoja')) { t.hidden = true; return; }

  // Flecha atrás
  if (t.closest('[data-atras]')) { volver(); return; }

  // Pestañas de la barra inferior y "Ver todos"
  const ir = t.closest('[data-ir]');
  if (ir) { mostrarPantalla(ir.dataset.ir); return; }

  // Abrir pantalla secundaria (Nuevo pedido, Notificaciones)
  const abrir = t.closest('[data-abrir]');
  if (abrir) { if (abrir.dataset.abrir === 'nuevo') { pedidoParaCliente = ''; pedidoEditando = 0; } abrirPantalla(abrir.dataset.abrir); return; }

  // Nuevo pedido con el cliente ya elegido
  const para = t.closest('[data-nuevo-para]');
  if (para) { pedidoParaCliente = para.dataset.nuevoPara; pedidoEditando = 0; abrirPantalla('nuevo'); return; }

  // Detalle de un cliente
  const cli = t.closest('[data-cliente]');
  if (cli) { clienteActual = cli.dataset.cliente; abrirPantalla('cliente'); return; }

  // Enlaces y botones de dentro de una tarjeta de pedido no abren el detalle
  if (t.closest('.mini')) return;

  // Detalle de un pedido
  const det = t.closest('[data-detalle]');
  if (det) { pedidoActual = Number(det.dataset.detalle); abrirPantalla('detalle'); return; }

  // Botones de pantallas que aún no están diseñadas
  const pendiente = t.closest('[data-pendiente]');
  if (pendiente) { mostrarAviso(`${pendiente.dataset.pendiente}: esta pantalla aún no está diseñada.`); }
});
