// ===== Inicio (Dashboard) y lista de Pedidos, según el diseño =====

let diaPedidos = 'hoy';        // "hoy" o "manana"
let filtroPedidos = 'todos';   // "todos", "proceso" o "listos"

// Foto a partir de su dirección (archivo o foto subida); si no hay, un recuadro con un plato
function htmlFotoSrc(src) {
  return src ? `<img class="foto-plato" src="${esc(src)}" alt="">` : '<span class="foto-plato foto-plato--vacia" aria-hidden="true">🍽️</span>';
}
// Foto de un platillo buscándolo por nombre en el menú del usuario
function htmlFoto(nombrePlatillo) { return htmlFotoSrc(fotoDePlatillo(nombrePlatillo)); }

// Enlaces de WhatsApp y Maps (también los usa el detalle del pedido)
function mensajeWhatsApp(p) {
  const negocio = leerConfig().negocio || '';
  return `Hola ${p.cliente}${negocio ? ', te escribe ' + negocio : ''}. Te confirmo tu pedido #${p.id} para las ${formatoHora(p.hora)}. ¡Gracias!`;
}
function enlaceWhatsApp(p) { return `https://wa.me/${p.telefono}?text=${encodeURIComponent(mensajeWhatsApp(p))}`; }
function enlaceMaps(p) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion)}`; }

// Total vendido en una fecha (todos los pedidos de ese día)
function ventasDeFecha(fecha) {
  return PEDIDOS.filter((p) => p.fecha === fecha).reduce((s, p) => s + totalPedido(p), 0);
}

// ----- INICIO -----
function renderInicio() {
  const cfg = leerConfig();
  const hoy = obtenerPedidos('hoy');

  // Saludo con el primer nombre
  const primerNombre = cfg.nombre ? cfg.nombre.trim().split(/\s+/)[0] : '';
  $('ini-saludo').textContent = primerNombre ? `Hola, ${primerNombre} 👋` : 'Hola 👋';
  $('ini-ejemplo').hidden = !hayEjemplos();

  // Recuadros: pendientes (recibidos + en preparación), listos y entregas hechas
  $('st-pend').textContent = hoy.filter((p) => p.estado === 'pendiente' || p.estado === 'preparando').length;
  $('st-listos').textContent = hoy.filter((p) => p.estado === 'listo').length;
  $('st-entregas').textContent = hoy.filter((p) => p.estado === 'entregado').length;

  // Ventas de hoy y cuánto va cobrado / por cobrar
  const total = hoy.reduce((s, p) => s + totalPedido(p), 0);
  const cobrado = hoy.filter((p) => p.pagado).reduce((s, p) => s + totalPedido(p), 0);
  $('ini-total').textContent = dinero(total);
  $('ini-cobro').textContent = `Cobrado ${dinero(cobrado)} · Por cobrar ${dinero(total - cobrado)}`;

  // Tendencia contra ayer (solo si ayer hubo ventas)
  const ayer = ventasDeFecha(fechaISO(-1));
  const tend = $('ini-tendencia');
  if (ayer > 0) {
    const pct = Math.round((total - ayer) / ayer * 100);
    tend.textContent = `${pct >= 0 ? '↑ +' : '↓ '}${pct}%`;
    tend.className = 'tendencia ' + (pct >= 0 ? 'tendencia--sube' : 'tendencia--baja');
    tend.hidden = false;
  } else {
    tend.hidden = true;
  }

  // Barras: ventas de los últimos 7 días (la última es hoy)
  const dias = [-6, -5, -4, -3, -2, -1, 0].map((d) => ventasDeFecha(fechaISO(d)));
  const maximo = Math.max(...dias, 1);
  $('ini-barras').innerHTML = dias.map((v, i) =>
    `<i class="${i === 6 ? 'barra-hoy' : ''}" style="height:${Math.max(8, Math.round(v / maximo * 100))}%"></i>`).join('');

  actualizarInsignia();
}

// ----- PEDIDOS (lista) -----
// ¿El pedido entra en el filtro activo?
function pasaFiltro(p) {
  if (filtroPedidos === 'proceso') return p.estado === 'pendiente' || p.estado === 'preparando';
  if (filtroPedidos === 'listos') return p.estado === 'listo';
  return true;
}

function renderPedidos() {
  const todos = obtenerPedidos(diaPedidos);
  $('ped-ejemplo').hidden = !hayEjemplos();
  $('tab-hoy').setAttribute('aria-selected', String(diaPedidos === 'hoy'));
  $('tab-manana').setAttribute('aria-selected', String(diaPedidos === 'manana'));
  $('tab-hoy').textContent = `Hoy (${obtenerPedidos('hoy').length})`;
  $('tab-manana').textContent = `Mañana (${obtenerPedidos('manana').length})`;

  // Conteos y filtro activo
  $('fil-todos').textContent = `Todos (${todos.length})`;
  $('fil-proceso').textContent = `En proceso (${todos.filter((p) => p.estado === 'pendiente' || p.estado === 'preparando').length})`;
  $('fil-listos').textContent = `Listos (${todos.filter((p) => p.estado === 'listo').length})`;
  document.querySelectorAll('.filtro').forEach((f) => f.setAttribute('aria-selected', String(f.dataset.filtro === filtroPedidos)));

  if (!todos.length) {
    $('ped-lista').innerHTML = htmlVacio(
      diaPedidos === 'hoy' ? 'Aún no hay pedidos hoy' : 'Aún no hay pedidos para mañana',
      'Cuando recibas un pedido, se mostrará aquí.');
    actualizarInsignia();
    return;
  }
  const lista = todos.filter(pasaFiltro);
  if (!lista.length) { $('ped-lista').innerHTML = '<p class="suave" style="text-align:center;padding:24px">No hay pedidos en este filtro.</p>'; actualizarInsignia(); return; }

  const choques = buscarChoques(todos);
  $('ped-lista').innerHTML = lista.map((p) => {
    const otro = choques[p.id];
    const aviso = otro ? `<div class="fila-pedido__choque">⚠ Choca con la entrega de ${formatoHora(otro.hora)} (${esc(otro.cliente)})</div>` : '';
    const n = p.items.length;
    return `
      <div class="fila-wrap">
        <button type="button" class="fila-pedido" data-detalle="${p.id}">
          ${htmlFoto(p.items[0].platillo)}
          <span class="fila-pedido__datos">
            <b>#${p.id}</b><span class="fila-pedido__cli">${esc(p.cliente)}</span>
            <span>${formatoHora(p.hora)}</span>
            <span>${n} ${n === 1 ? 'platillo' : 'platillos'} • ${dinero(totalPedido(p))}${p.pagado ? '' : ' <em class="debe">Por cobrar</em>'}</span>
          </span>
          <span class="pill pill--${p.estado}">${TEXTO_ESTADO[p.estado]}</span>
          <i aria-hidden="true">›</i>
        </button>
        ${aviso}
      </div>`;
  }).join('');
  actualizarInsignia();
}

// Hoy/Mañana y filtros
document.addEventListener('click', (e) => {
  const dia = e.target.closest('.dia-tab');
  if (dia) { diaPedidos = dia.dataset.dia; renderPedidos(); return; }
  const filtro = e.target.closest('.filtro[data-filtro]');
  if (filtro) { filtroPedidos = filtro.dataset.filtro; renderPedidos(); }
});
