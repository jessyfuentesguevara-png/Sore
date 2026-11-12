// ===== Nuevo pedido y Detalle del pedido =====

let pedidoActual = 0;        // id del pedido que se ve en el detalle
let pedidoParaCliente = '';  // si viene de un cliente, su nombre

// Estado del formulario de Nuevo pedido
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

// ----- NUEVO PEDIDO -----
function prepararNuevoPedido() {
  // Reinicia el formulario
  Object.assign(np, { tipo: 'comer', dia: 'hoy', items: [], pagado: false });
  $('form-nuevo').reset();
  $('np-cliente').value = pedidoParaCliente;
  elegirChip('np-tipo', 'comer');
  elegirChip('np-dia', 'hoy');
  $('np-dir-grupo').hidden = true;
  $('np-pagado').setAttribute('aria-checked', 'false');
  // Hora sugerida: la siguiente media hora
  const d = new Date(); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  $('np-hora').value = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  // Sugerencias de clientes al escribir el nombre
  $('lista-clientes').innerHTML = listaClientes().map((c) => `<option value="${esc(c.nombre)}">`).join('');
  ['err-np-cliente', 'err-np-direccion', 'err-np-hora', 'err-np-items'].forEach((id) => { $(id).hidden = true; });
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
          <div><b>${esc(it.platillo)}</b><div class="suave">${dinero(it.precio)} c/u</div></div>
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
  $('np-dir-grupo').hidden = np.tipo !== 'domicilio'; // la dirección solo para domicilio
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
  if (np.items[i].n <= 0) np.items.splice(i, 1); // al llegar a 0 se quita
  renderItemsNuevo();
});
$('np-items').addEventListener('input', (e) => {
  if (!e.target.matches('[data-para]')) return;
  np.items[Number(e.target.closest('.item-pedido').dataset.i)].para = e.target.value;
});

// Hoja para elegir platillos del catálogo
$('np-agregar').addEventListener('click', () => {
  $('hp-lista').innerHTML = PLATILLOS.map((p, i) => `
    <button type="button" class="tarjeta fila-menu" data-plato="${i}"><span>${esc(p.nombre)}</span><b>${dinero(p.precio)}</b></button>`).join('');
  $('hoja-platillos').hidden = false;
});
$('hp-lista').addEventListener('click', (e) => {
  const b = e.target.closest('[data-plato]'); if (!b) return;
  const plato = PLATILLOS[Number(b.dataset.plato)];
  const ya = np.items.find((i) => i.platillo === plato.nombre);
  if (ya) ya.n += 1; else np.items.push({ n: 1, platillo: plato.nombre, para: '', precio: plato.precio });
  $('err-np-items').hidden = true;
  $('hoja-platillos').hidden = true;
  renderItemsNuevo();
});

// Guardar el pedido
$('form-nuevo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cliente = $('np-cliente').value.trim();
  const direccion = $('np-direccion').value.trim();
  const hora = $('np-hora').value;
  // Validaciones con mensajes debajo de cada campo
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

  // Botón desactivado con "Guardando..." mientras se guarda
  const boton = $('np-guardar');
  boton.disabled = true; boton.textContent = 'Guardando...';
  await new Promise((r) => setTimeout(r, 500));
  boton.disabled = false; boton.textContent = 'Guardar pedido';

  // Si el cliente ya existe, se reutiliza su teléfono
  const existente = listaClientes().find((c) => c.nombre.toLowerCase() === cliente.toLowerCase());
  const nombreFinal = existente ? existente.nombre : cliente;
  const pedido = {
    id: siguienteId(), fecha: fechaISO(np.dia === 'hoy' ? 0 : 1), hora, cliente: nombreFinal,
    telefono: existente ? existente.telefono : '', direccion: np.tipo === 'domicilio' ? direccion : '',
    tipo: np.tipo, estado: 'pendiente', pagado: np.pagado, metodo: $('np-metodo').value,
    items: np.items.map((i) => ({ n: i.n, platillo: i.platillo, para: i.para.trim(), precio: i.precio })),
    tiempos: { pendiente: horaAhora() }
  };
  PEDIDOS.push(pedido);
  guardarPedidos();
  diaPedidos = np.dia;
  pedidoParaCliente = '';
  mostrarPantalla('pedidos');
  mostrarAviso(`Pedido #${pedido.id} guardado.`);
});

// ----- DETALLE DEL PEDIDO -----
const ORDEN_ESTADOS = ['pendiente', 'preparando', 'listo', 'entregado'];
const NOMBRE_PASO = { pendiente: 'Recibido', preparando: 'En preparación', listo: 'Listo', entregado: 'Entregado' };
const ICONO_PASO = { pendiente: '📥', preparando: '🍳', listo: '✅', entregado: '🛵' };

function renderDetalle() {
  const p = buscarPedido(pedidoActual);
  if (!p) { $('dt-titulo').textContent = 'Pedido'; $('dt-contenido').innerHTML = '<p>Pedido no encontrado.</p>'; return; }
  $('dt-titulo').textContent = `Pedido #${p.id}`;
  const idx = ORDEN_ESTADOS.indexOf(p.estado);

  // Línea de tiempo: cada paso se puede tocar para cambiar el estado
  const pasos = ORDEN_ESTADOS.map((est, i) => `
    <button type="button" class="paso-tiempo ${i <= idx ? 'paso-tiempo--hecho' : ''} ${i === idx ? 'paso-tiempo--actual' : ''}" data-estado="${est}">
      <span class="paso-tiempo__punto">${ICONO_PASO[est]}</span>
      <span class="paso-tiempo__nombre">${NOMBRE_PASO[est]}</span>
      <small>${p.tiempos && p.tiempos[est] ? formatoHora(p.tiempos[est]) : '—'}</small>
    </button>`).join('');

  const items = p.items.map((i) => `
    <div class="fila-item"><span><b>${i.n} ×</b> ${esc(i.platillo)}${i.para ? `<small class="suave"> — para ${esc(i.para)}</small>` : ''}</span><b>${dinero(i.n * i.precio)}</b></div>`).join('');
  const maps = p.tipo === 'domicilio' && p.direccion ? `<a class="boton boton--sec boton--enlace" target="_blank" rel="noopener" href="${enlaceMaps(p)}">📍 Abrir dirección en Maps</a>` : '';
  const wa = p.telefono ? `<a class="boton boton--sec boton--enlace" target="_blank" rel="noopener" href="${enlaceWhatsApp(p)}">💬 Avisar por WhatsApp</a>` : '';

  $('dt-contenido').innerHTML = `
    <div class="tarjeta perfil__cabecera">
      <div class="avatar avatar--grande">${esc(iniciales(p.cliente))}</div>
      <div style="flex:1"><div class="perfil__nombre">${esc(p.cliente)}</div>
        <div class="suave">${p.telefono ? '📞 ' + esc(p.telefono) + '<br>' : ''}${fechaLarga(p.fecha, p.hora)} · ${TEXTO_TIPO[p.tipo] || ''}</div>
        ${p.direccion ? `<div class="suave">📍 ${esc(p.direccion)}</div>` : ''}
        <div style="margin-top:8px">${etiquetaEstado(p)}</div>
      </div>
    </div>
    <p class="seccion">Platillos</p>
    <div class="tarjeta">
      ${items}
      <div class="fila-item fila-item--total"><span>Total</span><b>${dinero(totalPedido(p))}</b></div>
      <div class="fila-item"><span>Pago</span><button type="button" class="etiqueta ${p.pagado ? 'etiqueta--pagado' : 'etiqueta--cobrar'}" data-accion="pago">${p.pagado ? 'Pagado' : 'Por cobrar'} ↻</button></div>
      <div class="fila-item"><span>Método</span><span>${esc(p.metodo || 'Efectivo')}</span></div>
    </div>
    <p class="seccion">Estado del pedido <small class="suave">(toca para cambiar)</small></p>
    <div class="tarjeta linea-tiempo">${pasos}</div>
    ${maps}${wa}
    <div class="acciones acciones--3">
      <button type="button" class="boton boton--chico boton--sec" data-accion="editar">✏️ Editar</button>
      <button type="button" class="boton boton--chico boton--sec" data-accion="cancelar">🗑️ Cancelar</button>
      <button type="button" class="boton boton--chico" data-accion="finalizar" ${p.estado === 'entregado' ? 'disabled' : ''}>Finalizar</button>
    </div>`;
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
  if (acc.dataset.accion === 'editar') mostrarAviso('Editar pedido: esta pantalla aún no está diseñada.');
  if (acc.dataset.accion === 'cancelar') cancelarPedidoActual();
});

// Menú de los tres puntitos del detalle
$('dt-menu').addEventListener('click', () => { $('hoja-dt').hidden = false; });
$('dt-op-wa').addEventListener('click', () => {
  const p = buscarPedido(pedidoActual); $('hoja-dt').hidden = true;
  if (p && p.telefono) window.open(enlaceWhatsApp(p), '_blank', 'noopener'); else mostrarAviso('Este cliente no tiene teléfono guardado.');
});
$('dt-op-editar').addEventListener('click', () => { $('hoja-dt').hidden = true; mostrarAviso('Editar pedido: esta pantalla aún no está diseñada.'); });
$('dt-op-cancelar').addEventListener('click', () => { $('hoja-dt').hidden = true; cancelarPedidoActual(); });
