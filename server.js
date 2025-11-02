const express = require("express");
const cors = require("cors");
const si = require("systeminformation");

const app = express();
app.use(cors());
app.use(express.json()); // permite leer JSON en los POST
console.log("Servidor iniciado...");
// devuelve información del sistema
app.get("/api/sistema", async (req, res) => {
  try {
    const cpu = await si.cpu();
    const carga = await si.currentLoad();
    const memoria = await si.mem();
    const disco = await si.fsSize();
    const so = await si.osInfo();
    const usuarios = await si.users();
    const redes = await si.networkInterfaces();
    const estadisticasRed = await si.networkStats();
    const bateria = await si.battery();
    const procesos = await si.processes();
    const servicios = await si.services("*"); // '*' para todos los servicios
    const bios = await si.bios();
    const placaBase = await si.baseboard();
    const grafica = await si.graphics();
    const sensores = await si.cpuTemperature();

    const datos = {
      cpu,
      carga,
      memoria,
      disco,
      so,
      usuarios,
      redes,
      estadisticasRed,
      bateria,
      procesos,
      servicios,
      bios,
      placaBase,
      grafica,
      sensores,
      fecha: new Date().toISOString(),
    };

    res.json(datos);
  } catch (err) {
    console.error("Error obteniendo info del sistema:", err);
    res.status(500).json({ error: "Error al obtener información del sistema" });
  }
});

//  devuelve un mensaje básico
app.get("/api/mensaje", (req, res) => {
  res.json({ mensaje: " funcionando correctamente " });
});

// recibe datos del cliente
app.post("/api/mensaje", (req, res) => {
  // Evita error si no hay body
  const { nombre, texto } = req.body || {};

  if (!nombre || !texto) {
    return res
      .status(400)
      .json({ error: "Faltan campos: nombre y texto son obligatorios" });
  }

  console.log(`Mensaje recibido de ${nombre}: ${texto}`);

  res.json({
    ok: true,
    respuesta: `Gracias, ${nombre}! Tu mensaje fue recibido correctamente.`,
  });
});


// Servidor en puerto 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}/api/sistema`);
});
