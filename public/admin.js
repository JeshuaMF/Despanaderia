async function fetchJson(url, opts) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch (err) {
    console.error(err);
    alert("Error en la operación");
    throw err;
  }
}

fetch('/estadoSesion')
  .then(res => res.json())
  .then(data => {
    if (!data.sesion || data.rol !== 'admin') {
      alert("Acceso restringido. Solo el administrador puede entrar aquí.");
      window.location.href = '/';
    } else {

      const logoutBtn = document.getElementById('logout-button');
      const message = document.getElementById('session-message');

      logoutBtn.addEventListener('click', () => {
        fetch('/cerrarSesion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ correo: data.correo })
        })
        .then(() => {
          message.textContent = "Sesión cerrada correctamente.";
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        })
        .catch(() => {
          message.textContent = "Error al cerrar sesión.";
          setTimeout(() => message.textContent = "", 4000);
        });
      });
    }
  });


async function cargarUsuarios() {
  const usuarios = await fetchJson('/api/usuarios');
  const contenedor = document.getElementById('usuarios-list');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  usuarios.forEach(u => {
    const div = document.createElement('div');
    div.className = 'bg-gray-800 p-4 rounded mb-2';
    div.innerHTML = `
      <p><strong>${u.nombre}</strong> (${u.correo}) - Rol: ${u.rol}</p>
      <form method="POST" action="/borrarUsuario" style="display:inline;">
        <input type="hidden" name="id" value="${u.id}">
        <button class="bg-red-500 text-white px-2 py-1 rounded">Eliminar</button>
      </form>
    `;
    contenedor.appendChild(div);
  });
}

async function cargarPanes() {
  const panes = await fetchJson('/api/panes');
  const contenedor = document.getElementById('panes-list');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  panes.forEach(p => {
    const div = document.createElement('div');
    div.className = 'bg-gray-800 p-4 rounded mb-2';
    div.innerHTML = `
      <p><strong>${p.nombre}</strong> - $${p.precio} | Stock: ${p.stock}</p>
      <form method="POST" action="/borrarPan" style="display:inline;">
        <input type="hidden" name="id" value="${p.id}">
        <button class="bg-red-500 text-white px-2 py-1 rounded">Eliminar</button>
      </form>
    `;
    contenedor.appendChild(div);
  });
}

const formPan = document.querySelector('form[action="/agregarPan"]');
if (formPan) {
  formPan.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());

    try {
      const res = await fetch('/agregarPan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.ok) {
        alert(data.mensaje);
        e.target.reset();
        cargarPanes();
      } else {
        alert(data.error || 'Error al agregar pan');
      }
    } catch {
      alert("Error en la operación");
    }
  });
}

cargarUsuarios();
cargarPanes();
