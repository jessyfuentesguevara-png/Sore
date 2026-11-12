// ===== Datos de EJEMPLO de pedidos (PROVISIONAL) =====
// Sirven para ver cómo se ven Inicio y Pedidos. Cuando se conecte Supabase,
// "obtenerPedidos" leerá los pedidos reales y este arreglo se borra.
// Los teléfonos son inventados.

const PEDIDOS_EJEMPLO = [
  { id: 1047, dia: 'hoy', hora: '10:30', cliente: 'Rosa Martínez', telefono: '527770000001',
    direccion: 'Calle Hidalgo 12, Centro', entrega: 'domicilio', estado: 'preparando', pagado: false,
    items: [ { n: 2, platillo: 'Chilaquiles', para: 'Rosa', precio: 70 }, { n: 1, platillo: 'Café de olla', para: 'Rosa', precio: 25 } ] },
  { id: 1046, dia: 'hoy', hora: '10:45', cliente: 'Luis Ortega', telefono: '527770000002',
    direccion: 'Av. Morelos 230', entrega: 'domicilio', estado: 'pendiente', pagado: true,
    items: [ { n: 1, platillo: 'Enchiladas', para: 'Luis', precio: 80 } ] },
  { id: 1045, dia: 'hoy', hora: '13:00', cliente: 'Familia Sánchez', telefono: '527770000003',
    direccion: '', entrega: 'recoger', estado: 'listo', pagado: true,
    items: [ { n: 3, platillo: 'Milanesa', para: 'Ana', precio: 95 }, { n: 1, platillo: 'Milanesa', para: 'Pedro', precio: 95 } ] },
  { id: 1044, dia: 'hoy', hora: '09:00', cliente: 'Carmen Ruiz', telefono: '527770000004',
    direccion: '', entrega: 'local', estado: 'entregado', pagado: true,
    items: [ { n: 1, platillo: 'Huevos al gusto', para: 'Carmen', precio: 60 } ] },
  { id: 1048, dia: 'manana', hora: '14:30', cliente: 'Doña Lupita', telefono: '527770000005',
    direccion: 'Callejón del Sol 4', entrega: 'domicilio', estado: 'pendiente', pagado: false,
    items: [ { n: 4, platillo: 'Enchiladas', para: 'Familia', precio: 80 } ] }
];

// Devuelve los pedidos de un día ('hoy' o 'manana'), ordenados por hora de entrega
function obtenerPedidos(dia) {
  return PEDIDOS_EJEMPLO
    .filter((p) => p.dia === dia)
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

// Total en pesos de un pedido (cantidad × precio de cada platillo)
function totalPedido(p) {
  return p.items.reduce((suma, i) => suma + i.n * i.precio, 0);
}

// Formatea dinero: 1250 -> "$1,250"
function dinero(n) {
  return '$' + n.toLocaleString('es-MX');
}

// Formatea la hora de 24 h a 12 h: "13:00" -> "1:00 p. m."
function formatoHora(h24) {
  const [h, m] = h24.split(':').map(Number);
  const sufijo = h >= 12 ? 'p. m.' : 'a. m.';
  return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + ' ' + sufijo;
}

// Convierte "HH:MM" a minutos para comparar horas
function aMinutos(h24) {
  const [h, m] = h24.split(':').map(Number);
  return h * 60 + m;
}

// Busca entregas que chocan: dos pedidos activos (no entregados) con menos de 20 min de diferencia.
// Devuelve un objeto { idPedido: pedidoConElQueChoca }
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
