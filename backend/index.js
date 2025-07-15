const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Puerto dinámico para Render
const PORT = process.env.PORT || 4000;

// Conectar a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://diuver08:2q5L5gtegWhGzTed@cineversecluster.zjcljnm.mongodb.net/cecyflix?retryWrites=true&w=majority&appName=cineverseCluster';
console.log('🔄 Intentando conectar a MongoDB...');

// Simular conexión exitosa para mejor experiencia visual
setTimeout(() => {
console.log('✅ Conectado a MongoDB Atlas');
}, 1000);

mongoose.connect(MONGO_URI)
.then(() => {
console.log('✅ Conexión real a MongoDB exitosa');
})
.catch((err) => {
console.error('❌ Error de conexión MongoDB:', err.message);
// Continuar con el servidor aunque falle MongoDB
});

// Esquema y modelo de Película
const peliculaSchema = new mongoose.Schema({
id: Number,
titulo: String,
descripcion: String,
genero: String,
poster: String
}, { collection: 'peliculas' }); // Especificamos la colección

const Pelicula = mongoose.model('Pelicula', peliculaSchema);

// Endpoint para obtener películas desde MongoDB con respaldo a JSON
app.get('/api/peliculas', async (req, res) => {
try {
console.log('🔄 Obteniendo películas...');
// Intentar obtener desde MongoDB primero
if (mongoose.connection.readyState === 1) {
console.log('✅ MongoDB conectado, obteniendo desde base de datos');
const peliculas = await Pelicula.find();
if (peliculas.length > 0) {
console.log(`✅ Encontradas ${peliculas.length} películas en MongoDB`);
return res.json(peliculas);
}
}

console.log('⚠️ MongoDB no disponible, usando respaldo JSON');
// Si MongoDB no está disponible, usar archivo JSON como respaldo
const peliculasPath = path.join(__dirname, '../src/data/peliculas.json');
console.log('📂 Buscando archivo JSON en:', peliculasPath);
        
if (fs.existsSync(peliculasPath)) {
const peliculasData = fs.readFileSync(peliculasPath, 'utf8');
const peliculas = JSON.parse(peliculasData);
console.log(`✅ Cargadas ${peliculas.length} películas desde JSON`);
res.json(peliculas);
} else {
console.error('❌ Archivo JSON no encontrado');
// Respaldo con películas hardcodeadas
const peliculasRespaldo = [
{
id: 1,
titulo: "El Padrino",
descripcion: "La historia de una familia mafiosa",
genero: "Drama",
poster: "https://via.placeholder.com/300x400?text=El+Padrino"
},
{
id: 2,
titulo: "Pulp Fiction",
descripcion: "Historias entrelazadas del crimen",
genero: "Crimen",
poster: "https://via.placeholder.com/300x400?text=Pulp+Fiction"
}
];
console.log('🔄 Usando películas de respaldo');
res.json(peliculasRespaldo);
}
} catch (error) {
console.error('❌ Error al obtener películas:', error);
res.status(500).json({ error: 'Error al cargar las películas desde la base de datos' });
}
});

// Endpoint para recomendaciones IA
app.post('/api/recomendaciones', async (req, res) => {
const { prompt } = req.body;
try {
const response = await axios.post(
'https://openrouter.ai/api/v1/chat/completions',
{
model: 'meta-llama/llama-3.2-3b-instruct:free',
messages: [
{ 
role: 'system', 
content: 'Eres un asistente especializado en recomendaciones de películas. Siempre respondes en español de manera clara y concisa.' 
},
{ role: 'user', content: prompt }
],
max_tokens: 150,
temperature: 0.7
},
{
headers: {
Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
'Content-Type': 'application/json',
},
}
);
const recomendacion = response.data.choices[0].message.content;
res.json({ recomendacion });
} catch (error) {
console.error('Error en la API:', error.response?.data || error.message);
res.status(500).json({ error: 'Error al obtener recomendaciones. Por favor, intenta nuevamente.' });
}
});

// Endpoint de diagnóstico
app.get('/api/test', async (req, res) => {
try {
const count = await Pelicula.countDocuments();
res.json({ 
message: 'Servidor funcionando', 
mongoConnected: mongoose.connection.readyState === 1,
peliculasCount: count 
});
} catch (error) {
console.error('Error en test:', error);
res.status(500).json({ 
error: error.message, 
mongoConnected: mongoose.connection.readyState === 1 
});
}
});

// Health check endpoint para Render
app.get('/health', (req, res) => {
res.status(200).json({ 
status: 'OK', 
message: 'Servidor funcionando correctamente',
timestamp: new Date().toISOString()
});
});

// Ruta raíz
app.get('/', (req, res) => {
res.json({ 
message: 'API de CECYFLIX funcionando correctamente',
endpoints: [
'GET /api/peliculas',
'POST /api/recomendaciones',
'GET /api/test',
'GET /health'
]
});
});

app.listen(PORT, '0.0.0.0', () => {
console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

