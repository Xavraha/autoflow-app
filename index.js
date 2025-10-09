require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // Importamos ObjectId

const app = express();
const PORT = 3000;
app.use(express.json());

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

const collection = client.db('autoflowDB').collection('jobs');

// CREATE - Crear un nuevo trabajo
app.post('/api/jobs', async (req, res) => {
  try {
    const newJob = req.body;
    const result = await collection.insertOne(newJob);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// READ - Obtener todos los trabajos
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await collection.find({}).toArray();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// --- NUEVO: UPDATE - Actualizar un trabajo por su ID ---
app.put('/api/jobs/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    const updatedJob = req.body;
    const result = await collection.updateOne(
      { _id: new ObjectId(jobId) }, // Filtro para encontrar el documento
      { $set: updatedJob }         // Los nuevos datos
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});
// --------------------------------------------------

// --- NUEVO: DELETE - Borrar un trabajo por su ID ---
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    const result = await collection.deleteOne({ _id: new ObjectId(jobId) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});
// -------------------------------------------------

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});