# Deriv SynthQuant Pro — Señales en Índices Sintéticos, Motor ICT/SMC, RBAC & Bitácora en Tiempo Real

MicroApp completa para el análisis, generación de señales y gestión de bitácoras de trading en **Índices Sintéticos de Deriv** (`Volatility 10–100`, `1s`, `Boom 300/500/1000`, `Crash 300/500/1000`, `Jump 25–100`, `Step Index` y `Range Break`).

## Características Principales

1. **Conexión a Deriv WebSocket API v3 (`wss://ws.derivws.com/websockets/v3`)**
   - Catálogo de 22 Índices Sintéticos de Deriv con configuración técnica (Pip, decimales, lote mínimo, spread, velocidad `1s`/`2s`).
   - Selección personalizada por usuario de qué índices monitorear y de cuáles recibir señales.
   - Soporte para `App ID` público (`1089`) y `API Token` opcional (`authorize`) + motor cuántico 24/7 de respaldo.

2. **Motor de Estrategias ICT / Smart Money Concepts (SMC) & Cuantitativas**
   - **6 Estrategias Preconfiguradas de Alta Efectividad:**
     - *ICT Silver Bullet + FVG + OTE (76.8% WR)*
     - *ICT Market Structure Shift (MSS) + Order Block (74.2% WR)*
     - *Boom & Crash Institutional Spike Hunter (78.4% WR)*
     - *ICT Judas Swing & Turtle Soup Reversal (71.5% WR)*
     - *Volatility Triple EMA (20/50/200) + ATR Trend (73.1% WR)*
     - *Jump & Step Volatility Squeeze Breakout (69.5% WR)*
   - **Constructor de Estrategias Personalizadas** con Backtest instantáneo.

3. **Seguimiento en Tiempo Real con Barra `SL ◄─── Entry ───► TP`**
   - Al tomar una señal hacia la bitácora, la barra de progreso se actualiza tick a tick con el precio en vivo.
   - **Auto-Trigger SL/TP:** Actualiza automáticamente el estado de la operación a **`GANADA (TP HIT)`** o **`PERDIDA (SL HIT)`** cuando el precio toca el Take Profit o el Stop Loss.

4. **Bitácora de Trading Profesional, Límites Diarios y Psicotrading**
   - Creación de múltiples bitácoras con configuración de capital inicial, riesgo %, **máximo de entradas por día** y **máximo de pérdidas por día** (con Guardia Anti-Overtrading).
   - **Checklist Pre-Trade obligatorio** configurable.
   - Registro de **Estado de Ánimo (Psicotrading)**, sentimiento del mercado, notas y exportación a CSV.

5. **Seguridad Nivel 5, Login con Google (OAuth 2.0) y Roles/Permisos (RBAC)**
   - Registro con hashing `PBKDF2-HMAC-SHA512`, medidor de entropía en bits, 2FA/TOTP y protección Anti-Fuerza Bruta.
   - Acceso con Google OAuth 2.0 y matriz de permisos RBAC en vivo (`Super Admin`, `Analista ICT`, `Trader Pro / VIP`, `Viewer`).
   - **Menú de Perfil en la Esquina Superior Izquierda**: Popover nativo con carga y recorte de foto de perfil, avatares SVG predefinidos, edición de datos del usuario y cierre de sesión.

6. **Diseño UX/UI Adaptativo y Mobile-First**
   - Barras de desplazamiento personalizadas (`scrollbar-width`, `scrollbar-gutter`, `:webkit-scrollbar`) con degradados de estado de scroll (`scroll-state(scrollable)` + fallback JS).
   - Barra de navegación inferior fija en dispositivos móviles con soporte `safe-area-inset-bottom` y objetivos táctiles de `44px`.

## Ejecución Rápida

```bash
npm start
```

Abre en tu navegador: `http://localhost:3080`
