// ===== Autenticación PROVISIONAL (sin servidor) =====
// IMPORTANTE: esto es solo para probar la pantalla de login. Cuando se conecte Supabase,
// este archivo se reemplaza por la autenticación real y se borra el usuario de prueba.
// Cualquiera puede ver este archivo en el navegador, así que NUNCA pongas aquí una contraseña real.

// Usuario de prueba temporal
const USUARIO_DEMO = {
  correo: 'demo@sore.app',
  clave: 'Sore-Demo-2026'
};

// Clave con la que se recuerda la sesión en el celular
const CLAVE_SESION = 'sore_sesion';

// ¿Hay una sesión guardada? (el try/catch evita errores si el navegador bloquea el almacenamiento)
function haySesion() {
  try { return localStorage.getItem(CLAVE_SESION) === '1'; } catch (e) { return false; }
}

// Intenta iniciar sesión. Devuelve una promesa con { ok: true } o { ok: false, mensaje }
function iniciarSesion(correo, clave) {
  return new Promise((resolve) => {
    // Simula la espera de un servidor (0.7 segundos)
    setTimeout(() => {
      const correoOk = correo.trim().toLowerCase() === USUARIO_DEMO.correo;
      if (correoOk && clave === USUARIO_DEMO.clave) {
        try { localStorage.setItem(CLAVE_SESION, '1'); } catch (e) { /* sin almacenamiento: la sesión dura hasta cerrar */ }
        resolve({ ok: true });
      } else {
        resolve({ ok: false, mensaje: 'Correo o contraseña incorrectos.' });
      }
    }, 700);
  });
}

// Cierra la sesión guardada
function cerrarSesion() {
  try { localStorage.removeItem(CLAVE_SESION); } catch (e) { /* nada que borrar */ }
}
