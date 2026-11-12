// ===== Nuevo pedido (y editar pedido) y Detalle del pedido =====

let pedidoActual = 0;        // id del pedido que se ve en el detalle
let pedidoEditando = 0;      // id del pedido que se está editando (0 = pedido nuevo)
let pedidoParaCliente = '';  // si viene de un cliente, su nombre

// Estado del formulario. dia: "hoy", "manana" o null (se conserva la fecha del pedido que se edita)
const np = { tipo: 'comer', dia: 'hoy', items: [], pagado: false };

// Hora actual en formato "HH:MM"
function horaAhora() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// Marca una sola opción como activa dentro de un grupo de chips
function elegirChip(idGrupo, valor) {
  $(idGrupo).querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.valor === valor)));
}

// ----- NUEVO PEDIDO / EDITAR PEDIDO -----
function prepararNuevoPedido() {
  const p = pedidoEditando ? buscarPedido(pedidoEditando) : null;
  $('form-nuevo').reset();
  ['err-np-cliente', 'err-np-direccion', 'err-np-hora', 'err-np-items'].forEach((id) => { $(id).hidden = true; });
  $('lista-clientes').innerHTML = listaClientes().map((c) => `<option value="${esc(c.nombre)}">`).join('');

  if (p) {
    // Editar: se llenan los campos con lo que ya tiene el pedido
    $('np-titulo').textContent = 'Editar pedido';
    $('np-guardar').textContent = 'Guardar cambios';
    Object.assign(np, {
      tipo: p.tipo, pagado: p.pagado, items: p.items.map((i) => ({ ...i })),
      dia: p.fecha === fechaISO(0) ? 'hoy' : p.fecha === fechaISO(1) ? 'manana' : null
    });
    $('np-cliente').value = p.cliente;
    $('np-direccion').value = p.direccion || '';
    $('np-hora').value = p.hora;
    $('np-metodo').value = p.metodo || 'Efectivo';
  } else {
    // Nuevo: formulario limpio con la siguiente media hora
    $('np-titulo').textContent = 'Nuevo pedido';
    $('np-guardar').textContent = 'Guardar pedido';
    Object.assign(np, { tipo: 'comer', dia: 'hoy', items: [], pagado: false });
    $('np-cliente').value = pedidoParaCliente;
    const d = new Date(); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
    $('np-hora').value = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  elegirChip('np-tipo', np.tipo);
  elegirChip('np-dia', np.dia || '');
  $('np-dir-grupo').hidden = np.tipo !== 'domicilio';
  $('np-pagado').setAttribute('aria-checked', String(np.pagado));
  renderItemsNuevo();
}

// Dibuja la lista de platillos del pedido y el total
function renderItemsNuevo() {
  if (!np.items.length) {
    $('np-items').innerHTML = '<p class="suave">Todavía no agregas platillos.</p>';
  } else {
    $('np-items').innerHTML = np.items.map((it, i) => `
      <div class="item-pedido" data-i="${i}">
        <div class="item-pedido__fila">
          ${htmlFoto(it.platillo)}
          <div style="flex:1;min-width:0"><b>${esc(it.platillo)}</b><div class="suave">${dinero(it.precio)} c/u</div></div>
          <div class="paso-cant">
            <button type="button" data-cant="-1" aria-label="Quitar uno">−</button>
            <span>${it.n}</span>
            <button type="button" data-cant="1" aria-label="Agregar uno">+</button>
          </div>
        </div>
        <label class="campo campo--chico"><input type="text" data-para placeholder="¿Para quién es? (opcional)" value="${esc(it.para)}"></label>
      </div>`).join('');
  }
  $('np-total').textContent = dinero(np.items.reduce((s, i) => s + i.n * i.precio, 0));
}

// Chips: tipo de pedido y día
$('np-tipo').addEventListener('click', (e) => {
  const c = e.target.closest('.chip'); if (!c) return;
  np.tipo = c.dataset.valor; elegirChip('np-tipo', np.tipo);
  $('np-dir-grupo').hidden = np.tipo !== 'domicilio';
});
$('np-dia').addEventListener('click', (e) => {
  const c = e.target.closest('.chip'); if (!c) return;
  np.dia = c.dataset.valor; elegirChip('np-dia', np.dia);
});
$('np-pagado').addEventListener('click', () => {
  np.pagado = !np.pagado;
  $('np-pagado').setAttribute('aria-checked', String(np.pagado));
});

// Cantidades y "para quién" de cada platillo
$('np-items').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cant]'); if (!b) return;
  const i = Number(b.closest('.item-pedido').dataset.i);
  np.items[i].n += Number(b.dataset.cant);
  if (np.items[i].n <= 0) np.items.splice(i, 1);
  renderItemsNuevo();
});
$('np-items').addEventListener('input', (e) => {
  if (!e.target.matches('[data-para]')) return;
  np.items[Number(e.target.closest('.item-pedido').dataset.i)].para = e.target.value;
});

// Hoja para elegir platillos de TU menú
$('np-agregar').addEventListener('click', () => {
  const disponibles = PLATILLOS.filter((p) => p.disponible);
  $('hp-lista').innerHTML = disponibles.length ? disponibles.map((p) => `
    <button type="button" class="tarjeta fila-menu fila-menu--foto" data-plato="${p.id}">
      ${htmlFotoSrc(p.foto)}<span style="flex:1;text-align:left"><b>${esc(p.nombre)}</b></span><b>${dinero(p.precio)}</b>
    </button>`).join('') : '<p class="suave">No tienes platillos disponibles. Agrégalos en "Administrar mis platillos".</p>';
  $('hoja-platillos').hidden = false;
});
$('hp-lista').addEventListener('click', (e) => {
  const b = e.target.closest('[data-plato]'); if (!b) return;
  const plato = PLATILLOS.find((p) => p.id === Number(b.dataset.plato)); if (!plato) return;
  const ya = np.items.find((i) => i.platillo === plato.nombre);
  if (ya) ya.n += 1; else np.items.push({ n: 1, platillo: plato.nombre, para: '', precio: plato.precio });
  $('err-np-items').hidden = true;
  $('hoja-platillos').hidden = true;
  renderItemsNuevo();
});
$('hp-administrar').addEventListener('click', () => { $('hoja-platillos').hidden = true; abrirPantalla('platillos'); });

// Guardar el pedido (nuevo o editado)
$('form-nuevo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cliente = $('np-cliente').value.trim();
  const direccion = $('np-direccion').value.trim();
  const hora = $('np-hora').value;
  const fallas = {
    'err-np-cliente': cliente ? '' : 'Escribe o elige el cliente.',
    'err-np-direccion': np.tipo === 'domicilio' && !direccion ? 'Escribe la dirección de entrega.' : '',
    'err-np-hora': hora ? '' : 'Elige la hora de entrega.',
    'err-np-items': np.items.length ? '' : 'Agrega al menos un platillo.'
  };
  let hayError = false;
  for (const [id, texto] of Object.entries(fallas)) {
    $(id).textContent = texto; $(id).hidden = !texto;
    if (texto) hayError = true;
  }
  if (hayError) return;

  const boton = $('np-guardar');
  const textoBoton = boton.textContent;
  boton.disabled = true; boton.textContent = 'Guardando...';
  await new Promise((r) => setTimeout(r, 500));
  boton.disabled = false; boton.textContent = textoBoton;

  const existente = listaClientes().find((c) => c.nombre.toLowerCase() === cliente.toLowerCase());
  const nombreFinal = existente ? existente.nombre : cliente;
  const items = np.items.map((i) => ({ n: i.n, platillo: i.platillo, para: (i.para || '').trim(), precio: i.precio }));

  if (pedidoEditando) {
    // Editar: se actualiza el pedido existente y se vuelve al detalle
    const p = buscarPedido(pedidoEditando);
    Object.assign(p, {
      cliente: nombreFinal, hora, tipo: np.tipo, direccion: np.tipo === 'domicilio' ? direccion : '',
      pagado: np.pagado, metodo: $('np-metodo').value, items,
      fecha: np.dia ? fechaISO(np.dia === 'hoy' ? 0 : 1) : p.fecha,
      telefono: p.telefono || (existente ? existente.telefono : '')
    });
    guardarPedidos();
    pedidoEditando = 0;
    volver();
    mostrarAviso(`Pedido #${p.id} actualizado.`);
    return;
  }

  const pedido = {
    id: siguienteId(), fecha: fechaISO(np.dia === 'manana' ? 1 : 0), hora, cliente: nombreFinal,
    telefono: existente ? existente.telefono : '', direccion: np.tipo === 'domicilio' ? direccion : '',
    tipo: np.tipo, estado: 'pendiente', pagado: np.pagado, metodo: $('np-metodo').value,
    items, tiempos: { pendiente: horaAhora() }
  };
  PEDIDOS.push(pedido);
  guardarPedidos();
  diaPedidos = np.dia === 'manana' ? 'manana' : 'hoy';
  pedidoParaCliente = '';
  mostrarPantalla('pedidos');
  mostrarAviso(`Pedido #${pedido.id} guardado.`);
});

// ----- DETALLE DEL PEDIDO (según el diseño) -----
// Los tres pasos del diseño; "Finalizar" marca el pedido como entregado
const PASOS = [
  { estado: 'pendiente', nombre: 'Recibido' },
  { estado: 'preparando', nombre: 'En preparación' },
  { estado: 'listo', nombre: 'Listo' }
];
const SVG_TEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3h3l1.5 4-2 1.5a11 11 0 0 0 5.4 5.4l1.5-2 4 1.5v3A2.5 2.5 0 0 1 17.5 19 14.5 14.5 0 0 1 5 6.5 2.5 2.5 0 0 1 6.6 3z"/></svg>';

function renderDetalle() {
  const p = buscarPedido(pedidoActual);
  if (!p) { $('dt-contenido').innerHTML = '<p>Pedido no encontrado.</p>'; return; }
  const entregado = p.estado === 'entregado';
  const idx = entregado ? PASOS.length : PASOS.findIndex((x) => x.estado === p.estado);

  // Platillos con foto, precio y cantidad
  const items = p.items.map((i) => `
    <div class="dt-item">
      ${htmlFoto(i.platillo)}
      <div class="dt-item__datos"><b>${esc(i.platillo)}</b><span>${dinero(i.precio)} &nbsp;x${i.n}</span>${i.para ? `<small>para ${esc(i.para)}</small>` : ''}</div>
      <i aria-hidden="true">›</i>
    </div>`).join('');

  // Línea de tiempo de 3 pasos (se puede tocar cada paso)
  const pasos = PASOS.map((s, i) => `
    <button type="button" class="dt-paso ${i < idx ? 'dt-paso--hecho' : ''} ${i === idx ? 'dt-paso--actual' : ''} ${i === PASOS.length - 1 ? 'dt-paso--ultimo' : ''}" data-estado="${s.estado}">
      <span class="dt-paso__punto"></span><span class="dt-paso__nombre">${s.nombre}</span>
      <small>${p.tiempos && p.tiempos[s.estado] ? formatoHora(p.tiempos[s.estado]) : ''}</small>
    </button>`).join('');

  const detalleEntrega = p.tipo === 'domicilio' && p.direccion
    ? `<a class="dt-dir" target="_blank" rel="noopener" href="${enlaceMaps(p)}">📍 ${esc(p.direccion)}</a>` : `<span class="dt-tipo">${TEXTO_TIPO[p.tipo] || ''}</span>`;

  $('dt-contenido').innerHTML = `
    <div class="dt-cab">
      <div><b class="dt-num">#${p.id}</b><span class="dt-fecha">${formatoHora(p.hora)} • ${fechaLarga(p.fecha)}</span></div>
      <span class="pill pill--${p.estado}">${TEXTO_ESTADO[p.estado]}</span>
    </div>
    <div class="dt-cliente">
      <div><small>Cliente</small><b>${esc(p.cliente)}</b>${detalleEntrega}</div>
      ${p.telefono ? `<a class="dt-tel" target="_blank" rel="noopener" href="${enlaceWhatsApp(p)}" aria-label="Avisar por WhatsApp">${SVG_TEL}</a>` : ''}
    </div>
    <h3 class="dt-sub">Platillos</h3>
    <div class="dt-items">${items}</div>
    <div class="dt-total">
      <button type="button" class="etiqueta ${p.pagado ? 'etiqueta--pagado' : 'etiqueta--cobrar'}" data-accion="pago">${p.pagado ? 'Pagado' : 'Por cobrar'} ↻</button>
      <b>${dinero(totalPedido(p))}</b>
    </div>
    <h3 class="dt-sub">Estado del pedido</h3>
    <div class="dt-linea">${pasos}</div>
    <div class="dt-botones">
      <button type="button" class="dt-btn dt-btn--editar" data-accion="editar">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>Editar</button>
      <button type="button" class="dt-btn dt-btn--ok" data-accion="finalizar" ${entregado ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>${entregado ? 'Entregado' : 'Finalizar'}</button>
    </div>
    <button type="button" class="enlace enlace--peligro" data-accion="cancelar">Cancelar pedido</button>`;
}

// Cambia el estado de un pedido y guarda la hora en que se hizo
function cambiarEstado(p, estado) {
  p.estado = estado;
  p.tiempos = p.tiempos || {};
  if (!p.tiempos[estado]) p.tiempos[estado] = horaAhora();
  guardarPedidos();
}

// Cancelar (borrar) el pedido actual, con confirmación
function cancelarPedidoActual() {
  const p = buscarPedido(pedidoActual); if (!p) return;
  if (confirm(`¿Cancelar el pedido #${p.id} de ${p.cliente}? No se puede deshacer.`)) {
    eliminarPedido(p.id);
    mostrarAviso('Pedido cancelado.');
    volver();
  }
}

$('dt-contenido').addEventListener('click', (e) => {
  const p = buscarPedido(pedidoActual); if (!p) return;
  const paso = e.target.closest('[data-estado]');
  if (paso) { cambiarEstado(p, paso.dataset.estado); renderDetalle(); return; }
  const acc = e.target.closest('[data-accion]'); if (!acc) return;
  if (acc.dataset.accion === 'pago') { p.pagado = !p.pagado; guardarPedidos(); renderDetalle(); }
  if (acc.dataset.accion === 'finalizar') {
    cambiarEstado(p, 'entregado'); renderDetalle();
    mostrarAviso(p.pagado ? 'Pedido finalizado.' : 'Pedido entregado. Recuerda cobrarlo.');
  }
  if (acc.dataset.accion === 'editar') { pedidoEditando = p.id; abrirPantalla('nuevo'); }
  if (acc.dataset.accion === 'cancelar') cancelarPedidoActual();
});
