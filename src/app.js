const STORAGE_KEY = 'viagi-travel-planner-v2';

const today = new Date();
today.setHours(0, 0, 0, 0);

const starterTrips = [
  {
    id: crypto.randomUUID(),
    destination: 'Roma',
    startDate: '2026-08-12',
    endDate: '2026-08-16',
    hotel: 'Hotel Centrale, Via Nazionale 22 - check-in 15:00',
    budget: 850,
    spent: 260,
    booking: 'Treno + hotel confermati',
    bookingSource: 'https://hotel.example/roma',
    pins: ['Hotel Centrale', 'Colosseo', 'Trastevere', 'Musei Vaticani'],
    suggestions: ['Passeggiata al tramonto al Gianicolo', 'Cena tipica a Testaccio', 'Prenotare i Musei Vaticani in anticipo'],
    itinerary: ['Giorno 1: arrivo, check-in e passeggiata a Monti', 'Giorno 2: Colosseo, Foro Romano e Trastevere', 'Giorno 3: Musei Vaticani e Castel Sant’Angelo', 'Giorno 4: Villa Borghese e rientro'],
    reminders: ['Carta identità', 'Caricatore', 'Prenotare taxi aeroporto'],
  },
];

let trips = loadTrips();
let activeId = trips[0]?.id;

const form = document.querySelector('#trip-form');
const tripGroups = document.querySelector('#trip-groups');
const details = document.querySelector('#trip-details');
const totalBudget = document.querySelector('#total-budget');
const totalSpent = document.querySelector('#total-spent');
const bookingInput = document.querySelector('#booking-source');
const fileInput = document.querySelector('#booking-file');
const destinationInput = document.querySelector('#destination');
const hotelInput = document.querySelector('#hotel');
const startInput = document.querySelector('#start-date');
const endInput = document.querySelector('#end-date');

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

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}

function formatDate(value) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function tripDates(trip) {
  return `${formatDate(trip.startDate)} → ${formatDate(trip.endDate)}`;
}

function getTripStatus(trip) {
  const start = trip.startDate ? new Date(`${trip.startDate}T00:00:00`) : null;
  const end = trip.endDate ? new Date(`${trip.endDate}T00:00:00`) : start;
  if (end && end < today) return 'past';
  if (start && start <= today && (!end || end >= today)) return 'present';
  return 'future';
}

function splitLines(value) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 3;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.min(10, Math.max(1, Math.round((end - start) / 86400000) + 1));
}

function uniqueItems(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function generateTripPlan({ destination, hotel, startDate, endDate, bookingSource, bookingFileName, budget }) {
  const sourceText = `${bookingSource} ${bookingFileName}`.toLowerCase();
  const basePlaces = ['centro storico', 'quartiere tipico', 'museo principale', 'mercato locale', 'punto panoramico'];
  const hotelName = hotel || `Alloggio a ${destination}`;
  const inferredPins = uniqueItems([
    hotelName,
    `${destination} centro`,
    `${destination} stazione/aeroporto`,
    ...basePlaces.map((place) => `${destination} ${place}`),
  ]);

  const travelHints = [];
  if (sourceText.includes('flight') || sourceText.includes('volo') || sourceText.includes('aereo')) travelHints.push('Controlla transfer aeroporto e limiti bagaglio');
  if (sourceText.includes('train') || sourceText.includes('treno')) travelHints.push('Salva biglietti treno offline e binario');
  if (sourceText.includes('hotel') || sourceText.includes('booking')) travelHints.push('Verifica orario check-in e tassa di soggiorno');

  const dailyBudget = Math.max(55, Math.round(Number(budget || 0) / daysBetween(startDate, endDate)) || 90);
  const suggestions = uniqueItems([
    ...travelHints,
    `Metti in mappa ristoranti vicino a ${hotelName}`,
    `Prenota almeno una esperienza guidata a ${destination}`,
    `Lascia ${euro(dailyBudget)} al giorno per cibo, trasporti e ingressi`,
  ]);

  const dayCount = daysBetween(startDate, endDate);
  const itinerary = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    if (day === 1) return `Giorno ${day}: arrivo, check-in, prima passeggiata in centro e cena vicino all'alloggio`;
    if (day === dayCount) return `Giorno ${day}: colazione lenta, ultimo giro, souvenir e rientro`;
    return `Giorno ${day}: visita ${basePlaces[(index - 1) % basePlaces.length]}, pausa pranzo locale e attività serale`;
  });

  return { pins: inferredPins, suggestions, itinerary, estimatedDailyBudget: dailyBudget };
}

function renderTotals() {
  const budget = trips.reduce((sum, trip) => sum + Number(trip.budget || 0), 0);
  const spent = trips.reduce((sum, trip) => sum + Number(trip.spent || 0), 0);
  totalBudget.textContent = euro(budget);
  totalSpent.textContent = `Speso ${euro(spent)} · Resta ${euro(budget - spent)}`;
}

function renderTripButton(trip) {
  return `
    <button class="trip-tab ${trip.id === activeId ? 'active' : ''}" data-trip-id="${trip.id}">
      <span>${escapeHtml(trip.destination)}</span>
      <small>${escapeHtml(tripDates(trip))}</small>
    </button>
  `;
}

function renderTripGroups() {
  const groups = [
    ['present', '🧭 Viaggi presenti'],
    ['future', '🔮 Viaggi futuri'],
    ['past', '📚 Viaggi passati'],
  ];

  tripGroups.innerHTML = groups.map(([status, title]) => {
    const items = trips.filter((trip) => getTripStatus(trip) === status);
    return `
      <section class="trip-group">
        <h3>${title}</h3>
        ${items.length ? items.map(renderTripButton).join('') : '<p class="empty">Nessun viaggio in questa sezione.</p>'}
      </section>
    `;
  }).join('');
}

function renderList(title, items, empty, icon = '✅') {
  const content = items?.length
    ? items.map((item) => `<p>${icon} ${escapeHtml(item)}</p>`).join('')
    : `<p class="muted">${empty}</p>`;
  return `<div class="checklist"><h3>${title}</h3>${content}</div>`;
}

function renderMapPins(pins) {
  return `
    <div class="map-card">
      <div class="map-bg" aria-label="Mappa con pin automatici">
        ${(pins || []).slice(0, 6).map((pin, index) => `<span class="pin pin-${index + 1}" title="${escapeHtml(pin)}">📍</span>`).join('')}
      </div>
      <div class="pin-list">${(pins || []).map((pin) => `<span>${escapeHtml(pin)}</span>`).join('')}</div>
    </div>
  `;
}

function renderDetails() {
  const trip = trips.find((item) => item.id === activeId) || trips[0];
  if (!trip) {
    details.innerHTML = '<p class="empty">Nessun viaggio selezionato. Aggiungi un link o un PDF di prenotazione per iniziare.</p>';
    return;
  }

  details.innerHTML = `
    <div class="details-head">
      <div><p class="eyebrow">${getTripStatus(trip) === 'past' ? '📚 Passato' : getTripStatus(trip) === 'present' ? '🧭 In corso' : '🔮 Futuro'} · ${escapeHtml(tripDates(trip))}</p><h2>${escapeHtml(trip.destination)}</h2></div>
      <button class="icon-button" id="delete-trip" aria-label="Elimina viaggio">🗑️</button>
    </div>
    <div class="info-grid">
      <article class="info-card"><span>🏨 Albergo</span><strong>${escapeHtml(trip.hotel)}</strong></article>
      <article class="info-card"><span>📎 Prenotazione</span><strong>${escapeHtml(trip.bookingSource || trip.booking || 'Link/PDF non caricato')}</strong></article>
      <article class="info-card"><span>💶 Budget stimato</span><strong>${euro(trip.budget)} totali · ${euro(trip.estimatedDailyBudget)} al giorno</strong></article>
    </div>
    ${renderMapPins(trip.pins)}
    <div class="columns three">
      ${renderList('🗺️ Programma giorno per giorno', trip.itinerary, 'Il programma automatico apparirà qui.')}
      ${renderList('✨ Posti e idee consigliate', trip.suggestions, 'I suggerimenti appariranno qui.', '⭐')}
      ${renderList('🔔 Promemoria', trip.reminders, 'Nessun promemoria inserito.', '🔔')}
    </div>
  `;
}

function render() {
  renderTotals();
  renderTripGroups();
  renderDetails();
}

function applyBookingPreview() {
  const bookingSource = bookingInput.value.trim();
  const bookingFileName = fileInput.files[0]?.name || '';
  const destination = destinationInput.value.trim();
  if (!destination && !bookingSource && !bookingFileName) return;

  if (!hotelInput.value.trim() && destination) hotelInput.value = `Hotel rilevato dalla prenotazione - ${destination}`;
}

bookingInput.addEventListener('input', applyBookingPreview);
fileInput.addEventListener('change', applyBookingPreview);

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const destination = destinationInput.value.trim();
  const startDate = startInput.value;
  const endDate = endInput.value || startDate;
  const hotel = hotelInput.value.trim() || 'Alloggio da scegliere';
  const bookingSource = bookingInput.value.trim() || fileInput.files[0]?.name || 'Prenotazione da completare';
  const budget = Number(document.querySelector('#budget').value || 0);
  const automaticPlan = generateTripPlan({ destination, hotel, startDate, endDate, bookingSource, bookingFileName: fileInput.files[0]?.name, budget });

  const newTrip = {
    id: crypto.randomUUID(),
    destination,
    startDate,
    endDate,
    hotel,
    budget: budget || automaticPlan.estimatedDailyBudget * daysBetween(startDate, endDate),
    spent: Number(document.querySelector('#spent').value || 0),
    booking: bookingSource,
    bookingSource,
    pins: automaticPlan.pins,
    suggestions: automaticPlan.suggestions,
    itinerary: splitLines(document.querySelector('#itinerary').value).length ? splitLines(document.querySelector('#itinerary').value) : automaticPlan.itinerary,
    reminders: splitLines(document.querySelector('#reminders').value),
    estimatedDailyBudget: automaticPlan.estimatedDailyBudget,
  };

  trips = [newTrip, ...trips];
  activeId = newTrip.id;
  saveTrips();
  form.reset();
  render();
});

tripGroups.addEventListener('click', (event) => {
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
