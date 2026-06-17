const STORAGE_KEY = 'viagi-travel-planner';

const starterTrips = [
  {
    id: crypto.randomUUID(),
    destination: 'Roma',
    dates: '12-16 Agosto',
    hotel: 'Hotel Centrale, check-in 15:00',
    budget: 850,
    spent: 260,
    booking: 'Treno + hotel confermati',
    itinerary: ['Colosseo', 'Trastevere food tour', 'Musei Vaticani'],
    reminders: ['Carta identità', 'Caricatore', 'Prenotare taxi aeroporto'],
  },
];

let trips = loadTrips();
let activeId = trips[0]?.id;

const form = document.querySelector('#trip-form');
const tripList = document.querySelector('#trip-list');
const details = document.querySelector('#trip-details');
const totalBudget = document.querySelector('#total-budget');
const totalSpent = document.querySelector('#total-spent');

function loadTrips() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : starterTrips;
  } catch {
    return starterTrips;
  }
}

function saveTrips() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function euro(value) {
  return `€${Number(value || 0).toLocaleString('it-IT')}`;
}

function splitLines(value) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}

function renderTotals() {
  const budget = trips.reduce((sum, trip) => sum + Number(trip.budget || 0), 0);
  const spent = trips.reduce((sum, trip) => sum + Number(trip.spent || 0), 0);
  totalBudget.textContent = euro(budget);
  totalSpent.textContent = `Speso ${euro(spent)} · Resta ${euro(budget - spent)}`;
}

function renderTripList() {
  if (!trips.length) {
    tripList.innerHTML = '<p class="empty">Aggiungi il primo viaggio per iniziare.</p>';
    return;
  }

  tripList.innerHTML = trips.map((trip) => `
    <button class="trip-tab ${trip.id === activeId ? 'active' : ''}" data-trip-id="${trip.id}">
      <span>${escapeHtml(trip.destination)}</span>
      <small>${escapeHtml(trip.dates)}</small>
    </button>
  `).join('');
}

function renderChecklist(title, items, empty) {
  const content = items.length
    ? items.map((item) => `<p>✅ ${escapeHtml(item)}</p>`).join('')
    : `<p class="muted">${empty}</p>`;

  return `<div class="checklist"><h3>${title}</h3>${content}</div>`;
}

function renderDetails() {
  const trip = trips.find((item) => item.id === activeId) || trips[0];
  if (!trip) {
    details.innerHTML = '<p class="empty">Nessun viaggio selezionato.</p>';
    return;
  }

  details.innerHTML = `
    <div class="details-head">
      <div>
        <p class="eyebrow">📅 ${escapeHtml(trip.dates)}</p>
        <h2>${escapeHtml(trip.destination)}</h2>
      </div>
      <button class="icon-button" id="delete-trip" aria-label="Elimina viaggio">🗑️</button>
    </div>
    <div class="info-grid">
      <article class="info-card"><span>🏨 Albergo</span><strong>${escapeHtml(trip.hotel)}</strong></article>
      <article class="info-card"><span>✅ Prenotamenti</span><strong>${escapeHtml(trip.booking)}</strong></article>
      <article class="info-card"><span>💶 Budget</span><strong>${euro(trip.spent)} spesi su ${euro(trip.budget)}</strong></article>
    </div>
    <div class="columns">
      ${renderChecklist('📅 Programmazione', trip.itinerary, 'Nessuna attività inserita.')}
      ${renderChecklist('🔔 Promemoria', trip.reminders, 'Nessun promemoria inserito.')}
    </div>
  `;
}

function render() {
  renderTotals();
  renderTripList();
  renderDetails();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const newTrip = {
    id: crypto.randomUUID(),
    destination: document.querySelector('#destination').value.trim(),
    dates: document.querySelector('#dates').value.trim() || 'Date da definire',
    hotel: document.querySelector('#hotel').value.trim() || 'Alloggio da scegliere',
    budget: Number(document.querySelector('#budget').value || 0),
    spent: Number(document.querySelector('#spent').value || 0),
    booking: document.querySelector('#booking').value.trim() || 'Prenotamenti da completare',
    itinerary: splitLines(document.querySelector('#itinerary').value),
    reminders: splitLines(document.querySelector('#reminders').value),
  };

  trips = [newTrip, ...trips];
  activeId = newTrip.id;
  saveTrips();
  form.reset();
  render();
});

tripList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-trip-id]');
  if (!button) return;
  activeId = button.dataset.tripId;
  render();
});

details.addEventListener('click', (event) => {
  if (event.target.closest('#delete-trip')) {
    trips = trips.filter((trip) => trip.id !== activeId);
    activeId = trips[0]?.id;
    saveTrips();
    render();
  }
});

render();
