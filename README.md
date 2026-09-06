```text
 +------------------------------------------------------------------+
 |                                                                  |
 |   TTTTTTT   AAA       JJJJ  III    W   W  EEEEE  BBBB              |
 |      T     A   A         J   I     W   W  E      B   B             |
 |      T     AAAAA         J   I     W W W  EEEE   BBBB              |
 |      T     A   A     J   J   I     WW WW  E      B   B             |
 |      T     A   A      JJJ   III    W   W  EEEEE  BBBB              |
 |                                                                  |
 |           CONDOMINIOS / ANGULAR / DJANGO REST / SPRINT 1           |
 +------------------------------------------------------------------+
```

# Taji Web

Frontend Angular 22 para la API de [Taji Backend](https://github.com/Gerstep360/Taji-Backend).
Integra CU01–CU07, sesión con cookies HttpOnly, roles y permisos, navegación por
cinco paquetes, formularios y manejo global de errores. Conserva la implementación
CU02 de Noelia que ya estaba en `main`.

El backlog T076 menciona React, pero el equipo implementó Angular. Esta integración
mantiene Angular y las pantallas existentes; no duplica la aplicación en React.

## Inicio rápido — Windows

```powershell
git clone https://github.com/Gerstep360/Taji-Web.git Frontend
cd Frontend
.\instalar_requerimientos.ps1
.\iniciar.ps1
```

El instalador descarga Node **24.19.0** con npm, verifica SHA256, instala las
dependencias exactas del lockfile y compila Angular. No requiere instalar un
Angular CLI global ni cambia el Node de otros proyectos. Crea `.env` solo si falta.

Para obtener cambios de la rama actual y volver a instalar/compilar:

```powershell
.\instalar_requerimientos.ps1 -Actualizar
```

Detén el servidor local con `Ctrl+C` y vuelve a ejecutar `iniciar.ps1` después de
actualizar dependencias. El VPS tiene su propio actualizador con recarga de Nginx.

## Conexión al backend

```dotenv
TAJI_API_BASE_URL=http://localhost:8000/api/v1
TAJI_API_TIMEOUT_MS=12000
```

Abre `http://localhost:4200` y ejecuta Django en el puerto 8000. Usa `localhost`
en ambas direcciones; mezclarlo con `127.0.0.1` puede impedir el envío de cookies.
En el backend, `FRONTEND_URLS` debe incluir `http://localhost:4200` y para desarrollo
HTTP `COOKIE_SECURE=False`. Configura su PostgreSQL según el README del backend.

`.env` es local y está ignorado. `npm start`, `npm run build` y `npm test` generan
`public/config/app-config.json` con la URL validada. El entorno del proceso tiene
prioridad sobre `.env`, por lo que CI/VPS no necesitan copiar archivos personales.
Ese JSON es **público**: nunca colocar contraseñas, claves privadas o credenciales
PostgreSQL en la configuración del frontend.

## Paquetes

| Carpeta en `src/app/paquetes` | Paquete funcional | Casos de uso |
|---|---|---|
| `paquete1_usuarios_condominio` | Gestión de Usuarios y Condominio | CU01–CU07 |
| `paquete2_seguridad_accesos` | Seguridad, Accesos y Auditoría | CU08–CU17 |
| `paquete3_incidencias_ia` | Incidencias e Inteligencia Artificial | CU18–CU22 |
| `paquete4_activos_mantenimiento` | Activos y Mantenimiento | CU23–CU25 |
| `paquete5_servicios_comunidad` | Servicios y Administración Comunitaria | CU26–CU30 |

```text
src/app/
|-- core/       Configuración, HTTP, autenticación, permisos y errores
|-- domain/     Contratos compartidos
|-- paquetes/   Pantallas y servicios por paquete y caso de uso
|-- shared/     Componentes reutilizables, layout y páginas de error
`-- app.routes.ts
deploy/         Instalador Linux, actualización y prueba real de VPS
scripts/        Configuración pública y backend aislado para pruebas
e2e/            Pruebas de navegador contra Django y PostgreSQL
```

| CU | Funcionalidad | Ruta |
|---|---|---|
| CU01 | Autenticación, registro, recuperación y sesión | `/iniciar-sesion` |
| CU02 | Usuarios, roles, permisos y aprobación de residentes | `/roles-y-permisos` |
| CU03 | Datos generales del condominio | `/condominium/config` |
| CU04 | Sectores y unidades habitacionales | `/sectores-unidades` |
| CU05 | Residentes y copropietarios | `/residentes-y-copropietarios` |
| CU06 | Asociaciones entre residentes y unidades | `/residentes-unidades` |
| CU07 | Personal del condominio | `/personal` |

CU08–CU29 tienen espacio reservado para siguientes sprints. CU30 contiene la
pantalla de inicio existente, **no** un módulo completo de reportes. La navegación
solo habilita las funciones implementadas y autorizadas para el usuario.

## Verificación

Con Node de `.node-version` y npm disponibles:

```bash
npm ci
npm test -- --watch=false
npm run build
npx playwright install chromium
# Otra terminal, con el venv del backend:
../Backend/.venv/bin/python scripts/e2e/prepare-backend.py --backend ../Backend --serve
npm run test:e2e
```

En Windows, el Python equivalente es `..\Backend\.venv\Scripts\python.exe`.
La prueba crea **`taji_web_e2e`**, separada de `taji`; requiere permisos para crear
una base de pruebas. Nunca introduce usuarios de prueba en la base real. El
servidor de pruebas usa el puerto 8001 y Playwright sirve el build en 4201.

GitHub Actions ejecuta pruebas unitarias, compilación, navegación/autenticación
contra Django y una instalación real de Node/Nginx con actualizaciones y reversión
en Ubuntu desechable. La emisión ACME se sustituye solo en CI por un certificado
de prueba confiable; Nginx, TLS, API, npm y Angular se ejecutan de verdad.

## VPS

```bash
sudo bash deploy/vps.sh install web.ejemplo.com correo@ejemplo.com https://api.ejemplo.com
sudo taji-web-deploy update
```

Consulta [la guía de despliegue](deploy/README.md) para DNS, backend, HTTPS y
actualizaciones. El instalador publica el build y conecta `/api/` con Django desde
el mismo dominio de la web. PostgreSQL pertenece al backend y no se instala otra
base de datos para Angular.

Los cambios de integración y su relación con el Sprint están documentados en
[Paquetes y Sprint 1](docs/PAQUETES-Y-SPRINT1.md).
