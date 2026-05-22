# Matchplay

Monorepo con backend Spring Boot y frontend React (Vite).

## Estructura

```
matchplay-repository/
├── backend/      # Spring Boot 3 · Java 21 · Maven
├── frontend/     # React 18 · Vite 5
└── .vscode/      # Configuración de workspace
```

## Requisitos

- Java 21
- Maven 3.9+
- Node.js 20+

## Arrancar en desarrollo

### Opción A — VS Code (recomendado)

`Ctrl+Shift+B` → **Arrancar todo** (lanza backend y frontend en paralelo).

### Opción B — terminal

```bash
# Backend (puerto 8080)
cd backend && mvn spring-boot:run

# Frontend (puerto 5173)
cd frontend && npm install && npm run dev
```

El frontend proxea `/api/*` al backend automáticamente (ver `vite.config.js`).

## Debug

Abre el panel **Run & Debug** (`Ctrl+Shift+D`) y selecciona **Debug Spring Boot**.
