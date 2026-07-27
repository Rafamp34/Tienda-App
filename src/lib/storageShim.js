// Sustituye el API window.storage (solo disponible dentro de los artifacts
// de Claude) por una implementación equivalente basada en localStorage,
// para que la app funcione igual una vez desplegada fuera de claude.ai.
//
// Los datos quedan guardados en el navegador de cada dispositivo. Si en el
// futuro quieres que varios dispositivos/usuarios compartan los mismos
// datos, esto habría que sustituirlo por una base de datos real
// (por ejemplo Supabase o Firebase).

if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      if (value === null) throw new Error(`Key not found: ${key}`);
      return { key, value, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      const existed = localStorage.getItem(key) !== null;
      localStorage.removeItem(key);
      return { key, deleted: existed, shared: false };
    },
    async list(prefix = '') {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
      return { keys, prefix, shared: false };
    },
  };
}
