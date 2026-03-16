import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { initializeDb } from "../src/db.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
// Initialize DB
initializeDb().catch(console.error);
// API Routes (todas as suas rotas)
// Exportar para Vercel (IMPORTANTE!)
export default app;
// Iniciar servidor apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
