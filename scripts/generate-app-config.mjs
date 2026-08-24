import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const envPath = resolve(root, '.env');
const outputPath = resolve(root, 'public/config/app-config.json');
const fileEnv = await readEnvironment(envPath);
const apiBaseUrl = validateApiBaseUrl(requiredValue('TAJI_API_BASE_URL'));
const requestTimeoutMs = positiveInteger('TAJI_API_TIMEOUT_MS', 12000);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify({ apiBaseUrl, requestTimeoutMs }, null, 2)}\n`,
  'utf8',
);
console.log(`Configuración Web generada para ${apiBaseUrl}`);

function requiredValue(name) {
  const value = (process.env[name] ?? fileEnv[name] ?? '').trim();
  if (!value) throw new Error(`Falta ${name} en Frontend/.env.`);
  return value;
}

function positiveInteger(name, fallback) {
  const raw = (process.env[name] ?? fileEnv[name] ?? '').trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1000) {
    throw new Error(`${name} debe ser un entero mayor o igual a 1000.`);
  }
  return parsed;
}

function validateApiBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('TAJI_API_BASE_URL debe ser una URL HTTP o HTTPS absoluta.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('TAJI_API_BASE_URL no debe contener credenciales y debe usar HTTP o HTTPS.');
  }
  if (!url.pathname.replace(/\/+$/, '').endsWith('/api/v1')) {
    throw new Error('TAJI_API_BASE_URL debe terminar en /api/v1.');
  }
  return value.replace(/\/+$/, '');
}

async function readEnvironment(path) {
  let content;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('Falta Frontend/.env. Copia .env.example y configura la IP del backend.');
    }
    throw error;
  }

  const entries = {};
  for (const sourceLine of content.split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) throw new Error(`Línea inválida en .env: ${sourceLine}`);
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}
