// ===== Datos de la app (PROVISIONAL: se guardan en este celular) =====
// Cuando se conecte Supabase, estas funciones leerán y guardarán en el servidor.
// Los pedidos de ejemplo y sus teléfonos son inventados.

const CLAVE_PEDIDOS = 'sore_pedidos';
const CLAVE_CLIENTES = 'sore_clientes';
const CLAVE_NOTIF = 'sore_notif';

// ----- Fechas -----
// Fecha "YYYY-MM-DD" de hoy más/menos N días
function fechaISO(dias) {
  const d = new Date();
  d.setDate(d.getDate() + (dias || 0));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// "2026-11-15" + "10:24" -> "15 nov. 2026 · 10:24 a. m."
function fechaLarga(iso, hora) {
  const meses = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} ${meses[m - 1]} ${a}` + (hora ? ` · ${formatoHora(hora)}` : '');
}

// ----- Catálogo de platillos (de ejemplo, para elegir en Nuevo pedido) -----
const PLATILLOS = [
  { nombre: 'Huevos al gusto', precio: 60 },
  { nombre: 'Chilaquiles', precio: 70 },
  { nombre: 'Enchiladas', precio: 80 },
  { nombre: 'Enchiladas de pollo', precio: 80 },
  { nombre: 'Milanesa', precio: 95 },
  { nombre: 'Café de olla', precio: 25 },
  { nombre: 'Agua de Jamaica', precio: 25 },
  { nombre: 'Flan', precio: 35 }
];

// ----- Pedidos de ejemplo (las fechas se calculan a partir de hoy) -----
function ejemploPedidos() {
  const p = (id, dias, hora, cliente, tel, dir, tipo, estado, pagado, items, metodo) => ({
    id, fecha: fechaISO(dias), hora, cliente, telefono: tel, direccion: dir, tipo, estado, pagado,
    metodo: metodo || 'Efectivo', items, ejemplo: true,
    tiempos: { pendiente: hora.replace(/^(\d+):(\d+)$/, (x, h, m) => String(Math.max(0, h - 1)).padStart(2, '0') + ':' + m) }
  });
  return [
    p(1047, 0, '10:30', 'Rosa Martínez', '527770000001', 'Calle Hidalgo 12, Centro', 'domicilio', 'preparando', false,
      [{ n: 2, platillo: 'Chilaquiles', para: 'Rosa', precio: 70 }, { n: 1, platillo: 'Café de olla', para: 'Rosa', precio: 25 }]),
    p(1046, 0, '10:45', 'Luis Ortega', '527770000002', 'Av. Morelos 230', 'domicilio', 'pendiente', true,
      [{ n: 1, platillo: 'Enchiladas', para: 'Luis', precio: 80 }], 'Transferencia'),
    p(1045, 0, '13:00', 'Familia Sánchez', '527770000003', '', 'llevar', 'listo', true,
      [{ n: 3, platillo: 'Milanesa', para: 'Ana', precio: 95 }, { n: 1, platillo: 'Milanesa', para: 'Pedro', precio: 95 }]),
    p(1044, 0, '09:00', 'Carmen Ruiz', '527770000004', '', 'comer', 'entregado', true,
      [{ n: 1, platillo: 'Huevos al gusto', para: 'Carmen', precio: 60 }]),
    p(1048, 1, '14:30', 'Doña Lupita', '527770000005', 'Callejón del Sol 4', 'domicilio', 'pendiente', false,
      [{ n: 4, platillo: 'Enchiladas', para: 'Familia', precio: 80 }]),
    // Historial de días anteriores (para que Clientes tenga datos)
    p(1041, -3, '14:00', 'Rosa Martínez', '527770000001', 'Calle Hidalgo 12, Centro', 'domicilio', 'entregado', true,
      [{ n: 2, platillo: 'Enchiladas de pollo', para: 'Rosa', precio: 80 }]),
    p(1038, -6, '13:30', 'Rosa Martínez', '527770000001', '', 'llevar', 'entregado', true,
      [{ n: 1, platillo: 'Milanesa', para: 'Rosa', precio: 95 }]),
    p(1040, -4, '09:30', 'Luis Ortega', '527770000002', 'Av. Morelos 230', 'domicilio', 'entregado', true,
      [{ n: 2, platillo: 'Chilaquiles', para: 'Luis', precio: 70 }, { n: 1, platillo: 'Agua de Jamaica', para: 'Luis', precio: 25 }]),
    p(1036, -8, '15:00', 'Carmen Ruiz', '527770000004', '', 'comer', 'entregado', true,
      [{ n: 1, platillo: 'Flan', para: 'Carmen', precio: 35 }]),
    p(1039, -5, '12:00', 'Familia Sánchez', '527770000003', '', 'llevar', 'entregado', true,
      [{ n: 4, platillo: 'Enchiladas', para: 'Familia', precio: 80 }])
  ];
}

// ----- Lectura y guardado de pedidos -----
function leerJSON(clave, defecto) {
  try { const t = localStorage.getItem(clave); if (t) return JSON.parse(t); } catch (e) { /* sin almacenamiento */ }
  return defecto;
}
function guardarJSON(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
}

// Lista de pedidos en memoria (la primera vez se llena con los de ejemplo)
let PEDIDOS = leerJSON(CLAVE_PEDIDOS, null);
if (!PEDIDOS) { PEDIDOS = ejemploPedidos(); guardarJSON(CLAVE_PEDIDOS, PEDIDOS); }
function guardarPedidos() { guardarJSON(CLAVE_PEDIDOS, PEDIDOS); }

function buscarPedido(id) { return PEDIDOS.find((p) => p.id === id); }
function siguienteId() { return PEDIDOS.reduce((m, p) => Math.max(m, p.id), 1000) + 1; }
function eliminarPedido(id) { PEDIDOS = PEDIDOS.filter((p) => p.id !== id); guardarPedidos(); }
function hayEjemplos() { return PEDIDOS.some((p) => p.ejemplo); }
function borrarEjemplos() { PEDIDOS = PEDIDOS.filter((p) => !p.ejemplo); guardarPedidos(); }
function restablecerEjemplos() { PEDIDOS = PEDIDOS.filter((p) => !p.ejemplo).concat(ejemploPedidos()); guardarPedidos(); }

// Pedidos de un día ('hoy' o 'manana'), ordenados por hora de entrega
function obtenerPedidos(dia) {
  const fecha = fechaISO(dia === 'hoy' ? 0 : 1);
  return PEDIDOS.filter((p) => p.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora));
}

// ----- Cálculos -----
function totalPedido(p) { return p.items.reduce((s, i) => s + i.n * i.precio, 0); }
function dinero(n) { return '$' + n.toLocaleString('es-MX'); }

// "13:00" -> "1:00 p. m."
function formatoHora(h24) {
  const [h, m] = h24.split(':').map(Number);
  return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'p. m.' : 'a. m.');
}
function aMinutos(h24) { const [h, m] = h24.split(':').map(Number); return h * 60 + m; }

// Entregas que chocan: dos pedidos activos con menos de 20 min de diferencia. { id: otroPedido }
function buscarChoques(pedidos) {
  const activos = pedidos.filter((p) => p.estado !== 'entregado');
  const choques = {};
  for (let i = 0; i < activos.length; i++) {
    for (let j = i + 1; j < activos.length; j++) {
      if (Math.abs(aMinutos(activos[i].hora) - aMinutos(activos[j].hora)) < 20) {
        choques[activos[i].id] = activos[j];
        choques[activos[j].id] = activos[i];
      }
    }
  }
  return choques;
}

// ----- Clientes: se arman con los pedidos y con los que se agregan a mano -----
function leerClientesExtra() { return leerJSON(CLAVE_CLIENTES, {}); }   // { nombre: {telefono, observaciones} }
function guardarClienteExtra(nombre, datos) {
  const todos = leerClientesExtra();
  todos[nombre] = Object.assign(todos[nombre] || {}, datos);
  guardarJSON(CLAVE_CLIENTES, todos);
}
function pedidosDeCliente(nombre) {
  return PEDIDOS.filter((p) => p.cliente === nombre).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
}
// Lista de clientes con sus totales, de mayor a menor gasto
function listaClientes() {
  const extra = leerClientesExtra();
  const nombres = new Set([...PEDIDOS.map((p) => p.cliente), ...Object.keys(extra)]);
  return [...nombres].map((nombre) => {
    const peds = pedidosDeCliente(nombre);
    const tel = (extra[nombre] && extra[nombre].telefono) || (peds[0] && peds[0].telefono) || '';
    return { nombre, telefono: tel, pedidos: peds.length, total: peds.reduce((s, p) => s + totalPedido(p), 0) };
  }).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
}
// Iniciales para el círculo del cliente: "Rosa Martínez" -> "RM"
function iniciales(nombre) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');
}

// ----- Notificaciones dentro de la app -----
function leerNotif() { return Object.assign({ proximas: true, cobrar: true, choques: true }, leerJSON(CLAVE_NOTIF, {})); }
function guardarNotif(n) { guardarJSON(CLAVE_NOTIF, n); }

// Alertas de hoy: [{ icono, texto, pedidoId }]
function calcularAlertas() {
  const cfg = leerNotif();
  const hoy = obtenerPedidos('hoy');
  const ahora = new Date();
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const alertas = [];

  if (cfg.proximas) {
    hoy.filter((p) => p.estado !== 'entregado').forEach((p) => {
      const diff = aMinutos(p.hora) - minAhora;
      if (diff <= 60 && diff >= -30) {
        const cuando = diff >= 0 ? `en ${diff} min` : `hace ${-diff} min`;
        alertas.push({ icono: '⏰', texto: `Entrega ${cuando}: ${p.cliente} (${formatoHora(p.hora)})`, pedidoId: p.id });
      }
    });
  }
  if (cfg.choques) {
    const choques = buscarChoques(hoy);
    const vistos = new Set();
    Object.keys(choques).forEach((id) => {
      const a = buscarPedido(Number(id)); const b = choques[id];
      const clave = [a.id, b.id].sort().join('-');
      if (vistos.has(clave)) return;
      vistos.add(clave);
      alertas.push({ icono: '⚠️', texto: `Choque de entregas: ${a.cliente} y ${b.cliente}`, pedidoId: a.id });
    });
  }
  if (cfg.cobrar) {
    hoy.filter((p) => !p.pagado).forEach((p) => {
      alertas.push({ icono: '💵', texto: `Por cobrar: ${p.cliente} ${dinero(totalPedido(p))}`, pedidoId: p.id });
    });
  }
  return alertas;
}
