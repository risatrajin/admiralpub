/* ═══════════════════════════════════════════
   ADMIRAL PUB — MENU LOADER (Google Sheets CMS)
   Fetches food & drink data from the Menu sheet
   and renders it into menu.html dynamically.
═══════════════════════════════════════════ */

const MENU_CONFIG = {
  SPREADSHEET_ID: '1LuesM2Dm2LMp2uoNdYbNmf730fMToPPICQbLWG9W5uU',
  SHEET_NAME: 'Menu',
  API_KEY: 'AIzaSyC7tNSWriQdcBeG5NnCDa2EMFqQIXbYt6E',
  CACHE_KEY: 'admiral_menu_cache',
  CACHE_DURATION: 60 * 1000 // 1 min fallback only
};

/* ── Slug / display maps ── */
const FOOD_CAT_SLUG = {
  'Share Plates':  'share-plates',
  'Salads & Soup': 'salads-soup',
  'Handhelds':     'handhelds',
  'Pizza':         'pizza',
  'Pasta':         'pasta',
  'Curry':         'curry',
  'Mains':         'mains',
  'Desserts':      'desserts'
};

const FOOD_CAT_TITLE = {
  'Pizza':    'House Made Thin Crust Pizza',
  'Pasta':    'Pasta De La Casa',
  'Curry':    "Chef's Curry Table",
  'Mains':    'Mains — All Day'
};

const FOOD_ORDER  = ['Share Plates','Salads & Soup','Handhelds','Pizza','Pasta','Curry','Mains','Desserts'];
const DRINK_ORDER = ['On Tap','Cocktails','Martinis','Beer by the Bottle','Ciders & Coolers','Wine by the Glass','Wine by the Bottle','Spirits','Non-Alcoholic'];
const DRINK_SLUG  = {
  'On Tap':              'on-tap',
  'Cocktails':           'cocktails',
  'Martinis':            'martinis',
  'Beer by the Bottle':  'beer-bottle',
  'Ciders & Coolers':    'ciders',
  'Wine by the Glass':   'wine',
  'Wine by the Bottle':  'wine',
  'Spirits':             'spirits',
  'Non-Alcoholic':       'non-alc'
};
const DRINK_ICON = {
  'On Tap':              'fa-beer-mug-empty',
  'Cocktails':           'fa-martini-glass',
  'Martinis':            'fa-martini-glass-citrus',
  'Beer by the Bottle':  'fa-wine-bottle',
  'Ciders & Coolers':    'fa-apple-whole',
  'Wine by the Glass':   'fa-wine-glass',
  'Wine by the Bottle':  'fa-wine-glass',
  'Spirits':             'fa-whiskey-glass',
  'Non-Alcoholic':       'fa-droplet'
};
const COMPACT_CATS = new Set(['Beer by the Bottle','Ciders & Coolers','Non-Alcoholic','Wine by the Bottle']);
const WINE_SUBCAT_ORDER = ['White','Red','Sparkling'];
const SPIRITS_ORDER = ['Whisky & Bourbon','Scotch','Gin','Tequila & Mezcal','Vodka','Rum','Brandy'];

/* ── Price formatter ── */
function fmt(p) {
  if (p === '' || p == null) return '';
  const n = parseFloat(p);
  if (isNaN(n)) return '';
  return '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}

/* ── Tag helpers ── */
function tagInName(tag) {
  switch ((tag || '').toLowerCase()) {
    case 'canadian': return ' <span class="mic-tag ca-tag">🍁 Canadian</span>';
    case 'spicy':    return ' <span class="spicy-icon">🌶️</span>';
    default:         return '';
  }
}
function tagBelow(tag) {
  switch ((tag || '').toLowerCase()) {
    case 'veg':        return '<span class="mic-tag veg-tag"><i class="fa-solid fa-seedling"></i> Veg</span>';
    case 'happy hour': return '<span class="mic-tag hh-tag"><i class="fa-solid fa-clock"></i> Happy Hour</span>';
    case 'signature':  return '<span class="mic-tag sig-tag">⚓ Signature</span>';
    default:           return '';
  }
}

/* ── Standard menu-item-card ── */
function buildCard(item, compact) {
  const cls = 'menu-item-card' + (compact ? ' compact' : '') + (item.tag?.toLowerCase() === 'spicy' ? ' spicy' : '');
  const priceHTML = buildPriceHTML(item);
  return `<div class="${cls}">
      <div class="mic-body">
        <div class="mic-name">${item.name}${tagInName(item.tag)}</div>
        ${item.desc ? `<div class="mic-desc">${item.desc}</div>` : ''}
        ${tagBelow(item.tag)}
      </div>
      ${priceHTML ? `<div class="mic-price">${priceHTML}</div>` : ''}
    </div>`;
}

function buildPriceHTML(item) {
  const p1 = fmt(item.price1);
  const p2 = fmt(item.price2);
  if (p1 && p2) {
    // Two-price display (e.g. Fish & Chips: $14 / $19 with portion note)
    const lbl = (item.price1Label && item.price2Label)
      ? `<span class="mic-portion">${item.price1Label} / ${item.price2Label}</span>`
      : '';
    return `${p1} / ${p2}${lbl}`;
  }
  return p1 || p2;
}

/* ═══ RENDER: FOOD SECTION ═══ */
function renderFood(food) {
  return FOOD_ORDER
    .filter(cat => food[cat]?.length)
    .map(cat => {
      const slug  = FOOD_CAT_SLUG[cat] || slugify(cat);
      const title = FOOD_CAT_TITLE[cat] || cat;
      const cards = food[cat].map(item =>
        `<div class="col-md-6 col-lg-4">${buildCard(item, false)}</div>`
      ).join('\n');
      return `<div class="menu-category reveal" data-category="${slug}">
      <h3 class="menu-cat-title"><span>${title}</span></h3>
      <div class="row g-3">${cards}</div>
    </div>`;
    }).join('\n');
}

/* ═══ RENDER: DRINK SECTIONS ═══ */
function renderOnTap(items) {
  const rows = items.map(item => {
    // Some rows have pint price shifted into price1Label due to no sleeve price
    let sleeveRaw = item.price1;
    let pintRaw   = item.price2;
    if (!pintRaw && !isNaN(parseFloat(item.price1Label))) {
      pintRaw   = item.price1Label;
      sleeveRaw = '';
    }
    const sleeve = fmt(sleeveRaw) || '—';
    const pint   = fmt(pintRaw)   || '—';
    // Origin note: size_note takes precedence; Canadian tag → 🍁 CAN
    const origin = item.sizeNote
      ? `<span class="tap-origin">${item.sizeNote}</span>`
      : item.tag === 'Canadian' ? '<span class="tap-origin">🍁 CAN</span>' : '';
    return `<div class="tap-row"><span class="tap-name">${item.name} ${origin}</span><span>${sleeve}</span><span>${pint}</span></div>`;
  }).join('\n');
  return `<div class="drink-category reveal" data-dcategory="on-tap">
    <h3 class="menu-cat-title"><span><i class="fa-solid fa-beer-mug-empty me-2"></i>On Tap</span></h3>
    <div class="tap-grid">
      <div class="tap-header"><span>Beer</span><span>Sleeve</span><span>Pint</span></div>
      ${rows}
    </div>
  </div>`;
}

function renderStandardDrinkCat(cat, items, noteText) {
  const slug    = DRINK_SLUG[cat] || slugify(cat);
  const icon    = DRINK_ICON[cat] ? `<i class="fa-solid ${DRINK_ICON[cat]} me-2"></i>` : '';
  const compact = COMPACT_CATS.has(cat);
  const col     = compact ? 'col-6 col-md-4 col-lg-3' : 'col-md-6 col-lg-4';
  const note    = noteText ? ` <span class="cat-note">${noteText}</span>` : '';
  const cards   = items.map(item =>
    `<div class="${col}">${buildCard(item, compact)}</div>`
  ).join('\n');
  return `<div class="drink-category reveal" data-dcategory="${slug}">
    <h3 class="menu-cat-title"><span>${icon}${cat}</span>${note}</h3>
    <div class="row g-3">${cards}</div>
  </div>`;
}

function renderWineByGlass(subcats) {
  const sections = WINE_SUBCAT_ORDER
    .filter(sub => subcats[sub]?.length)
    .map(sub => {
      const rows = subcats[sub].map(item => {
        const p1  = fmt(item.price1) || '';
        const p2  = fmt(item.price2) || '';
        const tag = item.tag === 'Canadian'
          ? ' <span class="mic-tag ca-tag">🍁 BC</span>' : '';
        return `<div class="col-12"><div class="wine-row row"><span class="col-6">${item.name}${tag}</span><span class="col-3">${p1}</span><span class="col-3">${p2}</span></div></div>`;
      }).join('\n');
      return `<div class="col-12"><div class="wine-glass-header row"><span class="col-6">${sub}</span><span class="col-3">6oz</span><span class="col-3">9oz</span></div></div>
      ${rows}`;
    }).join('\n<div class="col-12 mt-2"></div>\n');

  return `<div class="drink-category reveal" data-dcategory="wine">
    <h3 class="menu-cat-title"><span><i class="fa-solid fa-wine-glass me-2"></i>Wine by the Glass</span></h3>
    <div class="row g-3 mb-4">${sections}</div>
  </div>`;
}

function renderWineByBottle(items) {
  const cards = items.map(item =>
    `<div class="col-md-6 col-lg-4">${buildCard(item, true)}</div>`
  ).join('\n');
  return `<div class="drink-category reveal" data-dcategory="wine">
    <h3 class="menu-cat-title mt-4"><span>Wine by the Bottle — Select</span></h3>
    <div class="row g-3">${cards}</div>
  </div>`;
}

function renderSpirits(subcats) {
  const cols = SPIRITS_ORDER
    .filter(sub => subcats[sub]?.length)
    .map(sub => {
      const rows = subcats[sub].map(item => {
        const p1 = fmt(item.price1);
        const p2 = fmt(item.price2);
        const price = [p1, p2].filter(Boolean).join(' / ');
        const ca = item.tag === 'Canadian' ? ' <span class="ca-inline">🍁</span>' : '';
        return `<div class="spirit-row"><span>${item.name}${ca}</span><span>${price}</span></div>`;
      }).join('\n');
      return `<div class="spirits-col">
        <div class="spirits-cat-label">${sub}</div>
        ${rows}
      </div>`;
    }).join('\n');
  return `<div class="drink-category reveal" data-dcategory="spirits">
    <h3 class="menu-cat-title"><span><i class="fa-solid fa-whiskey-glass me-2"></i>Spirits</span> <span class="cat-note">Single / Double</span></h3>
    <div class="spirits-grid">${cols}</div>
  </div>`;
}

function renderDrinks(drinks) {
  let html = '';
  for (const cat of DRINK_ORDER) {
    if (!drinks[cat]) continue;
    const sub = drinks[cat]; // object keyed by subcategory

    if (cat === 'On Tap') {
      html += renderOnTap(sub['__main__'] || []);
    } else if (cat === 'Cocktails') {
      html += renderStandardDrinkCat(cat, sub['__main__'] || [], '2oz pours');
    } else if (cat === 'Martinis') {
      html += renderStandardDrinkCat(cat, sub['__main__'] || [], '2oz pours');
    } else if (cat === 'Wine by the Glass') {
      html += renderWineByGlass(sub);
    } else if (cat === 'Wine by the Bottle') {
      html += renderWineByBottle(sub['__main__'] || []);
    } else if (cat === 'Spirits') {
      html += renderSpirits(sub);
    } else {
      html += renderStandardDrinkCat(cat, sub['__main__'] || [], '');
    }
  }
  return html;
}

/* ═══ FETCH & PARSE ═══ */
async function fetchMenuFromSheets() {
  // Always fetch fresh — cache is fallback only on error
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${MENU_CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(MENU_CONFIG.SHEET_NAME + '!A:N')}?key=${MENU_CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const rows = data.values || [];
    if (rows.length < 2) return { food: {}, drinks: {} };

    // Build column index map from header row
    const headers = rows[0].map(h => (h || '').toLowerCase().trim());
    const ci = {};
    headers.forEach((h, i) => ci[h] = i);

    const items = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const status = (r[ci['status']] || 'active').toLowerCase();
      if (status === 'archive' || status === 'archived') continue;
      const name = r[ci['item_name']]?.trim();
      if (!name) continue;

      items.push({
        menu_type:   (r[ci['menu_type']]    || '').trim(),
        category:    (r[ci['category']]     || '').trim(),
        subcategory: (r[ci['subcategory']]  || '').trim(),
        name,
        desc:        (r[ci['description']]  || '').trim(),
        tag:         (r[ci['tag']]          || '').trim(),
        price1:      (r[ci['price_1']]      || '').trim(),
        price1Label: (r[ci['price_1_label']]|| '').trim(),
        price2:      (r[ci['price_2']]      || '').trim(),
        price2Label: (r[ci['price_2_label']]|| '').trim(),
        sizeNote:    (r[ci['size_note']]    || '').trim(),
        sortOrder:   parseInt(r[ci['sort_order']]) || 999
      });
    }

    items.sort((a, b) => a.sortOrder - b.sortOrder);

    // Group: food by category; drinks by category → subcategory
    const food = {}, drinks = {};
    items.forEach(item => {
      if (item.menu_type === 'food') {
        (food[item.category] = food[item.category] || []).push(item);
      } else if (item.menu_type === 'drinks') {
        const cat = drinks[item.category] = drinks[item.category] || {};
        const sub = item.subcategory || '__main__';
        (cat[sub] = cat[sub] || []).push(item);
      }
    });

    const result = { food, drinks };
    saveMenuCache(result);
    console.log('Menu: loaded from Sheets');
    return result;

  } catch (err) {
    console.error('Menu Sheets error:', err);
    return getMenuCache() || { food: {}, drinks: {} };
  }
}

/* ═══ CACHE ═══ */
function saveMenuCache(data) {
  try { localStorage.setItem(MENU_CONFIG.CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch(e) {}
}
function getMenuCache() {
  try {
    const c = JSON.parse(localStorage.getItem(MENU_CONFIG.CACHE_KEY) || 'null');
    if (c && Date.now() - c.ts < MENU_CONFIG.CACHE_DURATION) return c.data;
  } catch(e) {}
  return null;
}

/* ── Utility ── */
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

/* ═══ INIT ═══ */
async function initMenuLoader() {
  const foodEl  = document.getElementById('foodItems');
  const drinkEl = document.getElementById('drinkItems');
  if (!foodEl && !drinkEl) return;

  const loading = '<div class="text-center py-5" style="opacity:.5">Loading menu…</div>';
  if (foodEl)  foodEl.innerHTML  = loading;
  if (drinkEl) drinkEl.innerHTML = loading;

  const { food, drinks } = await fetchMenuFromSheets();

  if (foodEl)  foodEl.innerHTML  = renderFood(food);
  if (drinkEl) drinkEl.innerHTML = renderDrinks(drinks);

  // Re-run reveal observer on dynamically added elements
  if (typeof initReveal === 'function') initReveal();
}

document.addEventListener('DOMContentLoaded', initMenuLoader);
