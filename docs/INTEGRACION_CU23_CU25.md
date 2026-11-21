# Web: integración selectiva CU23/CU25

Fecha: 2026-11-03. Rama: `Gerstep`.

Se incorporó CU23 desde Rodrigo (`0ee494b`, PR #28) y CU25 desde Daniel (`704303b`, PR #25), únicamente sus directorios funcionales. No se importó el inventario alternativo incluido en la rama de Cristel ni se repitieron CU18/seguimiento/reportes de otros PR.

| Función | Ruta |
|---|---|
| Inventario, crear/editar/retirar activos, tipos, ficha y QR | `/activos` |
| Identificación QR e historial (CU24 ya integrado) | `/identificar-activo-qr` |
| Órdenes, asignación, estados, costos, evidencias, planes y proveedores | `/mantenimiento` |

Las rutas y el menú usan permisos del Backend. Endpoints agregados al cliente central; `.env`, configuración de API, autenticación, CU18–CU22 y CU31 se conservan. Las consultas/catálogos se cancelan y limpian al cambiar de condominio; los activos tienen paginación y protección contra respuestas de búsquedas antiguas.

## Pruebas

- Build de producción correcto. Advertencias previas: tamaño de estilos de bienvenida y CommonJS de `jsqr`/`recordrtc`.
- Suite unitaria completa: 127 pruebas correctas.
- 17 E2E del alcance CU18–CU25/CU31 correctas, con Edge y las pruebas de voz existentes.
- 5 de esas E2E consumen Django real, no respuestas simuladas: reporte/comentario; QR/historial/aislamiento; denegación a residente; crear/editar activo; crear/asignar/iniciar/completar orden e historial.
- Visualización a 1440 px y 390 px, sin desborde horizontal. Se mantuvo el lenguaje visual Taji.
- Las 4 E2E antiguas de `sprint1.spec.ts` no pudieron iniciar: falta el ejecutable Chromium que exige esa suite. No se presentan como aprobadas ni se cambiaron para ocultarlo.

Repetir pruebas de integración sin tocar datos reales:

1. En Backend ejecutar `.venv/Scripts/python.exe scripts/serve_cu24_test_api.py`.
2. En esta carpeta: `$env:CU24_LIVE_URL='http://localhost:18766'` y `node node_modules/@playwright/test/cli.js test e2e/cu23-cu25-live.spec.ts e2e/cu24-live.spec.ts`.
3. Detener el servidor de pruebas. Esta variable es solo para E2E; la aplicación mantiene su configuración habitual.

Capturas: [CU23 escritorio](screenshots/CU23-live-desktop.png), [CU23 móvil](screenshots/CU23-live-mobile.png), [CU25 escritorio](screenshots/CU25-live-desktop.png), [CU25 móvil](screenshots/CU25-live-mobile.png).

Respaldo: `backup/Gerstep-before-cu18-cu25-completion-20261103`. Sin fusiones completas de ramas ni push remoto.
