# CF Wealth · Motor de análisis pre-inversión (frontend)

Dashboard React conectado al backend real en Railway
(`https://notas-production-a2e8.up.railway.app`).

## Desarrollo local
```
npm install
npm run dev
```

## Despliegue en Vercel
1. Sube esta carpeta a un repo de GitHub (ej. `CHAPARRO-FERNANDEZ/notas-frontend`)
2. En vercel.com → "Add New Project" → importa el repo
3. Framework preset: Vite (se detecta solo)
4. Deploy — no hace falta ninguna variable de entorno salvo que cambie la URL
   del backend, en cuyo caso añade `VITE_API_BASE`.
