const STORAGE_KEY = 'viagi-intelligente-v1';

const today = new Date();
today.setHours(0, 0, 0, 0);

const starterTrips = [
  {
    id: crypto.randomUUID(),
    name: 'Weekend intelligente a Roma',
    city: 'Roma',
    country: 'Italia',
    coverPhoto: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    startDate: '2026-08-12',
    endDate: '2026-08-16',
    accommodation: 'Hotel Centrale',
    address: 'Via Nazionale 22, Roma',
    people: 2,
    budget: 1180,
    spent: 320,
    bookingSource: 'PDF prenotazione + treno confermati',
    transports: { flights: ['FCO arrivo ore 10:40'], trains: ['Roma Termini → Firenze SMN'], rentalCars: [] },
    budgetBreakdown: { hotel: 520, transports: 180, fuel: 0, tolls: 0, food: 260, excursions: 140, parking: 20, extras: 60 },
    pins: [],
    itinerary: [],
    diary: [
      { day: 1, title: 'Arrivo', notes: 'Aggiungi foto, video, spese e valutazione della giornata.', expenses: 0, rating: 0, media: [] },
    ],
  },
];

const pinCategories = [
  ['hotel', '🏨', 'hotel/alloggio'],
  ['airport', '✈️', 'aeroporto'],
  ['station', '🚆', 'stazione'],
  ['beach', '🏖️', 'spiaggia'],
  ['monument', '🏛️', 'monumento'],
  ['restaurant', '🍝', 'ristorante consigliato'],
  ['parking', '🅿️', 'parcheggio'],
  ['market', '🛒', 'supermercato'],
  ['fuel', '⛽', 'distributore'],
  ['hospital', '🏥', 'ospedale'],
];

let trips = normalizeTrips(loadTrips());
let activeId = trips[0]?.id;

const formPanel = document.querySelector('#new-trip-panel');
const form = document.querySelector('#trip-form');
const tripGroups = document.querySelector('#trip-groups');
const details = document.querySelector('#trip-details');
const totalBudget = document.querySelector('#total-budget');
const totalSpent = document.querySelector('#total-spent');
const addTripButton = document.querySelector('#add-trip-button');
const cancelTripButton = document.querySelector('#cancel-trip-button');
const bookingInput = document.querySelector('#booking-source');
const fileInput = document.querySelector('#booking-file');
const cityInput = document.querySelector('#city');
const countryInput = document.querySelector('#country');
const nameInput = document.querySelector('#trip-name');
const accommodationInput = document.querySelector('#accommodation');
const addressInput = document.querySelector('#address');
const startInput = document.querySelector('#start-date');
const endInput = document.querySelector('#end-date');
const peopleInput = document.querySelector('#people');

function loadTrips() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : starterTrips;
  } catch {
    return starterTrips;
  }
}

function normalizeTrips(items) {
  return items.map((trip) => {
    const normalized = { ...trip };
    normalized.name ||= trip.destination || `Viaggio a ${trip.city || 'destinazione'}`;
    normalized.city ||= trip.destination || 'Da definire';
    normalized.country ||= 'Da definire';
    normalized.coverPhoto ||= coverFor(normalized.city);
    normalized.accommodation ||= trip.hotel || 'Alloggio da confermare';
    normalized.address ||= `${normalized.city}, ${normalized.country}`;
    normalized.people ||= 1;
    normalized.budgetBreakdown ||= estimateBudgetBreakdown(normalized.budget, daysBetween(normalized.startDate, normalized.endDate), normalized.people);
    normalized.budget ||= sumBudget(normalized.budgetBreakdown);
    normalized.spent ||= 0;
    normalized.transports ||= { flights: [], trains: [], rentalCars: [] };
    normalized.pins = normalized.pins?.length && typeof normalized.pins[0] === 'object' ? normalized.pins : buildPins(normalized);
    normalized.itinerary = normalized.itinerary?.length && typeof normalized.itinerary[0] === 'object' ? normalized.itinerary : buildItinerary(normalized);
    normalized.diary ||= buildDiary(normalized);
    return normalized;
  });
}

function saveTrips() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function euro(value) {
  return `€${Number(value || 0).toLocaleString('it-IT')}`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function formatDate(value) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function tripDates(trip) {
  return `${formatDate(trip.startDate)} → ${formatDate(trip.endDate)}`;
}

function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 3;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function getTripStatus(trip) {
  const start = trip.startDate ? new Date(`${trip.startDate}T00:00:00`) : null;
  const end = trip.endDate ? new Date(`${trip.endDate}T00:00:00`) : start;
  if (end && end < today) return 'past';
  if (start && start <= today && (!end || end >= today)) return 'present';
  return 'future';
}

function splitLines(value) {
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function coverFor(city) {
  const query = encodeURIComponent(city || 'travel');
  return `https://source.unsplash.com/1200x800/?${query},travel`;
}

function sumBudget(breakdown) {
  return Object.values(breakdown || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function estimateBudgetBreakdown(total, days, people) {
  const target = Number(total || 0) || Math.round((days * people * 115) + 260);
  return {
    hotel: Math.round(target * 0.38),
    transports: Math.round(target * 0.18),
    fuel: Math.round(target * 0.06),
    tolls: Math.round(target * 0.04),
    food: Math.round(target * 0.18),
    excursions: Math.round(target * 0.08),
    parking: Math.round(target * 0.03),
    extras: Math.round(target * 0.05),
  };
}

function googleMapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildPins(trip) {
  const place = `${trip.city}, ${trip.country}`;
  return pinCategories.map(([type, icon, label]) => ({
    type,
    icon,
    label,
    name: type === 'hotel' ? trip.accommodation : `${label} a ${trip.city}`,
    address: type === 'hotel' ? trip.address : place,
    mapsUrl: googleMapsUrl(`${type === 'hotel' ? trip.accommodation : label} ${place}`),
  }));
}

function buildItinerary(trip) {
  const days = daysBetween(trip.startDate, trip.endDate);
  const themes = ['centro storico e monumenti iconici', 'quartieri autentici, mercati e vista panoramica', 'spiagge o attrazioni naturali più belle', 'musei, esperienze guidate e ristoranti tipici'];
  return Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    date: formatDate(addDays(trip.startDate, index)),
    title: index === 0 ? 'Arrivo e orientamento' : index === days - 1 ? 'Ultime visite e rientro' : `Scoperta di ${trip.city}`,
    plan: index === 0 ? `Check-in presso ${trip.accommodation}, passeggiata vicino all'alloggio e cena consigliata.` : `Visita ${themes[index % themes.length]}, con pause in luoghi vicini e alternative meteo.` ,
    mobility: `${10 + index * 7}-${25 + index * 9} min medi tra le tappe`,
    distance: `${(1.2 + index * 0.8).toFixed(1)} km dall'alloggio`,
    restaurants: [`Trattoria consigliata ${trip.city}`, `Bistrot vicino a ${trip.accommodation}`],
    tips: `Consiglio AI: ritmo ${trip.people > 2 ? 'comodo per gruppo/famiglia' : 'flessibile'} e prenotazioni in anticipo per attrazioni richieste.`,
  }));
}

function addDays(value, offset) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function buildDiary(trip) {
  return Array.from({ length: daysBetween(trip.startDate, trip.endDate) }, (_, index) => ({ day: index + 1, title: `Diario giorno ${index + 1}`, notes: '', expenses: 0, rating: 0, media: [] }));
}

function analyzeBooking({ name, city, country, accommodation, address, bookingSource, bookingFileName, people }) {
  const source = `${bookingSource} ${bookingFileName}`.toLowerCase();
  const transports = { flights: [], trains: [], rentalCars: [] };
  if (/volo|flight|aereo|airport/.test(source)) transports.flights.push(`Volo rilevato per ${city}: verificare terminal e bagagli`);
  if (/treno|train|rail|stazione/.test(source)) transports.trains.push(`Treno rilevato: salva biglietto e binario per ${city}`);
  if (/auto|car|rental|noleggio/.test(source)) transports.rentalCars.push(`Auto a noleggio rilevata: controlla cauzione e parcheggi`);
  return {
    name: name || `Viaggio a ${city}`,
    accommodation: accommodation || `Alloggio rilevato a ${city}`,
    address: address || `Indirizzo rilevato automaticamente, ${city}, ${country}`,
    people: Number(people || 1),
    transports,
    bookingSummary: bookingFileName ? `PDF analizzato: ${bookingFileName}` : bookingSource ? `Link analizzato: ${bookingSource}` : 'Inserimento manuale',
  };
}

function renderTotals() {
  const budget = trips.reduce((sum, trip) => sum + Number(trip.budget || 0), 0);
  const spent = trips.reduce((sum, trip) => sum + Number(trip.spent || 0), 0);
  totalBudget.textContent = euro(budget);
  totalSpent.textContent = `Speso ${euro(spent)} · Resta ${euro(budget - spent)}`;
}

function renderTripCard(trip) {
  return `<button class="trip-card ${trip.id === activeId ? 'active' : ''}" data-trip-id="${trip.id}">
    <img src="${escapeHtml(trip.coverPhoto)}" alt="Copertina ${escapeHtml(trip.name)}" />
    <span class="trip-card-body">
      <strong>${escapeHtml(trip.name)}</strong>
      <small>${escapeHtml(tripDates(trip))}</small>
      <small>${escapeHtml(trip.city)}, ${escapeHtml(trip.country)} · ${daysBetween(trip.startDate, trip.endDate)} giorni</small>
      <small>Previsto ${euro(trip.budget)} · Speso ${euro(trip.spent)}</small>
    </span>
  </button>`;
}

function renderTripGroups() {
  const groups = [['past', '📚 Viaggi passati'], ['present', '🧭 Viaggi presenti / in corso'], ['future', '🔮 Viaggi futuri']];
  tripGroups.innerHTML = groups.map(([status, title]) => {
    const items = trips.filter((trip) => getTripStatus(trip) === status);
    return `<section class="trip-group"><h3>${title}</h3>${items.length ? items.map(renderTripCard).join('') : '<p class="empty">Nessun viaggio in questa sezione.</p>'}</section>`;
  }).join('');
}

function renderMapPins(pins) {
  return `<div class="map-card"><div class="map-bg" aria-label="Mappa con pin automatici">
    ${(pins || []).slice(0, 10).map((pin, index) => `<a class="pin pin-${index + 1}" href="${escapeHtml(pin.mapsUrl)}" target="_blank" rel="noreferrer" title="Apri ${escapeHtml(pin.name)} in Google Maps">${pin.icon}</a>`).join('')}
  </div><div class="pin-list">${(pins || []).map((pin) => `<a href="${escapeHtml(pin.mapsUrl)}" target="_blank" rel="noreferrer">${pin.icon} ${escapeHtml(pin.name)}</a>`).join('')}</div></div>`;
}

function renderBudget(trip) {
  const recommended = sumBudget(trip.budgetBreakdown);
  const minimum = Math.round(recommended * 0.82);
  const maximum = Math.round(recommended * 1.25);
  const labels = { hotel: 'Hotel', transports: 'Trasporti', fuel: 'Benzina', tolls: 'Pedaggi', food: 'Cibo', excursions: 'Escursioni', parking: 'Parcheggi', extras: 'Extra' };
  return `<section class="section-card"><h3>💶 Budget intelligente</h3><div class="budget-range"><strong>Min ${euro(minimum)}</strong><strong>Consigliato ${euro(recommended)}</strong><strong>Max ${euro(maximum)}</strong></div><div class="budget-grid">${Object.entries(trip.budgetBreakdown).map(([key, value]) => `<span>${labels[key]} <b>${euro(value)}</b></span>`).join('')}</div></section>`;
}

function renderItinerary(trip) {
  return `<section class="section-card"><h3>🗓️ Itinerario automatico giorno per giorno</h3><div class="timeline">${trip.itinerary.map((day) => `<article><strong>Giorno ${day.day} · ${escapeHtml(day.title)}</strong><p>${escapeHtml(day.plan)}</p><small>🚶 ${escapeHtml(day.mobility)} · 📍 ${escapeHtml(day.distance)}</small><small>🍽️ ${escapeHtml(day.restaurants.join(' / '))}</small><small>✨ ${escapeHtml(day.tips)}</small></article>`).join('')}</div></section>`;
}

function renderDiary(trip) {
  return `<section class="section-card"><h3>📔 Diario di viaggio</h3><div class="diary-grid">${trip.diary.map((day) => `<article><strong>Giorno ${day.day}</strong><p>📷 Foto · 🎥 Video · 📝 Note · 💳 Spese ${euro(day.expenses)} · ⭐ ${day.rating || 'da valutare'}</p><textarea data-diary-day="${day.day}" placeholder="Scrivi note della giornata...">${escapeHtml(day.notes)}</textarea></article>`).join('')}</div></section>`;
}

function renderDetails() {
  const trip = trips.find((item) => item.id === activeId) || trips[0];
  if (!trip) {
    details.innerHTML = '<p class="empty">Nessun viaggio selezionato. Premi “+ Nuovo viaggio” per iniziare.</p>';
    return;
  }
  details.innerHTML = `<div class="details-cover" style="background-image:url('${escapeHtml(trip.coverPhoto)}')"><button class="icon-button" id="delete-trip" aria-label="Elimina viaggio">🗑️</button></div>
    <div class="details-head"><div><p class="eyebrow">${escapeHtml(tripDates(trip))} · ${daysBetween(trip.startDate, trip.endDate)} giorni</p><h2>${escapeHtml(trip.name)}</h2><p>${escapeHtml(trip.city)}, ${escapeHtml(trip.country)}</p></div></div>
    <div class="info-grid">
      <article class="info-card"><span>🏨 Alloggio</span><strong>${escapeHtml(trip.accommodation)}</strong><small>${escapeHtml(trip.address)}</small></article>
      <article class="info-card"><span>👥 Persone</span><strong>${trip.people}</strong><small>${escapeHtml(trip.bookingSource || 'Inserimento manuale')}</small></article>
      <article class="info-card"><span>🚗 Trasporti</span><strong>${[...trip.transports.flights, ...trip.transports.trains, ...trip.transports.rentalCars].length || 'Da completare'}</strong><small>voli, treni e auto a noleggio rilevati dall’analisi</small></article>
    </div>
    ${renderMapPins(trip.pins)}${renderItinerary(trip)}${renderBudget(trip)}${renderDiary(trip)}`;
}

function render() {
  renderTotals();
  renderTripGroups();
  renderDetails();
}

function applyBookingPreview() {
  const city = cityInput.value.trim();
  if (!city && !bookingInput.value.trim() && !fileInput.files[0]) return;
  if (!nameInput.value.trim() && city) nameInput.value = `Viaggio intelligente a ${city}`;
  if (!accommodationInput.value.trim() && city) accommodationInput.value = `Alloggio rilevato a ${city}`;
  if (!addressInput.value.trim() && city) addressInput.value = `Indirizzo rilevato automaticamente, ${city}`;
}

addTripButton.addEventListener('click', () => {
  formPanel.hidden = false;
  nameInput.focus();
});
cancelTripButton.addEventListener('click', () => { formPanel.hidden = true; });
bookingInput.addEventListener('input', applyBookingPreview);
fileInput.addEventListener('change', applyBookingPreview);
cityInput.addEventListener('input', applyBookingPreview);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const startDate = startInput.value;
  const endDate = endInput.value || startDate;
  const city = cityInput.value.trim();
  const country = countryInput.value.trim() || 'Da definire';
  const bookingSource = bookingInput.value.trim() || fileInput.files[0]?.name || 'Inserimento manuale';
  const analysis = analyzeBooking({
    name: nameInput.value.trim(), city, country, accommodation: accommodationInput.value.trim(), address: addressInput.value.trim(),
    bookingSource, bookingFileName: fileInput.files[0]?.name, people: peopleInput.value,
  });
  const days = daysBetween(startDate, endDate);
  const budgetBreakdown = estimateBudgetBreakdown(Number(document.querySelector('#budget').value || 0), days, analysis.people);
  const newTrip = {
    id: crypto.randomUUID(),
    name: analysis.name,
    city,
    country,
    coverPhoto: document.querySelector('#cover-photo').value.trim() || coverFor(city),
    startDate,
    endDate,
    accommodation: analysis.accommodation,
    address: analysis.address,
    people: analysis.people,
    budget: sumBudget(budgetBreakdown),
    spent: Number(document.querySelector('#spent').value || 0),
    bookingSource: analysis.bookingSummary,
    transports: analysis.transports,
    budgetBreakdown,
  };
  newTrip.pins = buildPins(newTrip);
  newTrip.itinerary = splitLines(document.querySelector('#itinerary').value).length
    ? splitLines(document.querySelector('#itinerary').value).map((plan, index) => ({ day: index + 1, date: formatDate(addDays(startDate, index)), title: `Piano manuale ${index + 1}`, plan, mobility: 'Da calcolare', distance: 'Da calcolare', restaurants: [`Ristoranti consigliati a ${city}`], tips: 'Completa con AI/Places API' }))
    : buildItinerary(newTrip);
  newTrip.diary = buildDiary(newTrip);
  trips = [newTrip, ...trips];
  activeId = newTrip.id;
  saveTrips();
  form.reset();
  formPanel.hidden = true;
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

details.addEventListener('input', (event) => {
  const day = event.target.dataset.diaryDay;
  if (!day) return;
  const trip = trips.find((item) => item.id === activeId);
  const entry = trip?.diary.find((item) => String(item.day) === day);
  if (entry) {
    entry.notes = event.target.value;
    saveTrips();
  }
});

render();
