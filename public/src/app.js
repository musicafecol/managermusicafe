import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  runTransaction,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyACaoRL50ee3bP5j-uhZ4-wIHln2fUsyJA',
  authDomain: 'db-musicafe.firebaseapp.com',
  projectId: 'db-musicafe',
  storageBucket: 'db-musicafe.firebasestorage.app',
  messagingSenderId: '742667534518',
  appId: '1:742667534518:web:7db496423c662e99fde617'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const DEFAULT_SETTINGS = {
  name: 'MusiCafé',
  taxRate: 0,
  currency: 'COP',
  ticketFooter: 'Gracias por apoyar MusiCafé ☕',
  updatedAt: null
};

const VIEW_META = {
  dashboard: ['Día a día', 'Hoy en MusiCafé', 'Ventas, caja, inventario y pendientes del día.'],
  pos: ['Día a día', 'Caja', 'Agrega productos, confirma el método de pago y guarda la venta.'],
  cierre: ['Día a día', 'Cierre de caja', 'Revisa ventas, pagos, gastos y efectivo antes de cerrar el día.'],
  productos: ['Productos', 'Productos', 'Organiza el catálogo, precios y disponibilidad en caja.'],
  inventario: ['Productos', 'Inventario', 'Controla entradas, salidas, ajustes y productos por reponer.'],
  compras: ['Productos', 'Compras', 'Registra compras de insumos y actualiza el stock automáticamente.'],
  ventas: ['Control', 'Ventas', 'Consulta cobros anteriores, filtra por fecha o anula una venta.'],
  clientes: ['Relación', 'Clientes', 'Fidelización, historial básico y preferencias.'],
  gastos: ['Finanzas', 'Gastos', 'Control de egresos por categoría, proveedor y fecha.'],
  reportes: ['Análisis', 'Reportes', 'Ventas, productos, métodos de pago y rendimiento del negocio.'],
  config: ['Sistema', 'Ajustes', 'Datos generales, copias de seguridad y opciones de MusiCafé.']
};

const DEMO_PRODUCTS = [
  { name: 'Americano', category: 'Bebidas calientes', price: 4500, cost: 1600, stock: 80, minStock: 12, unit: 'vaso', sku: 'CAF-AMER', active: true, notes: 'Base café filtrado.' },
  { name: 'Latte', category: 'Bebidas calientes', price: 8000, cost: 3100, stock: 45, minStock: 10, unit: 'vaso', sku: 'CAF-LATT', active: true, notes: 'Café + leche vaporizada.' },
  { name: 'Capuccino', category: 'Bebidas calientes', price: 8500, cost: 3300, stock: 38, minStock: 10, unit: 'vaso', sku: 'CAF-CAP', active: true, notes: 'Espuma abundante.' },
  { name: 'Chocolate caliente', category: 'Bebidas calientes', price: 7500, cost: 2800, stock: 30, minStock: 8, unit: 'vaso', sku: 'BEB-CHO', active: true, notes: 'Ideal para tardes dramáticas.' },
  { name: 'Té chai', category: 'Bebidas calientes', price: 9000, cost: 3500, stock: 22, minStock: 8, unit: 'vaso', sku: 'BEB-CHAI', active: true, notes: '' },
  { name: 'Brownie', category: 'Postres', price: 7000, cost: 2600, stock: 16, minStock: 5, unit: 'porción', sku: 'POS-BRO', active: true, notes: '' },
  { name: 'Croissant', category: 'Panadería', price: 6500, cost: 2400, stock: 18, minStock: 6, unit: 'unidad', sku: 'PAN-CRO', active: true, notes: '' },
  { name: 'Combo café + postre', category: 'Combos', price: 13000, cost: 5200, stock: 999, minStock: 0, unit: 'combo', sku: 'COM-CAF', active: true, notes: 'Producto de combo, revisar stock manualmente.' }
];

const state = {
  user: null,
  view: 'dashboard',
  products: [],
  customers: [],
  sales: [],
  expenses: [],
  purchases: [],
  cashSessions: [],
  settings: { ...DEFAULT_SETTINGS },
  cart: [],
  unsubscribers: [],
  globalSearch: '',
  loaded: false
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const money = (value = 0) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value) || 0);
const int = (value = 0) => Number.isFinite(Number(value)) ? Number(value) : 0;
const normalize = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const now = () => new Date();
const pad = (n) => String(n).padStart(2, '0');
const dateKeyFromDate = (date = now()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKeyFromDate = (date = now()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
const saleNumber = () => `MC-${dateKeyFromDate().replaceAll('-', '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const toDate = (value) => value?.toDate?.() || (value ? new Date(value) : null);
const formatDateTime = (value) => {
  const d = toDate(value);
  if (!d || Number.isNaN(d.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};
const withinRange = (key, from, to) => (!from || key >= from) && (!to || key <= to);
const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));
const debounce = (fn, wait = 250) => {
  let id = 0;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), wait);
  };
};

function toast(message, type = 'ok') {
  const host = $('#toastHost');
  if (!host) return;
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  host.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

function setConnection(text, ok = true) {
  const label = $('#connectionLabel');
  if (label) label.textContent = text;
  const role = $('#roleLabel');
  if (role) {
    role.textContent = ok ? 'Todo listo' : 'Revisa la conexión';
    role.classList.toggle('success', ok);
  }
}

function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const cell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [headers.map(cell).join(','), ...rows.map((row) => headers.map((h) => cell(row[h])).join(','))].join('\n');
}

function getSubtotal() {
  return state.cart.reduce((acc, item) => acc + int(item.price) * int(item.qty), 0);
}

function getDiscount() {
  return Math.max(0, int($('#saleDiscount')?.value || 0));
}

function getCartTotal() {
  return Math.max(0, getSubtotal() - getDiscount());
}

function productMargin(product) {
  const price = int(product.price);
  const cost = int(product.cost);
  if (!price) return 0;
  return Math.round(((price - cost) / price) * 100);
}

function matchSearch(...values) {
  if (!state.globalSearch) return true;
  const haystack = normalize(values.join(' '));
  return haystack.includes(state.globalSearch);
}

function getSelectedSales() {
  const from = $('#salesFrom')?.value || dateKeyFromDate(new Date(now().getFullYear(), now().getMonth(), 1));
  const to = $('#salesTo')?.value || dateKeyFromDate();
  return state.sales.filter((sale) => sale.status !== 'void' && withinRange(sale.dateKey, from, to));
}

function getSelectedExpenses() {
  const from = $('#expensesFrom')?.value || dateKeyFromDate(new Date(now().getFullYear(), now().getMonth(), 1));
  const to = $('#expensesTo')?.value || dateKeyFromDate();
  return state.expenses.filter((expense) => withinRange(expense.dateKey, from, to));
}

function getOpenCashSession() {
  return state.cashSessions.find((session) => session.status === 'open') || null;
}

function getTodaySales() {
  const today = dateKeyFromDate();
  return state.sales.filter((sale) => sale.status !== 'void' && sale.dateKey === today);
}

function totalsByPayment(sales = getTodaySales()) {
  return sales.reduce((totals, sale) => {
    const method = sale.paymentMethod || 'Otro';
    totals[method] = (totals[method] || 0) + int(sale.totals?.total);
    return totals;
  }, {});
}

function setView(view) {
  state.view = VIEW_META[view] ? view : 'dashboard';
  $$('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === state.view));
  $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${state.view}`));
  const [eyebrow, title, description] = VIEW_META[state.view];
  $('#viewEyebrow').textContent = eyebrow;
  $('#viewTitle').textContent = title;
  $('#viewDescription').textContent = description;
  document.body.classList.remove('sidebar-open');
  localStorage.setItem('musicafe_last_view', state.view);
  renderAll();
}

async function login() {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error(err);
    toast('No pudimos iniciar la sesión. Revisa la cuenta e inténtalo de nuevo.', 'error');
  }
}

async function logout() {
  await signOut(auth);
}

function cleanupListeners() {
  state.unsubscribers.forEach((unsub) => {
    try { unsub(); } catch (_) {}
  });
  state.unsubscribers = [];
}

function subscribe(ref, handler, label) {
  const unsub = onSnapshot(ref, handler, (err) => {
    console.error(label, err);
    setConnection('No se pudo actualizar', false);
    toast(`No pudimos cargar ${label}. Revisa internet e inténtalo de nuevo.`, 'error');
  });
  state.unsubscribers.push(unsub);
}

async function initDataAfterLogin(user) {
  state.user = user;
  $('#userEmail').textContent = user.email || 'Cuenta de trabajo';
  setConnection('Listo para trabajar');
  cleanupListeners();

  subscribe(doc(db, 'settings', 'cafe'), async (snap) => {
    if (snap.exists()) {
      state.settings = { ...DEFAULT_SETTINGS, ...snap.data() };
    } else {
      await setDoc(doc(db, 'settings', 'cafe'), { ...DEFAULT_SETTINGS, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    renderSettings();
    renderAll();
  }, 'los ajustes');

  subscribe(query(collection(db, 'products'), orderBy('name')), (snap) => {
    state.products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  }, 'productos');

  subscribe(query(collection(db, 'customers'), orderBy('name')), (snap) => {
    state.customers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  }, 'clientes');

  subscribe(query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(500)), (snap) => {
    state.sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  }, 'ventas');

  subscribe(query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(500)), (snap) => {
    state.expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  }, 'gastos');

  subscribe(query(collection(db, 'purchases'), orderBy('createdAt', 'desc'), limit(200)), (snap) => {
    state.purchases = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  }, 'compras');

  subscribe(query(collection(db, 'cashSessions'), orderBy('openedAt', 'desc'), limit(60)), (snap) => {
    state.cashSessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  }, 'cierres de caja');

  await loadDraftCart();
  state.loaded = true;
  setView(localStorage.getItem('musicafe_last_view') || 'dashboard');
}

async function loadDraftCart() {
  if (!state.user) return;
  try {
    const snap = await getDoc(doc(db, 'draftCarts', state.user.uid));
    state.cart = Array.isArray(snap.data()?.items) ? snap.data().items : [];
  } catch (err) {
    console.warn(err);
    state.cart = [];
  }
}

const saveCartDraft = debounce(async () => {
  if (!state.user) return;
  try {
    await setDoc(doc(db, 'draftCarts', state.user.uid), {
      items: state.cart,
      updatedAt: serverTimestamp(),
      email: state.user.email || ''
    }, { merge: true });
  } catch (err) {
    console.warn(err);
  }
}, 300);

function touchCart() {
  renderPOS();
  renderKPIs();
  saveCartDraft();
}

function addToCart(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product || product.active === false) return;
  if (int(product.stock) <= 0) {
    toast('Ese producto está sin stock. Primero ajusta inventario.', 'warn');
    return;
  }

  const found = state.cart.find((item) => item.productId === productId);
  if (found) {
    found.qty += 1;
  } else {
    state.cart.push({
      productId,
      name: product.name,
      price: int(product.price),
      cost: int(product.cost),
      qty: 1
    });
  }
  touchCart();
}

function setCartQty(productId, qty) {
  state.cart = state.cart.map((item) => item.productId === productId ? { ...item, qty: Math.max(1, int(qty)) } : item);
  touchCart();
}

function removeCartItem(productId) {
  state.cart = state.cart.filter((item) => item.productId !== productId);
  touchCart();
}

async function clearCart() {
  state.cart = [];
  touchCart();
  if (state.user) {
    await setDoc(doc(db, 'draftCarts', state.user.uid), { items: [], updatedAt: serverTimestamp() }, { merge: true });
  }
}

async function saveSale() {
  if (!state.cart.length) return toast('Agrega productos antes de cobrar. Revolucionario, lo sé.', 'warn');

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = getCartTotal();
  const customerId = $('#saleCustomer')?.value || '';
  const customer = state.customers.find((c) => c.id === customerId);
  const saleRef = doc(collection(db, 'sales'));
  const productRefs = state.cart.map((item) => doc(db, 'products', item.productId));
  const movementRefs = state.cart.map(() => doc(collection(db, 'inventoryMovements')));
  const created = now();

  $('#btnSaveSale').disabled = true;

  try {
    await runTransaction(db, async (tx) => {
      const productSnaps = [];
      for (const ref of productRefs) {
        productSnaps.push(await tx.get(ref));
      }

      const items = state.cart.map((item, index) => {
        const snap = productSnaps[index];
        if (!snap.exists()) throw new Error(`Producto no encontrado: ${item.name}`);
        const product = snap.data();
        const stock = int(product.stock);
        const newStock = stock - int(item.qty);
        if (newStock < 0) throw new Error(`Stock insuficiente para ${item.name}. Disponible: ${stock}`);
        const price = int(item.price);
        const cost = int(product.cost ?? item.cost);
        const qty = int(item.qty);
        return {
          productId: item.productId,
          name: item.name,
          qty,
          price,
          cost,
          subtotal: price * qty,
          profit: (price - cost) * qty,
          previousStock: stock,
          newStock
        };
      });

      const totalCost = items.reduce((acc, item) => acc + item.cost * item.qty, 0);
      const profit = total - totalCost;
      const payload = {
        saleNo: saleNumber(),
        createdAt: serverTimestamp(),
        createdBy: state.user.uid,
        createdByEmail: state.user.email || '',
        dateKey: dateKeyFromDate(created),
        monthKey: monthKeyFromDate(created),
        status: 'paid',
        paymentMethod: $('#salePayment')?.value || 'Efectivo',
        customerId,
        customerName: customer?.name || 'Cliente ocasional',
        notes: $('#saleNotes')?.value?.trim() || '',
        items: items.map(({ previousStock, newStock, ...rest }) => rest),
        totals: { subtotal, discount, total, cost: totalCost, profit }
      };

      tx.set(saleRef, payload);

      items.forEach((item, index) => {
        tx.update(productRefs[index], {
          stock: item.newStock,
          soldCount: increment(item.qty),
          salesTotal: increment(item.subtotal),
          updatedAt: serverTimestamp()
        });
        tx.set(movementRefs[index], {
          createdAt: serverTimestamp(),
          productId: item.productId,
          productName: item.name,
          type: 'sale',
          qtyChange: -item.qty,
          previousStock: item.previousStock,
          newStock: item.newStock,
          saleId: saleRef.id,
          reason: 'Venta en Caja',
          createdBy: state.user.email || state.user.uid
        });
      });

      if (customerId) {
        tx.set(doc(db, 'customers', customerId), {
          totalSpent: increment(total),
          visits: increment(1),
          points: increment(Math.floor(total / 10000)),
          lastPurchaseAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    });

    toast('Venta guardada correctamente ☕');
    $('#saleNotes').value = '';
    $('#saleDiscount').value = 0;
    await clearCart();
  } catch (err) {
    console.error(err);
    toast('No pudimos guardar la venta. Revisa la información e inténtalo de nuevo.', 'error');
  } finally {
    $('#btnSaveSale').disabled = false;
  }
}

async function saveProduct(event) {
  event.preventDefault();
  const id = $('#productId').value;
  const payload = {
    name: $('#productName').value.trim(),
    category: $('#productCategory').value.trim() || 'General',
    price: int($('#productPrice').value),
    cost: int($('#productCost').value),
    stock: int($('#productStock').value),
    minStock: int($('#productMinStock').value),
    sku: $('#productSku').value.trim(),
    unit: $('#productUnit').value.trim() || 'unidad',
    notes: $('#productNotes').value.trim(),
    active: $('#productActive').checked,
    updatedAt: serverTimestamp()
  };

  if (!payload.name || payload.price <= 0) return toast('Nombre y precio son obligatorios.', 'warn');

  try {
    if (id) {
      await updateDoc(doc(db, 'products', id), payload);
      toast('Producto actualizado.');
    } else {
      await addDoc(collection(db, 'products'), { ...payload, createdAt: serverTimestamp(), soldCount: 0, salesTotal: 0 });
      toast('Producto creado.');
    }
    resetProductForm();
  } catch (err) {
    console.error(err);
    toast('No pude guardar el producto.', 'error');
  }
}

function editProduct(id) {
  const p = state.products.find((item) => item.id === id);
  if (!p) return;
  setView('productos');
  $('#productFormTitle').textContent = 'Editar producto';
  $('#productId').value = p.id;
  $('#productName').value = p.name || '';
  $('#productCategory').value = p.category || '';
  $('#productPrice').value = int(p.price);
  $('#productCost').value = int(p.cost);
  $('#productStock').value = int(p.stock);
  $('#productMinStock').value = int(p.minStock);
  $('#productSku').value = p.sku || '';
  $('#productUnit').value = p.unit || '';
  $('#productNotes').value = p.notes || '';
  $('#productActive').checked = p.active !== false;
  $('#productName').focus();
}

function resetProductForm() {
  $('#productForm')?.reset();
  $('#productFormTitle').textContent = 'Nuevo producto';
  $('#productId').value = '';
  $('#productActive').checked = true;
  $('#productStock').value = 0;
  $('#productMinStock').value = 5;
}

async function adjustStock(id, direction = 1) {
  const product = state.products.find((p) => p.id === id);
  if (!product) return;
  const raw = prompt(`¿Cuántas unidades quieres ${direction > 0 ? 'sumar' : 'restar'} a ${product.name}?`, '1');
  if (raw === null) return;
  const qty = Math.abs(int(raw));
  if (!qty) return toast('Cantidad inválida.', 'warn');
  const current = int(product.stock);
  const next = Math.max(0, current + qty * direction);
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'products', id), { stock: next, updatedAt: serverTimestamp() });
    batch.set(doc(collection(db, 'inventoryMovements')), {
      createdAt: serverTimestamp(),
      productId: id,
      productName: product.name,
      type: 'adjustment',
      qtyChange: next - current,
      previousStock: current,
      newStock: next,
      reason: direction > 0 ? 'Ingreso manual' : 'Salida manual',
      createdBy: state.user?.email || ''
    });
    await batch.commit();
    toast('Stock actualizado.');
  } catch (err) {
    console.error(err);
    toast('No pude ajustar el stock.', 'error');
  }
}

async function toggleProduct(id) {
  const product = state.products.find((p) => p.id === id);
  if (!product) return;
  await updateDoc(doc(db, 'products', id), { active: product.active === false, updatedAt: serverTimestamp() });
}

async function seedProducts() {
  if (state.products.length && !confirm('Ya tienes productos. ¿También quieres agregar los productos de ejemplo?')) return;
  try {
    const batch = writeBatch(db);
    DEMO_PRODUCTS.forEach((p) => batch.set(doc(collection(db, 'products')), { ...p, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), soldCount: 0, salesTotal: 0 }));
    await batch.commit();
    toast('Productos demo cargados. Ahora sí hay café imaginario que vender.');
  } catch (err) {
    console.error(err);
    toast('No pude cargar la demo.', 'error');
  }
}

async function saveCustomer(event) {
  event.preventDefault();
  const id = $('#customerId').value;
  const payload = {
    name: $('#customerName').value.trim(),
    phone: $('#customerPhone').value.trim(),
    email: $('#customerEmail').value.trim(),
    notes: $('#customerNotes').value.trim(),
    updatedAt: serverTimestamp()
  };
  if (!payload.name) return toast('El nombre del cliente es obligatorio.', 'warn');

  try {
    if (id) {
      await updateDoc(doc(db, 'customers', id), payload);
      toast('Cliente actualizado.');
    } else {
      await addDoc(collection(db, 'customers'), { ...payload, createdAt: serverTimestamp(), visits: 0, points: 0, totalSpent: 0 });
      toast('Cliente creado.');
    }
    resetCustomerForm();
  } catch (err) {
    console.error(err);
    toast('No pude guardar el cliente.', 'error');
  }
}

function editCustomer(id) {
  const c = state.customers.find((item) => item.id === id);
  if (!c) return;
  setView('clientes');
  $('#customerFormTitle').textContent = 'Editar cliente';
  $('#customerId').value = c.id;
  $('#customerName').value = c.name || '';
  $('#customerPhone').value = c.phone || '';
  $('#customerEmail').value = c.email || '';
  $('#customerNotes').value = c.notes || '';
  $('#customerName').focus();
}

function resetCustomerForm() {
  $('#customerForm')?.reset();
  $('#customerFormTitle').textContent = 'Nuevo cliente';
  $('#customerId').value = '';
}

async function deleteCustomer(id) {
  if (!confirm('¿Eliminar este cliente? Sus ventas históricas se conservan con el nombre registrado.')) return;
  await deleteDoc(doc(db, 'customers', id));
}

async function saveExpense(event) {
  event.preventDefault();
  const dateKey = $('#expenseDate').value || dateKeyFromDate();
  const payload = {
    dateKey,
    monthKey: dateKey.slice(0, 7),
    category: $('#expenseCategory').value,
    amount: int($('#expenseAmount').value),
    paymentMethod: $('#expensePayment').value,
    description: $('#expenseDescription').value.trim(),
    supplier: $('#expenseSupplier').value.trim(),
    notes: $('#expenseNotes').value.trim(),
    createdAt: serverTimestamp(),
    createdBy: state.user?.email || '',
    updatedAt: serverTimestamp()
  };
  if (!payload.description || payload.amount <= 0) return toast('Descripción y valor son obligatorios.', 'warn');

  try {
    await addDoc(collection(db, 'expenses'), payload);
    $('#expenseForm').reset();
    $('#expenseDate').value = dateKeyFromDate();
    toast('Gasto guardado. Qué maravilla registrar cómo se va la plata.');
  } catch (err) {
    console.error(err);
    toast('No pude guardar el gasto.', 'error');
  }
}

async function deleteExpense(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  await deleteDoc(doc(db, 'expenses', id));
}

async function savePurchase(event) {
  event.preventDefault();
  const productId = $('#purchaseProduct').value;
  const product = state.products.find((item) => item.id === productId);
  const qty = Math.max(1, int($('#purchaseQty').value));
  const unitCost = Math.max(0, int($('#purchaseUnitCost').value));
  const total = qty * unitCost;
  if (!product) return toast('Selecciona un producto para registrar la compra.', 'warn');

  const purchaseRef = doc(collection(db, 'purchases'));
  const expenseRef = doc(collection(db, 'expenses'));
  const movementRef = doc(collection(db, 'inventoryMovements'));
  const productRef = doc(db, 'products', productId);
  const dateKey = $('#purchaseDate').value || dateKeyFromDate();
  const supplier = $('#purchaseSupplier').value.trim();
  const paymentMethod = $('#purchasePayment').value || 'Efectivo';

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(productRef);
      if (!snap.exists()) throw new Error('El producto ya no existe.');
      const previousStock = int(snap.data().stock);
      const newStock = previousStock + qty;
      tx.update(productRef, { stock: newStock, cost: unitCost, updatedAt: serverTimestamp() });
      tx.set(purchaseRef, {
        dateKey, monthKey: dateKey.slice(0, 7), supplier, paymentMethod,
        items: [{ productId, name: product.name, qty, unitCost, total }],
        total, notes: $('#purchaseNotes').value.trim(),
        createdBy: state.user.email || state.user.uid, createdAt: serverTimestamp()
      });
      tx.set(expenseRef, {
        dateKey, monthKey: dateKey.slice(0, 7), category: 'Insumos',
        description: `Compra: ${product.name}`, supplier, amount: total, paymentMethod,
        scope: 'MusiCafé', purchaseId: purchaseRef.id,
        notes: $('#purchaseNotes').value.trim(),
        createdBy: state.user.email || state.user.uid, createdAt: serverTimestamp()
      });
      tx.set(movementRef, {
        createdAt: serverTimestamp(), productId, productName: product.name,
        type: 'purchase', qtyChange: qty, previousStock, newStock,
        purchaseId: purchaseRef.id, reason: `Compra a ${supplier}`,
        createdBy: state.user.email || state.user.uid
      });
    });
    event.target.reset();
    $('#purchaseDate').value = dateKeyFromDate();
    renderPurchaseTotal();
    toast('Compra guardada, gasto registrado y stock actualizado.');
  } catch (err) {
    console.error(err);
    toast('No pudimos guardar la compra. Revisa los datos e inténtalo de nuevo.', 'error');
  }
}

async function saveCashSession(event) {
  event.preventDefault();
  const open = getOpenCashSession();
  if (!open) {
    const openingCash = Math.max(0, int($('#openingCash').value));
    await addDoc(collection(db, 'cashSessions'), {
      dateKey: dateKeyFromDate(), status: 'open', openingCash,
      openedAt: serverTimestamp(), openedBy: state.user.email || state.user.uid
    });
    toast('Caja abierta. Ya puedes comenzar a vender.');
    return;
  }

  const payments = totalsByPayment();
  const cashSales = int(payments.Efectivo);
  const cashExpenses = state.expenses
    .filter((expense) => expense.dateKey === dateKeyFromDate() && expense.paymentMethod === 'Efectivo')
    .reduce((sum, expense) => sum + int(expense.amount), 0);
  const expectedCash = int(open.openingCash) + cashSales - cashExpenses;
  const countedCash = Math.max(0, int($('#countedCash').value));
  await updateDoc(doc(db, 'cashSessions', open.id), {
    status: 'closed', closedAt: serverTimestamp(),
    closedBy: state.user.email || state.user.uid,
    expectedCash, countedCash, difference: countedCash - expectedCash,
    totalsByPaymentMethod: payments, cashExpenses,
    notes: $('#cashNotes').value.trim()
  });
  toast('Día cerrado y conciliación guardada.');
}

function renderPurchaseTotal() {
  const total = int($('#purchaseQty')?.value) * int($('#purchaseUnitCost')?.value);
  if ($('#purchaseTotal')) $('#purchaseTotal').textContent = money(total);
}

async function voidSale(id) {
  const sale = state.sales.find((s) => s.id === id);
  if (!sale || sale.status === 'void') return;
  if (!confirm('¿Anular esta venta y devolver las unidades al inventario?')) return;

  try {
    const batch = writeBatch(db);
    (sale.items || []).forEach((item) => {
      const product = state.products.find((p) => p.id === item.productId);
      const current = int(product?.stock);
      const next = current + int(item.qty);
      batch.update(doc(db, 'products', item.productId), { stock: next, updatedAt: serverTimestamp() });
      batch.set(doc(collection(db, 'inventoryMovements')), {
        createdAt: serverTimestamp(),
        productId: item.productId,
        productName: item.name,
        type: 'void_sale',
        qtyChange: int(item.qty),
        previousStock: current,
        newStock: next,
        saleId: sale.id,
        reason: 'Venta anulada',
        createdBy: state.user?.email || ''
      });
    });
    batch.update(doc(db, 'sales', id), { status: 'void', voidedAt: serverTimestamp(), voidedBy: state.user?.email || '' });
    await batch.commit();
    toast('Venta anulada y stock devuelto.');
  } catch (err) {
    console.error(err);
    toast('No pude anular la venta.', 'error');
  }
}

async function saveSettings(event) {
  event.preventDefault();
  try {
    await setDoc(doc(db, 'settings', 'cafe'), {
      name: $('#settingCafeName').value.trim() || 'MusiCafé',
      taxRate: Number($('#settingTaxRate').value) || 0,
      currency: $('#settingCurrency').value.trim() || 'COP',
      ticketFooter: $('#settingTicketFooter').value.trim(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    toast('Cambios guardados.');
  } catch (err) {
    console.error(err);
    toast('No pudimos guardar los cambios. Inténtalo de nuevo.', 'error');
  }
}

function exportBackup() {
  const payload = {
    app: 'MusiCafé Manager',
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    products: state.products,
    customers: state.customers,
    sales: state.sales,
    expenses: state.expenses
  };
  downloadText(`musicafe-backup-${dateKeyFromDate()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
}

async function importBackup(file) {
  if (!file) return;
  if (!confirm('Esto recuperará la información guardada en la copia seleccionada. ¿Deseas continuar?')) return;
  try {
    const data = JSON.parse(await file.text());
    const ops = [];
    if (data.settings) ops.push({ ref: doc(db, 'settings', 'cafe'), data: { ...data.settings, updatedAt: serverTimestamp() } });
    ['products', 'customers', 'sales', 'expenses'].forEach((key) => {
      (Array.isArray(data[key]) ? data[key] : []).forEach(({ id, ...item }) => {
        const ref = id ? doc(db, key, id) : doc(collection(db, key));
        ops.push({ ref, data: { ...item, updatedAt: serverTimestamp() } });
      });
    });

    for (let i = 0; i < ops.length; i += 420) {
      const batch = writeBatch(db);
      ops.slice(i, i + 420).forEach((op) => batch.set(op.ref, op.data, { merge: true }));
      await batch.commit();
    }

    toast(`Copia recuperada correctamente. Se actualizaron ${ops.length} registros.`);
  } catch (err) {
    console.error(err);
    toast('No pudimos usar esa copia. Verifica que sea un archivo guardado desde MusiCafé.', 'error');
  }
}

function exportSalesCsv() {
  const rows = getSelectedSales().map((sale) => ({
    fecha: sale.dateKey,
    venta: sale.saleNo,
    cliente: sale.customerName,
    metodo: sale.paymentMethod,
    subtotal: sale.totals?.subtotal || 0,
    descuento: sale.totals?.discount || 0,
    total: sale.totals?.total || 0,
    utilidad: sale.totals?.profit || 0,
    items: (sale.items || []).map((i) => `${i.qty}x ${i.name}`).join(' | '),
    notas: sale.notes || ''
  }));
  downloadText(`musicafe-ventas-${dateKeyFromDate()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
}

function exportExpensesCsv() {
  const rows = getSelectedExpenses().map((expense) => ({
    fecha: expense.dateKey,
    categoria: expense.category,
    descripcion: expense.description,
    proveedor: expense.supplier || '',
    metodo: expense.paymentMethod,
    valor: expense.amount || 0,
    notas: expense.notes || ''
  }));
  downloadText(`musicafe-gastos-${dateKeyFromDate()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
}

function renderAll() {
  if (!state.user) return;
  renderKPIs();
  renderSettings();
  renderProductOptions();
  renderProductsGrid();
  renderPOS();
  renderProducts();
  renderInventory();
  renderPurchases();
  renderCashSession();
  renderReports();
  renderCustomers();
  renderSales();
  renderExpenses();
  renderDashboard();
  const last = $('#lastUpdate');
  if (last) last.textContent = `Información actualizada a las ${new Intl.DateTimeFormat('es-CO', { timeStyle: 'short' }).format(new Date())}`;
}

function renderSettings() {
  const name = state.settings.name || 'MusiCafé';
  document.title = `${name} Manager`;
  const brand = $('.brand strong');
  if (brand) brand.textContent = name;
  const sName = $('#settingCafeName');
  if (sName && document.activeElement !== sName) sName.value = name;
  const tax = $('#settingTaxRate');
  if (tax && document.activeElement !== tax) tax.value = state.settings.taxRate ?? 0;
  const currency = $('#settingCurrency');
  if (currency && document.activeElement !== currency) currency.value = state.settings.currency || 'COP';
  const footer = $('#settingTicketFooter');
  if (footer && document.activeElement !== footer) footer.value = state.settings.ticketFooter || '';
}

function renderKPIs() {
  const today = dateKeyFromDate();
  const salesToday = state.sales.filter((sale) => sale.status !== 'void' && sale.dateKey === today);
  const salesTotal = salesToday.reduce((acc, sale) => acc + int(sale.totals?.total), 0);
  const profitTotal = salesToday.reduce((acc, sale) => acc + int(sale.totals?.profit), 0);
  const avg = salesToday.length ? salesTotal / salesToday.length : 0;
  const lowStock = state.products.filter((p) => p.active !== false && int(p.stock) <= int(p.minStock)).length;

  $('#kpiSalesToday').textContent = money(salesTotal);
  $('#kpiSalesTodayMeta').textContent = `${salesToday.length} orden${salesToday.length === 1 ? '' : 'es'}`;
  $('#kpiProfitToday').textContent = money(profitTotal);
  $('#kpiAvgTicket').textContent = money(avg);
  $('#kpiLowStock').textContent = String(lowStock);
  $('#todayLabel').textContent = new Intl.DateTimeFormat('es-CO', { dateStyle: 'full' }).format(new Date());
}

function renderProductOptions() {
  const categories = unique(state.products.map((p) => p.category || 'General')).sort((a, b) => a.localeCompare(b));
  const select = $('#posCategoryFilter');
  if (select) {
    const current = select.value;
    select.innerHTML = '<option value="">Todas</option>' + categories.map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
    select.value = categories.includes(current) ? current : '';
  }

  const customerSelect = $('#saleCustomer');
  if (customerSelect) {
    const current = customerSelect.value;
    customerSelect.innerHTML = '<option value="">Cliente ocasional</option>' + state.customers.map((c) => `<option value="${c.id}">${escapeHtml(c.name || 'Sin nombre')}</option>`).join('');
    customerSelect.value = state.customers.some((c) => c.id === current) ? current : '';
  }

  const purchaseSelect = $('#purchaseProduct');
  if (purchaseSelect) {
    const current = purchaseSelect.value;
    purchaseSelect.innerHTML = '<option value="">Seleccionar producto</option>' + state.products
      .filter((p) => p.active !== false)
      .map((p) => `<option value="${p.id}">${escapeHtml(p.name)} · Stock ${int(p.stock)}</option>`).join('');
    purchaseSelect.value = state.products.some((p) => p.id === current) ? current : '';
  }
}

function renderProductsGrid() {
  const grid = $('#productsGrid');
  if (!grid) return;
  const category = $('#posCategoryFilter')?.value || '';
  const list = state.products
    .filter((p) => p.active !== false)
    .filter((p) => !category || p.category === category)
    .filter((p) => matchSearch(p.name, p.category, p.sku))
    .sort((a, b) => String(a.category || '').localeCompare(String(b.category || '')) || String(a.name || '').localeCompare(String(b.name || '')));

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">No hay productos activos para mostrar. Carga productos en inventario.</div>';
    return;
  }

  grid.innerHTML = list.map((p) => {
    const low = int(p.stock) <= int(p.minStock);
    const categoryKey = normalize(p.category || 'general').replaceAll(' ', '-');
    return `<button class="product-card" type="button" data-category="${categoryKey}" data-action="add-cart" data-id="${p.id}">
      <span class="meta"><span>${escapeHtml(p.category || 'General')}</span><span class="badge ${low ? 'danger' : 'ok'}">Stock ${int(p.stock)}</span></span>
      <strong>${escapeHtml(p.name || 'Producto')}</strong>
      <span class="price">${money(p.price)}</span>
    </button>`;
  }).join('');
}

function renderPOS() {
  const list = $('#cartList');
  if (!list) return;
  if (!state.cart.length) {
    list.innerHTML = '<div class="empty-state">Pedido vacío. El arte de vender empieza tocando un producto, qué concepto.</div>';
  } else {
    list.innerHTML = state.cart.map((item) => `<div class="cart-item">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span class="muted tiny">${money(item.price)} c/u · ${money(item.price * item.qty)}</span>
      </div>
      <div class="qty-row">
        <button type="button" data-action="qty-dec" data-id="${item.productId}">−</button>
        <strong>${item.qty}</strong>
        <button type="button" data-action="qty-inc" data-id="${item.productId}">+</button>
        <button type="button" data-action="remove-cart" data-id="${item.productId}">🗑️</button>
      </div>
    </div>`).join('');
  }

  $('#cartSubtotal').textContent = money(getSubtotal());
  $('#cartDiscount').textContent = money(getDiscount());
  $('#cartTotal').textContent = money(getCartTotal());
  $('#btnSaveSale').disabled = !state.cart.length;
  $('#btnClearCart').disabled = !state.cart.length;
}

function renderProducts() {
  const table = $('#productsTable');
  if (!table) return;
  const term = normalize($('#productSearch')?.value || '');
  const list = state.products.filter((p) => !term || normalize(`${p.name} ${p.category} ${p.sku}`).includes(term));
  table.innerHTML = list.length ? list.map((p) => `<div class="table-row">
    <div>
      <div class="title">${escapeHtml(p.name || 'Producto')} ${p.active === false ? '<span class="badge danger">Inactivo</span>' : ''}</div>
      <div class="sub">${escapeHtml(p.category || 'General')} · Precio ${money(p.price)} · Costo ${money(p.cost)} · Margen ${productMargin(p)}%</div>
      <div class="status-row">${!int(p.price) ? '<span class="badge danger">Sin precio</span>' : ''}${!int(p.cost) ? '<span class="badge warn">Sin costo</span>' : ''}</div>
    </div>
    <div class="table-actions">
      <button class="btn ghost" type="button" data-action="edit-product" data-id="${p.id}">Editar</button>
      <button class="btn ghost" type="button" data-action="toggle-product" data-id="${p.id}">${p.active === false ? 'Activar' : 'Desactivar'}</button>
    </div>
  </div>`).join('') : '<div class="empty-state">No hay productos creados.</div>';
}

function renderInventory() {
  const table = $('#inventoryTable');
  if (!table) return;
  const term = normalize($('#inventorySearch')?.value || '');
  const list = state.products
    .filter((p) => !term || normalize(`${p.name} ${p.category} ${p.sku}`).includes(term))
    .filter((p) => matchSearch(p.name, p.category, p.sku))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  if (!list.length) {
    table.innerHTML = '<div class="empty-state">No hay productos en inventario.</div>';
    return;
  }

  table.innerHTML = list.map((p) => {
    const low = int(p.stock) <= int(p.minStock);
    return `<div class="table-row">
      <div>
        <div class="title">${escapeHtml(p.name || 'Producto')} ${p.active === false ? '<span class="badge danger">Inactivo</span>' : ''}</div>
        <div class="sub">${escapeHtml(p.category || 'General')} · Precio ${money(p.price)} · Costo ${money(p.cost)} · Margen ${productMargin(p)}%</div>
        <div class="sub">Stock: <strong>${int(p.stock)}</strong> · Mínimo: ${int(p.minStock)} ${low ? '<span class="badge danger">Stock bajo</span>' : '<span class="badge ok">OK</span>'}</div>
      </div>
      <div class="table-actions">
        <button class="btn ghost" type="button" data-action="stock-minus" data-id="${p.id}">− Stock</button>
        <button class="btn secondary" type="button" data-action="stock-plus" data-id="${p.id}">+ Stock</button>
        <button class="btn ghost" type="button" data-action="edit-product" data-id="${p.id}">Editar</button>
        <button class="btn ghost" type="button" data-action="toggle-product" data-id="${p.id}">${p.active === false ? 'Activar' : 'Desactivar'}</button>
      </div>
    </div>`;
  }).join('');

  const summary = $('#inventorySummary');
  if (summary) {
    const lowCount = state.products.filter((p) => int(p.stock) > 0 && int(p.stock) <= int(p.minStock)).length;
    const outCount = state.products.filter((p) => int(p.stock) <= 0).length;
    summary.innerHTML = `<div><span>Productos</span><strong>${state.products.length}</strong></div><div><span>Stock bajo</span><strong>${lowCount}</strong></div><div><span>Agotados</span><strong>${outCount}</strong></div>`;
  }
}

function renderCustomers() {
  const table = $('#customersTable');
  if (!table) return;
  const term = normalize($('#customersSearch')?.value || '');
  const list = state.customers
    .filter((c) => !term || normalize(`${c.name} ${c.phone} ${c.email}`).includes(term))
    .filter((c) => matchSearch(c.name, c.phone, c.email, c.notes))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  if (!list.length) {
    table.innerHTML = '<div class="empty-state">No hay clientes guardados todavía.</div>';
    return;
  }

  table.innerHTML = list.map((c) => `<div class="table-row">
    <div>
      <div class="title">${escapeHtml(c.name || 'Cliente')}</div>
      <div class="sub">${escapeHtml(c.phone || 'Sin teléfono')} · ${escapeHtml(c.email || 'Sin email')}</div>
      <div class="sub">Visitas: ${int(c.visits)} · Puntos: ${int(c.points)} · Compras: ${money(c.totalSpent)}</div>
    </div>
    <div class="table-actions">
      <button class="btn ghost" type="button" data-action="edit-customer" data-id="${c.id}">Editar</button>
      <button class="btn ghost" type="button" data-action="delete-customer" data-id="${c.id}">Eliminar</button>
    </div>
  </div>`).join('');
}

function renderSales() {
  const table = $('#salesTable');
  if (!table) return;
  const sales = getSelectedSales().filter((s) => matchSearch(s.saleNo, s.customerName, s.paymentMethod, (s.items || []).map((i) => i.name).join(' ')));
  const total = sales.reduce((acc, sale) => acc + int(sale.totals?.total), 0);
  const profit = sales.reduce((acc, sale) => acc + int(sale.totals?.profit), 0);
  const summary = $('#salesSummary');
  if (summary) {
    summary.innerHTML = `<div><span>Total ventas</span><strong>${money(total)}</strong></div><div><span>Utilidad estimada</span><strong>${money(profit)}</strong></div><div><span>Órdenes</span><strong>${sales.length}</strong></div>`;
  }

  if (!sales.length) {
    table.innerHTML = '<div class="empty-state">No hay ventas en este rango.</div>';
    return;
  }

  table.innerHTML = sales.map((sale) => `<div class="table-row">
    <div>
      <div class="title">${escapeHtml(sale.saleNo || sale.id)} · ${money(sale.totals?.total)}</div>
      <div class="sub">${formatDateTime(sale.createdAt)} · ${escapeHtml(sale.customerName || 'Cliente ocasional')} · ${escapeHtml(sale.paymentMethod || '')}</div>
      <div class="sub">${(sale.items || []).map((i) => `${i.qty}× ${escapeHtml(i.name)}`).join(' · ')}</div>
    </div>
    <div class="table-actions">
      <span class="badge ok">${money(sale.totals?.profit || 0)} utilidad</span>
      <button class="btn ghost" type="button" data-action="void-sale" data-id="${sale.id}">Anular</button>
    </div>
  </div>`).join('');
}

function renderExpenses() {
  const table = $('#expensesTable');
  if (!table) return;
  const expenses = getSelectedExpenses().filter((e) => matchSearch(e.category, e.description, e.supplier, e.paymentMethod));
  const total = expenses.reduce((acc, expense) => acc + int(expense.amount), 0);
  const byCat = expenses.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + int(e.amount) }), {});
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const summary = $('#expensesSummary');
  if (summary) {
    summary.innerHTML = `<div><span>Total gastos</span><strong>${money(total)}</strong></div><div><span>Registros</span><strong>${expenses.length}</strong></div><div><span>Categoría mayor</span><strong>${topCat ? `${topCat[0]} · ${money(topCat[1])}` : '—'}</strong></div>`;
  }

  if (!expenses.length) {
    table.innerHTML = '<div class="empty-state">No hay gastos en este rango.</div>';
    return;
  }

  table.innerHTML = expenses.map((e) => `<div class="table-row">
    <div>
      <div class="title">${escapeHtml(e.description || 'Gasto')} · ${money(e.amount)}</div>
      <div class="sub">${escapeHtml(e.dateKey || '')} · ${escapeHtml(e.category || '')} · ${escapeHtml(e.paymentMethod || '')}</div>
      <div class="sub">${escapeHtml(e.supplier || 'Sin proveedor')}</div>
    </div>
    <div class="table-actions"><button class="btn ghost" type="button" data-action="delete-expense" data-id="${e.id}">Eliminar</button></div>
  </div>`).join('');
}

function renderDashboard() {
  const today = dateKeyFromDate();
  const currentMonth = monthKeyFromDate();
  const monthSales = state.sales.filter((s) => s.status !== 'void' && s.monthKey === currentMonth);
  const monthExpenses = state.expenses.filter((e) => e.monthKey === currentMonth);
  const monthSalesTotal = monthSales.reduce((acc, s) => acc + int(s.totals?.total), 0);
  const monthProfit = monthSales.reduce((acc, s) => acc + int(s.totals?.profit), 0);
  const monthExpensesTotal = monthExpenses.reduce((acc, e) => acc + int(e.amount), 0);
  $('#dashMonthSales').textContent = money(monthSalesTotal);
  $('#dashMonthProfit').textContent = money(monthProfit);
  $('#dashMonthExpenses').textContent = money(monthExpensesTotal);
  $('#dashMonthOrders').textContent = String(monthSales.length);

  const lowStock = state.products.filter((p) => p.active !== false && int(p.stock) <= int(p.minStock));
  const salesToday = state.sales.filter((s) => s.status !== 'void' && s.dateKey === today);
  const alerts = [];
  if (!state.products.length) alerts.push(['warn', 'Agrega productos para comenzar a usar la Caja.']);
  if (lowStock.length) alerts.push(['danger', `${lowStock.length} producto(s) están en stock bajo: ${lowStock.slice(0, 4).map((p) => p.name).join(', ')}.`]);
  if (!salesToday.length) alerts.push(['warn', 'Todavía no hay ventas hoy. El café no se vende con telepatía, tristemente.']);
  if (monthExpensesTotal > monthSalesTotal && monthSalesTotal > 0) alerts.push(['danger', 'Los gastos del mes superan las ventas registradas. Toca revisar margen o registros.']);
  if (!alerts.length) alerts.push(['ok', 'Todo se ve estable por ahora. Sospechoso, pero agradable.']);
  $('#alertsList').innerHTML = alerts.map(([type, text]) => `<div class="hint"><span class="badge ${type}">${type === 'ok' ? 'OK' : 'Alerta'}</span> ${escapeHtml(text)}</div>`).join('');

  const productCount = new Map();
  state.sales.filter((s) => s.status !== 'void').forEach((sale) => (sale.items || []).forEach((item) => {
    const cur = productCount.get(item.name) || { name: item.name, qty: 0, total: 0 };
    cur.qty += int(item.qty);
    cur.total += int(item.subtotal);
    productCount.set(item.name, cur);
  }));
  const tops = Array.from(productCount.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  $('#topProducts').innerHTML = tops.length ? tops.map((p) => `<div class="table-row"><div><div class="title">${escapeHtml(p.name)}</div><div class="sub">${p.qty} unidades vendidas</div></div><strong>${money(p.total)}</strong></div>`).join('') : '<div class="empty-state">Aún no hay ventas para ranking.</div>';

  const recent = state.sales.filter((s) => s.status !== 'void').slice(0, 5);
  $('#recentSales').innerHTML = recent.length ? recent.map((s) => `<div class="table-row"><div><div class="title">${escapeHtml(s.saleNo || s.id)}</div><div class="sub">${formatDateTime(s.createdAt)} · ${escapeHtml(s.customerName || '')}</div></div><strong>${money(s.totals?.total)}</strong></div>`).join('') : '<div class="empty-state">Sin ventas recientes.</div>';
}

function renderPurchases() {
  const table = $('#purchasesTable');
  if (!table) return;
  table.innerHTML = state.purchases.length ? state.purchases.slice(0, 30).map((purchase) => {
    const item = purchase.items?.[0] || {};
    return `<div class="table-row"><div><div class="title">${escapeHtml(item.name || 'Compra')} · ${money(purchase.total)}</div><div class="sub">${escapeHtml(purchase.dateKey || '')} · ${escapeHtml(purchase.supplier || 'Sin proveedor')} · ${int(item.qty)} unidades</div></div><span class="badge ok">Stock actualizado</span></div>`;
  }).join('') : '<div class="empty-state">Todavía no hay compras registradas.</div>';
}

function renderCashSession() {
  const open = getOpenCashSession();
  const payments = totalsByPayment();
  const cashSales = int(payments.Efectivo);
  const cashExpenses = state.expenses.filter((e) => e.dateKey === dateKeyFromDate() && e.paymentMethod === 'Efectivo').reduce((sum, e) => sum + int(e.amount), 0);
  const expected = int(open?.openingCash) + cashSales - cashExpenses;
  if ($('#cashStatus')) $('#cashStatus').textContent = open ? 'Caja abierta' : 'Caja cerrada';
  if ($('#cashStatusMeta')) $('#cashStatusMeta').textContent = open ? `Abierta con ${money(open.openingCash)} de base.` : 'Abre la caja para comenzar el día.';
  if ($('#btnOpenCashQuick')) {
    $('#btnOpenCashQuick').textContent = open ? 'Ver cierre' : 'Abrir caja';
    $('#btnOpenCashQuick').dataset.goView = 'cierre';
  }
  if ($('#cashFormTitle')) $('#cashFormTitle').textContent = open ? 'Cerrar caja' : 'Abrir caja';
  if ($('#openingCashLabel')) $('#openingCashLabel').hidden = Boolean(open);
  if ($('#closeCashFields')) $('#closeCashFields').hidden = !open;
  if ($('#btnSubmitCash')) $('#btnSubmitCash').textContent = open ? 'Cerrar día' : 'Abrir caja';
  if ($('#cashExpectedSummary')) $('#cashExpectedSummary').innerHTML = `<div><span>Efectivo inicial</span><strong>${money(open?.openingCash)}</strong></div><div><span>Ventas efectivo</span><strong>${money(cashSales)}</strong></div><div><span>Gastos efectivo</span><strong>${money(cashExpenses)}</strong></div><div><span>Efectivo esperado</span><strong>${money(expected)}</strong></div>`;
  if ($('#cashReconciliation')) $('#cashReconciliation').innerHTML = Object.entries(payments).map(([method, total]) => `<div class="reconciliation-row"><span>${escapeHtml(method)}</span><strong>${money(total)}</strong></div>`).join('') || '<div class="empty-state">No hay ventas registradas hoy.</div>';
}

function renderReports() {
  const month = monthKeyFromDate();
  const sales = state.sales.filter((s) => s.status !== 'void' && s.monthKey === month);
  const expenses = state.expenses.filter((e) => e.monthKey === month);
  const revenue = sales.reduce((sum, s) => sum + int(s.totals?.total), 0);
  const costs = expenses.reduce((sum, e) => sum + int(e.amount), 0);
  if ($('#reportsSummary')) $('#reportsSummary').innerHTML = `<div><span>Ventas</span><strong>${money(revenue)}</strong></div><div><span>Gastos</span><strong>${money(costs)}</strong></div><div><span>Resultado</span><strong>${money(revenue - costs)}</strong></div>`;
  const payments = totalsByPayment(sales);
  if ($('#paymentReport')) $('#paymentReport').innerHTML = Object.entries(payments).map(([method, total]) => `<div class="table-row"><span>${escapeHtml(method)}</span><strong>${money(total)}</strong></div>`).join('') || '<div class="empty-state">Sin ventas este mes.</div>';
  const products = new Map();
  sales.forEach((sale) => (sale.items || []).forEach((item) => products.set(item.name, (products.get(item.name) || 0) + int(item.qty))));
  if ($('#productReport')) $('#productReport').innerHTML = Array.from(products.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, qty]) => `<div class="table-row"><span>${escapeHtml(name)}</span><strong>${qty} unidades</strong></div>`).join('') || '<div class="empty-state">Sin datos para ranking.</div>';
}

function wireEvents() {
  $('#btnLogin')?.addEventListener('click', login);
  $('#btnLogout')?.addEventListener('click', logout);
  $('#btnMenu')?.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  $('#btnSync')?.addEventListener('click', () => { renderAll(); toast('Información actualizada.'); });
  $('#btnSaveSale')?.addEventListener('click', saveSale);
  $('#btnClearCart')?.addEventListener('click', clearCart);
  $('#saleDiscount')?.addEventListener('input', renderPOS);
  $('#posCategoryFilter')?.addEventListener('change', renderProductsGrid);
  $('#productForm')?.addEventListener('submit', saveProduct);
  $('#btnResetProduct')?.addEventListener('click', resetProductForm);
  $('#btnSeedProducts')?.addEventListener('click', seedProducts);
  $('#customerForm')?.addEventListener('submit', saveCustomer);
  $('#btnResetCustomer')?.addEventListener('click', resetCustomerForm);
  $('#expenseForm')?.addEventListener('submit', saveExpense);
  $('#purchaseForm')?.addEventListener('submit', savePurchase);
  $('#cashSessionForm')?.addEventListener('submit', (event) => saveCashSession(event).catch((err) => {
    console.error(err);
    toast('No pudimos actualizar la caja. Revisa la información e inténtalo de nuevo.', 'error');
  }));
  $('#purchaseQty')?.addEventListener('input', renderPurchaseTotal);
  $('#purchaseUnitCost')?.addEventListener('input', renderPurchaseTotal);
  $('#settingsForm')?.addEventListener('submit', saveSettings);
  $('#btnExportJson')?.addEventListener('click', exportBackup);
  $('#btnExportJson2')?.addEventListener('click', exportBackup);
  $('#btnExportSalesCsv')?.addEventListener('click', exportSalesCsv);
  $('#btnExportExpensesCsv')?.addEventListener('click', exportExpensesCsv);
  $('#btnImportJson')?.addEventListener('click', () => $('#importJsonFile')?.click());
  $('#importJsonFile')?.addEventListener('change', (event) => importBackup(event.target.files?.[0]));
  $('#btnWipeDraft')?.addEventListener('click', clearCart);
  $('#btnQuickProduct')?.addEventListener('click', () => { setView('inventario'); resetProductForm(); $('#productName')?.focus(); });

  ['productSearch', 'inventorySearch', 'customersSearch', 'salesFrom', 'salesTo', 'expensesFrom', 'expensesTo'].forEach((id) => {
    $(`#${id}`)?.addEventListener('input', renderAll);
    $(`#${id}`)?.addEventListener('change', renderAll);
  });

  $('#globalSearch')?.addEventListener('input', debounce((event) => {
    state.globalSearch = normalize(event.target.value);
    renderAll();
  }, 180));

  document.addEventListener('click', (event) => {
    const quickNote = event.target.closest('[data-quick-note]');
    if (quickNote) {
      const notes = $('#saleNotes');
      const value = quickNote.dataset.quickNote;
      notes.value = notes.value ? `${notes.value}, ${value}` : value;
      quickNote.classList.toggle('selected');
      return;
    }
    const go = event.target.closest('[data-go-view]');
    if (go?.dataset.goView) return setView(go.dataset.goView);
    const nav = event.target.closest('.nav-btn');
    if (nav?.dataset.view) return setView(nav.dataset.view);

    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === 'add-cart') addToCart(id);
    if (action === 'qty-inc') setCartQty(id, (state.cart.find((i) => i.productId === id)?.qty || 0) + 1);
    if (action === 'qty-dec') {
      const current = state.cart.find((i) => i.productId === id)?.qty || 1;
      if (current <= 1) removeCartItem(id); else setCartQty(id, current - 1);
    }
    if (action === 'remove-cart') removeCartItem(id);
    if (action === 'edit-product') editProduct(id);
    if (action === 'stock-plus') adjustStock(id, 1);
    if (action === 'stock-minus') adjustStock(id, -1);
    if (action === 'toggle-product') toggleProduct(id);
    if (action === 'edit-customer') editCustomer(id);
    if (action === 'delete-customer') deleteCustomer(id).catch(() => toast('No pudimos eliminar el cliente. Inténtalo de nuevo.', 'error'));
    if (action === 'delete-expense') deleteExpense(id).catch(() => toast('No pudimos eliminar el gasto. Inténtalo de nuevo.', 'error'));
    if (action === 'void-sale') voidSale(id);
  });
}

function setInitialDates() {
  const today = dateKeyFromDate();
  const firstMonthDay = dateKeyFromDate(new Date(now().getFullYear(), now().getMonth(), 1));
  ['salesFrom', 'expensesFrom'].forEach((id) => { const el = $(`#${id}`); if (el) el.value = firstMonthDay; });
  ['salesTo', 'expensesTo', 'expenseDate', 'purchaseDate'].forEach((id) => { const el = $(`#${id}`); if (el) el.value = today; });
}

function boot() {
  setInitialDates();
  wireEvents();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      cleanupListeners();
      state.user = null;
      $('#authScreen').hidden = false;
      $('#appShell').hidden = true;
      return;
    }

    $('#authScreen').hidden = true;
    $('#appShell').hidden = false;
    await initDataAfterLogin(user);
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => null);
  }
}

boot();
