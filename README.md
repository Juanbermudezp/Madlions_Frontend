# Madlions Gym · Frontend

Frontend de la plataforma de gestión de gimnasio del equipo Madlions (Ingeniería de Software, UCA, ciclo 02/2026). Next.js 16 + React 19.

| Componente | URL |
|---|---|
| Frontend | https://madlions-frontend.vercel.app |
| Documentación de la API (Swagger) | https://madlions-backend.onrender.com/api/docs |

**La documentación completa del proyecto está en el repositorio del backend:**
https://github.com/Juanbermudezp/Madlions_Backend (README y carpeta `docs`).

## Levantar en local

```bash
cp .env.example .env    # API_URL=http://localhost:8000/api/v1 (URL del backend local)
npm ci
npm run dev             # http://localhost:3000 (o el siguiente puerto libre)
npm test                # pruebas con Vitest (carpeta tests/)
```
