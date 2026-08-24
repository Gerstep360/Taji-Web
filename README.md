# Taji Web

Aplicación SPA de Taji construida con Angular y TypeScript. La base integrada cubre T076 y T077 con rutas modulares, cliente HTTP centralizado, layout, rutas privadas, navegación, interceptores y páginas 403, 404 y 500.

> El backlog menciona React para T076, pero este repositorio y los cambios recibidos desde main están implementados en Angular. Se mantuvo la tecnología real del proyecto para no sustituir ni duplicar la aplicación.

## Requisitos

- Node.js 20 o 22
- npm 10 o superior
- PowerShell para los scripts PS1

## Configuración de la API

La fuente editable es .env; no se guarda la IP en TypeScript ni se reescribe desde PowerShell.

~~~powershell
Copy-Item .env.example .env
~~~

Edita .env:

~~~dotenv
TAJI_API_BASE_URL=http://192.168.100.223:8000/api/v1
TAJI_API_TIMEOUT_MS=12000
~~~

TAJI_API_BASE_URL debe ser una URL HTTP(S) absoluta y terminar en /api/v1. .env está ignorado por Git. .env.example documenta las variables sin imponer la IP de una máquina concreta.

Antes de start, build y test, scripts/generate-app-config.mjs valida .env y genera public/config/app-config.json. Ese JSON también está ignorado: es un artefacto, no otra fuente de configuración.

## Instalación y ejecución

~~~powershell
.\instalar_requerimientos.ps1
.\iniciar.ps1
~~~

iniciar.ps1 no cambia la API; solamente valida que exista .env y levanta Angular en 0.0.0.0. El puerto web es opcional:

~~~powershell
.\iniciar.ps1 -WebPort 4300
~~~

También puedes usar npm:

~~~powershell
npm install
npm start
~~~

## Verificación

~~~powershell
npm run config
npm test -- --watch=false
npm run build
~~~

## Estructura relevante

~~~text
Frontend/
├── .env.example
├── scripts/
│   └── generate-app-config.mjs
├── public/config/
│   └── app-config.json       # Generado e ignorado
├── src/app/
│   ├── core/                 # Configuración, HTTP, errores, sesión y guardas
│   ├── domain/               # Contratos TypeScript
│   ├── features/             # Pantallas por funcionalidad
│   ├── layout/               # Shell y navegación autenticada
│   └── app.routes.ts         # Rutas públicas, privadas y errores
├── iniciar.ps1
├── instalar_requerimientos.ps1
└── package.json
~~~
