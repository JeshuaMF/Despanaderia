const express = require("express")
const mysql= require("mysql2")
var bodyParser=require('body-parser')
var app=express()

// 1. CONFIGURACIÓN DE CONEXIÓN A BASE DE DATOS
var con=mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'Batman',
    // Usaremos "5IV8" como en la versión anterior. ¡Asegúrate de que este sea el nombre correcto de tu DB!
    database:'panaderia_db' 
})
con.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.stack);
        return;
    }
    console.log('Conectado a la base de datos con el ID ' + con.threadId);
});

// Middlewares
app.use(bodyParser.json())

app.use(bodyParser.urlencoded({
    extended:true
}))
app.use(express.static('public'))

// -- RUTAS CRUD PARA PANES --

// Create (C): Ruta POST para agregar un pan nuevo
app.post('/agregarPan',(req,res)=>{
        let nombre = req.body.nombre;
        let precio = req.body.precio;
        let ingredientes = req.body.ingredientes;

        con.query(
            'INSERT INTO panes (nombre, precio, ingredientes) VALUES (?, ?, ?)', 
            [nombre, precio, ingredientes], 
            (err, respuesta, fields) => {
                if (err) {
                    console.error("Error al insertar pan:", err);
                    return res.status(500).send("Error al insertar el pan en la base de datos.");
                }
               
                return res.send(`<h1>Pan agregado exitosamente!</h1> 
                                <p>Nombre: ${nombre}, Precio: $${precio}</p>
                                <a href="/">Volver a la tienda</a>`);
            }
        );
   
});


// Read (R): Ruta GET para obtener la lista de panes (CON BOTONES FUNCIONALES)
app.get('/obtenerPanes',(req,res)=>{
    con.query('SELECT * FROM panes', (err,respuesta, fields)=>{
        if(err){
            console.error('ERROR al obtener panes: ', err);
            return res.status(500).send("Error al cargar la lista de panes.");
        }
        
        var panesHTML = ``;
        respuesta.forEach(pan => {
            // Cada botón de Borrar/Editar ahora es parte de un formulario POST 
            // para manejar la acción de forma segura y específica por ID.
            panesHTML += `<tr>
                            <td>${pan.id}</td>
                            <td>${pan.nombre}</td>
                            <td>$${pan.precio}</td>
                            <td>
                                <!-- Formulario para EDITAR (llama a la ruta GET para el formulario de edición) -->
                                <a href="/editarPan/${pan.id}" class="edit-link">
                                    <button type="button" class="edit-button">Editar</button>
                                </a>
                                
                                <!-- Formulario para BORRAR (llama a la ruta POST /borrarPan) -->
                                <form action="/borrarPan" method="POST" style="display:inline-block;" 
                                      onsubmit="return confirm('¿Estás seguro de que quieres borrar el pan ${pan.nombre}?');">
                                    <input type="hidden" name="id" value="${pan.id}">
                                    <button type="submit" class="delete-button">Borrar</button>
                                </form>
                            </td>
                          </tr>`;
        });

        // HTML que genera la tabla de listado
        return res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <title>Lista de Panes</title>
                <style>
                    /* Estilos para la vista de listado */
                    body { font-family: 'Inter', sans-serif; background-color: #1a1a1a; color: white; padding: 20px; }
                    table { width: 80%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; background-color: #2c2c2c; border-radius: 8px; overflow: hidden; }
                    th, td { border: 1px solid #444; padding: 12px; text-align: left; }
                    th { background-color: #333; font-weight: 600; }
                    a { color: #61DAFB; text-decoration: none; display: inline-block; margin-right: 15px; }
                    .edit-button { background-color: #4cd1f3; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px; color: #1a1a1a; font-weight: 600;}
                    .delete-button { background-color: #e74c3c; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; color: white; font-weight: 600;}
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

// Delete (D): Ruta POST para borrar un pan
app.post('/borrarPan', (req, res) => {
    const id = req.body.id; 
    
    con.query('DELETE FROM panes WHERE id = ?', [id], (err, resultado, fields) => {

        if (err) {
            console.error('Error al borrar el pan:', err);
            return res.status(500).send("Error al borrar el pan.");
        }
        if (resultado.affectedRows === 0) {
            return res.status(404).send(`Pan con ID ${id} no encontrado.`);
        }
        // Redirigimos de vuelta a la lista para ver el cambio
        return res.redirect('/obtenerPanes');
    });
});


// Update (U - Paso 1): Ruta GET para obtener los datos de un pan y mostrar el formulario de edición
app.get('/editarPan/:id', (req, res) => {
    const id = req.params.id;

    con.query('SELECT * FROM panes WHERE id = ?', [id], (err, respuesta) => {
        if (err) {
            console.error('Error al obtener pan para edición:', err);
            return res.status(500).send("Error al cargar datos del pan.");
        }
        if (respuesta.length === 0) {
            return res.status(404).send("Pan no encontrado.");
        }

        const pan = respuesta[0];
        
        // Muestra el formulario de edición prellenado
        return res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <title>Editar Pan</title>
                <style>
                    body { font-family: 'Inter', sans-serif; background-color: #1a1a1a; color: white; padding: 20px; }
                    .form-container { max-width: 500px; margin: 0 auto; padding: 20px; background-color: #2c2c2c; border-radius: 8px; }
                    input[type="text"], input[type="number"], textarea { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #444; border-radius: 4px; background-color: #333; color: white; }
                    button[type="submit"] { background-color: #61DAFB; color: #1a1a1a; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
                    a { color: #61DAFB; text-decoration: none; margin-top: 20px; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="form-container">
                    <h2>Editar Pan (ID: ${pan.id})</h2>
                    <form method="POST" action="/actualizarPan">
                        <!-- Campo oculto para enviar el ID del pan que se va a actualizar -->
                        <input type="hidden" name="id" value="${pan.id}">

                        <label for="nombre">Nombre:</label>
                        <input type="text" id="nombre" name="nombre" value="${pan.nombre}" required>

                        <label for="precio">Precio:</label>
                        <input type="number" id="precio" name="precio" value="${pan.precio}" step="0.01" required>

                        <label for="ingredientes">Ingredientes:</label>
                        <textarea id="ingredientes" name="ingredientes">${pan.ingredientes}</textarea>
                        
                        <button type="submit">Actualizar Pan</button>
                    </form>
                    <a href="/obtenerPanes">Cancelar y Volver a la Lista</a>
                </div>
            </body>
            </html>
        `);
    });
});

// Update (U - Paso 2): Ruta POST para procesar el formulario de actualización
app.post('/actualizarPan', (req, res) => {
    const id = req.body.id;
    const nombre = req.body.nombre;
    const precio = req.body.precio;
    const ingredientes = req.body.ingredientes;

    const sql = 'UPDATE panes SET nombre = ?, precio = ?, ingredientes = ? WHERE id = ?';

    con.query(sql, [nombre, precio, ingredientes, id], (err, resultado, fields) => {
        if (err) {
            console.error('Error al actualizar el pan:', err);
            return res.status(500).send("Error al actualizar el pan.");
        }
        if (resultado.affectedRows === 0) {
            return res.status(404).send(`Pan con ID ${id} no encontrado o los datos son los mismos.`);
        }
        // Redirigimos a la lista para ver el pan actualizado
        return res.redirect('/obtenerPanes');
    });
});


app.listen(10000,()=>{
    console.log('Servidor escuchando en el puerto 10000')
});