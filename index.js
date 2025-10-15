// index.js (Backend)

require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  // Esta es la dirección de tu frontend. Solo ella podrá hacerle peticiones a este backend.
  origin: 'https://autoflow-frontend-wj3z.vercel.app' 
};

// Le decimos a la app que USE estas opciones específicas de CORS
app.use(cors(corsOptions));

// Esta línea se queda igual, justo después
app.use(express.json());

// --- Configuración de Cloudinary ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Configuración de Multer (para guardar archivos temporalmente en memoria) ---
const upload = multer({ storage: multer.memoryStorage() });

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

// --- TUS ENDPOINTS CRUD EXISTENTES ---
// Aquí va tu código para GET, POST, PUT, DELETE de /api/jobs
// ...

// REEMPLAZA TU ANTIGUO 'CREATE JOB' CON ESTE
app.post('/api/jobs', async (req, res) => {
  try {
    console.log('Datos recibidos en el backend:', req.body);
    
    const collection = client.db('autoflowDB').collection('jobs');
    const { customerId, vehicleInfo, taskInfo } = req.body;

    // Preparamos el documento base del nuevo trabajo
    const newJob = {
      customerId: new ObjectId(customerId),
      vehicleInfo: vehicleInfo,
      status: 'pending_diagnosis',
      tasks: [], // Por defecto, la lista de tareas empieza vacía
      createdAt: new Date()
    };

    // LÓGICA MEJORADA: Verificamos si existe taskInfo y si tiene un título
    if (taskInfo && taskInfo.title) {
      console.log('Condición cumplida: Se creará la tarea inicial.');
      // Si la condición se cumple, añadimos la tarea al array 'tasks'
      newJob.tasks.push({
        _id: new ObjectId(),
        title: taskInfo.title,
        technician: taskInfo.technician,
        description: taskInfo.description,
        steps: []
      });
    } else {
      console.log('Condición NO cumplida: La lista de tareas queda vacía.');
    }

    const result = await collection.insertOne(newJob);
    console.log('Documento insertado en la base de datos.');
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

// --- NUEVO: Añadir una TAREA a un TRABAJO ---
app.post('/api/jobs/:jobId/tasks', async (req, res) => {
  try {
    const { jobId } = req.params;
    const collection = client.db('autoflowDB').collection('jobs');
    
    const newTask = {
      _id: new ObjectId(), // Generamos un ID único para la tarea
      title: req.body.title,
      technician: req.body.technician,
      steps: [] // Empezamos con una lista de pasos vacía
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $push: { tasks: newTask } } // $push añade el nuevo objeto al array 'tasks'
    );

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// --- NUEVO: Añadir un PASO a una TAREA ---
app.post('/api/jobs/:jobId/tasks/:taskId/steps', async (req, res) => {
  try {
        const collection = client.db('autoflowDB').collection('jobs');
        const { jobId, taskId } = req.params;
    
    const newStep = {
      _id: new ObjectId(), // Generamos un ID único para el paso
      description: req.body.description,
      photo_before: req.body.photo_before || null,
      photo_after: req.body.photo_after || null,
      video_url: req.body.video_url || null
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(jobId), "tasks._id": new ObjectId(taskId) },
      { $push: { "tasks.$.steps": newStep } } // $push anidado para añadir el paso
    );

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});


// --- NUEVO: Subir un ARCHIVO (foto o video) ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    // Usamos un stream para subir el archivo desde el buffer de memoria a Cloudinary
    cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
      if (error || !result) {
        console.error('Error en Cloudinary:', error);
        return res.status(500).json({ error: 'Error al subir a Cloudinary' });
      }
      
      // Devolvemos la URL segura del archivo subido
      res.status(201).json({ url: result.secure_url });
    }).end(req.file.buffer);

  } catch (error) {
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// --- NUEVO: Actualizar un PASO específico (ej. para añadir una URL de imagen) ---
app.patch('/api/jobs/:jobId/tasks/:taskId/steps/:stepId', async (req, res) => {
  try {
    const { jobId, taskId, stepId } = req.params;
    const { photo_before } = req.body; // Recibimos la URL de la imagen

    const collection = client.db('autoflowDB').collection('jobs');
    
    const result = await collection.updateOne(
      { 
        _id: new ObjectId(jobId), 
        "tasks._id": new ObjectId(taskId) 
      },
      { 
        $set: { "tasks.$[task].steps.$[step].photo_before": photo_before } 
      },
      {
        arrayFilters: [
          { "task._id": new ObjectId(taskId) },
          { "step._id": new ObjectId(stepId) }
        ]
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error al actualizar el paso:', error);
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// --- NUEVO: ENDPOINTS PARA CLIENTES ---

// CREATE CUSTOMER
app.post('/api/customers', async (req, res) => {
  try {
    const collection = client.db('autoflowDB').collection('customers');
    const newCustomer = req.body; // ej: { name: "Jane Smith", phone: "555-8765" }
    const result = await collection.insertOne(newCustomer);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error en POST /api/customers:', error);
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// READ ALL CUSTOMERS
app.get('/api/customers', async (req, res) => {
  try {
    const collection = client.db('autoflowDB').collection('customers');
    const customers = await collection.find({}).toArray();
    res.json(customers);
  } catch (error) {
    console.error('Error en GET /api/customers:', error);
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// --- NUEVO: ENDPOINT PARA DECODIFICAR VIN ---
app.get('/api/vehicle-info/:vin', async (req, res) => {
  const { vin } = req.params;
  const nhtsaApiUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`;

  try {
    console.log(`Recibida petición para VIN: ${vin}`);
    const response = await axios.get(nhtsaApiUrl);
    const data = response.data.Results[0];

    // La API de NHTSA devuelve muchos datos. Filtramos solo los que nos interesan.
    const vehicleInfo = {
      make: data.Make,
      model: data.Model,
      year: data.ModelYear,
      manufacturer: data.Manufacturer,
      vehicleType: data.VehicleType,
      engineCylinders: data.EngineCylinders,
      fuelType: data.FuelTypePrimary,
      transmission: data.TransmissionStyle
    };

    console.log('Información decodificada:', vehicleInfo);
    res.json(vehicleInfo);

  } catch (error) {
    console.error('Error al contactar la API de NHTSA:', error.message);
    res.status(404).json({ error: 'VIN no encontrado o inválido.' });
  }
});

// --- NUEVO: OBTENER UN SOLO TRABAJO POR SU ID ---
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de trabajo inválido' });
    }
    const collection = client.db('autoflowDB').collection('jobs');
    const job = await collection.findOne({ _id: new ObjectId(id) });
    if (!job) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

// --- NUEVO: ACTUALIZAR EL ESTADO DE UN TRABAJO ---
app.patch('/api/jobs/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Recibimos el nuevo estado desde el frontend
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de trabajo inválido' });
    }
    const collection = client.db('autoflowDB').collection('jobs');
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en ${PORT}`);
});