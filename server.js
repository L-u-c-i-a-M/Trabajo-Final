// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const si = require("systeminformation");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

function bytesToGB(bytes) {
    return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
}

async function obtenerDatosSistema() {
    try {
        const [
            memoria,
            cpu,
            cpuTemp,
            discos,
            interfaces,
            carga,
            so,
            usuarios,
            bateria,
            procesos,
            grafica
        ] = await Promise.all([
            si.mem(),
            si.cpu(),
            si.cpuTemperature(),
            si.fsSize(),
            si.networkInterfaces(),
            si.currentLoad(),
            si.osInfo(),
            si.users(),
            si.battery(),
            si.processes(),
            si.graphics()
        ]);

        // Convertimos discos a array uniforme
        const discosData = discos.map(d => ({
            filesystem: d.fs,
            tamaño: bytesToGB(d.size),
            usado: bytesToGB(d.used),
            libre: bytesToGB(d.size - d.used),
            puntoMontaje: d.mount
        }));

        // Interfaces de red con stats
        const redData = await Promise.all(
            interfaces.map(async iface => {
                const stats = await si.networkStats(iface.iface);
                const s = stats[0] || {};
                return {
                    interfaz: iface.iface,
                    ip4: iface.ip4,
                    mac: iface.mac,
                    recibidoMB: s.rx_bytes ? (s.rx_bytes / (1024*1024)).toFixed(2) : "0.00",
                    enviadoMB: s.tx_bytes ? (s.tx_bytes / (1024*1024)).toFixed(2) : "0.00"
                };
            })
        );

        return {
            timestamp: new Date().toISOString(),
            cpu: {
                fabricante: cpu.manufacturer || "Desconocido",
                modelo: cpu.brand || "Desconocido",
                nucleos: cpu.cores,
                temperatura: cpuTemp.main ? `${cpuTemp.main} °C` : "N/D",
                carga: carga.currentLoad ? `${carga.currentLoad.toFixed(1)} %` : "N/D"
            },
            memoria: {
                total: bytesToGB(memoria.total),
                libre: bytesToGB(memoria.available),
                usado: bytesToGB(memoria.total - memoria.available)
            },
            discos: discosData,
            red: redData,
            procesos: procesos.list.map(p => ({
                pid: p.pid,
                nombre: p.name,
                estado: p.state
            })),
            usuarios: usuarios.map(u => ({
                usuario: u.user,
                terminal: u.tty,
                fechaLogin: u.date
            })),
            bateria: {
                porcentaje: bateria.hasbattery ? (bateria.percent || 0) + " %" : "N/D",
                estado: bateria.isCharging ? "Cargando" : "No Cargando"
            },
            so: {
                plataforma: so.platform || "Desconocido",
                distro: so.distro || "Desconocido",
                version: so.release || "N/D"
            },
            grafica: grafica.controllers.length > 0 ? grafica.controllers[0] : {}
        };

    } catch (error) {
        console.error("Error al obtener datos del sistema:", error);
        throw error;
    }
}

// Ruta básica
app.get("/", (req, res) => {
    res.send('Servidor de monitoreo activo. Usa <a href="/api/sistema">/api/sistema</a>');
});

// API REST
app.get("/api/sistema", async (req, res) => {
    try {
        const datos = await obtenerDatosSistema();
        res.json(datos);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos" });
    }
});

// WebSocket
io.on("connection", (socket) => {
    console.log("Cliente conectado");
    const intervalo = setInterval(async () => {
        try {
            const datos = await obtenerDatosSistema();
            socket.emit("datosSistema", datos);
        } catch (error) {
            console.error("Error en WebSocket:", error);
        }
    }, 5000);

    socket.on("disconnect", () => {
        clearInterval(intervalo);
        console.log("Cliente desconectado");
    });
});

// Iniciar servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
