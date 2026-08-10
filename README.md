```text
 ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 ║                                                                                                              ║
 ║  ████████╗ █████╗   ██████╗ ██╗   ███████╗██████╗  ██████╗ ███╗   ██╗████████╗███████╗███╗   ██╗██████╗      ║
 ║  ╚══██╔══╝██╔══██╗    ██╔══╝██║   ██╔════╝██╔══██╗██╔═══██╗████╗  ██║╚══██╔══╝██╔════╝████╗  ██║██╔══██╗     ║
 ║     ██║   ███████║    ██║   ██║   █████╗  ██████╔╝██║   ██║██╔██╗ ██║   ██║   █████╗  ██╔██╗ ██║██║  ██║     ║
 ║     ██║   ██╔══██║██  ██║   ██║   ██╔══╝  ██╔══██╗██║   ██║██║╚██╗██║   ██║   ██╔══╝  ██║╚██╗██║██║  ██║     ║
 ║     ██║   ██║  ██║╚█████╔╝  ██║   ██║     ██║  ██║╚██████╔╝██║ ╚████║   ██║   ███████╗██║ ╚████║██████╔╝     ║
 ║     ╚═╝   ╚═╝  ╚═╝ ╚════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═════╝      ║
 ║                                                                                                              ║
 ║                 TAJI — Aplicación Web para Condominios (Angular Framework)                                   ║
 ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

# TAJI Frontend Web — Aplicación Angular SPA

Aplicación Web cliente de la plataforma **Taji**, desarrollada en **Angular** como una Single Page Application (SPA). Proporciona la interfaz de usuario para la administración de condominios, inicio de sesión con JWT mediante cookies HttpOnly, control de acceso basado en roles (RBAC) y modelos de dominio tipados strictly.

---

## Requisitos Previos

- **Node.js**: Versión 18.x, 20.x o 22.x
- **npm**: Incluido con Node.js (se recomienda npm 10+)
- **PowerShell**: (Para ejecutar los scripts de automatización `.ps1` en Windows)

---

## Instalación y Configuración del Entorno

Puedes instalar y preparar las dependencias del proyecto de dos formas: mediante el script automático de PowerShell o usando comandos CLI manuales.

### Opción 1: Mediante Script de PowerShell (Recomendado)

Abre una terminal PowerShell en la carpeta `Frontend` y ejecuta:

```powershell
.\instalar_requerimientos.ps1
```

Este script automatiza los siguientes pasos:
1. Verifica que Node.js y `npm` estén correctamente instalados.
2. Ejecuta `npm install` para descargar e instalar los paquetes de `package.json`.
3. Crea el archivo de configuración [public/config/app-config.json](file:///c:/Users/rojas/Documents/Proyectos/Sistemas%20de%20informacion%20II/Frontend/public/config/app-config.json) con la URL inicial de la API.

---

### Opción 2: Mediante Comandos Manuales (CLI)

Si prefieres realizar la instalación manualmente:

1. **Navegar al directorio Frontend**:
   ```powershell
   cd Frontend
   ```

2. **Instalar las dependencias de Node**:
   ```powershell
   npm install
   ```

3. **Verificar o crear la configuración de Runtime**:
   Asegúrate de que exista el archivo `public/config/app-config.json` con el siguiente contenido:
   ```json
   {
     "apiBaseUrl": "http://localhost:8000/api/v1",
     "requestTimeoutMs": 12000
   }
   ```

---

## Cómo Ejecutar la Aplicación Web

### Opción 1: Mediante Script PowerShell (Recomendado para Red Local / MVP)

Para levantar la interfaz web configurando automáticamente la IP de la red local (LAN) para comunicarse con el Backend Django:

```powershell
.\iniciar.ps1
```

#### Parámetros opcionales del script `iniciar.ps1`:
- **`-MachineIp`**: Especifica manualmente una dirección IP local en lugar de la auto-detectada.
- **`-ApiPort`**: Define el puerto del Backend (por defecto `8000`).
- **`-WebPort`**: Define el puerto de desarrollo de Angular (por defecto `4200`).

**Ejemplos de uso:**
```powershell
# Especificar IP de la máquina
.\iniciar.ps1 -MachineIp "192.168.100.50"

# Especificar puerto web diferente
.\iniciar.ps1 -WebPort 4300
```

---

### Opción 2: Mediante Comandos Manuales (CLI)

1. **Iniciar servidor de desarrollo (Angular CLI)**:
   ```powershell
   npm start
   ```
   *Esto iniciará el servidor en `http://localhost:4200` utilizando la configuración de proxy `proxy.conf.json`.*

2. **Iniciar permitiendo conexiones desde la red local**:
   ```powershell
   npx ng serve --host 0.0.0.0 --port 4200
   ```

---

## Scripts PowerShell Incluidos

| Script | Descripción | Parámetros Principales |
| --- | --- | --- |
| [instalar_requerimientos.ps1](file:///c:/Users/rojas/Documents/Proyectos/Sistemas%20de%20informacion%20II/Frontend/instalar_requerimientos.ps1) | Verifica Node/npm, ejecuta `npm install` y crea la configuración base `app-config.json`. | Ninguno |
| [iniciar.ps1](file:///c:/Users/rojas/Documents/Proyectos/Sistemas%20de%20informacion%20II/Frontend/iniciar.ps1) | Detecta la IP LAN de la máquina, actualiza runtime `app-config.json` e inicia Angular en `0.0.0.0`. | `-MachineIp`, `-ApiPort`, `-WebPort` |

---

## Comandos Útiles de Desarrollo

```powershell
# Ejecutar compilación de desarrollo continua
npm run watch

# Compilar para Producción (Crea el bundle optimizado en dist/)
npm run build

# Ejecutar Pruebas Unitarias (Vitest)
npm test
```

---

## Estructura del Proyecto Frontend

```text
Frontend/
├── public/
│   └── config/
│       └── app-config.json   # Configuración editable en runtime (API URL, Timeouts)
├── src/
│   ├── app/
│   │   ├── core/             # Servicios centrales de API, interceptores HTTP y guardias de ruta
│   │   ├── domain/           # Contratos TypeScript e interfaces de las 47 tablas de dominio
│   │   └── features/         # Módulos y pantallas de usuario (Auth, Dashboard, Condominios, etc.)
│   ├── assets/               # Recurso estáticos, fuentes, íconos y marca Taji
│   ├── index.html            # HTML principal
│   └── main.ts               # Punto de entrada de Angular
├── angular.json              # Configuración de compilación e infraestructura Angular
├── iniciar.ps1               # Script de lanzamiento con autodetección de IP LAN
├── instalar_requerimientos.ps1 # Script de instalación de Node.js y dependencias
├── package.json              # Dependencias de proyecto y scripts npm
└── proxy.conf.json           # Configuración de proxy para desarrollo local
```
