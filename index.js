// Requerimos dotenv para poder usar nuestras variables de entorno
require('dotenv').config();

const express = require('express');
// NUEVO: Requerimos el cliente de MongoDB
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3000;

// Obtenemos la cadena de conexión desde nuestro archivo .env
const client = new MongoClient(process.env.DATABASE_URL);

// Variable para saber si estamos conectados
let isDbConnected = false;

// Función para conectar a la base de datos
async function connectDB() {
  try {
    // Conectamos el cliente al servidor
    await client.connect();
    isDbConnected = true;
    console.log('¡Conectado exitosamente a la base de datos! 💾');
  } catch (error) {
    console.error('Falló la conexión a la base de datos', error);
    // Si la conexión falla, detenemos la aplicación
    process.exit(1);
  }
}

// Llamamos a la función para conectar
connectDB();

app.get('/', (req, res) => {
  res.send('¡Mi motor Express está funcionando!');
});

// Endpoint modificado con diagnósticos
app.get('/api/jobs', async (req, res) => {
  // SENSOR 1: Verificamos si la ruta se está ejecutando
  console.log('Ruta /api/jobs alcanzada.');

  if (!isDbConnected) {
    console.log('Error: La base de datos no está conectada.');
    return res.status(500).json({ error: 'Servidor no conectado a la base de datos' });
  }

  try {
    const collection = client.db('autoflowDB').collection('jobs');
    const jobs = await collection.find({}).toArray();
    
    // SENSOR 2: Veremos qué es lo que la base de datos nos devuelve
    console.log('Datos obtenidos de la base de datos:', jobs);

    res.json(jobs);
  } catch (error) {
    // SENSOR 3: Si hay un error en la consulta, lo veremos aquí
    console.error('Error al obtener los trabajos desde la base de datos', error);
    res.status(500).json({ error: 'Ocurrió un error en el servidor al consultar los datos' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});