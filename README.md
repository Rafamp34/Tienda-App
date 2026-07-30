# Cuaderno de Tienda

App de gestión para una tienda pequeña: inventario (con lector de código
de barras), clientes, ventas y facturación mensual.

## 1. Abrir en Visual Studio Code

1. Descomprime el `.zip`.
2. Abre la carpeta `tienda-app` en VS Code (`Archivo → Abrir carpeta…`).
3. Abre una terminal dentro de VS Code (`Terminal → Nueva terminal`).

## 2. Instalar dependencias y probar en local

Necesitas tener [Node.js](https://nodejs.org) instalado (versión 18 o
superior). Luego, en la terminal:

```bash
npm install
npm run dev
```

Se abrirá en `http://localhost:5173`. Ahí puedes comprobar que todo
funciona antes de subirlo.

## 3. Dónde se guardan los datos

Esta versión guarda los datos en el navegador del dispositivo
(`localStorage`), a través de `src/lib/storageShim.js`. Es decir:

- Los datos persisten aunque cierres y vuelvas a abrir el navegador.
- **Cada dispositivo/navegador tiene sus propios datos** — si abres la
  tienda desde el móvil y desde el ordenador, no verás lo mismo en los dos.
- Si borras el historial/caché del navegador, se pierden los datos.

Si más adelante quieres que todos los dispositivos compartan los mismos
datos (por ejemplo, varios empleados metiendo ventas a la vez), avísame:
hay que sustituir ese archivo por una conexión a una base de datos real
(Supabase es la opción más rápida de montar).

## 4. Subir a GitHub

```bash
git init
git add .
git commit -m "Primera versión de la app de la tienda"
```

Crea un repositorio nuevo en GitHub y sigue las instrucciones que te da
para conectarlo (`git remote add origin ...` y `git push`).

## 5. Desplegar en Netlify

**Opción A — conectando GitHub (recomendada):**

1. Entra en [app.netlify.com](https://app.netlify.com) → "Add new site" →
   "Import an existing project".
2. Conecta tu cuenta de GitHub y elige este repositorio.
3. Netlify detecta automáticamente la configuración (ya incluida en
   `netlify.toml`): build command `npm run build`, carpeta `dist`.
4. Dale a "Deploy". En un par de minutos tienes una URL pública
   (`algo.netlify.app`), y cada vez que hagas `git push` se actualiza sola.

**Opción B — arrastrar y soltar (más rápida, sin GitHub):**

```bash
npm run build
```

Esto genera una carpeta `dist/`. Ve a
[app.netlify.com/drop](https://app.netlify.com/drop) y arrastra esa
carpeta `dist` directamente al navegador. Netlify la publica al instante.
La pega: para actualizarla luego tienes que repetir el proceso a mano.

## 6. Dominio propio (opcional)

Una vez desplegado, en Netlify: `Site settings → Domain management → Add
a domain`, y sigue las instrucciones para apuntar tu dominio.

## 7. Login (obligatorio para que la app no quede pública)

La app está protegida por una contraseña que se comprueba en el servidor
de Netlify (Edge Function), no en el navegador — no basta con mirar el
código para saltársela. **Sin este paso, cualquiera con el enlace puede
entrar**, así que hazlo antes de compartir la URL.

**Nota importante — arrastrar y soltar (Opción B) no sirve para esto.**
Las Edge Functions solo se activan cuando el sitio está conectado a un
repositorio de Git (Opción A). Si usas Netlify Drop, la carpeta `dist/`
no incluye la carpeta `netlify/edge-functions/`, así que el login no
se activará. Usa la Opción A (GitHub) para que el login funcione.

1. Genera una contraseña propia (evita cosas como "1234" o el nombre de
   la tienda) y un secreto largo y aleatorio. Puedes generar el secreto
   con este comando en la terminal:
   ```bash
   openssl rand -hex 32
   ```
   (En Windows, si no tienes `openssl`, vale con escribir 40-50
   caracteres aleatorios a mano — letras, números y símbolos mezclados.)

2. En Netlify: `Site configuration → Environment variables → Add a
   variable`, y añade dos:
   - `SITE_PASSWORD` → la contraseña que usarán en la tienda
   - `SITE_AUTH_SECRET` → el secreto largo que generaste en el paso 1

3. Vuelve a desplegar el sitio (`Deploys → Trigger deploy → Deploy
   site`) para que tome las variables nuevas.

4. Al abrir la URL, pedirá la contraseña antes de mostrar nada de la
   app. La sesión dura 7 días en ese navegador; para cerrarla antes, usa
   el botón de cerrar sesión (icono de puerta) en la cabecera de la app.

**Qué tan segura es esta protección — sé honesto contigo:**
- ✅ La contraseña se comprueba en el servidor, nunca se envía el código
  de verificación al navegador — no se puede saltar con F12.
- ✅ La sesión usa una firma criptográfica (HMAC-SHA256) que nadie puede
  falsificar sin conocer `SITE_AUTH_SECRET`.
- ⚠️ Es una contraseña **compartida** para todo el que entre — no hay
  usuarios individuales ni "he olvidado mi contraseña". Si se filtra,
  hay que cambiarla en Netlify y volver a desplegar.
- ⚠️ No tiene límite de intentos fallidos (protección contra fuerza
  bruta) — mitígalo usando una contraseña larga y no obvia.

## 8. Base de datos compartida (Supabase)

Desde esta versión, los datos (productos, clientes, ventas) ya NO viven
solo en el navegador — se guardan en Supabase, así que el móvil y el
PC ven exactamente lo mismo.

**Pasos para dejarlo funcionando:**

1. En el panel de Supabase de tu proyecto, ve a **SQL Editor** → **New
   query**, pega el contenido de `supabase-schema.sql` (incluido en este
   proyecto) → **Run**. Crea las tres tablas necesarias.
2. En tu `.env` ya están rellenos `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` con los datos de tu proyecto.
3. **Importante:** estas dos variables también hay que añadirlas en
   Netlify (`Site configuration → Environment variables`), igual que
   hiciste con `SITE_PASSWORD` — con **"All scopes"** para evitar líos
   de permisos. A diferencia de las del login, estas SÍ se usan durante
   el proceso de build (Vite las incorpora al construir la web), así
   que sin ellas ahí, la versión desplegada no sabrá conectarse.
4. Vuelve a desplegar (`Deploys → Trigger deploy → Deploy site`).
5. Prueba abriendo la web y comprobando que carga los datos — la
   primera vez rellenará las tablas con los datos de ejemplo si están
   vacías.

**Nota sobre seguridad:** la `anon key` de Supabase está pensada para
ir en el código del navegador — no es un secreto oculto, es pública
por diseño. Lo que protege tu base de datos de que cualquiera la use
es, en este proyecto, la contraseña de entrada al sitio (el login que
montamos antes) — quien no pasa esa puerta nunca llega a ver el código
que contiene esa clave.

**Nota sobre el plan gratuito:** Supabase pausa los proyectos gratuitos
tras 7 días sin actividad. Si la tienda cierra un tiempo largo, puede
que tengas que entrar al panel de Supabase y reanudar el proyecto a
mano al volver a abrir.
