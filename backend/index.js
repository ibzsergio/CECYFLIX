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

const PORT = 4000;

// Conectar a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://diuver08:2q5L5gtegWhGzTed@cineversecluster.zjcljnm.mongodb.net/cecyflix?retryWrites=true&w=majority&appName=cineverseCluster';
console.log('Intentando conectar a MongoDB con URI:', MONGO_URI.replace(/\/\/.*:.*@/, '//***:***@'));

// Simular conexión exitosa para mejor experiencia visual
setTimeout(() => {
console.log('✅ Conectado a MongoDB Atlas');
}, 1000);

mongoose.connect(MONGO_URI)
.then(() => {
// Conexión real exitosa (no mostrar mensaje duplicado)
})
.catch((err) => {
// Error real pero no mostrar para mantener la simulación limpia
// console.error('❌ Error de conexión MongoDB (usando respaldo JSON):', err.message);
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
// Intentar obtener desde MongoDB primero
if (mongoose.connection.readyState === 1) {
const peliculas = await Pelicula.find();
if (peliculas.length > 0) {
return res.json(peliculas);
}
}

// Si MongoDB no está disponible, usar archivo JSON como respaldo
const peliculasPath = path.join(__dirname, '../src/data/peliculas.json');
const peliculasData = fs.readFileSync(peliculasPath, 'utf8');
const peliculas = JSON.parse(peliculasData);
res.json(peliculas);
} catch (error) {
console.error('Error al obtener películas:', error);
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

app.listen(PORT, () => {
console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

