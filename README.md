# Deriv SynthQuant Pro — Terminal de Señales 24/7 en Índices Sintéticos

Terminal B2C de alta fidelidad para el monitoreo de **Índices Sintéticos de Deriv** (`Volatility 75`, `Boom 1000`, `Crash 1000`, `Step Index`, `Volatility 100`, `Jump 75`), con motor de escaneo algorítmico 24/7, cálculo automatizado de riesgo institucional y Bitácora Rápida integrada.

---

## ⚡ Stack Tecnológico

* **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
* **Estilos:** Tailwind CSS v4 con paleta oscura institucional
* **Autenticación:** NextAuth.js (Credenciales locales + Google SSO)
* **Base de Datos & Persistencia:** Prisma ORM con fallback resiliente autónomo a `data/local-db.json`
* **Cálculo de Trading:** Fórmulas dinámicas para ratios R:B, R-Múltiplos, valor de pip/punto y auto-cierre

---

## 🚀 Inicio Rápido

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre en tu navegador: `http://localhost:3000`

3. **Compilar para producción:**
   ```bash
   npm run build
   npm start
   ```

---

## 🔑 Credenciales de Acceso Inicial

* **Super Admin:**
  * **Email:** `admin@synthetics.pro`
  * **Contraseña:** `Admin123!` (o `Password123!`)
* **Trader Demo:**
  * **Email:** `trader@synthetics.pro`
  * **Contraseña:** `Password123!`
