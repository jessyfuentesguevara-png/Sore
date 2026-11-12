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
const TEXTO_ESTADO = { pendiente: 'Pendiente', preparando: 'En preparación', listo: 'Listo', entregado: 'Entregado' };
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
    <button type="button" class="boton boton--chico" data-abrir="nuevo">Nuevo pedido</button>
  </div>`;
}

// Actualiza el número rojo de la campana
function actualizarInsignia() {
  const n = calcularAlertas().length;
  $('ini-insignia').textContent = n;
  $('ini-insignia').hidden = !n;
}

// ----- INICIO -----
function renderInicio() {
  const cfg = leerConfig();
  const hoy = obtenerPedidos('hoy');

  // Saludo según la hora, con el nombre real
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const primerNombre = cfg.nombre ? cfg.nombre.trim().split(/\s+/)[0] : '';
  $('ini-saludo').textContent = primerNombre ? `${saludo}, ${primerNombre} 👋` : `${saludo} 👋`;
  $('ini-ejemplo').hidden = !hayEjemplos();

  // Recuadros: pendientes (pendiente + en preparación), listos y entregados
  $('st-pend').textContent = hoy.filter((p) => p.estado === 'pendiente' || p.estado === 'preparando').length;
  $('st-listos').textContent = hoy.filter((p) => p.estado === 'listo').length;
  $('st-entregas').textContent = hoy.filter((p) => p.estado === 'entregado').length;

  // Resumen: total, cobrado y por cobrar, con barra de avance de cobro
  const cobrado = hoy.filter((p) => p.pagado).reduce((s, p) => s + totalPedido(p), 0);
  const porCobrar = hoy.filter((p) => !p.pagado).reduce((s, p) => s + totalPedido(p), 0);
  const total = cobrado + porCobrar;
  $('ini-total').textContent = dinero(total);
  $('ini-cobrado').textContent = dinero(cobrado);
  $('ini-porcobrar').textContent = dinero(porCobrar);
  $('ini-barra').style.width = (total ? Math.round(cobrado / total * 100) : 0) + '%';

  // Próximas entregas: pedidos de hoy sin entregar, por hora, con el nombre del cliente
  const proximas = hoy.filter((p) => p.estado !== 'entregado').slice(0, 3);
  if (!hoy.length) {
    $('ini-lista').innerHTML = htmlVacio('Aún no hay pedidos hoy', 'Cuando recibas un pedido, se mostrará aquí.');
  } else if (!proximas.length) {
    $('ini-lista').innerHTML = '<p class="suave">No tienes entregas pendientes. ¡Buen trabajo!</p>';
  } else {
    $('ini-lista').innerHTML = proximas.map((p) => `
      <button type="button" class="entrega" data-detalle="${p.id}">
        <div class="entrega__hora">${formatoHora(p.hora)}</div>
        <div class="entrega__datos">
          <div class="entrega__cliente">${esc(p.cliente)}</div>
          <div class="entrega__plato">${esc(p.items.map((i) => `${i.n} ${i.platillo}`).join(', '))}</div>
        </div>
        ${etiquetaEstado(p)}
      </button>`).join('');
  }
  actualizarInsignia();
}

// ----- PEDIDOS -----
let diaPedidos = 'hoy'; // pestaña activa

// Mensaje de confirmación para WhatsApp
function mensajeWhatsApp(p) {
  const negocio = leerConfig().negocio || '';
  return `Hola ${p.cliente}${negocio ? ', te escribe ' + negocio : ''}. Te confirmo tu pedido #${p.id} para las ${formatoHora(p.hora)}. ¡Gracias!`;
}
function enlaceWhatsApp(p) { return `https://wa.me/${p.telefono}?text=${encodeURIComponent(mensajeWhatsApp(p))}`; }
function enlaceMaps(p) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion)}`; }

function renderPedidos() {
  $('ped-ejemplo').hidden = !hayEjemplos();
  $('tab-hoy').textContent = `Hoy (${obtenerPedidos('hoy').length})`;
  $('tab-manana').textContent = `Mañana (${obtenerPedidos('manana').length})`;
  $('tab-hoy').setAttribute('aria-selected', String(diaPedidos === 'hoy'));
  $('tab-manana').setAttribute('aria-selected', String(diaPedidos === 'manana'));

  const lista = obtenerPedidos(diaPedidos);
  if (!lista.length) {
    $('ped-lista').innerHTML = htmlVacio(
      diaPedidos === 'hoy' ? 'Aún no hay pedidos hoy' : 'Aún no hay pedidos para mañana',
      'Cuando registres uno, se mostrará aquí.');
    return;
  }

  const choques = buscarChoques(lista);
  $('ped-lista').innerHTML = lista.map((p) => {
    const otro = choques[p.id];
    const aviso = otro ? `<div class="pedido__choque">⚠ Choca con la entrega de ${formatoHora(otro.hora)} (${esc(otro.cliente)})</div>` : '';
    const items = p.items.map((i) => `<div>${i.n} × ${esc(i.platillo)}${i.para ? ' — para ' + esc(i.para) : ''}</div>`).join('');
    const maps = p.tipo === 'domicilio' && p.direccion ? `<a class="mini" target="_blank" rel="noopener" href="${enlaceMaps(p)}">📍 Maps</a>` : '';
    const wa = p.telefono ? `<a class="mini" target="_blank" rel="noopener" href="${enlaceWhatsApp(p)}">💬 WhatsApp</a>` : '';
    return `
      <article class="tarjeta pedido" data-detalle="${p.id}">
        <div class="pedido__arriba"><span class="pedido__hora">${formatoHora(p.hora)}</span><span class="pedido__num">#${p.id} · ${TEXTO_TIPO[p.tipo] || ''}</span></div>
        <div class="pedido__cliente">${esc(p.cliente)}</div>
        <div class="pedido__items">${items}</div>
        <div class="pedido__etiquetas">${etiquetaEstado(p)}${etiquetaPago(p)}<span class="pedido__total">${dinero(totalPedido(p))}</span></div>
        ${aviso}
        <div class="pedido__botones">${maps}${wa}</div>
      </article>`;
  }).join('');
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

// ----- PERFIL -----
function renderPerfil() {
  const cfg = leerConfig();
  $('pf-avatar').textContent = cfg.nombre ? iniciales(cfg.nombre) : '?';
  $('pf-nombre').textContent = cfg.nombre || 'Tu nombre';
  $('pf-negocio').textContent = cfg.negocio ? `${cfg.negocio}${cfg.tipo ? ' · ' + cfg.tipo : ''}` : 'Tu negocio';
  $('pf-horario').textContent = cfg.dias && cfg.dias.length ? `${cfg.dias.join(', ')} ${cfg.desde}–${cfg.hasta}` : 'Sin definir';
  $('pf-pago').textContent = cfg.pago && cfg.pago.length ? cfg.pago.join(', ') : 'Sin definir';
  const n = leerNotif();
  $('sw-n-proximas').setAttribute('aria-checked', String(n.proximas));
  $('sw-n-cobrar').setAttribute('aria-checked', String(n.cobrar));
  $('sw-n-choques').setAttribute('aria-checked', String(n.choques));
}
// Interruptores de notificaciones: guardan al instante
[['sw-n-proximas', 'proximas'], ['sw-n-cobrar', 'cobrar'], ['sw-n-choques', 'choques']].forEach(([id, clave]) => {
  $(id).addEventListener('click', () => {
    const n = leerNotif();
    n[clave] = !n[clave];
    guardarNotif(n);
    $(id).setAttribute('aria-checked', String(n[clave]));
  });
});
$('btn-restablecer-ejemplos').addEventListener('click', () => { restablecerEjemplos(); mostrarAviso('Datos de ejemplo restablecidos.'); });
$('btn-borrar-ejemplos').addEventListener('click', () => {
  if (confirm('¿Borrar los pedidos de ejemplo? Los que tú registraste se quedan.')) { borrarEjemplos(); mostrarAviso('Datos de ejemplo borrados.'); }
});

// ----- Clics: se atienden todos aquí (delegación de eventos) -----
document.addEventListener('click', (e) => {
  const t = e.target;

  // Cerrar una hoja inferior
  if (t.closest('[data-cerrar-hoja]')) { t.closest('.hoja').hidden = true; return; }
  // Tocar el fondo oscuro de una hoja también la cierra
  if (t.classList && t.classList.contains('hoja')) { t.hidden = true; return; }

  // Pestañas Hoy / Mañana
  const pestana = t.closest('.pestana');
  if (pestana) { diaPedidos = pestana.dataset.dia; renderPedidos(); return; }

  // Flecha atrás
  if (t.closest('[data-atras]')) { volver(); return; }

  // Pestañas de la barra inferior y "Ver todos"
  const ir = t.closest('[data-ir]');
  if (ir) { mostrarPantalla(ir.dataset.ir); return; }

  // Abrir pantalla secundaria (Nuevo pedido, Notificaciones)
  const abrir = t.closest('[data-abrir]');
  if (abrir) { if (abrir.dataset.abrir === 'nuevo') pedidoParaCliente = ''; abrirPantalla(abrir.dataset.abrir); return; }

  // Nuevo pedido con el cliente ya elegido
  const para = t.closest('[data-nuevo-para]');
  if (para) { pedidoParaCliente = para.dataset.nuevoPara; abrirPantalla('nuevo'); return; }

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
