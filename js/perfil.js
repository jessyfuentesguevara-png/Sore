// ===== Perfil, Configuración y Platillos (menú personalizado) =====

const NOMBRE_ENTREGA = { domicilio: 'A domicilio', recoger: 'Recoger', local: 'En el local' };
const NOMBRE_PAGO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const CLAVE_FOTO_PERFIL = 'sore_foto_perfil';

// ----- Utilidades -----
// Lee una imagen elegida por la persona y la reduce (para no llenar la memoria del celular)
function leerImagen(archivo, maximo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maximo / Math.max(img.width, img.height));
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.round(img.width * escala);
        lienzo.height = Math.round(img.height * escala);
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
        resolver(lienzo.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = rechazar;
      img.src = lector.result;
    };
    lector.onerror = rechazar;
    lector.readAsDataURL(archivo);
  });
}

// "Lun, Mar, Mié, Jue, Vie" -> "Lun - Vie"
function textoDias(dias) {
  if (!dias || !dias.length) return '';
  const idx = dias.map((d) => DIAS_SEMANA.indexOf(d)).filter((i) => i >= 0).sort((a, b) => a - b);
  const seguidos = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (idx.length > 2 && seguidos) return DIAS_SEMANA[idx[0]] + ' - ' + DIAS_SEMANA[idx[idx.length - 1]];
  return idx.map((i) => DIAS_SEMANA[i]).join(', ');
}
// "08:00" -> "8:00 AM" (versión corta para caber en una línea)
function horaCorta(h24) { return formatoHora(h24).replace('a. m.', 'AM').replace('p. m.', 'PM'); }
function formatoTelefono(t) {
  const d = (t || '').replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d;
}
function guardarConfig(cfg) { guardarJSON('sore_config', cfg); }

// ===== PERFIL =====
function renderPerfil() {
  const c = leerConfig();
  const foto = leerJSON(CLAVE_FOTO_PERFIL, '');
  $('pf-foto').src = foto || 'img/mascota-asomada.png';
  $('pf-nombre').textContent = c.nombre || 'Tu nombre';
  $('pf-v-nombre').textContent = c.nombre || 'Sin definir';
  $('pf-v-negocio').textContent = c.negocio || 'Sin definir';
  $('pf-v-whatsapp').textContent = formatoTelefono(c.whatsapp) || 'Sin definir';
  $('pf-v-ciudad').textContent = c.ciudad || 'Sin definir';
  $('pf-v-horario').textContent = c.dias && c.dias.length ? `${textoDias(c.dias)} | ${horaCorta(c.desde)} - ${horaCorta(c.hasta)}` : 'Sin definir';
  $('pf-v-entrega').textContent = c.entrega && c.entrega.length ? c.entrega.map((x) => NOMBRE_ENTREGA[x] || x).join(', ') : 'Sin definir';
  $('pf-v-pago').textContent = c.pago && c.pago.length ? c.pago.map((x) => NOMBRE_PAGO[x] || x).join(', ') : 'Sin definir';
  $('pf-v-eventos').textContent = c.eventos ? 'Sí, hacemos eventos' : 'No hacemos eventos';
}

// Cambiar la foto de perfil
$('pf-input-foto').addEventListener('change', async (e) => {
  const archivo = e.target.files[0]; if (!archivo) return;
  try {
    guardarJSON(CLAVE_FOTO_PERFIL, await leerImagen(archivo, 360));
    renderPerfil();
    mostrarAviso('Foto actualizada.');
  } catch (err) { mostrarAviso('No pude leer esa imagen.'); }
  e.target.value = '';
});

// ----- Hoja para editar un dato del perfil -----
let campoEditando = '';
const TITULO_EDITAR = { nombre: 'Tu nombre', negocio: 'Nombre del negocio', whatsapp: 'WhatsApp del negocio', ciudad: 'Ciudad o zona',
  horario: 'Horario de servicio', entrega: '¿Cómo entregas?', pago: 'Formas de pago', eventos: '¿Hacen eventos?' };

function chipsHTML(opciones, activos, id) {
  return `<div class="chips" id="${id}">` + Object.entries(opciones).map(([valor, nombre]) =>
    `<button type="button" class="chip" aria-pressed="${activos.includes(valor)}" data-valor="${valor}">${nombre}</button>`).join('') + '</div>';
}

function abrirEditor(campo) {
  campoEditando = campo;
  const c = leerConfig();
  $('he-titulo').textContent = TITULO_EDITAR[campo];
  $('err-he').hidden = true;
  let html = '';
  if (['nombre', 'negocio', 'ciudad'].includes(campo)) {
    html = `<label class="campo"><input id="he-valor" type="text" value="${esc(c[campo] || '')}" autocomplete="off"></label>`;
  } else if (campo === 'whatsapp') {
    html = `<label class="campo"><input id="he-valor" type="tel" inputmode="tel" placeholder="10 dígitos" value="${esc(c.whatsapp || '')}"></label>`;
  } else if (campo === 'horario') {
    html = chipsHTML(Object.fromEntries(DIAS_SEMANA.map((d) => [d, d])), c.dias || [], 'he-chips') +
      `<div class="horas"><label>Desde<input type="time" id="he-desde" value="${esc(c.desde || '08:00')}"></label>
       <label>Hasta<input type="time" id="he-hasta" value="${esc(c.hasta || '16:00')}"></label></div>`;
  } else if (campo === 'entrega') {
    html = chipsHTML(NOMBRE_ENTREGA, c.entrega || [], 'he-chips');
  } else if (campo === 'pago') {
    html = chipsHTML(NOMBRE_PAGO, c.pago || [], 'he-chips');
  } else if (campo === 'eventos') {
    html = chipsHTML({ si: 'Sí, hacemos eventos', no: 'No' }, [c.eventos ? 'si' : 'no'], 'he-chips');
  }
  $('he-cuerpo').innerHTML = html;
  $('hoja-editar').hidden = false;
  const entrada = $('he-valor'); if (entrada) entrada.focus();
}

// Tocar una opción: "eventos" es de una sola; las demás se pueden elegir varias
$('he-cuerpo').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip'); if (!chip) return;
  if (campoEditando === 'eventos') {
    $('he-cuerpo').querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === chip)));
  } else {
    chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
  }
});

$('he-guardar').addEventListener('click', () => {
  const c = leerConfig();
  const elegidos = () => [...$('he-cuerpo').querySelectorAll('.chip[aria-pressed="true"]')].map((x) => x.dataset.valor);
  const error = (texto) => { $('err-he').textContent = texto; $('err-he').hidden = false; };

  if (['nombre', 'negocio'].includes(campoEditando)) {
    const v = $('he-valor').value.trim();
    if (!v) return error('Este dato no puede quedar vacío.');
    c[campoEditando] = v;
  } else if (campoEditando === 'ciudad') {
    c.ciudad = $('he-valor').value.trim();
  } else if (campoEditando === 'whatsapp') {
    const d = $('he-valor').value.replace(/\D/g, '');
    if (d && d.length !== 10) return error('Escribe los 10 dígitos del número.');
    c.whatsapp = d;
  } else if (campoEditando === 'horario') {
    const dias = elegidos(); const desde = $('he-desde').value; const hasta = $('he-hasta').value;
    if (!dias.length) return error('Elige al menos un día.');
    if (!desde || !hasta || hasta <= desde) return error('La hora final debe ser después de la inicial.');
    Object.assign(c, { dias, desde, hasta });
  } else if (campoEditando === 'entrega' || campoEditando === 'pago') {
    const v = elegidos();
    if (!v.length) return error('Elige al menos una opción.');
    c[campoEditando] = v;
  } else if (campoEditando === 'eventos') {
    c.eventos = elegidos()[0] === 'si';
  }
  guardarConfig(c);
  $('hoja-editar').hidden = true;
  renderPerfil();
  mostrarAviso('Cambios guardados.');
});

// Tocar una fila del perfil abre su editor
document.addEventListener('click', (e) => {
  const fila = e.target.closest('[data-editar]');
  if (fila) abrirEditor(fila.dataset.editar);
});

// ===== CONFIGURACIÓN =====
$('cfg-notif').addEventListener('click', () => {
  const n = leerNotif();
  $('sw-n-proximas').setAttribute('aria-checked', String(n.proximas));
  $('sw-n-cobrar').setAttribute('aria-checked', String(n.cobrar));
  $('sw-n-choques').setAttribute('aria-checked', String(n.choques));
  $('hoja-notif').hidden = false;
});
[['sw-n-proximas', 'proximas'], ['sw-n-cobrar', 'cobrar'], ['sw-n-choques', 'choques']].forEach(([id, clave]) => {
  $(id).addEventListener('click', () => {
    const n = leerNotif(); n[clave] = !n[clave]; guardarNotif(n);
    $(id).setAttribute('aria-checked', String(n[clave]));
  });
});
$('btn-restablecer-ejemplos').addEventListener('click', () => { restablecerEjemplos(); mostrarAviso('Datos de ejemplo restablecidos.'); });
$('btn-borrar-ejemplos').addEventListener('click', () => {
  if (confirm('¿Borrar los pedidos de ejemplo? Los que tú registraste y tus platillos se quedan.')) { borrarEjemplos(); mostrarAviso('Datos de ejemplo borrados.'); }
});
$('cfg-salir').addEventListener('click', () => { cerrarSesion(); mostrarPantalla('login'); });

// ===== PLATILLOS (tu menú) =====
let categoriaFiltro = 'Todos';
let platilloEditando = 0;   // id del platillo que se edita (0 = platillo nuevo)
let fotoEditando = '';      // foto elegida para el platillo en el formulario

function renderPlatillos() {
  // Filtros: "Todos" y las categorías que sí tienen platillos
  const cats = ['Todos', ...CATEGORIAS.filter((c) => PLATILLOS.some((p) => p.categoria === c))];
  if (!cats.includes(categoriaFiltro)) categoriaFiltro = 'Todos';
  $('pl-filtros').innerHTML = cats.map((c) =>
    `<button type="button" class="filtro" data-cat="${esc(c)}" aria-selected="${c === categoriaFiltro}">${esc(c)}</button>`).join('');

  const lista = PLATILLOS.filter((p) => categoriaFiltro === 'Todos' || p.categoria === categoriaFiltro);
  if (!lista.length) {
    $('pl-lista').innerHTML = '<div class="vacio"><img src="img/mascota-olla.png" alt=""><h2>Aún no tienes platillos</h2><p>Agrega los que preparas, con su foto y su precio.</p></div>';
    return;
  }
  $('pl-lista').innerHTML = lista.map((p) => {
    const ganancia = p.costo != null && p.costo !== '' ? `<small class="ganancia">Ganancia ${dinero(p.precio - p.costo)}</small>` : '';
    return `
      <div class="fila-wrap ${p.disponible ? '' : 'fila-wrap--apagada'}">
        <button type="button" class="fila-pedido" data-platillo="${p.id}">
          ${htmlFotoSrc(p.foto)}
          <span class="fila-pedido__datos"><b>${esc(p.nombre)}</b><span class="precio">${dinero(p.precio)}</span>${ganancia}${p.disponible ? '' : '<small>No disponible hoy</small>'}</span>
          <svg class="lapiz" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>
        </button>
      </div>`;
  }).join('');
}

document.addEventListener('click', (e) => {
  const cat = e.target.closest('[data-cat]');
  if (cat) { categoriaFiltro = cat.dataset.cat; renderPlatillos(); return; }
  const fila = e.target.closest('[data-platillo]');
  if (fila) { platilloEditando = Number(fila.dataset.platillo); abrirPantalla('platillo'); }
});
$('pl-agregar').addEventListener('click', () => { platilloEditando = 0; abrirPantalla('platillo'); });

// ----- Agregar / editar platillo -----
function mostrarFotoEditando() {
  $('pe-foto').src = fotoEditando || '';
  $('pe-foto').hidden = !fotoEditando;
  $('pe-foto-vacia').hidden = !!fotoEditando;
}
function actualizarGanancia() {
  const precio = parseFloat($('pe-precio').value); const costo = parseFloat($('pe-costo').value);
  $('pe-ganancia').textContent = !isNaN(precio) && !isNaN(costo) ? `Ganancia por porción: ${dinero(precio - costo)}` : '';
}
function prepararPlatillo() {
  const p = PLATILLOS.find((x) => x.id === platilloEditando);
  $('pe-titulo').textContent = p ? 'Editar platillo' : 'Agregar platillo';
  $('pe-guardar').textContent = p ? 'Guardar cambios' : 'Guardar platillo';
  $('pe-eliminar').hidden = !p;
  $('pe-categoria').innerHTML = CATEGORIAS.map((c) => `<option>${c}</option>`).join('');
  $('pe-nombre').value = p ? p.nombre : '';
  $('pe-categoria').value = p ? p.categoria : 'Almuerzos';
  $('pe-precio').value = p ? p.precio : '';
  $('pe-costo').value = p && p.costo != null ? p.costo : '';
  $('pe-disponible').setAttribute('aria-checked', String(p ? p.disponible : true));
  fotoEditando = p ? p.foto : '';
  mostrarFotoEditando();
  actualizarGanancia();
  ['err-pe-nombre', 'err-pe-precio'].forEach((id) => { $(id).hidden = true; });
}
$('pe-precio').addEventListener('input', actualizarGanancia);
$('pe-costo').addEventListener('input', actualizarGanancia);
$('pe-disponible').addEventListener('click', () => $('pe-disponible').setAttribute('aria-checked', String($('pe-disponible').getAttribute('aria-checked') !== 'true')));
$('pe-input-foto').addEventListener('change', async (e) => {
  const archivo = e.target.files[0]; if (!archivo) return;
  try { fotoEditando = await leerImagen(archivo, 640); mostrarFotoEditando(); }
  catch (err) { mostrarAviso('No pude leer esa imagen.'); }
  e.target.value = '';
});

$('form-platillo').addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = $('pe-nombre').value.trim();
  const precio = parseFloat($('pe-precio').value);
  const costoTxt = $('pe-costo').value.trim();
  const repetido = PLATILLOS.some((p) => p.id !== platilloEditando && p.nombre.toLowerCase() === nombre.toLowerCase());
  const errNombre = !nombre ? 'Escribe el nombre del platillo.' : repetido ? 'Ya tienes un platillo con ese nombre.' : '';
  const errPrecio = isNaN(precio) || precio <= 0 ? 'Escribe el precio de venta.' : '';
  $('err-pe-nombre').textContent = errNombre; $('err-pe-nombre').hidden = !errNombre;
  $('err-pe-precio').textContent = errPrecio; $('err-pe-precio').hidden = !errPrecio;
  if (errNombre || errPrecio) return;

  const datos = { nombre, categoria: $('pe-categoria').value, precio, costo: costoTxt === '' ? null : parseFloat(costoTxt),
    foto: fotoEditando, disponible: $('pe-disponible').getAttribute('aria-checked') === 'true' };
  if (platilloEditando) Object.assign(PLATILLOS.find((p) => p.id === platilloEditando), datos);
  else PLATILLOS.push({ id: siguienteIdPlatillo(), ...datos });
  guardarPlatillos();
  volver();
  mostrarAviso('Platillo guardado.');
});

$('pe-eliminar').addEventListener('click', () => {
  const p = PLATILLOS.find((x) => x.id === platilloEditando); if (!p) return;
  if (confirm(`¿Eliminar "${p.nombre}" de tu menú? Los pedidos que ya hiciste no se borran.`)) {
    PLATILLOS = PLATILLOS.filter((x) => x.id !== p.id);
    guardarPlatillos();
    volver();
    mostrarAviso('Platillo eliminado.');
  }
});
