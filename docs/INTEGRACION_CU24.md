# Integración Web selectiva de CU24

## Fuentes y exclusiones

Se importó únicamente `cu24_identificar_activo_qr` de [Cristel #29](https://github.com/Gerstep360/Taji-Web/pull/29), fuente `10e87a5`. No se fusionó su historial, que contiene CU23 y CU25. Se excluyeron [Rodrigo #28](https://github.com/Gerstep360/Taji-Web/pull/28) y [Daniel #25](https://github.com/Gerstep360/Taji-Web/pull/25), como indicó el usuario.

Las funciones CU18/CU19 de [Noelia #27](https://github.com/Gerstep360/Taji-Web/pull/27) y [Eunice #26](https://github.com/Gerstep360/Taji-Web/pull/26) ya tienen implementación compatible en Gerstep; no se importaron otras pantallas que duplicarían registro, seguimiento o reportes. Se conservaron las mejoras de Gerstep para CU21, CU22 y CU31.

De la integración de Eunice se tomaron los enlaces de compatibilidad (`/registrar-incidencia` → `/reportar-incidencia`, `/seguimiento-incidencias` → `/incidencias`) y el manejo local de 403, reutilizando el token HTTP existente en vez de crear otro paralelo. No se importó su cambio de `/health/` a `/api/v1/health/`: el cliente ya antepone `/api/v1`, por lo que habría duplicado el prefijo.

No se modificó `main`, ni se aprobaron/cerraron/fusionaron PRs en GitHub. Existe la rama local de respaldo `backup/Gerstep-before-cu24-integration-20261103`.

## Función integrada

Ruta: `/identificar-activo-qr`, dentro de **Activos y Mantenimiento → Identificación QR**. Menú y guard usan los mismos permisos que Backend (`manage_maintenance`, `manage_assets`, `view_general_status`, `maintain_assets`; el servidor sigue siendo la autoridad).

- Captura por cámara con `jsqr` y alternativa de ingreso manual.
- Validación del QR, ficha de activo e historial de incidencias, órdenes y planes existentes.
- Cliente HTTP central y configuración API existentes, sin direcciones IP propias.
- Resolución explícita de las dependencias de lectura que antes apuntaban a CU23 sin implementar sus CRUD.
- Las solicitudes se cancelan al salir y sus resultados se descartan si cambia el condominio.
- La cámara libera sus tracks al cerrar, incluso si un permiso termina después de salir. Se limita la decodificación a aproximadamente 8 cuadros/s y 640 px para evitar procesar cada cuadro a resolución completa.
- Se ajustó el encabezado al estilo Taji, las columnas del detalle y las pestañas en pantalla estrecha.

## Pruebas

- Compilación Angular correcta.
- Suite unitaria completa: **124 aprobadas**.
- **15 pruebas de navegador aprobadas** para CU21, CU22, CU24, CU31, galería, registro y espacio IA.
- CU24 se probó contra Django real y login real sobre una base SQLite efímera. El escáner decodificó un QR reproducido con cámara sintética; se verificaron historial, activo ajeno rechazado y residente sin acceso. Otra prueba real creó una incidencia y añadió un comentario desde Web, usando los enlaces antiguos de Eunice redirigidos a los módulos existentes. No fueron mocks de los endpoints.
- [Escritorio](screenshots/CU24-live-desktop.png) y [pantalla estrecha](screenshots/CU24-live-mobile.png) revisados.

Repetir CU24 real: iniciar `Backend/scripts/serve_cu24_test_api.py`, compilar Web y ejecutar:

```powershell
$env:CU24_LIVE_URL='http://localhost:18766'
node node_modules/@playwright/test/cli.js test e2e/cu24-live.spec.ts
```

Sin `CU24_LIVE_URL`, esos tres casos se omiten para no intentar conectarse a una base real. Cámara física requiere verificación manual y HTTPS o localhost. No se compiló Móvil ni se modificó su repositorio.

Advertencias de compilación no bloqueantes: presupuesto previo de `welcome.page.scss`, y paquetes CommonJS `recordrtc`/`jsqr` (cargados en los módulos de sus funciones). No se realizaron actualizaciones masivas de dependencias.
