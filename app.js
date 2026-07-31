const foodImages = {
  lemonRice: 'https://images.unsplash.com/photo-1630409351217-bc4fa6422075?auto=format&fit=crop&w=500&q=82',
  thali: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=500&q=82',
  idli: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=82',
  biryani: 'https://images.unsplash.com/photo-1631515242808-497c3fbd3972?auto=format&fit=crop&w=500&q=82',
  sweets: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=82',
  dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=500&q=82',
  cook1: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=500&q=82',
  cook2: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=500&q=82&sat=-30',
  cook3: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=500&q=82',
  kitchen: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=82',
  story: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=500&q=82'
};

const kitchens = [
  { id: 'meera', name: "Meera's Kitchen", cook: 'Meera Krishnan', cuisine: 'Tamil home-style · Veg', rating: '4.9', reviews: '218', distance: '2.1 km', time: 'Tomorrow 12:30–1:30', image: foodImages.thali, avatar: foodImages.cook1, bio: 'I cook the lunch I would want my own family to eat — seasonal, balanced and always from scratch. My kitchen has been feeding RS Puram for 14 years.', dishes: [
    { id: 'meera-lemon', name: 'Lemon rice comfort box', description: 'Lemon rice, kootu, poriyal & vadai', price: 159, image: foodImages.lemonRice, tags: ['Veg', 'No onion garlic'] },
    { id: 'meera-idli', name: 'Idli & sambar set', description: 'Six soft idlis, sambar and chutney', price: 118, image: foodImages.idli, tags: ['Veg', 'Breakfast'] },
    { id: 'meera-sweet', name: 'Sakkarai pongal', description: 'Ghee, jaggery and moong dal', price: 95, image: foodImages.sweets, tags: ['Festival special'] }
  ] },
  { id: 'anitha', name: 'Anitha Bakes', cook: 'Anitha Nair', cuisine: 'Sourdough · Desserts', rating: '4.8', reviews: '174', distance: '3.6 km', time: 'Today 5:00–6:00', image: foodImages.sweets, avatar: foodImages.cook2, bio: 'A former pastry chef, now baking small batches with stone-ground flour and butter worth the splurge.', dishes: [
    { id: 'anitha-bread', name: 'Country sourdough loaf', description: 'Naturally leavened, 24-hour ferment', price: 210, image: foodImages.sweets, tags: ['Eggless', 'Pre-order'] },
    { id: 'anitha-cake', name: 'Dark chocolate tea cake', description: 'Rich cocoa, walnut and sea salt', price: 340, image: foodImages.story, tags: ['Eggless'] }
  ] },
  { id: 'shafi', name: 'Shafi’s Table', cook: 'Shafi Rahman', cuisine: 'Malabar · Non-veg', rating: '4.9', reviews: '308', distance: '4.2 km', time: 'Tomorrow 7:30–8:30', image: foodImages.biryani, avatar: foodImages.cook3, bio: 'The Malabar recipes in my home have travelled through three generations. Every spice is roasted fresh each morning.', dishes: [
    { id: 'shafi-biryani', name: 'Thalassery chicken biryani', description: 'Jeerakasala rice, raita & pickle', price: 279, image: foodImages.biryani, tags: ['Halal', 'Medium spice'] },
    { id: 'shafi-pathiri', name: 'Pathiri & chicken stew', description: 'Five pathiris with coconut stew', price: 235, image: foodImages.dosa, tags: ['Halal'] }
  ] }
];

const state = {
  view: 'home',
  role: 'customer',
  cart: [],
  search: '',
  activeChip: 'For you',
  exploreCategory: 'All',
  activeFilters: ['Within 5 km', 'Verified cooks'],
  followed: new Set(),
  delivery: 'Tomorrow · 12:30–1:30 pm',
  address: 'RS Puram, Coimbatore',
  cookTab: 'Overview',
  adminTab: 'Needs review',
  store: loadSellerStore(),
  sellerDraft: { name: '', owner: 'Asha R.', area: 'RS Puram, Coimbatore', items: [{ name: '', price: '' }] },
  reviews: loadReviews(),
  reviewDraft: { stars: 5, photoName: '' },
  planDraft: { cookId: 'meera', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const content = $('#app-content');
const modalLayer = $('#modal-layer');

// img error events don't bubble, so this needs the capture phase.
document.addEventListener('error', event => {
  const img = event.target;
  if (img.tagName === 'IMG' && !img.dataset.fallbackApplied) {
    img.dataset.fallbackApplied = 'true';
    img.src = './assets/placeholder.png';
  }
}, true);

function currency(value) { return `₹${value.toLocaleString('en-IN')}`; }
function quantityOf(id) { const item = state.cart.find(entry => entry.dish.id === id); return item ? item.quantity : 0; }
function qtyControlHTML(dish, style = '') {
  const qty = quantityOf(dish.id);
  const styleAttr = style ? ` data-qty-style="${style}"` : '';
  if (qty > 0) {
    return `<div class="quantity qty-control" data-qty-control="${dish.id}"${styleAttr}><button data-quantity="${dish.id}" data-amount="-1" aria-label="Remove one ${dish.name}">−</button><b>${qty}</b><button data-quantity="${dish.id}" data-amount="1" aria-label="Add one more ${dish.name}">+</button></div>`;
  }
  return `<button class="${style}" data-qty-control="${dish.id}"${styleAttr} data-add="${dish.id}" aria-label="Add ${dish.name}">+</button>`;
}
function refreshQtyControl(id) {
  const dish = findDish(id);
  if (!dish) return;
  $$(`[data-qty-control="${id}"]`).forEach(el => { el.outerHTML = qtyControlHTML(dish, el.dataset.qtyStyle || ''); });
}
function escapeHtml(text) { return text.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function loadSellerStore() { try { return JSON.parse(localStorage.getItem('loom-seller-store') || 'null'); } catch { return null; } }
function saveSellerStore() { localStorage.setItem('loom-seller-store', JSON.stringify(state.store)); }
function loadReviews() { try { const saved = JSON.parse(localStorage.getItem('loom-customer-reviews') || 'null'); if (Array.isArray(saved)) return saved; } catch {} return [{ cookId: 'meera', name: 'Priya S.', stars: 5, text: 'The lemon rice was exactly like home.', photoName: 'meal-photo.jpg' }, { cookId: 'anitha', name: 'Nandini K.', stars: 5, text: 'Perfectly soft tea cake and such careful packaging.', photoName: '' }]; }
function saveReviews() { localStorage.setItem('loom-customer-reviews', JSON.stringify(state.reviews)); }
function reviewsFor(cookId) { return state.reviews.filter(review => review.cookId === cookId); }
function activeStore() { return state.store || { name: 'Meera’s Kitchen', owner: 'Meera', area: 'RS Puram', items: kitchens[0].dishes.map(d => ({ name: d.name, price: d.price, active: true })) }; }
function registerStoreForDiscovery() {
  if (!state.store) return;
  const existing = kitchens.findIndex(k => k.id === 'seller-store');
  const sellerKitchen = {
    id: 'seller-store', name: state.store.name, cook: state.store.owner, cuisine: 'Home kitchen · Made to order', rating: 'New', reviews: '0', distance: '0.8 km', time: 'Tomorrow 12:30–1:30', image: foodImages.thali, avatar: foodImages.cook1,
    bio: `${state.store.owner} is now cooking from ${state.store.area}. Follow this new kitchen to hear about upcoming delivery slots.`,
    dishes: state.store.items.filter(item => item.active !== false).map((item, index) => ({ id: `seller-item-${index}`, name: item.name, description: 'Freshly prepared in this new LOOM kitchen', price: Number(item.price), image: [foodImages.thali, foodImages.idli, foodImages.sweets][index % 3], tags: ['New kitchen'] }))
  };
  if (existing >= 0) kitchens[existing] = sellerKitchen;
  else kitchens.unshift(sellerKitchen);
}
registerStoreForDiscovery();
function findDish(dishId) { return kitchens.flatMap(k => k.dishes.map(d => ({ ...d, kitchen: k }))).find(d => d.id === dishId); }
function cartTotal() { return state.cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0); }
function toast(message) { const t = $('#toast'); t.textContent = message; t.classList.add('show'); window.clearTimeout(toast.timer); toast.timer = window.setTimeout(() => t.classList.remove('show'), 2400); }

function updateCartBadge() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = $('#cart-count');
  badge.textContent = count;
  badge.classList.toggle('show', count > 0);
}

function updateDeliveryAddress() {
  const label = $('#delivery-address');
  if (label) label.textContent = state.address;
}

function setNav(view) {
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
}

function addDish(id) {
  const dish = findDish(id);
  const current = state.cart.find(item => item.dish.id === id);
  if (current) current.quantity += 1;
  else state.cart.push({ dish, quantity: 1 });
  updateCartBadge();
  toast(`${dish.name} added to your basket`);
  refreshQtyControl(id);
  if (state.view === 'cart') render();
}

function changeQuantity(id, amount) {
  const item = state.cart.find(entry => entry.dish.id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) state.cart = state.cart.filter(entry => entry.dish.id !== id);
  updateCartBadge();
  refreshQtyControl(id);
  render();
}

function homeView() {
  const featureKitchens = kitchens.map(k => `
    <article class="cook-card" data-cook="${k.id}" tabindex="0" role="button" aria-label="Open ${k.name}">
      <div class="image-wrap"><img src="${k.image}" alt="${k.name} food" loading="lazy"/><span class="verified">✓ Verified kitchen</span></div>
      <div class="card-copy"><h3>${k.name}</h3><p><span class="rating">★ ${k.rating}</span> · ${k.distance}</p></div>
    </article>`).join('');
  const specials = [
    { dish: kitchens[0].dishes[0], left: 'Only 7 left', cook: 'Meera’s Kitchen', kitchenId: kitchens[0].id },
    { dish: kitchens[2].dishes[0], left: 'Only 5 left', cook: 'Shafi’s Table', kitchenId: kitchens[2].id },
    { dish: kitchens[1].dishes[1], left: 'Only 4 left', cook: 'Anitha Bakes', kitchenId: kitchens[1].id }
  ].map(({ dish, left, cook, kitchenId }) => `
    <article class="special-card" data-cook="${kitchenId}" tabindex="0" role="button" aria-label="Open ${cook}"><img src="${dish.image}" alt="${dish.name}"  loading="lazy"/><div class="special-info"><h3>${dish.name}</h3><p>${cook}</p><span class="quantity-note">${left}</span><div class="special-row"><strong>${currency(dish.price)}</strong>${qtyControlHTML(dish, 'add-mini')}</div></div></article>`).join('');
  return `
    <p class="eyebrow">Made close to home</p>
    <h1>Good food has a<br/>person behind it.</h1>
    <div class="search-wrap"><span class="search-icon">⌕</span><input id="main-search" value="${state.search}" placeholder="Search cooks, dishes, cuisines…" aria-label="Search"/><button class="filter-trigger" id="open-filters" aria-label="Open filters">≡</button></div>
    <div class="chips" id="home-chips">${['For you', 'Today’s specials', 'Tiffin plans', 'Festival foods', 'Catering'].map(c => `<button class="chip ${state.activeChip === c ? 'active' : ''}" data-chip="${c}">${c}</button>`).join('')}</div>
    <section class="hero-card"><p class="eyebrow">Weekend table</p><h2>Sunday lunch, from a kitchen you’ll love.</h2><p>Scheduled for your table, prepared with care.</p><button class="pill-button" data-cook="meera">Meet Meera →</button></section>
    <div class="section-head"><h2>People near you</h2><button data-view-link="explore">See all</button></div>
    <div class="h-scroll">${featureKitchens}</div>
    <div class="section-head"><h2>Today’s specials</h2><button data-view-link="explore">See all</button></div>
    <div class="h-scroll">${specials}</div>
    <section class="section-head"><h2>Your week, sorted</h2></section>
    <article class="plan-card"><div class="plan-icon">☼</div><div><h3>Fresh tiffins, your rhythm</h3><p>Choose a cook. Pick your days. Pause any week.</p></div><button data-plan aria-label="Explore tiffin plans">→</button></article>
    <div class="section-head"><h2>Stories from the stove</h2><button data-stories>Read more</button></div>
    <div class="h-scroll">
      <article class="story-card" data-stories tabindex="0" role="button" aria-label="Read stories from the stove"><img src="${foodImages.story}" alt="Handmade dessert" loading="lazy"/><div class="card-copy"><h3>Why I still hand-grind my masalas</h3></div></article>
      <article class="story-card" data-stories tabindex="0" role="button" aria-label="Read stories from the stove"><img src="${foodImages.dosa}" alt="South Indian breakfast" loading="lazy"/><div class="card-copy"><h3>A tiffin ritual from Pollachi</h3></div></article>
      <article class="story-card" data-stories tabindex="0" role="button" aria-label="Read stories from the stove"><img src="${foodImages.sweets}" alt="Festival sweets" loading="lazy"/><div class="card-copy"><h3>My grandmother’s Diwali murukku</h3></div></article>
    </div>`;
}

function exploreView() {
  const term = state.search.trim().toLowerCase();
  const categoryMatch = (k) => ({
    All: true,
    Tamil: k.cuisine.includes('Tamil'),
    Bakery: k.cuisine.includes('Sourdough'),
    Tiffin: k.id === 'meera',
    Catering: k.id === 'shafi',
    Jain: k.id === 'meera'
  }[state.exploreCategory]);
  const visible = kitchens.filter(k => categoryMatch(k) && (!term || `${k.name} ${k.cook} ${k.cuisine} ${k.dishes.map(d => d.name).join(' ')}`.toLowerCase().includes(term)));
  return `
    <div class="screen-title"><h1>Explore kitchens</h1><button id="open-filters">Filter · ${state.activeFilters.length}</button></div>
    <div class="search-wrap"><span class="search-icon">⌕</span><input id="explore-search" value="${state.search}" placeholder="Cooks, dishes, bakery, tiffin…" aria-label="Search kitchens"/><button class="filter-trigger" id="clear-search" aria-label="Clear search">×</button></div>
    <div class="chips">${['All', 'Tamil', 'Bakery', 'Tiffin', 'Catering', 'Jain'].map(c => `<button class="chip ${c === state.exploreCategory ? 'active' : ''}" data-explore-category="${c}">${c}</button>`).join('')}</div>
    <div class="results-info"><span>${visible.length} trusted kitchens in your area</span><span>⌖ within 5 km</span></div>
    <section class="discover-map" aria-label="Map of nearby kitchens">
      <iframe title="Nearby kitchens in Coimbatore" src="https://www.openstreetmap.org/export/embed.html?bbox=76.9373%2C11.0015%2C76.9815%2C11.0329&amp;layer=mapnik&amp;marker=11.0168%2C76.9558" loading="lazy"></iframe>
      <div class="map-topline"><span>⌖ Nearby kitchens</span><span class="map-live">Live area</span></div>
      <button class="map-pin pin-one" data-cook="meera" aria-label="Open Meera's Kitchen">★</button>
      <button class="map-pin pin-two" data-cook="anitha" aria-label="Open Anitha Bakes">★</button>
      <button class="map-pin pin-three" data-cook="shafi" aria-label="Open Shafi's Table">★</button>
      <button class="map-address-button" id="open-location-map">Set exact address</button>
    </section>
    <section class="kitchen-list">${visible.map(k => `
      <article class="kitchen-row" data-cook="${k.id}" tabindex="0" role="button" aria-label="Open ${k.name}"><img src="${k.image}" alt="${k.name} food" loading="lazy"/><div class="kitchen-copy"><div><span class="tag">✓ Verified</span><h3>${k.name}</h3><p>${k.cuisine}</p></div><div class="kitchen-meta"><span>★ ${k.rating} (${k.reviews})</span><span>${k.distance}</span></div></div></article>`).join('') || '<div class="cart-empty"><div class="empty-icon">⌕</div><h2>No kitchens yet</h2><p>Try a cuisine, dish, or another neighbourhood.</p></div>'}</section>`;
}

function cartView() {
  if (!state.cart.length) return `<div class="screen-title"><h1>Your basket</h1></div><div class="cart-empty"><div class="empty-icon">♧</div><h2>Nothing delicious yet</h2><p>Meals here are prepared to your schedule, by people around you.</p><button class="primary-button" data-view-link="explore">Find a kitchen</button></div>`;
  const groups = state.cart.reduce((acc, item) => { (acc[item.dish.kitchen.id] ||= []).push(item); return acc; }, {});
  const subtotal = cartTotal(), delivery = 42, platform = 10;
  return `<div class="screen-title"><h1>Your basket</h1><button id="clear-cart">Clear</button></div>${Object.entries(groups).map(([id, items]) => {
    const k = kitchens.find(kitchen => kitchen.id === id);
    return `<section class="cart-card"><div class="cart-cook"><span>♨</span>${k.name}</div>${items.map(item => `<article class="cart-item"><img src="${item.dish.image}" alt="${item.dish.name}" loading="lazy"/><div><h3>${item.dish.name}</h3><p>${item.dish.tags.join(' · ')}</p><strong>${currency(item.dish.price)}</strong></div><div class="quantity"><button data-quantity="${item.dish.id}" data-amount="-1" aria-label="Decrease quantity of ${item.dish.name}">−</button><b>${item.quantity}</b><button data-quantity="${item.dish.id}" data-amount="1" aria-label="Increase quantity of ${item.dish.name}">+</button></div></article>`).join('')}</section>`;
  }).join('')}
  <section class="delivery-picker"><h3>When should it arrive?</h3><div class="delivery-options">${['Today · 6–7 pm', 'Tomorrow · 12:30–1:30 pm', 'Fri · 7–8 pm'].map(slot => `<button class="${state.delivery === slot ? 'selected' : ''}" data-delivery="${slot}">${slot.replace(' · ', '<br/>')}</button>`).join('')}</div></section>
  <section class="cost-breakdown"><div><span>Food total</span><span>${currency(subtotal)}</span></div><div><span>Kovai Delivery</span><span>${currency(delivery)}</span></div><div><span>Platform fee</span><span>${currency(platform)}</span></div><div class="total"><span>Total</span><span>${currency(subtotal + delivery + platform)}</span></div></section>
  <button class="primary-button checkout" id="checkout">Continue to payment · ${currency(subtotal + delivery + platform)}</button>`;
}

function ordersView() {
  return `<div class="screen-title"><h1>Your orders</h1></div>
    <section class="order-card"><header class="order-head"><div><h3>Meera’s Kitchen</h3><small>Tomorrow · 12:30–1:30 pm</small></div><span class="status">CONFIRMED</span></header><div class="order-content"><img class="order-image" src="${foodImages.thali}" alt="Lemon rice meal" loading="lazy"/><div><p>Lemon rice comfort box · 1</p><p>Custom: Less oil, please</p><strong>${currency(159)}</strong></div></div><footer class="order-actions"><button class="outline-button" data-chat="meera">Chat with Meera</button><button class="primary-button" data-track>Track order</button></footer></section>
    <section class="order-card"><header class="order-head"><div><h3>Anitha Bakes</h3><small>Delivered · 18 Jul 2026</small></div><span class="status">DELIVERED</span></header><div class="order-content"><img class="order-image" src="${foodImages.sweets}" alt="Sourdough bread" loading="lazy"/><div><p>Country sourdough loaf · 1</p><strong>${currency(210)}</strong></div></div><footer class="order-actions"><button class="outline-button" data-review="anitha">Leave a review</button><button class="primary-button" data-reorder="anitha-bread">Reorder</button></footer></section>
    <div class="section-head"><h2>Subscriptions</h2><button data-plan>Browse plans</button></div><article class="plan-card"><div class="plan-icon">◫</div><div><h3>Weekday lunch with Meera</h3><p>Mon–Fri · pauses automatically for holidays</p></div><button data-plan aria-label="Manage tiffin subscription">→</button></article>`;
}

function profileView() {
  return `<div class="profile-page"><div class="screen-title"><h1>Good afternoon, Asha</h1></div><section class="account-card"><div class="avatar-large">A</div><div><h3>Asha R.</h3><p>RS Puram · 420 Loom credits</p></div><button data-profile-action="account" aria-label="Open account details">›</button></section>
    <div class="settings-group"><button class="settings-row" data-profile-action="addresses"><span>⌖</span><strong>Addresses</strong><em>›</em></button><button class="settings-row" data-profile-action="favourites"><span>♡</span><strong>Favourite cooks</strong><em>›</em></button><button class="settings-row" data-profile-action="reviews"><span>★</span><strong>Reviews & photos</strong><em>›</em></button><button class="settings-row" data-profile-action="preferences"><span>◇</span><strong>Food preferences</strong><em>›</em></button><button class="settings-row" data-profile-action="payments"><span>◌</span><strong>Payments & credits</strong><em>›</em></button><button class="settings-row" id="dark-toggle"><span>◐</span><strong>Appearance</strong><em>System</em></button></div>
    <section class="role-switch"><p>Do you cook, bake or cater? Your kitchen can be part of Coimbatore’s next food story.</p><button id="start-selling">${state.store ? 'Manage your food store →' : 'Start selling food →'}</button></section>
    <section class="role-switch" style="background:#386a4b"><p>Platform team access: verify kitchens, resolve reports, and keep the community trusted.</p><button id="switch-admin">Open admin desk →</button></section></div>`;
}

function cookOverview(store) {
  return `<article class="alert-card"><span>◒</span><div><strong>Order cutoff in 48 min</strong><p>Tomorrow’s lunch closes at 8:00 pm. You have 3 spots left.</p></div></article>
    <section class="stats"><article class="stat"><small>Today’s orders</small><strong>12</strong><span class="up">↑ 20% from last Tue</span></article><article class="stat"><small>Today’s earnings</small><strong>₹2,340</strong><span class="up">↑ ₹420 from last Tue</span></article><article class="stat"><small>Repeat customers</small><strong>68%</strong><span class="up">↑ 6% this month</span></article><article class="stat"><small>Next payout</small><strong>₹8,460</strong><span class="up">Friday, 24 Jul</span></article></section>
    <div class="section-head"><h2>Your order calendar</h2><button data-cook-tool="calendar">Full calendar</button></div><div class="calendar-strip">${[['Tue','22'],['Wed','23'],['Thu','24'],['Fri','25'],['Sat','26'],['Sun','27']].map(([day,date], i) => `<button class="calendar-day ${i === 0 ? 'active' : ''}" data-cook-day="${day} ${date}"><small>${day}</small><strong>${date}</strong></button>`).join('')}</div>
    <div class="section-head"><h2>To prepare today</h2><button data-cook-tab="Orders">View all</button></div><section class="cart-card"><article class="cook-order"><div class="time">12:30</div><div><h3>Priya & family · 3 boxes</h3><p>${store.items[0]?.name || 'Your first dish'} · less oil</p></div><button data-status>Start prep</button></article><article class="cook-order"><div class="time">1:00</div><div><h3>Arun · 2 boxes</h3><p>Customer favourite · medium spice</p></div><button data-status>Start prep</button></article><article class="cook-order"><div class="time">7:30</div><div><h3>Oakley Studio · 18 boxes</h3><p>Bulk team lunch · advance paid</p></div><button data-status>Review</button></article></section>
    <div class="section-head"><h2>Kitchen pulse</h2><button data-cook-tool="analytics">Analytics</button></div><section class="plan-card"><div class="plan-icon">◔</div><div><h3>Low stock: ${store.items[0]?.name || 'Sakkarai pongal'}</h3><p>4 portions left. Pause the dish or raise today’s cap.</p></div><button data-stock aria-label="Manage stock for ${store.items[0]?.name || 'Sakkarai pongal'}">→</button></section>`;
}

function cookOrdersView() {
  return `<div class="section-head"><h2>All orders</h2><button data-cook-tool="calendar">Calendar</button></div><section class="cart-card"><article class="cook-order"><div class="time">12:30</div><div><h3>Priya & family · 3 boxes</h3><p>Confirmed · ₹477 · custom: less oil</p></div><button data-status>Start prep</button></article><article class="cook-order"><div class="time">1:00</div><div><h3>Arun · 2 boxes</h3><p>Confirmed · ₹318 · UPI paid</p></div><button data-status>Start prep</button></article><article class="cook-order"><div class="time">7:30</div><div><h3>Oakley Studio · 18 boxes</h3><p>Bulk request · ₹2,862 advance held</p></div><button data-cook-tool="orders">Review</button></article></section><div class="section-head"><h2>Fulfilment</h2></div><article class="plan-card"><div class="plan-icon">▣</div><div><h3>Recurring lunch slots</h3><p>Mon–Fri · 12:30 pm · 3 seats still open tomorrow.</p></div><button data-cook-tool="calendar">→</button></article>`;
}

function cookMenuView(store) {
  return `<div class="section-head"><h2>Your menu</h2><button id="add-menu-item">Add food item</button></div><section class="menu-manager">${store.items.map((item, index) => `<article class="menu-manager-row"><div><h3>${escapeHtml(item.name)}</h3><p>${currency(Number(item.price) || 0)} · ${item.active === false ? 'Hidden from customers' : 'Available today'}</p></div><button class="${item.active === false ? 'outline-button' : 'follow-button'}" data-toggle-item="${index}">${item.active === false ? 'Enable' : 'Pause'}</button></article>`).join('') || '<div class="cart-empty"><div class="empty-icon">♨</div><h2>List your first dish</h2><p>Add a food item, price and daily availability to open your menu.</p></div>'}</section><article class="plan-card"><div class="plan-icon">✦</div><div><h3>Smart price suggestion</h3><p>Use ingredient cost and prep time to set a healthy margin.</p></div><button data-price-assistant>→</button></article>`;
}

function cookCustomersView() {
  const feedback = reviewsFor(state.store ? 'seller-store' : 'meera');
  return `<div class="section-head"><h2>Your customers</h2><button data-customer-filter>Repeat first</button></div><section class="customer-list"><article><span class="customer-avatar">P</span><div><h3>Priya S.</h3><p>12 orders · 5-star regular</p></div><button data-customer="Priya">Message</button></article><article><span class="customer-avatar">A</span><div><h3>Arun M.</h3><p>8 orders · prefers medium spice</p></div><button data-customer="Arun">Message</button></article><article><span class="customer-avatar">O</span><div><h3>Oakley Studio</h3><p>New bulk customer · 18 boxes</p></div><button data-customer="Oakley Studio">Message</button></article></section><div class="section-head"><h2>Feedback inbox</h2><button data-cook-review-list>See all</button></div><div class="feedback-inbox">${(feedback.length ? feedback : [{ name: 'No reviews yet', stars: 0, text: 'New reviews from customers will appear here.', photoName: '' }]).slice(0, 2).map(review => `<article class="feedback-card"><strong>“${escapeHtml(review.text)}”</strong><span>${review.stars ? '★'.repeat(review.stars) : 'New kitchen'} · ${escapeHtml(review.name)}${review.photoName ? ' · photo attached' : ''}</span><button data-customer="${escapeHtml(review.name)}">Reply to feedback</button></article>`).join('')}</div>`;
}

function cookMoreView(store) {
  return `<div class="section-head"><h2>Run your kitchen</h2></div><section class="settings-group"><button class="settings-row" data-payout-ledger><span>₹</span><strong>Payout ledger</strong><em>›</em></button><button class="settings-row" data-cook-tool="calendar"><span>◷</span><strong>Availability & cutoff</strong><em>›</em></button><button class="settings-row" data-price-assistant><span>✦</span><strong>Pricing assistant</strong><em>›</em></button><button class="settings-row" data-inventory><span>▤</span><strong>Ingredient planning</strong><em>›</em></button><button class="settings-row" id="edit-store"><span>⌂</span><strong>Edit ${escapeHtml(store.name)}</strong><em>›</em></button></section><article class="payout-summary"><span>Next Friday payout</span><strong>₹8,460</strong><button data-payout-ledger>Open ledger →</button></article>`;
}

function cookView() {
  const store = activeStore();
  const views = { Overview: cookOverview(store), Orders: cookOrdersView(), Menu: cookMenuView(store), Customers: cookCustomersView(), More: cookMoreView(store) };
  return `<div class="dashboard-greeting"><div><p class="eyebrow">${escapeHtml(store.name)}</p><h1>Good morning,<br/>${escapeHtml(store.owner)}.</h1></div><button data-role="customer">Customer view</button></div>${views[state.cookTab]}<div class="cook-bottom-nav">${['Overview', 'Orders', 'Menu', 'Customers', 'More'].map(tab => `<button class="${state.cookTab === tab ? 'active' : ''}" data-cook-tab="${tab}">${tab}</button>`).join('')}</div>`;
}

function adminCases() {
  return {
    'Needs review': [
      { title: 'Kitchen verification · Lakshmi’s Snacks', status: 'NEW', body: 'FSSAI disclosure, bank payout details and four kitchen photos submitted today.', actions: [['approve', 'approved', 'Approve verification'], ['review', 'review', 'Review documents']] },
      { title: 'Kitchen verification · Anitha Bakes renewal', status: 'PENDING', body: 'Annual FSSAI renewal and updated payout details are awaiting a second review.', actions: [['approve', 'approved', 'Approve renewal'], ['review', 'review', 'Review documents']] }
    ],
    Hygiene: [
      { title: 'Quality report · Order #L-20844', status: 'FLAGGED', body: 'Customer reports packaging seal was open on delivery. Photo evidence included.', actions: [['review', 'review', 'Open case'], ['approve', 'resolved', 'Resolve']] },
      { title: 'Kitchen photo re-check · Shafi’s Table', status: 'DUE', body: 'Kitchen photos on file are 11 months old. Request a fresh hygiene photo set before renewal.', actions: [['review', 'review', 'Request photos'], ['approve', 'resolved', 'Mark reviewed']] }
    ],
    Orders: [
      { title: 'Bulk order exception · Oakley Studio', status: 'PENDING', body: '18 lunch boxes exceed Meera’s daily capacity. Advance payment is held.', actions: [['approve', 'approved', 'Approve capacity'], ['review', 'review', 'Contact cook']] },
      { title: 'Delivery delay · Order #L-20899', status: 'FLAGGED', body: 'Kovai Delivery reported a 40-minute delay on this order. The customer has been notified.', actions: [['review', 'review', 'View timeline'], ['approve', 'resolved', 'Resolve']] }
    ]
  };
}

function adminView() {
  const tabs = ['Needs review', 'Hygiene', 'Orders'];
  const cases = adminCases()[state.adminTab] || [];
  return `<div class="dashboard-greeting"><div><p class="eyebrow">LOOM trust desk</p><h1>Community,<br/>looked after.</h1></div><button data-role="customer">Exit desk</button></div>
    <section class="stats"><article class="stat"><small>Open reports</small><strong>7</strong><span class="up">3 need attention</span></article><article class="stat"><small>Verifications</small><strong>14</strong><span class="up">5 submitted today</span></article></section>
    <div class="admin-tabs">${tabs.map(tab => `<button class="${state.adminTab === tab ? 'active' : ''}" data-admin-tab="${tab}">${tab}</button>`).join('')}</div>
    <section>${cases.length ? cases.map(c => `<article class="moderation-row"><div class="mod-top"><h3>${c.title}</h3><span class="status">${c.status}</span></div><p>${c.body}</p><footer>${c.actions.map(([cls, action, label]) => `<button class="${cls}" data-admin="${action}">${label}</button>`).join('')}</footer></article>`).join('') : '<div class="cart-empty"><div class="empty-icon">▣</div><h2>All caught up</h2><p>Nothing needs attention in this queue right now.</p></div>'}</section>`;
}

function render() {
  if (state.role === 'cook') content.innerHTML = cookView();
  else if (state.role === 'admin') content.innerHTML = adminView();
  else if (state.view === 'explore') content.innerHTML = exploreView();
  else if (state.view === 'cart') content.innerHTML = cartView();
  else if (state.view === 'orders') content.innerHTML = ordersView();
  else if (state.view === 'profile') content.innerHTML = profileView();
  else content.innerHTML = homeView();
  $('.bottom-nav').classList.toggle('hidden', state.role !== 'customer');
  $('#assistant-button').classList.toggle('hidden', state.role !== 'customer');
  updateDeliveryAddress();
  setNav(state.view);
  updateCartBadge();
}

function openModal(innerHTML) { modalLayer.innerHTML = `<section class="modal">${innerHTML}</section>`; modalLayer.classList.add('visible'); }
function closeModal() { modalLayer.classList.remove('visible'); window.setTimeout(() => modalLayer.innerHTML = '', 180); }

function openFilters() {
  const filters = ['Within 2 km', 'Within 5 km', 'Within 8 km', 'Vegetarian', 'Vegan', 'Jain', 'Halal', 'Verified cooks', 'Tiffin plans', 'Bulk orders', 'Festival specials'];
  openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>Fine-tune your feed</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="filter-block"><h3>Delivery radius</h3><div class="option-grid">${filters.slice(0, 3).map(f => `<button class="option ${state.activeFilters.includes(f) ? 'selected' : ''}" data-filter="${f}">${f}</button>`).join('')}</div></div><div class="filter-block"><h3>Food & kitchen</h3><div class="option-grid">${filters.slice(3).map(f => `<button class="option ${state.activeFilters.includes(f) ? 'selected' : ''}" data-filter="${f}">${f}</button>`).join('')}</div></div><div class="modal-actions"><button class="outline-button" id="reset-filters">Reset</button><button class="primary-button" data-close>Show kitchens</button></div>`);
}

function reviewPreview(cookId) {
  const reviews = reviewsFor(cookId);
  if (!reviews.length) return `<div class="section-head"><h2>Customer reviews</h2><button data-review="${cookId}">Write first review</button></div><p class="review-empty">This new kitchen has no reviews yet.</p>`;
  return `<div class="section-head"><h2>Customer reviews</h2><button data-review="${cookId}">Write a review</button></div><article class="profile-review"><strong>${'★'.repeat(reviews[0].stars)} <span>${escapeHtml(reviews[0].name)}</span></strong><p>“${escapeHtml(reviews[0].text)}”</p>${reviews[0].photoName ? '<small>◧ Customer food photo attached</small>' : ''}</article>`;
}

function openReview(cookId) {
  const kitchen = kitchens.find(item => item.id === cookId);
  state.reviewDraft = { stars: 5, photoName: '' };
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">${escapeHtml(kitchen.name)}</p><h2>How was your meal?</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="review-stars" aria-label="Choose a rating">${[1, 2, 3, 4, 5].map(star => `<button class="${star <= 5 ? 'selected' : ''}" data-review-star="${star}" aria-label="${star} star rating">★</button>`).join('')}</div><label class="review-label" for="review-text">Tell neighbours what you loved</label><textarea id="review-text" maxlength="400" placeholder="Freshness, packaging, flavour, or a thoughtful detail…"></textarea><label class="photo-upload" for="review-photo"><span>◧</span><div><strong>Add a food photo</strong><small id="review-photo-status">Optional · helps neighbours order with confidence</small></div></label><input class="hidden" id="review-photo" type="file" accept="image/*"/><div class="modal-actions"><button class="primary-button" id="submit-review" data-review-cook="${cookId}">Post review</button></div>`);
}

function openReviewList(cookId) {
  const reviews = reviewsFor(cookId);
  openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>Customer feedback</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="review-list">${reviews.length ? reviews.map(review => `<article><strong>${'★'.repeat(review.stars)} <span>${escapeHtml(review.name)}</span></strong><p>“${escapeHtml(review.text)}”</p><small>${review.photoName ? '◧ Food photo attached' : 'Verified order'}</small></article>`).join('') : '<p class="review-empty">No customer reviews yet.</p>'}</div>`);
}

function submitReview(cookId) {
  const text = $('#review-text')?.value.trim();
  if (!text) return toast('Write a short note before posting your review');
  state.reviews.unshift({ cookId, name: 'Asha R.', stars: state.reviewDraft.stars, text, photoName: state.reviewDraft.photoName });
  saveReviews();
  closeModal();
  toast('Thanks — your review now helps neighbours choose');
}

function openCook(id) {
  const k = kitchens.find(kitchen => kitchen.id === id);
  const followText = state.followed.has(id) ? 'Following ✓' : 'Follow';
  openModal(`<div class="profile-hero"><img src="${k.image}" alt="${k.name}" loading="lazy"/><button class="close-button profile-close" data-close aria-label="Close">×</button><div class="cook-avatar"><img src="${k.avatar}" alt="${k.cook}" loading="lazy"/></div></div><div class="profile-body"><div class="profile-title"><div><h2>${k.name} <span style="color:#386a4b;font-family:DM Sans;font-size:16px">✓</span></h2><p>${k.cuisine} · ${k.distance} away</p></div><button class="follow-button" data-follow="${id}">${followText}</button></div><div class="trust-row"><div class="trust"><strong>★ ${k.rating}</strong><small>${k.reviews} neighbours</small></div><div class="trust"><strong>98%</strong><small>on-time handoffs</small></div><div class="trust"><strong>2 hrs</strong><small>order cutoff</small></div></div><p class="eyebrow">Meet ${k.cook.split(' ')[0]}</p><p class="bio">${k.bio}</p>${reviewPreview(id)}<div class="section-head"><h2>From the menu</h2><button data-chat="${id}">Chat</button></div>${k.dishes.map(d => `<article class="dish-row"><img src="${d.image}" alt="${d.name}" loading="lazy"/><div><h3>${d.name}</h3><p>${d.description}</p><strong>${currency(d.price)}</strong></div>${qtyControlHTML(d)}</article>`).join('')}<div class="modal-actions"><button class="outline-button" data-chat="${id}">Ask a question</button><button class="primary-button" data-add="${k.dishes[0].id}">Add a meal</button></div></div>`);
}

function openAssistant() {
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">Loom guide</p><h2>What are you in the mood for?</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="chat-list"><div class="bubble">I can find a cook for a calm vegan lunch, a last-minute birthday cake, or set up your weekday tiffins.</div><div class="bubble me">Something wholesome for two tomorrow?</div><div class="bubble">Meera’s Kitchen has a vegetarian comfort box open for tomorrow at 12:30 pm. It is 2.1 km away and has 7 portions left.</div></div><div class="option-grid"><button class="option" data-assist="tiffin">Set up tiffins</button><button class="option" data-assist="festival">Festival food</button><button class="option" data-assist="catering">Plan an event</button></div><div class="chat-compose"><input id="assistant-input" placeholder="Ask about food, cooks or plans"/><button id="assistant-send" aria-label="Send message">↑</button></div>`);
}

function openChat(cookId) {
  const k = kitchens.find(kitchen => kitchen.id === cookId);
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">${k.name}</p><h2>Chat with ${k.cook.split(' ')[0]}</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="chat-list" id="chat-list"><div class="bubble">Hi Asha! I can help with ingredient questions or a small custom request for your order.</div><div class="bubble me">Could you make the lemon rice a little less oily?</div><div class="bubble">Of course — I’ve noted that for you. 🌿</div></div><div class="chat-compose"><input id="chat-input" placeholder="Write a message"/><button id="chat-send" aria-label="Send message">↑</button></div>`);
}

function openLocation() {
  openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>Where should we deliver?</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="location-map"><iframe title="Choose delivery address in Coimbatore" src="https://www.openstreetmap.org/export/embed.html?bbox=76.9373%2C11.0015%2C76.9815%2C11.0329&amp;layer=mapnik&amp;marker=11.0168%2C76.9558" loading="lazy"></iframe><span class="location-marker">⌖</span></div><div class="filter-block"><label class="address-label" for="exact-address">Your exact delivery address</label><input id="exact-address" class="address-input" value="${escapeHtml(state.address)}" autocomplete="street-address" placeholder="House / flat, street, landmark"/><p class="address-hint">Add a flat number and landmark so your cook and Kovai Delivery can find you easily.</p><div class="option-grid"><button class="option selected" data-location="RS Puram, Coimbatore">RS Puram</button><button class="option" data-location="Race Course, Coimbatore">Race Course</button><button class="option" data-location="Saibaba Colony, Coimbatore">Saibaba Colony</button><button class="option" data-location="Peelamedu, Coimbatore">Peelamedu</button></div></div><div class="modal-actions"><button class="primary-button" id="confirm-address">Save delivery address</button></div>`);
}

function syncSellerDraft() {
  const name = $('#seller-store-name');
  const owner = $('#seller-owner-name');
  const area = $('#seller-store-area');
  if (!name || !owner || !area) return;
  state.sellerDraft = {
    name: name.value,
    owner: owner.value,
    area: area.value,
    items: $$('.seller-menu-row', modalLayer).map(row => ({ name: $('[data-seller-dish]', row).value, price: $('[data-seller-price]', row).value, active: true }))
  };
}

function openSellerOnboarding(editing = false) {
  if (editing && state.store) state.sellerDraft = { ...state.store, items: state.store.items.map(item => ({ ...item })) };
  const draft = state.sellerDraft;
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">${editing ? 'Your food store' : 'Sell with LOOM'}</p><h2>${editing ? 'Edit your kitchen' : 'Open your food store'}</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><p class="seller-intro">Create your kitchen profile and list your first dishes. You control price, availability and daily capacity.</p><div class="seller-form"><label for="seller-store-name">Kitchen or store name</label><input id="seller-store-name" value="${escapeHtml(draft.name)}" placeholder="e.g. Asha’s Sunday Kitchen"/><label for="seller-owner-name">Your name</label><input id="seller-owner-name" value="${escapeHtml(draft.owner)}" placeholder="Your name"/><label for="seller-store-area">Kitchen area</label><input id="seller-store-area" value="${escapeHtml(draft.area)}" placeholder="Area in Coimbatore"/></div><div class="section-head seller-head"><h2>Your food items</h2><button id="add-menu-row">+ Add item</button></div><div class="seller-menu-list">${draft.items.map((item, index) => `<div class="seller-menu-row"><input data-seller-dish aria-label="Food item ${index + 1}" value="${escapeHtml(item.name)}" placeholder="Dish name"/><div><span>₹</span><input data-seller-price type="number" min="1" inputmode="numeric" aria-label="Price for food item ${index + 1}" value="${escapeHtml(String(item.price))}" placeholder="Price"/></div></div>`).join('')}</div><p class="seller-note">Your store will be visible to nearby customers after basic kitchen verification.</p><div class="modal-actions"><button class="primary-button" id="publish-store">${editing ? 'Save store changes' : 'Open my store'}</button></div>`);
}

function publishStore() {
  syncSellerDraft();
  const draft = state.sellerDraft;
  const items = draft.items.map(item => ({ ...item, name: item.name.trim(), price: Number(item.price), active: item.active !== false })).filter(item => item.name && Number.isFinite(item.price) && item.price > 0);
  if (!draft.name.trim() || !draft.owner.trim() || !draft.area.trim() || !items.length) return toast('Add your kitchen name, area and at least one priced food item');
  state.store = { name: draft.name.trim(), owner: draft.owner.trim(), area: draft.area.trim(), items };
  saveSellerStore();
  registerStoreForDiscovery();
  state.role = 'cook';
  state.cookTab = 'Menu';
  closeModal();
  render();
  toast(`${state.store.name} is now open on LOOM`);
}

function openPayoutLedger() {
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">Weekly settlement</p><h2>Payout ledger</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="ledger-summary"><span>Next payout · Fri, 24 Jul</span><strong>₹8,460</strong><small>After delivery and platform splits</small></div><div class="ledger-list"><article><div><strong>Order L-20912</strong><small>Priya S. · Lemon rice boxes</small></div><span>₹405</span></article><article><div><strong>Order L-20915</strong><small>Arun M. · Idli & sambar</small></div><span>₹276</span></article><article><div><strong>Order L-20919</strong><small>Oakley Studio · Bulk lunch advance</small></div><span>₹2,433</span></article></div><div class="payout-split"><div><span>Customer paid</span><strong>₹9,480</strong></div><div><span>Kovai Delivery</span><strong>− ₹630</strong></div><div><span>LOOM platform fee</span><strong>− ₹390</strong></div></div><div class="modal-actions"><button class="outline-button" data-statement>Download statement</button><button class="primary-button" data-close>Done</button></div>`);
}

function openPriceAssistant() {
  openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>Pricing assistant</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="seller-form"><label for="ingredient-cost">Ingredient cost per portion</label><input id="ingredient-cost" type="number" value="72" inputmode="numeric"/><label for="prep-minutes">Prep time in minutes</label><input id="prep-minutes" type="number" value="38" inputmode="numeric"/><label for="target-margin">Target margin</label><input id="target-margin" type="number" value="35" inputmode="numeric"/></div><article class="price-result"><span>Suggested menu price</span><strong id="suggested-price">₹159</strong><small>Covers ingredients, prep time and a 35% target margin.</small></article><div class="modal-actions"><button class="primary-button" id="apply-price">Use ₹159 for a dish</button></div>`);
}

function openInventory() {
  openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>Ingredient planning</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="inventory-list"><article><span>Rice</span><strong>3.6 kg</strong><small>For 18 confirmed portions</small></article><article><span>Fresh lemons</span><strong>24</strong><small>For tomorrow’s lunch slots</small></article><article><span>Toor dal</span><strong>1.2 kg</strong><small>Includes bulk lunch buffer</small></article></div><div class="modal-actions"><button class="outline-button" data-shopping-list>Share shopping list</button><button class="primary-button" data-close>Done</button></div>`);
}

function openCustomerMessage(name) {
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">Customer thread</p><h2>${escapeHtml(name)}</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="chat-list" id="customer-chat"><div class="bubble">Hi! I’m looking forward to my order. Please keep the spice medium.</div></div><div class="chat-compose"><input id="customer-message" placeholder="Reply to ${escapeHtml(name)}"/><button id="customer-send" aria-label="Send message">↑</button></div>`);
}

function openStories() {
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">From our cooks</p><h2>Stories from the stove</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="story-feed"><article><img src="${foodImages.story}" alt="Freshly prepared dessert" loading="lazy"/><div><h3>Why I still hand-grind my masalas</h3><p>Meera on flavour, patience and recipes that travel through families.</p></div></article><article><img src="${foodImages.dosa}" alt="Tiffin meal" loading="lazy"/><div><h3>A tiffin ritual from Pollachi</h3><p>A quiet breakfast tradition built for busy weekday mornings.</p></div></article><article><img src="${foodImages.sweets}" alt="Festival sweets" loading="lazy"/><div><h3>My grandmother’s Diwali murukku</h3><p>Anitha shares the first batch she makes every festival season.</p></div></article></div>`);
}

function syncPlanDays() {
  const dayButtons = $$('.option[data-plan-day]', modalLayer);
  if (!dayButtons.length) return;
  state.planDraft.days = dayButtons.filter(button => button.classList.contains('selected')).map(button => button.dataset.planDay);
}

function planCook() { return kitchens.find(k => k.id === state.planDraft.cookId) || kitchens[0]; }

function openPlan() {
  const cook = planCook();
  const days = state.planDraft.days;
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">Weekly tiffin plan</p><h2>Lunch, on your rhythm.</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="plan-builder"><div class="plan-icon">☼</div><h3>${cook.cook.split(' ')[0]}’s weekday comfort plan</h3><p>Choose the days you need. Each delivery is prepared fresh after you confirm your slot.</p><div class="plan-cook-row"><div><small>Cooking with</small><strong>${cook.name}</strong></div><button class="outline-button" id="find-plan-cook">Find a cook</button></div><div class="option-grid">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => `<button class="option ${days.includes(day) ? 'selected' : ''}" data-plan-day="${day}">${day}</button>`).join('')}</div><div class="plan-price">${planPriceRow(cook, days)}</div></div><div class="modal-actions"><button class="primary-button" id="save-plan">Start this plan</button></div>`);
}

function planPriceRow(cook, days) {
  return `<span>${days.length} lunch${days.length === 1 ? '' : 'es'} per week</span><strong>${currency(cook.dishes[0].price * days.length)} / week</strong>`;
}

function openPlanCookPicker() {
  const days = state.planDraft.days;
  const summary = days.length ? days.join(', ') : 'No days selected yet';
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">${summary}</p><h2>Find a cook for your plan</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="favourite-list">${kitchens.map(k => `<button class="favourite-row" data-select-plan-cook="${k.id}"><img src="${k.avatar}" alt="${k.cook}" loading="lazy"/><span><strong>${k.name}</strong><small>${k.cuisine} · ${k.distance}</small></span><em>${k.id === state.planDraft.cookId ? '✓' : '›'}</em></button>`).join('')}</div>`);
}

function openTodaySpecials() {
  const specials = [
    { dish: kitchens[0].dishes[0], cook: 'Meera’s Kitchen', left: '7 portions left' },
    { dish: kitchens[2].dishes[0], cook: 'Shafi’s Table', left: '5 portions left' },
    { dish: kitchens[1].dishes[1], cook: 'Anitha Bakes', left: '4 portions left' }
  ];
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">Cooked in small batches</p><h2>Today’s specials</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="special-list">${specials.map(({ dish, cook, left }) => `<article><img src="${dish.image}" alt="${dish.name}" loading="lazy"/><div><span>${left}</span><h3>${dish.name}</h3><p>${cook} · ${currency(dish.price)}</p></div>${qtyControlHTML(dish)}</article>`).join('')}</div>`);
}

function openFestivalFoods() {
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">Seasonal table</p><h2>Festival foods</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="festival-hero"><img src="${foodImages.sweets}" alt="South Indian festival sweets" loading="lazy"/><div><span>Next up · Aadi specials</span><h3>Handmade sweets, savories & gifting boxes</h3><p>Pre-order from local cooks before their small-batch slots fill up.</p></div></div><div class="festival-grid"><button data-cook="meera"><span>🥣</span><strong>Pongal classics</strong><small>Meera’s Kitchen</small></button><button data-cook="anitha"><span>🍬</span><strong>Sweet boxes</strong><small>Anitha Bakes</small></button><button data-cook="shafi"><span>✦</span><strong>Celebration feasts</strong><small>Shafi’s Table</small></button></div><div class="modal-actions"><button class="primary-button" data-festival-reminder>Remind me when slots open</button></div>`);
}

function openCatering() {
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">Office & event orders</p><h2>Plan a group meal</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><p class="seller-intro">Tell us a few details and the right cooks can confirm capacity, menu and advance payment.</p><div class="seller-form"><label for="catering-guests">How many people?</label><input id="catering-guests" type="number" min="10" value="20" inputmode="numeric"/><label for="catering-date">Delivery date</label><input id="catering-date" type="date" value="2026-07-25"/><label for="catering-notes">What are you planning?</label><input id="catering-notes" placeholder="Office lunch, birthday, housewarming…"/></div><div class="option-grid" style="margin-top:15px"><button class="option selected" data-catering-cuisine="South Indian">South Indian</button><button class="option" data-catering-cuisine="Bakery">Bakery</button><button class="option" data-catering-cuisine="Mixed menu">Mixed menu</button></div><div class="modal-actions"><button class="primary-button" id="submit-catering">Request quotes</button></div>`);
}

function openHomeCategory(chip) {
  state.activeChip = chip;
  render();
  if (chip === 'Today’s specials') return openTodaySpecials();
  if (chip === 'Tiffin plans') return openPlan();
  if (chip === 'Festival foods') return openFestivalFoods();
  if (chip === 'Catering') return openCatering();
}

function openProfileAction(action) {
  if (action === 'addresses') return openLocation();
  if (action === 'favourites') {
    const favourites = kitchens.filter(k => state.followed.has(k.id));
    return openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>Favourite cooks</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="favourite-list">${(favourites.length ? favourites : kitchens.slice(0, 2)).map(k => `<button class="favourite-row" data-cook="${k.id}"><img src="${k.avatar}" alt="${k.cook}" loading="lazy"/><span><strong>${k.name}</strong><small>${state.followed.has(k.id) ? 'Following · slot alerts on' : 'Tap to meet this cook'}</small></span><em>›</em></button>`).join('')}</div>`);
  }
  if (action === 'reviews') {
    const mine = state.reviews.filter(review => review.name === 'Asha R.');
    return openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">Your community voice</p><h2>Reviews & photos</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><p class="seller-intro">Your thoughtful reviews help neighbours find food they’ll love.</p><div class="review-list">${mine.length ? mine.map(review => `<article><strong>${'★'.repeat(review.stars)} <span>${escapeHtml(review.cookId === 'anitha' ? 'Anitha Bakes' : review.cookId === 'meera' ? 'Meera’s Kitchen' : 'LOOM kitchen')}</span></strong><p>“${escapeHtml(review.text)}”</p><small>${review.photoName ? '◧ Food photo attached' : 'Verified order review'}</small></article>`).join('') : '<p class="review-empty">You have not reviewed an order yet.</p>'}</div><div class="modal-actions"><button class="primary-button" data-review="anitha">Review your Anitha Bakes order</button></div>`);
  }
  if (action === 'preferences') return openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>Food preferences</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="filter-block"><p style="color:var(--muted);font-size:13px;line-height:1.5">We’ll use these to make the kitchen feed more useful.</p><div class="option-grid">${['Vegetarian', 'Vegan', 'Jain friendly', 'Egg okay', 'Mild spice', 'Gluten aware'].map((item, index) => `<button class="option ${index < 2 ? 'selected' : ''}" data-preference="${item}">${item}</button>`).join('')}</div></div><div class="modal-actions"><button class="primary-button" id="save-preferences">Save preferences</button></div>`);
  if (action === 'payments') return openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>Payments & credits</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="payment-card"><span class="payment-mark">UPI</span><div><strong>asha@okaxis</strong><small>Default payment method</small></div><span class="status">ACTIVE</span></div><div class="credit-card"><small>LOOM CREDITS</small><strong>₹420</strong><p>Apply automatically at checkout when you choose.</p></div><div class="modal-actions"><button class="outline-button" data-add-payment>Add payment method</button><button class="primary-button" data-close>Done</button></div>`);
  return openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>Your account</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="account-details"><div class="avatar-large">A</div><h3>Asha R.</h3><p>Member since July 2026 · RS Puram, Coimbatore</p><button class="outline-button" data-account-edit>Edit profile details</button></div>`);
}

function openCookTool(tool) {
  const contentByTool = {
    calendar: ['Order calendar', 'Your next seven days have 36 confirmed meals, 3 open lunch slots and 1 bulk-order review.', 'Open availability'],
    orders: ['All kitchen orders', '12 meals are due today. The newest order is a bulk lunch for Oakley Studio, already advance-paid.', 'Review bulk order'],
    analytics: ['Kitchen analytics', 'This month: ₹28,460 in sales, 68% repeat customers, and lemon rice is your best seller.', 'View payout ledger']
  };
  const [title, copy, action] = contentByTool[tool];
  openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>${title}</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="insight-card"><span>◔</span><p>${copy}</p></div><div class="modal-actions"><button class="primary-button" data-cook-tool-action="${tool}">${action}</button></div>`);
}

function openTracking() {
  openModal(`<div class="modal-handle"></div><div class="modal-top"><div><p class="eyebrow">Order L-20912</p><h2>Your meal is on schedule</h2></div><button class="close-button" data-close aria-label="Close">×</button></div><div class="tracking-map"><iframe title="Kovai Delivery route" src="https://www.openstreetmap.org/export/embed.html?bbox=76.9460%2C11.0050%2C76.9665%2C11.0255&amp;layer=mapnik" loading="lazy"></iframe></div><div class="tracking-steps"><div class="done"><span>✓</span><p><strong>Meera confirmed your meal</strong><small>10:15 am</small></p></div><div class="current"><span>2</span><p><strong>Preparing for pickup</strong><small>Packaging proof will appear here</small></p></div><div><span>3</span><p><strong>Kovai Delivery is on its way</strong><small>Estimated 12:30–1:30 pm</small></p></div></div></div>`);
}

function openCheckout() {
  const total = cartTotal() + 52;
  openModal(`<div class="modal-handle"></div><div class="modal-top"><h2>One last step</h2><button class="close-button" data-close aria-label="Close">×</button></div><div class="filter-block"><p style="color:var(--muted);font-size:13px;line-height:1.5">Your food is scheduled for <strong style="color:var(--ink)">${state.delivery}</strong>. We’ll share sealed-packaging proof before Kovai Delivery collects it.</p><h3>Pay with</h3><div class="option-grid"><button class="option selected" data-payment="UPI · asha@okaxis">UPI · asha@okaxis</button><button class="option" data-payment="Card">Card</button><button class="option" data-payment="Pay advance">Pay advance</button></div></div><div class="modal-actions"><button class="primary-button" id="place-order">Place order · ${currency(total)}</button></div>`);
}

document.addEventListener('click', event => {
  const target = event.target.closest('button, article[data-cook], article[data-stories]');
  if (!target) return;
  const { cook, add, view, viewLink, quantity, amount, delivery, role, chat, follow, filter, reorder, admin, chip, exploreCategory, stories, profileAction, cookTool, cookDay, cookTab, adminTab, payment, planDay, preference, cookToolAction, toggleItem, customer, review, reviewStar } = target.dataset;
  if (target.matches('[data-close]')) return closeModal();
  if (cook) return openCook(cook);
  if (add) return addDish(add);
  if (view) { state.view = view; state.role = 'customer'; return render(); }
  if (viewLink) { state.view = viewLink; return render(); }
  if (quantity) return changeQuantity(quantity, Number(amount));
  if (delivery) { state.delivery = delivery; return render(); }
  if (role) { state.role = role; state.view = 'home'; closeModal(); return render(); }
  if (chat) return openChat(chat);
  if (follow) { state.followed.has(follow) ? state.followed.delete(follow) : state.followed.add(follow); openCook(follow); toast(state.followed.has(follow) ? 'You’ll hear when new slots open' : 'Unfollowed this kitchen'); return; }
  if (filter) { target.classList.toggle('selected'); state.activeFilters = $$('.option.selected', modalLayer).map(b => b.dataset.filter).filter(Boolean); return; }
  if (reorder) { addDish(reorder); state.view = 'cart'; return render(); }
  if (review) return openReview(review);
  if (reviewStar) { state.reviewDraft.stars = Number(reviewStar); $$('.review-stars button', modalLayer).forEach(button => button.classList.toggle('selected', Number(button.dataset.reviewStar) <= state.reviewDraft.stars)); return; }
  if (admin) return toast(admin === 'approved' ? 'Case approved and team notified' : admin === 'resolved' ? 'Report resolved with a customer update' : 'Opening review details');
  if (chip) return openHomeCategory(chip);
  if (exploreCategory) { state.exploreCategory = exploreCategory; return render(); }
  if (stories !== undefined) return openStories();
  if (profileAction) return openProfileAction(profileAction);
  if (cookTool) return openCookTool(cookTool);
  if (cookDay) { $$('.calendar-day').forEach(button => button.classList.toggle('active', button.dataset.cookDay === cookDay)); return toast(`${cookDay} selected in your order calendar`); }
  if (cookTab) { state.cookTab = cookTab; return render(); }
  if (adminTab) { state.adminTab = adminTab; return render(); }
  if (payment) { $$('.option[data-payment]', modalLayer).forEach(button => button.classList.toggle('selected', button.dataset.payment === payment)); return toast(`${payment} selected for this order`); }
  if (planDay) {
    target.classList.toggle('selected');
    syncPlanDays();
    const priceBlock = $('.plan-price', modalLayer);
    if (priceBlock) priceBlock.innerHTML = planPriceRow(planCook(), state.planDraft.days);
    return;
  }
  if (preference) { target.classList.toggle('selected'); return; }
  if (cookToolAction) { if (cookToolAction === 'analytics') return openPayoutLedger(); if (cookToolAction === 'orders') { closeModal(); state.cookTab = 'Orders'; return render(); } return toast(toolActionMessage(cookToolAction)); }
  if (toggleItem !== undefined) { if (!state.store) return toast('Open your own store to manage its menu'); const item = state.store.items[Number(toggleItem)]; item.active = !item.active; saveSellerStore(); registerStoreForDiscovery(); return render(); }
  if (customer) return openCustomerMessage(customer);
  if (target.id === 'open-filters') return openFilters();
  if (target.id === 'clear-search') { state.search = ''; return render(); }
  if (target.id === 'clear-cart') { state.cart = []; updateCartBadge(); return render(); }
  if (target.id === 'checkout') return openCheckout();
  if (target.id === 'place-order') { state.cart = []; updateCartBadge(); closeModal(); state.view = 'orders'; render(); return toast('Order confirmed — Meera has been notified'); }
  if (target.id === 'switch-cook') { state.role = 'cook'; return render(); }
  if (target.id === 'start-selling') return state.store ? (state.role = 'cook', state.cookTab = 'Menu', render()) : openSellerOnboarding();
  if (target.id === 'edit-store') return openSellerOnboarding(true);
  if (target.id === 'add-menu-item') return openSellerOnboarding(true);
  if (target.id === 'add-menu-row') { syncSellerDraft(); state.sellerDraft.items.push({ name: '', price: '', active: true }); return openSellerOnboarding(); }
  if (target.id === 'publish-store') return publishStore();
  if (target.id === 'switch-admin') { state.role = 'admin'; return render(); }
  if (target.id === 'profile-button') { state.view = 'profile'; state.role = 'customer'; return render(); }
  if (target.id === 'location-button' || target.id === 'open-location-map') return openLocation();
  if (target.id === 'assistant-button') return openAssistant();
  if (target.id === 'dark-toggle') { document.documentElement.classList.toggle('force-dark'); return toast('Appearance follows your device setting'); }
  if (target.id === 'reset-filters') { state.activeFilters = []; return openFilters(); }
  if (target.dataset.plan !== undefined) return openPlan();
  if (target.dataset.track !== undefined) return openTracking();
  if (target.dataset.status !== undefined) { target.textContent = 'Preparing ✓'; return toast('Customer has been updated'); }
  if (target.dataset.stock !== undefined) return toast('Sakkarai pongal is now paused for new orders');
  if (target.dataset.festivalReminder !== undefined) return toast('We’ll remind you when festival slots open');
  if (target.dataset.cateringCuisine !== undefined) { $$('.option[data-catering-cuisine]', modalLayer).forEach(button => button.classList.toggle('selected', button === target)); return; }
  if (target.dataset.payoutLedger !== undefined) return openPayoutLedger();
  if (target.dataset.priceAssistant !== undefined) return openPriceAssistant();
  if (target.dataset.inventory !== undefined) return openInventory();
  if (target.dataset.customerFilter !== undefined) return toast('Customers are sorted by repeat order rate');
  if (target.dataset.feedback !== undefined) return toast('Reply thread opened for Priya S.');
  if (target.dataset.cookReviewList !== undefined) return openReviewList(state.store ? 'seller-store' : 'meera');
  if (target.dataset.statement !== undefined) return toast('Your weekly statement is ready to download');
  if (target.dataset.shoppingList !== undefined) return toast('Shopping list is ready to share');
  if (target.dataset.location !== undefined) { $$('.option[data-location]', modalLayer).forEach(b => b.classList.remove('selected')); target.classList.add('selected'); const input = $('#exact-address'); if (input) input.value = target.dataset.location; }
  if (target.id === 'confirm-address') { const input = $('#exact-address'); const address = input?.value.trim(); if (!address) return toast('Please add your delivery address'); state.address = address; updateDeliveryAddress(); closeModal(); return toast('Delivery address saved'); }
  if (target.dataset.assist !== undefined) { state.view = target.dataset.assist === 'catering' ? 'explore' : 'home'; closeModal(); render(); return toast('Here are a few thoughtful matches'); }
  if (target.id === 'chat-send') { const input = $('#chat-input'); if (input && input.value.trim()) { appendBubble('#chat-list', input.value.trim()); input.value = ''; } return; }
  if (target.id === 'assistant-send') { const input = $('#assistant-input'); if (input && input.value.trim()) { toast('I’m finding the best match near you'); input.value = ''; } return; }
  if (target.id === 'customer-send') { const input = $('#customer-message'); if (input && input.value.trim()) { appendBubble('#customer-chat', input.value.trim()); input.value = ''; } return; }
  if (target.id === 'find-plan-cook') { syncPlanDays(); return openPlanCookPicker(); }
  if (target.dataset.selectPlanCook) {
    state.planDraft.cookId = target.dataset.selectPlanCook;
    const picked = planCook();
    openPlan();
    return toast(`${picked.name} selected for your tiffin plan`);
  }
  if (target.id === 'save-plan') {
    syncPlanDays();
    const cook = planCook();
    const days = state.planDraft.days;
    closeModal();
    if (!days.length) return toast('Pick at least one day for your plan');
    return toast(`${cook.cook.split(' ')[0]}’s weekday plan is now active · ${days.length} lunch${days.length === 1 ? '' : 'es'}/week`);
  }
  if (target.id === 'submit-catering') { const guests = $('#catering-guests')?.value || 'your'; closeModal(); return toast(`Quote request sent for ${guests} guests`); }
  if (target.id === 'save-preferences') { closeModal(); return toast('Your food preferences have been saved'); }
  if (target.id === 'submit-review') return submitReview(target.dataset.reviewCook);
  if (target.id === 'apply-price') { closeModal(); state.cookTab = 'Menu'; render(); return toast('₹159 is ready to apply to a menu item'); }
  if (target.dataset.addPayment !== undefined) return toast('A secure payment-method form is ready for your details');
  if (target.dataset.accountEdit !== undefined) return toast('Profile editing is ready to continue');
  return toast('That option is ready to use');
});

document.addEventListener('input', event => {
  if (event.target.id === 'main-search' || event.target.id === 'explore-search') { state.search = event.target.value; if (event.target.id === 'explore-search') render(); }
});

document.addEventListener('change', event => {
  if (event.target.id === 'review-photo') { state.reviewDraft.photoName = event.target.files?.[0]?.name || ''; const status = $('#review-photo-status'); if (status) status.textContent = state.reviewDraft.photoName ? `${state.reviewDraft.photoName} ready to attach` : 'Optional · helps neighbours order with confidence'; }
});

document.addEventListener('keydown', event => {
  const chatInput = $('#chat-input'); const assistantInput = $('#assistant-input');
  if (event.key === 'Enter' && chatInput && document.activeElement === chatInput && chatInput.value.trim()) { appendBubble('#chat-list', chatInput.value.trim()); chatInput.value = ''; }
  if (event.key === 'Enter' && assistantInput && document.activeElement === assistantInput && assistantInput.value.trim()) { toast('I’m looking for kitchens that match that'); assistantInput.value = ''; }
  if (event.key === 'Enter' || event.key === ' ') {
    const card = event.target.closest('article[data-cook], article[data-stories]');
    if (card) { event.preventDefault(); card.click(); }
  }
});

function appendBubble(selector, text) { const list = $(selector); list.insertAdjacentHTML('beforeend', `<div class="bubble me">${text.replace(/[<>]/g, '')}</div>`); list.scrollTop = list.scrollHeight; }
function toolActionMessage(tool) { return ({ calendar: 'Availability editor opened for your next service days', orders: 'Bulk order review is ready for Oakley Studio', analytics: 'Payout ledger is ready to review' })[tool]; }
modalLayer.addEventListener('click', event => { if (event.target === modalLayer) closeModal(); });
render();
