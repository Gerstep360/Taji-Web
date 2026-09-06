# Integración del Sprint 1

Base: rama `Gerstep`, incorporando el `main` que ya contenía PR #5 de Noelia.
Orden de integración: #9 Eunice (CU03), #6 Cristel (CU05), #7 Daniel (CU06 y
perfil con unidades); #8 Rodrigo (CU04) ya está incluido en la historia de Daniel.

Se conserva CU02 de Noelia sin cambios en sus archivos. Se preservan formularios,
contratos y estilos de los compañeros; los movimientos se limitan a colocar cada
funcionalidad dentro de su paquete y corregir las rutas relativas de importación.

## Ajustes necesarios para que las integraciones convivan

- CU03 pasa de `features/condominium` y `core/services` a `cu03_datos_condominio`.
  Su comprobación de administrador usaba campos que Django no devuelve; ahora
  consulta `role.permissions`/`is_superuser`. La notificación de guardado actualiza
  la vista en Angular sin Zone.js. No se cambian sus campos ni reglas de negocio.
- CU05 pasa de `features/residents` a `cu05_residentes`. Su menú apunta al CRUD
  recibido de Cristel, conservando el layout por paquetes de Gerstep.
- CU06 usa `cu06_asociar_residentes_unidades`, igual que backend. El selector usa
  `/resident-directory/`, mientras el CRUD de CU05 conserva `/residents/`.
- Se combinan rutas y endpoints de todos los PR. CU03 y CU06 tienen rutas y menú
  con permisos coherentes; el perfil conserva las unidades añadidas por Daniel.
- La pantalla de inicio queda en CU30 y los errores compartidos en `shared/pages`.
- Se eliminan registros de depuración de sesión. La configuración pública admite
  variables de CI/VPS, valida la URL y no depende de una IP privada del equipo.
- Registro y recuperación conservan sus textos, normalizados de Windows-1252 a
  UTF-8 para que Angular muestre correctamente las tildes.

Las carpetas vacías de CU futuros son estructura prevista, no implementaciones
terminadas. No se agregan funciones ajenas al Sprint 1 para aparentar cobertura.

## Alcance del backlog

| Tareas | Relación con este repositorio |
|---|---|
| T076–T077 | Angular/TypeScript, HTTP, rutas, layout, permisos y errores |
| T001–T009, T058 | Se consumen desde Django; no se duplican modelos ni PostgreSQL en la web |
| T101 | Flutter pertenece al repositorio móvil |
| T138–T144 | Actividades Scrum; no se consideran realizadas por agregar código |

## Evidencia reproducible

`npm test -- --watch=false` valida componentes y servicios; `npm run build`
comprueba el conjunto de imports y rutas. Playwright usa Django/PostgreSQL en una
base `_e2e` para comprobar login, persistencia de sesión, CU02–CU07, guardado CU03,
permisos de residente y aprobación de una solicitud mediante la pantalla de Noelia.

`deploy/tests/vps_smoke.sh` prueba instalación real en Ubuntu, HTTPS/proxy/cookies,
actualización, ausencia de cambios, fallo de compilación, reversión tras fallo de
salud y recuperación. Solo admite un runner desechable de GitHub Actions.

La integración no modifica la autorización interna de los endpoints del backend.
Una guarda de Angular controla navegación, pero no reemplaza los permisos que
Django debe aplicar al recibir una petición.
