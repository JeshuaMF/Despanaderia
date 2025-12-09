const tablaBody = document.querySelector('#tablaCarrito tbody');
const totalEl = document.getElementById('total');
const contadorEl = document.getElementById('contador');
const pagarBtn = document.getElementById('pagarBtn');
const grid = document.getElementById('product-grid');
let sesionActiva = false;

async function fetchJson(url, opts) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function cargarCatalogo() {
  const panes = await fetchJson('/api/panes');
  grid.innerHTML = '';

  panes.forEach(pan => {
    const card = document.createElement('div');
    card.className = 'product-card bg-gray-800 p-4 rounded-lg shadow';

   card.innerHTML = `
  <img src="${pan.imagen_url}" alt="${pan.nombre}" class="w-full h-32 object-cover rounded mb-4">
  <h3 class="text-xl font-semibold">${pan.nombre}</h3>
  <p class="text-sm text-gray-400 mt-1">${pan.ingredientes}</p>
  <p class="text-sm text-yellow-400 mt-1">Stock disponible: ${pan.stock}</p>
  <div class="flex justify-between items-center mt-4">
    <span class="price">$${pan.precio}</span>
    <button class="buy-button bg-blue-500 text-white px-3 py-1 rounded" 
      data-nombre="${pan.nombre}" 
      data-precio="${pan.precio}">🛒</button>
  </div>
`;
    grid.appendChild(card);
  });

  if (!sesionActiva) deshabilitarAcciones();
}

async function loadAndRenderCarrito() {
  const cart = await fetchJson('/carrito');
  tablaBody.innerHTML = '';
  let total = 0;

  cart.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>$${item.precio.toFixed(2)}</td>
      <td>
        <input type="number" min="1" value="${item.cantidad}" 
          class="cantidad-input bg-gray-700 text-white px-2 py-1 rounded w-16" 
          data-id="${item.id}">
      </td>
      <td>$${subtotal.toFixed(2)}</td>
      <td><button class="btn-small text-red-500" data-id="${item.id}">Eliminar</button></td>
    `;
    tablaBody.appendChild(tr);
  });

  totalEl.textContent = total.toFixed(2);
  contadorEl.textContent = `(${cart.length})`;

  if (!sesionActiva) deshabilitarAcciones();
}

function deshabilitarAcciones() {
  document.querySelectorAll('.buy-button').forEach(btn => {
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    btn.title = 'Inicia sesión para comprar';
  });

  document.querySelectorAll('.cantidad-input').forEach(input => {
    input.disabled = true;
    input.classList.add('opacity-50', 'cursor-not-allowed');
    input.title = 'Inicia sesión para modificar cantidades';
  });

  document.querySelectorAll('button[data-id]').forEach(btn => {
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    btn.title = 'Inicia sesión para eliminar del carrito';
  });

  if (pagarBtn) {
  pagarBtn.disabled = false;
  pagarBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  pagarBtn.title = '';
}
  if (!document.getElementById('login-warning')) {
    const mensaje = document.createElement('p');
    mensaje.id = 'login-warning';
    mensaje.textContent = 'Inicia sesión para realizar compras.';
    mensaje.className = 'text-yellow-400 mt-4 text-center';
    document.querySelector('.cart-section')?.appendChild(mensaje);
  }
}


document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.buy-button');
  if (!btn || !sesionActiva) return;

  const nombre = btn.dataset.nombre;
  const precio = Number(btn.dataset.precio);
  const cantidad = 1;

  try {
    await fetchJson('/carrito/agregar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, precio, cantidad })
    });
    await loadAndRenderCarrito();
  } catch {
    alert('Error al agregar al carrito');
  }
});

tablaBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn || !sesionActiva) return;
  const id = btn.dataset.id;

  try {
    await fetchJson(`/carrito/eliminar/${id}`, { method: 'DELETE' });
    await loadAndRenderCarrito();
  } catch {
    alert('Error al eliminar del carrito');
  }
});

tablaBody.addEventListener('change', async (e) => {
  const input = e.target.closest('input.cantidad-input');
  if (!input || !sesionActiva) return;

  const id = input.dataset.id;
  const nuevaCantidad = Number(input.value);
  if (nuevaCantidad <= 0) return alert('Cantidad inválida');

  try {
    await fetchJson(`/carrito/actualizar/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad: nuevaCantidad })
    });
    await loadAndRenderCarrito();
  } catch {
    alert('Error al actualizar cantidad');
  }
});

if (pagarBtn) {
  pagarBtn.addEventListener('click', async () => {
    if (!sesionActiva) {
    alert('Inicia sesión para pagar');
    return;
  }
    try {
      const res = await fetchJson('/carrito/compra', { method: 'POST' });

      if (res.ok) {
        alert(res.mensaje || 'Compra registrada correctamente.');
        document.getElementById('user-funds').textContent = `Fondos: $${res.nuevosFondos}`;
        await loadAndRenderCarrito();
        await cargarCatalogo();
      } else {
        alert(res.error || 'Error al procesar la compra');
      }
    } catch {
      alert('Error al procesar la compra');
    }
  });
}

fetch('/estadoSesion')
  .then(res => res.json())
  .then(data => {
    sesionActiva = data.sesion;

    const icon = document.getElementById('session-icon');
    const addFundsBtn = document.getElementById('add-funds-btn');
    const ticketsLink = document.getElementById('tickets-link');
    const fundsForm = document.getElementById('funds-form');
    const formAddFunds = document.getElementById('form-add-funds');
    const userFunds = document.getElementById('user-funds');

    if (sesionActiva) {
      icon.innerHTML = `<button id="logout-button" class="text-xl bg-transparent border-none cursor-pointer" title="Cerrar sesión">🔓</button>`;
      const logoutBtn = document.getElementById('logout-button');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
      }
      userFunds.textContent = `Fondos: $${data.fondos}`;

      addFundsBtn.disabled = false;
      addFundsBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      ticketsLink.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      ticketsLink.href = "/historial.html";

      addFundsBtn.addEventListener('click', () => {
        fundsForm.classList.toggle('hidden');
      });

      formAddFunds.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cantidad = e.target.cantidad.value;

        try {
          const res = await fetch('/agregarFondos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: data.correo, cantidad })
          });

          const result = await res.json();
          if (result.ok) {
            alert('Fondos agregados correctamente.');
            fundsForm.classList.add('hidden');
            userFunds.textContent = `Fondos: $${result.nuevosFondos}`;
          } else {
            alert(result.error || 'Error al agregar fondos.');
          }
        } catch {
          alert('Error en la operación.');
        }
      });
    } else {
      icon.innerHTML = `<a href="/login.html" title="Iniciar sesión">👤</a>`;
      userFunds.textContent = "";
      addFundsBtn.disabled = true;
      addFundsBtn.classList.add('opacity-50', 'cursor-not-allowed');
      ticketsLink.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      ticketsLink.href = "#";
      fundsForm.classList.add('hidden');
      deshabilitarAcciones();
    }

    function cerrarSesion() {
      fetch('/cerrarSesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ correo: data.correo })
      })
      .then(() => {
        sesionActiva = false;
        icon.innerHTML = `<a href="/login.html" title="Iniciar sesión">👤</a>`;
        userFunds.textContent = "";
        addFundsBtn.disabled = true;
        addFundsBtn.classList.add('opacity-50', 'cursor-not-allowed');
        ticketsLink.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        ticketsLink.href = "#";
        fundsForm.classList.add('hidden');
        deshabilitarAcciones();
      });
    }
  });

  async function cargarHistorial() {
  const contenedor = document.getElementById('historial-container');
  contenedor.innerHTML = '';

  try {
    const res = await fetch('/comprasUsuario');
    const compras = await res.json();

    if (!Array.isArray(compras) || compras.length === 0) {
      contenedor.innerHTML = '<p class="text-center text-gray-400">No hay compras registradas.</p>';
      return;
    }

    compras.forEach(compra => {
      const tarjeta = document.createElement('div');
      tarjeta.className = 'bg-gray-800 p-4 rounded shadow';

      tarjeta.innerHTML = `
        <h3 class="text-lg font-bold mb-2">${compra.nombre_pan}</h3>
        <p><strong>Precio:</strong> $${compra.precio}</p>
        <p><strong>Cantidad:</strong> ${compra.cantidad}</p>
        <p><strong>Total:</strong> $${(compra.precio * compra.cantidad).toFixed(2)}</p>
        <p><strong>Fecha:</strong> ${new Date(compra.fecha).toLocaleString()}</p>
        <p class="text-sm text-gray-400">Venta #${compra.numero_venta}</p>
      `;

      contenedor.appendChild(tarjeta);
    });
  } catch {
    contenedor.innerHTML = '<p class="text-center text-red-400">Error al cargar el historial.</p>';
  }
}

async function cargarHistorial() {
  const contenedor = document.getElementById('historial-container');
  contenedor.innerHTML = '';

  try {
    const res = await fetch('/comprasUsuario');
    const compras = await res.json();

    if (!Array.isArray(compras) || compras.length === 0) {
      contenedor.innerHTML = '<p class="text-center text-gray-400">No hay compras registradas.</p>';
      return;
    }

    compras.forEach(compra => {
      const tarjeta = document.createElement('div');
      tarjeta.className = 'bg-gray-800 p-4 rounded-lg shadow';

      tarjeta.innerHTML = `
        <h3 class="text-xl font-semibold mb-2">${compra.nombre_pan}</h3>
        <p class="text-sm text-gray-400">Precio unitario: $${Number(compra.precio).toFixed(2)}</p>
        <p class="text-sm text-gray-400">Cantidad: ${compra.cantidad}</p>
        <p class="text-sm text-yellow-400 font-semibold">Total: $${(compra.precio * compra.cantidad).toFixed(2)}</p>
        <p class="text-sm text-gray-400 mt-2">Fecha: ${new Date(compra.fecha).toLocaleString()}</p>
        <p class="text-xs text-gray-500">Venta #${compra.numero_venta}</p>
      `;

      contenedor.appendChild(tarjeta);
    });
  } catch {
    contenedor.innerHTML = '<p class="text-center text-red-400">Error al cargar el historial.</p>';
  }
}

if (window.location.pathname.includes('historial.html')) {
  cargarHistorial();
}

cargarCatalogo();
loadAndRenderCarrito();
