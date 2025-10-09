require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors'); // Importa CORS

const app = express();
const PORT = 3000;

app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Middleware para entender JSON

const client = new MongoClient(process.env.DATABASE_URL);

async function connectDB() {
  try {
    await client.connect();
    console.log('¡Conectado exitosamente a la base de datos! 💾');
  } catch (error) {
    console.error('Falló la conexión a la base de datos', error);
    process.exit(1);
  }
}
connectDB();

// CREATE
app.post('/api/jobs', async (req, res) => {
  try {
    const collection = client.db('autoflowDB').collection('jobs');
    const newJob = req.body;
    const result = await collection.insertOne(newJob);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error en POST /api/jobs:', error);
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// READ
app.get('/api/jobs', async (req, res) => {
  try {
    const collection = client.db('autoflowDB').collection('jobs');
    const jobs = await collection.find({}).toArray();
    res.json(jobs);
  } catch (error) {
    console.error('Error en GET /api/jobs:', error);
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// UPDATE
app.put('/api/jobs/:id', async (req, res) => {
  try {
    const collection = client.db('autoflowDB').collection('jobs');
    const jobId = req.params.id;
    if (!ObjectId.isValid(jobId)) {
        return res.status(400).json({ error: 'ID de trabajo inválido' });
    }
    const updatedJob = req.body;
    const result = await collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: updatedJob }
    );
    res.json(result);
  } catch (error) {
    console.error('Error en PUT /api/jobs/:id:', error);
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// DELETE
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const collection = client.db('autoflowDB').collection('jobs');
    const jobId = req.params.id;
    if (!ObjectId.isValid(jobId)) {
        return res.status(400).json({ error: 'ID de trabajo inválido' });
    }
    const result = await collection.deleteOne({ _id: new ObjectId(jobId) });
    res.json(result);
  } catch (error) {
    console.error('Error en DELETE /api/jobs/:id:', error);
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});