const map = L.map('map-template').setView([19.4326, -99.1332], 13); // CDMX

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

L.marker([19.4326, -99.1332]).addTo(map)
  .bindPopup('¡Aquí está tu panadería!')
  .openPopup();
