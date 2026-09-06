# Instalación y actualización en VPS

Ubuntu 24.04 o Debian 12+, acceso `sudo`, arquitectura x64/ARM64 y puertos 80/443
abiertos. El dominio web debe apuntar al VPS antes de emitir el certificado.
El backend debe estar instalado y responder en `/api/v1/health/`.

```bash
git clone https://github.com/Gerstep360/Taji-Web.git
cd Taji-Web
sudo bash deploy/vps.sh install web.ejemplo.com correo@ejemplo.com https://api.ejemplo.com
```

Se instalan Nginx, Git, herramientas de compilación, Certbot, Node de `.node-version`
y las dependencias de Angular. Node queda aislado en `/opt/taji-web/runtimes`.
La compilación se ejecuta con el usuario sin privilegios `taji-web`. Nginx sirve
únicamente `dist/taji-web/browser`; no se publica el código fuente ni `.env`.

## Preparar Django

En `/etc/taji/backend.env` del instalador del backend:

```dotenv
FRONTEND_URLS=https://web.ejemplo.com
PASSWORD_RESET_URL=https://web.ejemplo.com/restablecer-contrasena
COOKIE_SECURE=True
```

Si admites varios orígenes, sepáralos por comas. Reinicia el backend después de
cambiar su entorno: `sudo systemctl restart taji`. Su `ALLOWED_HOSTS` debe incluir
el host del origen elegido, por ejemplo `api.ejemplo.com`.

Nginx web recibe `/api/v1/...` y lo envía al backend conservando esa ruta. El
navegador mantiene cookies HttpOnly bajo el dominio web, sin cookies de terceros.
No se reescribe el sitio Nginx del backend. Para ambos servicios en el mismo VPS
puedes usar `http://127.0.0.1:8000` como origen, incluyendo `127.0.0.1` en
`ALLOWED_HOSTS`; el navegador seguirá usando HTTPS. No uses el dominio web como
su propio upstream. Para un backend remoto se exige HTTPS con certificado válido.

## Actualizar

```bash
sudo taji-web-deploy update
```

El comando obtiene `main`, instala las dependencias del nuevo lockfile, usa la
versión de Node del nuevo commit, compila y comprueba Nginx. Cambia el enlace de
versión de forma atómica, recarga Nginx y comprueba página, configuración pública
y salud de la API. Si falla después del cambio, restaura la versión y configuración
anteriores. Si falla la compilación, la versión activa permanece disponible.
Cuando no hay cambios, comprueba salud sin reconstruir. Un cambio de configuración
también provoca publicación, aunque el commit sea el mismo.

No necesita un proceso Angular/Node activo ni `ng serve` en producción. Ejecuta el
actualizador cuando publiques nuevos cambios; no se instala una tarea periódica.
Un cambio de lógica del propio instalador puede requerir ejecutarlo desde el
checkout actualizado: `git pull --ff-only` y `sudo bash deploy/vps.sh update`.

## Archivos y diagnóstico

| Ruta | Contenido |
|---|---|
| `/etc/taji-web/web.env` | Dominio, email TLS y origen del backend; editable solo por root |
| `/opt/taji-web/repository.git` | Repositorio que obtiene `main` |
| `/opt/taji-web/current` | Enlace a la versión activa |
| `/opt/taji-web/releases` | Versiones anteriores y configuración previa de Nginx |
| `/etc/nginx/sites-available/taji-web` | HTTPS, SPA, caché y proxy de API |
| `/usr/local/sbin/taji-web-deploy` | Actualizador instalado |

```bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -u nginx -n 100 --no-pager
curl -f https://web.ejemplo.com/api/v1/health/
sudo certbot renew --dry-run
```

Para cambiar solo el origen del backend, edita `BACKEND_ORIGIN` en `web.env` y
ejecuta `update`. Migrar el dominio web requiere además actualizar DNS y los
orígenes permitidos/recuperación de contraseña en Django. El instalador conserva
las versiones anteriores para recuperación; vigila el espacio del VPS. La
contraseña de PostgreSQL y SMTP permanecen únicamente en el backend.
