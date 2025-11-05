const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const app = express();

require('dotenv').config();

const con = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

con.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la base de datos');
});

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));


// CRUD DE LOS PANES

// Crear pan
app.post('/agregarPan', (req, res) => {
    const { nombre, precio, ingredientes, imagen_url } = req.body;

    if (!nombre || !ingredientes || !imagen_url || precio === undefined || precio < 0) {
        return res.status(400).send("Todos los campos son obligatorios y el precio debe ser positivo.");
    }

    con.query(
        'INSERT INTO panes (nombre, precio, ingredientes, imagen_url) VALUES (?, ?, ?, ?)',
        [nombre, precio, ingredientes, imagen_url],
        (err) => {
            if (err) return res.status(500).send("Error al insertar el pan.");
            res.send(`<h1>Pan agregado exitosamente!</h1><a href="/">Volver</a>`);
        }
    );
});

app.get('/obtenerPanes', (req, res) => {
    con.query('SELECT * FROM panes', (err, resultado) => {
        if (err) {
            console.error('ERROR al obtener panes: ', err);
            return res.status(500).send("Error al cargar la lista de panes.");
        }

        let panesHTML = ``; 

        resultado.forEach(pan => {
            panesHTML += `<tr>
                <td>${pan.id}</td>
                <td>${pan.nombre}</td>
                <td>$${pan.precio}</td>
                <td>
                    <a href="/editarPan/${pan.id}">
                        <button class="edit-button">Editar</button>
                    </a>
                    <form method="POST" action="/borrarPan" style="display:inline;" onsubmit="return confirm('¿Borrar ${pan.nombre}?');">
                        <input type="hidden" name="id" value="${pan.id}">
                        <button class="delete-button">Borrar</button>
                    </form>
                </td>
            </tr>`;
        });

        return res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <title>Lista de Panes</title>
                <style>
                    body { font-family: 'Inter', sans-serif; background-color: #1a1a1a; color: white; padding: 20px; }
                    table { width: 80%; border-collapse: collapse; margin: 20px auto; background-color: #2c2c2c; border-radius: 8px; overflow: hidden; }
                    th, td { border: 1px solid #444; padding: 12px; text-align: left; }
                    th { background-color: #333; font-weight: 600; }
                    a { color: #61DAFB; text-decoration: none; margin-right: 15px; }
                    .edit-button { background-color: #4cd1f3; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; color: #1a1a1a; font-weight: 600; }
                    .delete-button { background-color: #e74c3c; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; color: white; font-weight: 600; }
                </style>
            </head>
            <body>
                <h2>Lista de Panes Disponibles (RUD)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Precio</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${panesHTML}
                    </tbody>
                </table>
                <a href="/">Volver a la Tienda</a>
            </body>
            </html>
        `);
    });
});


// Borrar pan
app.post('/borrarPan', (req, res) => {
    const { id } = req.body;
    con.query('DELETE FROM panes WHERE id = ?', [id], (err, resultado) => {
        if (err) return res.status(500).send("Error al borrar.");
        if (resultado.affectedRows === 0) return res.status(404).send("Pan no encontrado.");
        res.redirect('/obtenerPanes');
    });
});

// Formulario de edición
app.get('/editarPan/:id', (req, res) => {
    const { id } = req.params;
    con.query('SELECT * FROM panes WHERE id = ?', [id], (err, resultado) => {
        if (err || resultado.length === 0) return res.status(404).send("Pan no encontrado.");
        const pan = resultado[0];
        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <title>Editar Pan</title>
                <style>
                    body { font-family: 'Inter', sans-serif; background-color: #1a1a1a; color: white; padding: 20px; }
                    .form-container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #2c2c2c; border-radius: 8px; }
                    input[type="text"], input[type="number"], textarea {
                        width: 100%; padding: 10px; margin-bottom: 15px;
                        border: 1px solid #444; border-radius: 4px;
                        background-color: #333; color: white;
                    }
                    button[type="submit"] {
                        background-color: #61DAFB; color: #1a1a1a;
                        padding: 10px 15px; border: none; border-radius: 4px;
                        cursor: pointer; font-weight: 600;
                    }
                    a { color: #61DAFB; text-decoration: none; margin-top: 20px; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="form-container">
                    <h2>Editar Pan (ID: ${pan.id})</h2>
                    <form method="POST" action="/actualizarPan">
                        <input type="hidden" name="id" value="${pan.id}">
                        <input type="text" name="nombre" value="${pan.nombre}" required>
                        <input type="number" name="precio" value="${pan.precio}" step="0.01" min="0" required>
                        <textarea name="ingredientes" required>${pan.ingredientes}</textarea>
                        <input type="text" name="imagen_url" value="${pan.imagen_url || ''}" required>
                        <button type="submit">Actualizar</button>
                    </form>

                    <a href="/obtenerPanes">Cancelar y Volver a la Lista</a>
                </div>
            </body>
            </html>
        `);
    });
});


// Actualizar pan
app.post('/actualizarPan', (req, res) => {
    const { id, nombre, precio, ingredientes, imagen_url } = req.body;

    if (!id || !nombre || !ingredientes || !imagen_url || precio === undefined || precio < 0) {
        return res.status(400).send("Todos los campos son obligatorios y el precio debe ser positivo.");
    }

    con.query(
        'UPDATE panes SET nombre = ?, precio = ?, ingredientes = ?, imagen_url = ? WHERE id = ?',
        [nombre, precio, ingredientes, imagen_url, id],
        (err, resultado) => {
            if (err) return res.status(500).send("Error al actualizar.");
            res.redirect('/obtenerPanes');
        }
    );
});



app.get('/api/panes', (req, res) => {
    con.query('SELECT * FROM panes', (err, resultado) => {
        if (err) return res.status(500).json({ error: 'Error al obtener panes' });
        res.json(resultado);
    });
});


//Usuarios

// Registro
app.post('/registrarUsuario', (req, res) => {
    const { nombre, contraseña } = req.body;
    if (!nombre || !contraseña) return res.send("Campos inválidos");
    con.query('INSERT INTO usuarios (nombre, contraseña) VALUES (?, ?)', [nombre, contraseña], (err) => {
        if (err) return res.send("Error al registrar");
        res.redirect('/login.html');
    });
});

// Inicio de sesión
app.post('/iniciarSesion', (req, res) => {
    const { nombre, contraseña } = req.body;
    con.query('SELECT * FROM usuarios WHERE nombre = ? AND contraseña = ?', [nombre, contraseña], (err, resultado) => {
        if (err || resultado.length === 0) return res.send("Credenciales incorrectas");
        con.query('UPDATE usuarios SET sesion_iniciada = 1 WHERE id = ?', [resultado[0].id], (err) => {
            if (err) return res.send("Error al iniciar sesión");
            res.redirect('/');
        });
    });
});

// Cierre de sesión
app.post('/cerrarSesion', (req, res) => {
    const { nombre } = req.body;
    con.query('UPDATE usuarios SET sesion_iniciada = 0 WHERE nombre = ?', [nombre], (err) => {
        if (err) return res.send("Error al cerrar sesión");
        res.redirect('/');
    });
});

// Verificar sesión activa
app.get('/estadoSesion', (req, res) => {
    con.query('SELECT nombre FROM usuarios WHERE sesion_iniciada = 1 LIMIT 1', (err, resultado) => {
        if (err) return res.json({ error: true });
        if (resultado.length === 0) return res.json({ sesion: false });
        res.json({ sesion: true, usuario: resultado[0].nombre });
    });
});

const carrito = [];

app.get('/carrito', (req, res) => {
  res.json(carrito);
});

app.post('/carrito/agregar', (req, res) => {
  const { nombre, precio, cantidad } = req.body;
  if (!nombre || precio < 0 || cantidad <= 0) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  const id = Date.now();
  carrito.push({ id, nombre, precio, cantidad });
  res.json({ ok: true });
});

app.delete('/carrito/eliminar/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = carrito.findIndex(p => p.id === id);
  if (index !== -1) carrito.splice(index, 1);
  res.json({ ok: true });
});

app.post('/carrito/compra', (req, res) => {
  con.query('SELECT id FROM usuarios WHERE sesion_iniciada = 1 LIMIT 1', (err, resultado) => {
    if (err || resultado.length === 0) return res.status(403).json({ error: 'No hay sesión activa' });
    const usuarioId = resultado[0].id;

    carrito.forEach(item => {
      con.query(
        'INSERT INTO compras (usuario_id, nombre_pan, precio, cantidad) VALUES (?, ?, ?, ?)',
        [usuarioId, item.nombre, item.precio, item.cantidad]
      );
    });

    carrito.length = 0;
    res.json({ ok: true });
  });
});

app.put('/carrito/actualizar/:id', (req, res) => {
  const id = Number(req.params.id);
  const { cantidad } = req.body;

  if (cantidad <= 0) return res.status(400).json({ error: 'Cantidad inválida' });

  const item = carrito.find(p => p.id === id);
  if (!item) return res.status(404).json({ error: 'Producto no encontrado' });

  item.cantidad = cantidad;
  res.json({ ok: true });
});

app.get('/test-db', (req, res) => {
  con.query('SELECT 1 + 1 AS resultado', (err, resultado) => {
    if (err) return res.status(500).send("Error de conexión con la base");
    res.send(`Conexión OK. Resultado: ${resultado[0].resultado}`);
  });
});


app.listen(process.env.PORT || 10000, () => {
    console.log(`Servidor escuchando en el puerto ${process.env.PORT || 10000}`);
});

