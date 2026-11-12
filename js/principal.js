// ===== Pantallas principales: Inicio, Pedidos y barra inferior =====

// Pantallas que llevan la barra inferior
const PRINCIPALES = ['inicio', 'pedidos', 'finanzas', 'mas'];

// Convierte texto a HTML seguro (evita que un nombre con "<" rompa la pantalla)
function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Lee la configuración guardada (nombre de la persona, nombre del negocio...)
function leerConfig() {
  try { return JSON.parse(localStorage.getItem('sore_config')) || {}; } catch (e) { return {}; }
}

// Textos de cada estado de pedido y de pago
const TEXTO_ESTADO = { pendiente: 'Pendiente', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado' };
function etiquetaEstado(p) { return `<span class="etiqueta etiqueta--${p.estado}">${TEXTO_ESTADO[p.estado]}</span>`; }
function etiquetaPago(p) {
  return p.pagado ? '<span class="etiqueta etiqueta--pagado">Pagado</span>'
                  : '<span class="etiqueta etiqueta--cobrar">Por cobrar</span>';
}

// Estado vacío reutilizable (mascota con la olla); cambia el texto según la lista
function htmlVacio(titulo, texto) {
  return `<div class="vacio">
    <img src="img/mascota-olla.png" alt="">
    <h2>${esc(titulo)}</h2>
    <p>${esc(texto)}</p>
    <button type="button" class="boton boton--chico" data-pendiente="Nuevo pedido">Nuevo pedido</button>
  </div>`;
}

// ----- INICIO -----
function renderInicio() {
  const cfg = leerConfig();
  const hoy = obtenerPedidos('hoy');

  // Saludo con el nombre real (si aún no hay, solo "Hola")
  $('ini-saludo').textContent = cfg.nombre ? `Hola, ${cfg.nombre} ❤` : 'Hola ❤';

  // Ventas de hoy: separa lo cobrado de lo que falta cobrar
  const cobrado = hoy.filter((p) => p.pagado).reduce((s, p) => s + totalPedido(p), 0);
  const porCobrar = hoy.filter((p) => !p.pagado).reduce((s, p) => s + totalPedido(p), 0);
  $('ini-cobrado').textContent = dinero(cobrado);
  $('ini-porcobrar').textContent = dinero(porCobrar);

  // Próximas entregas: pedidos de hoy sin entregar, por hora, con el nombre del cliente
  const proximas = hoy.filter((p) => p.estado !== 'entregado').slice(0, 3);
  if (!hoy.length) {
    $('ini-lista').innerHTML = htmlVacio('Aún no hay pedidos hoy', 'Cuando recibas un pedido, se mostrará aquí.');
  } else if (!proximas.length) {
    $('ini-lista').innerHTML = '<p>No tienes entregas pendientes. ¡Buen trabajo!</p>';
  } else {
    $('ini-lista').innerHTML = proximas.map((p) => `
      <div class="entrega">
        <div class="entrega__hora">${formatoHora(p.hora)}</div>
        <div class="entrega__datos">
          <div class="entrega__cliente">${esc(p.cliente)}</div>
          <div class="entrega__plato">${esc(p.items.map((i) => `${i.n} ${i.platillo}`).join(', '))}</div>
        </div>
        ${etiquetaEstado(p)}
      </div>`).join('');
  }

  // Campana: alertas dentro de la app (choques de entrega y pedidos por cobrar)
  const alertas = calcularAlertas(hoy);
  $('ini-insignia').textContent = alertas.length;
  $('ini-insignia').hidden = !alertas.length;
}

// Lista de alertas de hoy en texto
function calcularAlertas(hoy) {
  const alertas = [];
  const choques = Object.keys(buscarChoques(hoy)).length / 2; // cada choque cuenta dos pedidos
  if (choques) alertas.push(choques === 1 ? '1 choque de entregas' : `${choques} choques de entregas`);
  const porCobrar = hoy.filter((p) => !p.pagado && p.estado !== 'entregado').length;
  if (porCobrar) alertas.push(porCobrar === 1 ? '1 pedido por cobrar' : `${porCobrar} pedidos por cobrar`);
  return alertas;
}

// ----- PEDIDOS -----
let diaPedidos = 'hoy'; // pestaña activa

function renderPedidos() {
  // Cuenta de pedidos en cada pestaña
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
  const negocio = leerConfig().negocio || '';
  $('ped-lista').innerHTML = lista.map((p) => {
    // Aviso si esta entrega choca con otra
    const otro = choques[p.id];
    const aviso = otro ? `<div class="pedido__choque">⚠ Choca con la entrega de ${formatoHora(otro.hora)} (${esc(otro.cliente)})</div>` : '';
    // Platillos con "para quién es" cada uno
    const items = p.items.map((i) => `<div>${i.n} × ${esc(i.platillo)} — para ${esc(i.para)}</div>`).join('');
    // Botón de Maps solo si hay dirección; WhatsApp con mensaje de confirmación
    const maps = p.direccion ? `<a class="mini" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion)}">📍 Maps</a>` : '';
    const mensaje = `Hola ${p.cliente}${negocio ? ', te escribe ' + negocio : ''}. Te confirmo tu pedido #${p.id} para las ${formatoHora(p.hora)}. ¡Gracias!`;
    const wa = p.telefono ? `<a class="mini" target="_blank" rel="noopener" href="https://wa.me/${p.telefono}?text=${encodeURIComponent(mensaje)}">💬 WhatsApp</a>` : '';
    return `
      <article class="tarjeta pedido" data-id="${p.id}">
        <div class="pedido__arriba"><span class="pedido__hora">${formatoHora(p.hora)}</span><span class="pedido__num">#${p.id}</span></div>
        <div class="pedido__cliente">${esc(p.cliente)}</div>
        <div class="pedido__items">${items}</div>
        <div class="pedido__etiquetas">${etiquetaEstado(p)}${etiquetaPago(p)}<span class="pedido__total">${dinero(totalPedido(p))}</span></div>
        ${aviso}
        <div class="pedido__botones">${maps}${wa}</div>
      </article>`;
  }).join('');
}

// ----- Clics: se atienden todos aquí (delegación de eventos) -----
document.addEventListener('click', (e) => {
  // Pestañas Hoy / Mañana
  const pestana = e.target.closest('.pestana');
  if (pestana) { diaPedidos = pestana.dataset.dia; renderPedidos(); return; }

  // Botones que llevan a otra pantalla (barra inferior y "Ver todos")
  const ir = e.target.closest('[data-ir]');
  if (ir) { mostrarPantalla(ir.dataset.ir); return; }

  // Botones de pantallas que aún no están diseñadas
  const pendiente = e.target.closest('[data-pendiente]');
  if (pendiente) { mostrarAviso(`${pendiente.dataset.pendiente}: esta pantalla aún no está diseñada.`); return; }

  // Tocar un pedido (fuera de sus botones) abriría el detalle, que está pendiente de decisión
  const tarjeta = e.target.closest('.pedido');
  if (tarjeta && !e.target.closest('.mini')) { mostrarAviso('Detalle del pedido: pendiente de diseño.'); }
});

// Hamburguesa (abre "Más") y campana (muestra las alertas)
$('ini-menu').addEventListener('click', () => mostrarPantalla('mas'));
$('ini-campana').addEventListener('click', () => {
  const alertas = calcularAlertas(obtenerPedidos('hoy'));
  mostrarAviso(alertas.length ? alertas.join(' · ') : 'No tienes alertas.');
});
