// 1. Requerimos la pieza 'express' que instalamos
const express = require('express');

// 2. Creamos nuestra aplicación ejecutando express
const app = express();

// 3. Definimos el puerto en el que escuchará nuestro servidor
const PORT = 3000;

// 4. Creamos una ruta de prueba (la página de inicio '/')
// Cuando alguien visite la página principal, le enviaremos un mensaje.
app.get('/', (req, res) => {
  res.send('¡Mi motor Express está funcionando!');
});

// 5. Ponemos el servidor a escuchar en el puerto definido
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});