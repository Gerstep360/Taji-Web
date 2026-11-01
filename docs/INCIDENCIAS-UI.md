# Incidencias: registro, atención y análisis

## Pantallas diferentes, una misma incidencia

| Ruta | Trabajo principal |
| --- | --- |
| `/reportar-incidencia` | Registrar descripción, categoría, ubicación y evidencias. Código y prioridad inicial los asigna el servidor. |
| `/incidencias` | Coordinar estados, responsables, plazos, evidencias, comentarios e historial. |
| `/analisis-incidencias` | Revisar la propuesta NVIDIA, peligros, negaciones y acciones; confirmar o corregir con autorización. |
| `/catalogos-incidencias` | Crear, buscar, editar, desactivar y reactivar categorías/prioridades desde la cuenta global. |

Los enlaces con `?codigo=...` abren el reporte concreto en seguimiento o análisis.
Los servicios usan `ApiClient` y las rutas centralizadas; no contienen IP ni API keys.
El reporte se envía con `FormData` y evidencias repetidas en `evidences`.
Los límites de archivos, categorías, sectores, unidades y activos se consultan
en `/paquete3/incidents/options/`. Las unidades se filtran por ubicación y alcance
del usuario; el backend sigue siendo la autoridad.

NVIDIA se consulta exclusivamente desde Backend. La pantalla distingue cola,
procesamiento, propuesta, revisión y fallo con clasificación manual. El sondeo
termina al salir o después de dos minutos y puede retomarse sin solicitar otro
análisis. La confianza del modelo no se presenta como garantía de exactitud.

No se eliminan catálogos con referencias históricas: la baja es reversible y
excluye el valor de nuevos reportes/análisis. Cambiar una categoría no requiere
entrenar un modelo. El código interno se genera al crear y no se cambia al editar.

## Verificación local (2026-11-01)

- Build de producción Angular correcto. Permanece un aviso anterior de presupuesto
  CSS en la página pública `welcome`, ajeno a estas pantallas.
- 110 pruebas unitarias y seis recorridos Playwright aprobados.
- Vistas de 1440 y 390 px: formulario, confirmación, catálogos, editor, cola,
  propuesta y clasificación manual. Incluye movimiento reducido.
- Backend: 111 pruebas ejecutadas, 109 aprobadas y dos omitidas por requerir
  concurrencia PostgreSQL; estas pruebas locales usan una base SQLite aislada.
- Prueba NVIDIA real aprobada: POST multipart 201, cola y análisis en 2.342 s,
  consulta como residente y revisión autorizada 200; originales conservados.
  Es una muestra funcional, no una garantía de disponibilidad o latencia.
- Flutter: 13 pruebas enfocadas aprobadas, análisis estático del código modificado
  sin problemas y APK debug generado con el formulario de registro.

Capturas: [registro](screenshots/reportar-desktop.png),
[catálogos](screenshots/catalogos-desktop.png),
[catálogos a 390 px](screenshots/catalogos-mobile.png),
[análisis](screenshots/CU22-desktop.png),
[revisión manual a 390 px](screenshots/CU22-manual-mobile.png).

El `runserver` de desarrollo inicia el procesador IA integrado al arrancar o
recargar Django. En producción se conserva el servicio separado. La interfaz
consulta su latido y avisa cuando está desconectado, sin reenviar el reporte.
Esta actualización de interfaz es local; no sustituye por sí sola la release
que se publicó anteriormente en el VPS.

## Galería y seguridad contextual

Seguimiento y clasificación utilizan `IncidentEvidenceComponent`: fotos visibles
con vista ampliada, navegación, Escape y restauración del foco. Solo usa URLs de
la API o del mismo origen, con endpoints privados; nunca convierte `file_path`
en una URL pública. Los fallos de carga permiten reintentar y los documentos
siguen descargándose. Pruebas `e2e/incident-gallery.spec.ts`: imágenes decodificadas,
ambas páginas, escritorio 1440 px y móvil 390 px, sin desbordamiento horizontal.

Si falla NVIDIA pero las reglas detectan un peligro alto/crítico, el panel muestra
la alerta de seguridad y exige revisión humana. No presenta el fallo como éxito.

Verificación final de esta ampliación: build aprobado y nueve recorridos
Playwright aprobados (incluyen ambas galerías y alerta local con NVIDIA caído).
Backend: 129 pruebas ejecutadas, 124 aprobadas y cinco omitidas (tres NVIDIA
opt-in para no consumir API y dos de concurrencia PostgreSQL). La base de pruebas
es aislada; la muestra real de violencia se comprobó aparte en el servidor local.
