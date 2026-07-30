import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, Users, Receipt, TrendingUp, Plus, X, Trash2, AlertTriangle, Search, ShoppingCart, ChevronDown, Barcode, Download, Upload, Cloud, Pencil, Tag, LogOut } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { supabase } from './lib/supabaseClient.js';

const productToDb = (p) => ({ id: p.id, name: p.name, price: p.price, cost: p.cost || 0, category: p.category || null, stock: p.stock, min_stock: p.minStock, barcode: p.barcode || null });
const productFromDb = (r) => ({ id: r.id, name: r.name, price: Number(r.price), cost: Number(r.cost) || 0, category: r.category || undefined, stock: r.stock, minStock: r.min_stock, barcode: r.barcode || undefined });

const clientToDb = (c) => ({ id: c.id, name: c.name, phone: c.phone || null });
const clientFromDb = (r) => ({ id: r.id, name: r.name, phone: r.phone || undefined });

const saleToDb = (s) => ({ id: s.id, order_id: s.orderId || null, client_id: s.clientId, product_id: s.productId, qty: s.qty, date: s.date, total: s.total, cost: s.cost || 0 });
const saleFromDb = (r) => ({ id: r.id, orderId: r.order_id || undefined, clientId: r.client_id, productId: r.product_id, qty: r.qty, date: r.date, total: Number(r.total), cost: Number(r.cost) || 0 });

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

const COLORS = {
  paper: '#EEEFE4',
  surface: '#FFFFFF',
  ink: '#21281F',
  inkMuted: '#6B7266',
  line: '#D8D9C9',
  amber: '#C98A2B',
  sage: '#55795C',
  rust: '#B14B3C',
};

const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
const monthKey = (d) => d.slice(0, 7);
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthLabel = (mk) => {
  const [y, m] = mk.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  const s = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const SEED = {
  products: [
    { id: 'p1', name: 'Café Colombia 250g', price: 6.5, stock: 4, minStock: 6 },
    { id: 'p2', name: 'Aceite de oliva 1L', price: 8.9, stock: 14, minStock: 5 },
    { id: 'p3', name: 'Pan de pueblo', price: 2.2, stock: 20, minStock: 8 },
    { id: 'p4', name: 'Queso curado 400g', price: 7.4, stock: 3, minStock: 4 },
    { id: 'p5', name: 'Miel artesana 500g', price: 5.8, stock: 9, minStock: 3 },
  ],
  clients: [
    { id: 'c1', name: 'Ana Ruiz', phone: '600 111 222' },
    { id: 'c2', name: 'Manuel Torres', phone: '600 333 444' },
    { id: 'c3', name: 'Lucía Fernández', phone: '600 555 666' },
  ],
  sales: [],
};

function seedSales() {
  const today = new Date();
  const sales = [];
  let id = 1;
  for (let i = 0; i < 18; i++) {
    const day = new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - i * 1.4 | 0));
    const p = SEED.products[i % SEED.products.length];
    const c = SEED.clients[i % SEED.clients.length];
    const qty = 1 + (i % 3);
    sales.push({
      id: `s${id++}`,
      clientId: c.id,
      productId: p.id,
      qty,
      date: day.toISOString().slice(0, 10),
      total: +(p.price * qty).toFixed(2),
    });
  }
  return sales;
}

function ticketShell(bodyHtml) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&display=swap');
    @page { size: 58mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body { width: 48mm; margin: 0 auto; padding: 3mm 2mm; font-family: 'IBM Plex Mono', 'Courier New', monospace; font-weight: 500; font-size: 12px; color: #000; -webkit-font-smoothing: none; }
    .center { text-align: center; }
    .line { border-top: 1.5px dashed #000; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    td { padding: 1.5px 0; vertical-align: top; font-weight: 500; }
    .num { text-align: right; white-space: nowrap; }
    .total-row td { border-top: 1.5px dashed #000; font-weight: 700; padding-top: 5px; font-size: 13px; }
    h1 { font-size: 14px; font-weight: 700; margin: 0 0 2px; }
    .muted { font-size: 10.5px; font-weight: 500; color: #000; }
  </style></head><body>${bodyHtml}</body></html>`;
}

function printSaleTicket(sale, product, client) {
  const body = `
    <div class="center">
      <h1>Cuaderno de Tienda</h1>
      <div class="muted">${new Date(sale.date).toLocaleDateString('es-ES')}</div>
    </div>
    <div class="line"></div>
    <table>
      <tr><td colspan="2">${product?.name || '—'}</td></tr>
      <tr><td>${sale.qty} x ${eur((product?.price) ?? (sale.total / sale.qty))}</td><td class="num">${eur(sale.total)}</td></tr>
    </table>
    <table><tr class="total-row"><td>TOTAL</td><td class="num">${eur(sale.total)}</td></tr></table>
    <div class="line"></div>
    <div class="center muted">${client ? client.name : 'Cliente sin registrar'}</div>
    <div class="center muted" style="margin-top:8px;">¡Gracias por su compra!</div>
  `;
  openPrintWindow(ticketShell(body));
}

function printCartTicket(salesArr, products, client) {
  const total = salesArr.reduce((sum, s) => sum + s.total, 0);
  const rows = salesArr.map((s) => {
    const p = products.find((x) => x.id === s.productId);
    const unit = p ? p.price : s.total / s.qty;
    return `<tr><td colspan="2">${p?.name || '—'}</td></tr><tr><td>${s.qty} x ${eur(unit)}</td><td class="num">${eur(s.total)}</td></tr>`;
  }).join('');
  const body = `
    <div class="center">
      <h1>Cuaderno de Tienda</h1>
      <div class="muted">${new Date(salesArr[0]?.date || todayISO()).toLocaleDateString('es-ES')}</div>
    </div>
    <div class="line"></div>
    <table>${rows}</table>
    <table><tr class="total-row"><td>TOTAL</td><td class="num">${eur(total)}</td></tr></table>
    <div class="line"></div>
    <div class="center muted">${client ? client.name : 'Cliente sin registrar'}</div>
    <div class="center muted" style="margin-top:8px;">¡Gracias por su compra!</div>
  `;
  openPrintWindow(ticketShell(body));
}

// Code 128 (subset B) barcode encoder — widths table per ISO/IEC 15417, index = symbol value 0-106
const CODE128_WIDTHS = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];

function encodeCode128B(text) {
  const chars = text.split('').filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126);
  const values = chars.map((ch) => ch.charCodeAt(0) - 32);
  const START_B = 104;
  let checksum = START_B;
  values.forEach((v, i) => { checksum += v * (i + 1); });
  checksum = checksum % 103;
  return [START_B, ...values, checksum, 106].map((v) => CODE128_WIDTHS[v]).join('');
}

function barcodeSVG(text, moduleWidth, height) {
  const widths = encodeCode128B(text).split('').map(Number);
  let x = 0;
  const bars = [];
  widths.forEach((w, i) => {
    const barWidth = w * moduleWidth;
    if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="#000"/>`);
    x += barWidth;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${height}" width="${x}" height="${height}">${bars.join('')}</svg>`;
}

function labelShell(bodyHtml) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@600;700&family=IBM+Plex+Mono:wght@500;700&display=swap');
    @page { size: 58mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body { width: 50mm; margin: 0 auto; font-family: 'IBM Plex Sans', Arial, sans-serif; -webkit-font-smoothing: none; }
    .label { padding: 3mm 2mm; text-align: center; page-break-after: always; }
    .label:last-child { page-break-after: auto; }
    .name { font-size: 12px; font-weight: 700; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .price { font-size: 15px; font-weight: 700; margin-bottom: 4px; font-family: 'IBM Plex Mono', monospace; }
    .code-text { font-size: 11px; font-weight: 500; font-family: 'IBM Plex Mono', monospace; margin-top: 3px; letter-spacing: 1px; }
    svg { display: block; margin: 0 auto; }
  </style></head><body>${bodyHtml}</body></html>`;
}

function printProductLabels(product, copies) {
  if (!product.barcode) return;
  const svg = barcodeSVG(product.barcode, 1.6, 40);
  const oneLabel = `
    <div class="label">
      <div class="name">${product.name}</div>
      <div class="price">${eur(product.price)}</div>
      ${svg}
      <div class="code-text">${product.barcode}</div>
    </div>
  `;
  const body = Array.from({ length: copies }).map(() => oneLabel).join('');
  openPrintWindow(labelShell(body));
}


function openPrintWindow(html) {
  const w = window.open('', '_blank');
  if (!w) { alert('El navegador ha bloqueado la ventana. Permite las ventanas emergentes para exportar.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

function reportShell(title, subtitle, bodyHtml) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${title}</title><style>
    * { box-sizing: border-box; }
    body { font-family: 'IBM Plex Sans', Arial, sans-serif; color: #21281F; margin: 0; padding: 36px 42px; }
    h1 { font-family: Georgia, serif; font-size: 22px; margin: 0 0 2px; }
    .subtitle { font-size: 12px; color: #6B7266; margin-bottom: 26px; }
    h2 { font-size: 14px; margin: 26px 0 8px; border-bottom: 1px solid #21281F; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 4px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #6B7266; border-bottom: 1px solid #D8D9C9; padding: 5px 4px; }
    td { padding: 5px 4px; border-bottom: 1px solid #EEEFE4; font-family: 'IBM Plex Mono', monospace; }
    td:first-child { font-family: inherit; }
    .num { text-align: right; }
    .client-block { break-inside: avoid; margin-bottom: 18px; }
    .client-block h3 { font-size: 13px; margin: 0 0 4px; }
    .client-total { text-align: right; font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 13px; padding: 4px; }
    .grand-total { display: flex; justify-content: space-between; align-items: baseline; border-top: 2px solid #21281F; margin-top: 20px; padding-top: 10px; font-size: 16px; }
    .grand-total .amount { font-family: 'IBM Plex Mono', monospace; font-weight: 700; }
    @media print { @page { margin: 16mm; } }
  </style></head><body>
    <h1>Cuaderno de Tienda</h1>
    <div class="subtitle">${subtitle} · generado el ${new Date().toLocaleDateString('es-ES')}</div>
    ${bodyHtml}
  </body></html>`;
}

export default function TiendaApp() {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [saleOpen, setSaleOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [labelProduct, setLabelProduct] = useState(null);
  const [salesSearch, setSalesSearch] = useState('');
  const [editingSale, setEditingSale] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [{ data: prodData, error: e1 }, { data: cliData, error: e2 }, { data: saleData, error: e3 }] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('clients').select('*'),
          supabase.from('sales').select('*'),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        if (e3) throw e3;

        if (prodData.length === 0 && cliData.length === 0 && saleData.length === 0) {
          const seeded = { ...SEED, sales: seedSales() };
          await Promise.all([
            supabase.from('products').upsert(seeded.products.map(productToDb)),
            supabase.from('clients').upsert(seeded.clients.map(clientToDb)),
            supabase.from('sales').upsert(seeded.sales.map(saleToDb)),
          ]);
          setProducts(seeded.products);
          setClients(seeded.clients);
          setSales(seeded.sales);
        } else {
          setProducts(prodData.map(productFromDb));
          setClients(cliData.map(clientFromDb));
          setSales(saleData.map(saleFromDb));
        }
      } catch (err) {
        console.error('Error cargando datos de Supabase:', err);
        showToast('No se pudo conectar con la base de datos');
      }
      setLoading(false);
    })();
    (async () => {
      try {
        const res = await window.storage.get('last-backup-date', false);
        setLastBackup(res.value);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('store-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        const { data } = await supabase.from('products').select('*');
        if (data) setProducts(data.map(productFromDb));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, async () => {
        const { data } = await supabase.from('clients').select('*');
        if (data) setClients(data.map(clientFromDb));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, async () => {
        const { data } = await supabase.from('sales').select('*');
        if (data) setSales(data.map(saleFromDb));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const syncTable = async (table, oldRows, newRows, toDb) => {
    const newIds = new Set(newRows.map((r) => r.id));
    const oldIds = oldRows.map((r) => r.id).filter((id) => !newIds.has(id));
    try {
      if (oldIds.length) await supabase.from(table).delete().in('id', oldIds);
      if (newRows.length) await supabase.from(table).upsert(newRows.map(toDb));
    } catch (err) {
      console.error(`Error sincronizando ${table}:`, err);
      showToast('Error guardando en la base de datos — revisa tu conexión');
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const updateAll = (p, c, s) => {
    syncTable('products', products, p, productToDb);
    syncTable('clients', clients, c, clientToDb);
    syncTable('sales', sales, s, saleToDb);
    setProducts(p); setClients(c); setSales(s);
  };

  const daysSinceBackup = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : null;
  const backupOverdue = daysSinceBackup === null || daysSinceBackup >= 7;

  const downloadBackup = () => {
    const payload = JSON.stringify({ products, clients, sales, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copia-tienda-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    const today = todayISO();
    setLastBackup(today);
    window.storage.set('last-backup-date', today, false).catch(() => {});
    showToast('Copia descargada — súbela a tu carpeta de Drive');
  };

  const restoreBackup = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data.products) || !Array.isArray(data.clients) || !Array.isArray(data.sales)) throw new Error('formato inválido');
        updateAll(data.products, data.clients, data.sales);
        showToast('Copia restaurada correctamente');
        setBackupOpen(false);
      } catch {
        showToast('El archivo no es una copia válida');
      }
    };
    reader.readAsText(file);
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthSales = useMemo(() => sales.filter((s) => monthKey(s.date) === currentMonth), [sales, currentMonth]);
  const monthRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);
  const monthCost = monthSales.reduce((sum, s) => sum + (s.cost || 0), 0);
  const monthMargin = monthRevenue - monthCost;
  const avgTicket = monthSales.length ? monthRevenue / monthSales.length : 0;
  const lowStock = products.filter((p) => p.stock <= p.minStock);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  const topProducts = useMemo(() => {
    const byProd = {};
    monthSales.forEach((s) => { byProd[s.productId] = (byProd[s.productId] || 0) + s.total; });
    return Object.entries(byProd)
      .map(([id, total]) => ({ id, name: productMap[id]?.name || '—', total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [monthSales, productMap]);

  const chartData = useMemo(() => {
    const byDay = {};
    monthSales.forEach((s) => {
      const day = s.date.slice(8, 10);
      byDay[day] = (byDay[day] || 0) + s.total;
    });
    return Object.entries(byDay)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([day, total]) => ({ day, total: +total.toFixed(2) }));
  }, [monthSales]);

  const availableMonths = useMemo(() => {
    const set = new Set(sales.map((s) => monthKey(s.date)));
    set.add(currentMonth);
    return Array.from(set).sort().reverse();
  }, [sales, currentMonth]);

  const billingData = useMemo(() => {
    const relevant = sales.filter((s) => monthKey(s.date) === billingMonth);
    const byClient = {};
    relevant.forEach((s) => {
      if (!byClient[s.clientId]) byClient[s.clientId] = { items: [], total: 0 };
      byClient[s.clientId].items.push(s);
      byClient[s.clientId].total += s.total;
    });
    return Object.entries(byClient)
      .map(([clientId, v]) => ({ clientId, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [sales, billingMonth]);

  const billingTotal = billingData.reduce((sum, c) => sum + c.total, 0);

  const clientTotals = useMemo(() => {
    const map = {};
    sales.forEach((s) => { map[s.clientId] = (map[s.clientId] || 0) + s.total; });
    return map;
  }, [sales]);

  if (loading) {
    return (
      <div style={{ background: COLORS.paper, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Sans', sans-serif", color: COLORS.inkMuted }}>
        <style>{FONTS}</style>
        Cargando tienda…
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.paper, minHeight: '100vh', fontFamily: "'IBM Plex Sans', sans-serif", color: COLORS.ink }}>
      <style>{FONTS}{`
        .font-display { font-family: 'Fraunces', serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        ::selection { background: ${COLORS.amber}33; }
        .stamp {
          border: 1.5px solid currentColor;
          border-radius: 999px;
          padding: 2px 10px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          display: inline-block;
          transform: rotate(-2deg);
        }
        .receipt {
          background: ${COLORS.surface};
          position: relative;
          border: 1px solid ${COLORS.line};
        }
        .receipt::before, .receipt::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          height: 10px;
          background-image: radial-gradient(circle at 8px 5px, ${COLORS.paper} 5px, transparent 5.5px);
          background-size: 16px 10px;
          background-repeat: repeat-x;
        }
        .receipt::before { top: -1px; }
        .receipt::after { bottom: -1px; transform: rotate(180deg); }
        .dotline { flex: 1; border-bottom: 1.5px dotted ${COLORS.line}; margin: 0 6px 4px; min-width: 12px; }
        .tab-btn { position: relative; }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -13px;
          height: 2px;
          background: ${COLORS.amber};
        }
        input, select { font-family: 'IBM Plex Sans', sans-serif; }

        .app-shell-padded { padding-left: 24px; padding-right: 24px; }
        .nav-tabs { display: flex; flex-wrap: wrap; row-gap: 18px; gap: 28px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
        .resumen-split { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; margin-bottom: 16px; }
        .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .header-top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; gap: 12px; }

        @media (max-width: 720px) {
          .app-shell-padded { padding-left: 16px; padding-right: 16px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .resumen-split { grid-template-columns: 1fr; }
          .nav-tabs { gap: 16px; row-gap: 16px; }
          h1.font-display, .store-title { font-size: 17px !important; }
        }
        @media (max-width: 480px) {
          .nav-tabs { gap: 12px; }
          .nav-tabs button { font-size: 13px !important; gap: 4px !important; }
        }
        @media (max-width: 420px) {
          .header-top-row { flex-wrap: wrap; }
        }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${COLORS.line}` }}>
        <div className="app-shell-padded" style={{ maxWidth: 1080, margin: '0 auto', paddingTop: 20 }}>
          <div className="header-top-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: COLORS.ink, color: COLORS.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Receipt size={18} />
              </div>
              <div>
                <div className="font-display store-title" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>Cuaderno de Tienda</div>
                <div className="font-mono" style={{ fontSize: 11, color: COLORS.inkMuted, marginTop: 2 }}>gestión diaria</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => { if (window.confirm('¿Cerrar sesión?')) window.location.href = '/logout'; }}
                title="Cerrar sesión"
                style={{ background: COLORS.surface, color: COLORS.ink, border: `1px solid ${COLORS.line}`, borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <LogOut size={16} />
              </button>
              <button
                onClick={() => setBackupOpen(true)}
                title="Copia de seguridad"
                style={{ background: COLORS.surface, color: COLORS.ink, border: `1px solid ${COLORS.line}`, borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
              >
                <Cloud size={17} />
                {backupOverdue && <span style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: COLORS.rust, border: `2px solid ${COLORS.paper}` }} />}
              </button>
              <button
                onClick={() => setSaleOpen(true)}
                style={{ background: COLORS.amber, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, cursor: 'pointer' }}
              >
                <Plus size={16} /> Nueva venta
              </button>
            </div>
          </div>
          <nav className="nav-tabs">
            {[
              ['resumen', 'Resumen', TrendingUp],
              ['inventario', 'Inventario', Package],
              ['clientes', 'Clientes', Users],
              ['ventas', 'Ventas', ShoppingCart],
              ['facturacion', 'Facturación', Receipt],
            ].map(([key, label, Icon]) => (
              <button
                key={key}
                className={`tab-btn ${tab === key ? 'active' : ''}`}
                onClick={() => setTab(key)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: tab === key ? COLORS.ink : COLORS.inkMuted, fontWeight: tab === key ? 600 : 400, fontSize: 14, whiteSpace: 'nowrap' }}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {backupOverdue && !bannerDismissed && (
        <div style={{ background: `${COLORS.amber}14`, borderBottom: `1px solid ${COLORS.amber}44` }}>
          <div className="app-shell-padded" style={{ maxWidth: 1080, margin: '0 auto', paddingTop: 10, paddingBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} color={COLORS.amber} />
              {daysSinceBackup === null ? 'Todavía no has hecho ninguna copia de seguridad.' : `Han pasado ${daysSinceBackup} días desde tu última copia de seguridad.`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={downloadBackup} style={{ background: COLORS.ink, color: COLORS.paper, border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>Descargar copia ahora</button>
              <button onClick={() => setBannerDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}><X size={15} /></button>
            </div>
          </div>
        </div>
      )}

      <main className="app-shell-padded" style={{ maxWidth: 1080, margin: '0 auto', paddingTop: 28, paddingBottom: 60 }}>
        {tab === 'resumen' && (
          <Resumen
            monthRevenue={monthRevenue}
            monthMargin={monthMargin}
            monthSalesCount={monthSales.length}
            avgTicket={avgTicket}
            lowStock={lowStock}
            topProducts={topProducts}
            chartData={chartData}
          />
        )}
        {tab === 'inventario' && (
          <Inventario
            products={products}
            search={productSearch}
            setSearch={setProductSearch}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            onAdd={() => { setEditingProduct(null); setProductOpen(true); }}
            onEdit={(p) => { setEditingProduct(p); setProductOpen(true); }}
            onScan={() => setScannerOpen(true)}
            onLabel={(p) => setLabelProduct(p)}
            onDelete={(id) => {
              if (sales.some((s) => s.productId === id)) { showToast('No se puede borrar: tiene ventas asociadas'); return; }
              updateAll(products.filter((p) => p.id !== id), clients, sales);
            }}
          />
        )}
        {tab === 'clientes' && (
          <Clientes
            clients={clients}
            clientTotals={clientTotals}
            onAdd={() => setClientOpen(true)}
            onDelete={(id) => {
              if (sales.some((s) => s.clientId === id)) { showToast('No se puede borrar: tiene compras asociadas'); return; }
              updateAll(products, clients.filter((c) => c.id !== id), sales);
            }}
          />
        )}
        {tab === 'ventas' && (
          <Ventas
            sales={sales}
            clientMap={clientMap}
            productMap={productMap}
            search={salesSearch}
            setSearch={setSalesSearch}
            editingSale={editingSale}
            setEditingSale={setEditingSale}
            onEditSale={(saleId, newQty) => {
              const sale = sales.find((s) => s.id === saleId);
              if (!sale) return false;
              const product = productMap[sale.productId];
              const availableStock = product.stock + sale.qty;
              if (newQty > availableStock) { showToast('Stock insuficiente para esa cantidad'); return false; }
              const newTotal = +(product.price * newQty).toFixed(2);
              const newCost = +((product.cost || 0) * newQty).toFixed(2);
              const newSales = sales.map((s) => s.id === saleId ? { ...s, qty: newQty, total: newTotal, cost: newCost } : s);
              const newProducts = products.map((p) => p.id === product.id ? { ...p, stock: availableStock - newQty } : p);
              updateAll(newProducts, clients, newSales);
              showToast('Venta actualizada');
              return true;
            }}
            onRemoveItem={(saleId) => {
              const sale = sales.find((s) => s.id === saleId);
              if (!sale) return;
              const newProducts = products.map((p) => p.id === sale.productId ? { ...p, stock: p.stock + sale.qty } : p);
              const newSales = sales.filter((s) => s.id !== saleId);
              updateAll(newProducts, clients, newSales);
              showToast('Producto devuelto — stock repuesto');
            }}
            onVoidOrder={(saleIds) => {
              const orderSales = sales.filter((s) => saleIds.includes(s.id));
              const newProducts = products.map((p) => {
                const qty = orderSales.filter((s) => s.productId === p.id).reduce((sum, s) => sum + s.qty, 0);
                return qty ? { ...p, stock: p.stock + qty } : p;
              });
              const newSales = sales.filter((s) => !saleIds.includes(s.id));
              updateAll(newProducts, clients, newSales);
              showToast('Pedido anulado — stock repuesto');
            }}
          />
        )}
        {tab === 'facturacion' && (
          <Facturacion
            month={billingMonth}
            setMonth={setBillingMonth}
            months={availableMonths}
            billingData={billingData}
            billingTotal={billingTotal}
            clientMap={clientMap}
            productMap={productMap}
            sales={sales}
          />
        )}
      </main>

      {saleOpen && (
        <SaleModal
          products={products}
          clients={clients}
          onClose={() => setSaleOpen(false)}
          onSaveCart={(cartItems, clientId, date) => {
            for (const item of cartItems) {
              const product = productMap[item.productId];
              if (!product || product.stock < item.qty) {
                showToast(`Stock insuficiente: ${product?.name || item.productId}`);
                return null;
              }
            }
            const orderId = 'o' + Date.now();
            const newSales = cartItems.map((item, i) => {
              const product = productMap[item.productId];
              return { id: orderId + '-' + i, orderId, clientId, productId: item.productId, qty: item.qty, date, total: +(product.price * item.qty).toFixed(2), cost: +((product.cost || 0) * item.qty).toFixed(2) };
            });
            const newProducts = products.map((p) => {
              const item = cartItems.find((c) => c.productId === p.id);
              return item ? { ...p, stock: p.stock - item.qty } : p;
            });
            updateAll(newProducts, clients, [...sales, ...newSales]);
            showToast('Venta registrada');
            return newSales;
          }}
          onCreateProduct={(barcode, { name, price, stock }) => {
            const product = { id: 'p' + Date.now(), name, price: parseFloat(price), stock: parseInt(stock || '0'), minStock: 3, barcode };
            updateAll([...products, product], clients, sales);
            return product;
          }}
        />
      )}
      {productOpen && (
        <ProductModal
          initialProduct={editingProduct}
          categories={Array.from(new Set(products.map((p) => p.category).filter(Boolean)))}
          onClose={() => { setProductOpen(false); setEditingProduct(null); }}
          onSave={(p) => {
            if (editingProduct) {
              updateAll(products.map((x) => x.id === p.id ? p : x), clients, sales);
            } else {
              updateAll([...products, p], clients, sales);
            }
            setProductOpen(false);
            setEditingProduct(null);
          }}
        />
      )}
      {clientOpen && (
        <ClientModal
          onClose={() => setClientOpen(false)}
          onSave={(c) => { updateAll(products, [...clients, c], sales); setClientOpen(false); }}
        />
      )}
      {scannerOpen && (
        <ScannerModal
          products={products}
          onClose={() => setScannerOpen(false)}
          onIncrement={(id) => {
            const next = products.map((p) => p.id === id ? { ...p, stock: p.stock + 1 } : p);
            updateAll(next, clients, sales);
          }}
          onDecrement={(id) => {
            const next = products.map((p) => p.id === id ? { ...p, stock: Math.max(0, p.stock - 1) } : p);
            updateAll(next, clients, sales);
          }}
          onCreate={(barcode, { name, price, stock }) => {
            const product = { id: 'p' + Date.now(), name, price: parseFloat(price), stock: parseInt(stock || '0'), minStock: 3, barcode };
            updateAll([...products, product], clients, sales);
            return product;
          }}
        />
      )}

      {backupOpen && (
        <BackupModal
          lastBackup={lastBackup}
          daysSinceBackup={daysSinceBackup}
          onClose={() => setBackupOpen(false)}
          onDownload={downloadBackup}
          onRestore={restoreBackup}
        />
      )}

      {labelProduct && (
        <LabelModal
          product={labelProduct}
          onClose={() => setLabelProduct(null)}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: COLORS.ink, color: COLORS.paper, padding: '10px 18px', borderRadius: 8, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 20, ...style }}>{children}</div>;
}

function Resumen({ monthRevenue, monthMargin, monthSalesCount, avgTicket, lowStock, topProducts, chartData }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 24 }}>
        <span className="font-mono" style={{ fontSize: 11, color: COLORS.inkMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Este mes</span>
        <span style={{ height: 1, flex: 1, background: COLORS.line }} />
      </div>
      <div className="stats-grid">
        <Card>
          <div style={{ fontSize: 12, color: COLORS.inkMuted, marginBottom: 6 }}>Facturación</div>
          <div className="font-mono" style={{ fontSize: 26, fontWeight: 600, color: COLORS.sage }}>{eur(monthRevenue)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.inkMuted, marginBottom: 6 }}>Beneficio</div>
          <div className="font-mono" style={{ fontSize: 26, fontWeight: 600, color: COLORS.amber }}>{eur(monthMargin)}</div>
          <div style={{ fontSize: 11, color: COLORS.inkMuted, marginTop: 2 }}>{monthRevenue > 0 ? `${Math.round((monthMargin / monthRevenue) * 100)}% margen` : 'sin datos de coste'}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.inkMuted, marginBottom: 6 }}>Ventas</div>
          <div className="font-mono" style={{ fontSize: 26, fontWeight: 600 }}>{monthSalesCount}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.inkMuted, marginBottom: 6 }}>Ticket medio</div>
          <div className="font-mono" style={{ fontSize: 26, fontWeight: 600 }}>{eur(avgTicket)}</div>
        </Card>
      </div>

      <div className="resumen-split">
        <Card>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Ventas por día</div>
          {chartData.length === 0 ? (
            <div style={{ color: COLORS.inkMuted, fontSize: 13, padding: '20px 0' }}>Sin ventas este mes todavía.</div>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.inkMuted, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: COLORS.inkMuted, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(v) => eur(v)}
                    contentStyle={{ background: COLORS.ink, border: 'none', borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: COLORS.paper }}
                    itemStyle={{ color: COLORS.paper }}
                  />
                  <Bar dataKey="total" fill={COLORS.amber} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Top productos</div>
          {topProducts.length === 0 ? (
            <div style={{ color: COLORS.inkMuted, fontSize: 13 }}>—</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topProducts.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="font-mono" style={{ fontSize: 11, color: COLORS.inkMuted, width: 14 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, flex: 1 }}>{p.name}</span>
                  <span className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>{eur(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <AlertTriangle size={15} color={COLORS.rust} />
          <div className="font-display" style={{ fontSize: 15, fontWeight: 600 }}>Stock bajo</div>
        </div>
        {lowStock.length === 0 ? (
          <div style={{ color: COLORS.inkMuted, fontSize: 13 }}>Todo el inventario está a nivel correcto.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {lowStock.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${COLORS.rust}12`, border: `1px solid ${COLORS.rust}33`, borderRadius: 8, padding: '6px 12px' }}>
                <span style={{ fontSize: 13 }}>{p.name}</span>
                <span className="font-mono" style={{ fontSize: 12, color: COLORS.rust, fontWeight: 600 }}>{p.stock} uds</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Inventario({ products, search, setSearch, categoryFilter, setCategoryFilter, onAdd, onEdit, onScan, onDelete, onLabel }) {
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
  const filtered = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !categoryFilter || p.category === categoryFilter);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 220 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: COLORS.inkMuted }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto…"
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, background: COLORS.surface, boxSizing: 'border-box' }}
            />
          </div>
          {categories.length > 0 && (
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, background: COLORS.surface }}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onScan} style={{ background: COLORS.surface, color: COLORS.ink, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Barcode size={15} /> Escanear
          </button>
          <button onClick={onAdd} style={{ background: COLORS.ink, color: COLORS.paper, border: 'none', borderRadius: 8, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Plus size={15} /> Añadir producto
          </button>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr 92px', padding: '10px 20px', fontSize: 11, color: COLORS.inkMuted, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${COLORS.line}`, minWidth: 560 }}>
          <span>Producto</span><span>Precio</span><span>Coste</span><span>Stock</span><span>Estado</span><span></span>
        </div>
        {filtered.length === 0 && <div style={{ padding: 24, color: COLORS.inkMuted, fontSize: 13 }}>No hay productos.</div>}
        {filtered.map((p) => {
          const low = p.stock <= p.minStock;
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr 92px', padding: '14px 20px', alignItems: 'center', borderBottom: `1px solid ${COLORS.line}`, fontSize: 14, minWidth: 560 }}>
              <span>
                {p.name}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                  {p.barcode && <span className="font-mono" style={{ fontSize: 10, color: COLORS.inkMuted }}>{p.barcode}</span>}
                  {p.category && <span style={{ fontSize: 10, color: COLORS.amber, background: `${COLORS.amber}15`, borderRadius: 4, padding: '1px 6px' }}>{p.category}</span>}
                </div>
              </span>
              <span className="font-mono">{eur(p.price)}</span>
              <span className="font-mono" style={{ color: COLORS.inkMuted }}>{p.cost ? eur(p.cost) : '—'}</span>
              <span className="font-mono">{p.stock} uds</span>
              <span>
                <span className="stamp" style={{ color: low ? COLORS.rust : COLORS.sage }}>{low ? 'bajo' : 'ok'}</span>
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                {p.barcode && (
                  <button onClick={() => onLabel(p)} title="Imprimir etiqueta" style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}>
                    <Tag size={14} />
                  </button>
                )}
                <button onClick={() => onEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}>
                  <Trash2 size={15} />
                </button>
              </span>
            </div>
          );
        })}
        </div>
      </Card>
    </div>
  );
}

function Clientes({ clients, clientTotals, onAdd, onDelete }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={onAdd} style={{ background: COLORS.ink, color: COLORS.paper, border: 'none', borderRadius: 8, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          <Plus size={15} /> Añadir cliente
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {clients.length === 0 && <div style={{ color: COLORS.inkMuted, fontSize: 13 }}>No hay clientes.</div>}
        {clients.map((c) => (
          <Card key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                <div className="font-mono" style={{ fontSize: 12, color: COLORS.inkMuted, marginTop: 3 }}>{c.phone || 'sin teléfono'}</div>
              </div>
              <button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}>
                <Trash2 size={14} />
              </button>
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, color: COLORS.inkMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total histórico</span>
              <span className="font-mono" style={{ fontWeight: 600 }}>{eur(clientTotals[c.id] || 0)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Facturacion({ month, setMonth, months, billingData, billingTotal, clientMap, productMap, sales }) {
  const year = month.slice(0, 4);

  const exportMonth = () => {
    const rows = billingData.map(({ clientId, items, total }) => `
      <div class="client-block">
        <h3>${clientMap[clientId]?.name || 'Cliente'}</h3>
        <table>
          <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead>
          <tbody>
            ${items.map((s) => `<tr><td>${productMap[s.productId]?.name || '—'}</td><td class="num">${s.qty}</td><td class="num">${eur(s.total / s.qty)}</td><td class="num">${eur(s.total)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="client-total">Total ${clientMap[clientId]?.name || ''}: ${eur(total)}</div>
      </div>
    `).join('') || '<p style="color:#6B7266;font-size:13px;">Ninguna venta registrada este mes.</p>';

    const body = `${rows}<div class="grand-total"><span>Total del mes</span><span class="amount">${eur(billingTotal)}</span></div>`;
    openPrintWindow(reportShell(`Facturación ${monthLabel(month)}`, `Facturación mensual — ${monthLabel(month)}`, body));
  };

  const exportYear = () => {
    const yearSales = sales.filter((s) => s.date.slice(0, 4) === year);
    const byMonth = {};
    const byClient = {};
    const byProduct = {};
    yearSales.forEach((s) => {
      const mk = s.date.slice(0, 7);
      byMonth[mk] = (byMonth[mk] || 0) + s.total;
      byClient[s.clientId] = (byClient[s.clientId] || 0) + s.total;
      if (!byProduct[s.productId]) byProduct[s.productId] = { qty: 0, total: 0 };
      byProduct[s.productId].qty += s.qty;
      byProduct[s.productId].total += s.total;
    });
    const yearTotal = yearSales.reduce((sum, s) => sum + s.total, 0);

    const monthRows = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mk, total]) => `<tr><td>${monthLabel(mk)}</td><td class="num">${eur(total)}</td></tr>`).join('');
    const clientRows = Object.entries(byClient).sort((a, b) => b[1] - a[1])
      .map(([id, total]) => `<tr><td>${clientMap[id]?.name || '—'}</td><td class="num">${eur(total)}</td></tr>`).join('');
    const productRows = Object.entries(byProduct).sort((a, b) => b[1].total - a[1].total)
      .map(([id, v]) => `<tr><td>${productMap[id]?.name || '—'}</td><td class="num">${v.qty} uds</td><td class="num">${eur(v.total)}</td></tr>`).join('');

    const body = `
      <h2>Por mes</h2>
      <table><thead><tr><th>Mes</th><th class="num">Facturación</th></tr></thead><tbody>${monthRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
      <h2>Por cliente</h2>
      <table><thead><tr><th>Cliente</th><th class="num">Total comprado</th></tr></thead><tbody>${clientRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
      <h2>Por producto</h2>
      <table><thead><tr><th>Producto</th><th class="num">Unidades</th><th class="num">Total</th></tr></thead><tbody>${productRows || '<tr><td colspan="3">Sin datos</td></tr>'}</tbody></table>
      <div class="grand-total"><span>Total del año ${year}</span><span class="amount">${eur(yearTotal)}</span></div>
    `;
    openPrintWindow(reportShell(`Facturación ${year}`, `Facturación anual — ${year}`, body));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="font-display" style={{ fontSize: 20, fontWeight: 600 }}>{monthLabel(month)}</div>
          <div className="font-mono" style={{ fontSize: 12, color: COLORS.inkMuted, marginTop: 2 }}>Total del mes: <strong style={{ color: COLORS.sage }}>{eur(billingTotal)}</strong></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ appearance: 'none', padding: '9px 32px 9px 14px', borderRadius: 8, border: `1px solid ${COLORS.line}`, background: COLORS.surface, fontSize: 13, cursor: 'pointer' }}
            >
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: 11, pointerEvents: 'none', color: COLORS.inkMuted }} />
          </div>
          <button onClick={exportMonth} style={{ background: COLORS.surface, color: COLORS.ink, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Download size={14} /> Exportar mes
          </button>
          <button onClick={exportYear} style={{ background: COLORS.ink, color: COLORS.paper, border: 'none', borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Download size={14} /> Exportar año {year}
          </button>
        </div>
      </div>

      {billingData.length === 0 ? (
        <Card><div style={{ color: COLORS.inkMuted, fontSize: 13 }}>Ninguna venta registrada este mes.</div></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {billingData.map(({ clientId, items, total }) => (
            <div key={clientId} className="receipt" style={{ padding: '22px 20px 16px', borderRadius: 4 }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div className="font-display" style={{ fontWeight: 600, fontSize: 16 }}>{clientMap[clientId]?.name || 'Cliente'}</div>
                <div className="font-mono" style={{ fontSize: 10, color: COLORS.inkMuted, letterSpacing: '0.08em', marginTop: 2 }}>{monthLabel(month).toUpperCase()}</div>
              </div>
              <div style={{ borderTop: `1.5px dashed ${COLORS.line}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((s) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'baseline', fontSize: 12.5 }}>
                    <span style={{ whiteSpace: 'nowrap' }}>{productMap[s.productId]?.name || '—'} {s.qty > 1 ? `×${s.qty}` : ''}</span>
                    <span className="dotline" />
                    <span className="font-mono">{eur(s.total)}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: `1.5px dashed ${COLORS.line}`, marginTop: 14, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                <span className="font-mono" style={{ fontWeight: 700, fontSize: 16 }}>{eur(total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BackupModal({ lastBackup, daysSinceBackup, onClose, onDownload, onRestore }) {
  const fileInputRef = useRef(null);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000055', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: 12, padding: 24, width: 380, maxWidth: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div className="font-display" style={{ fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cloud size={17} /> Copia de seguridad
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.inkMuted, marginBottom: 18 }}>
          {lastBackup
            ? `Última copia: ${new Date(lastBackup).toLocaleDateString('es-ES')} (hace ${daysSinceBackup} ${daysSinceBackup === 1 ? 'día' : 'días'}).`
            : 'Todavía no has hecho ninguna copia.'}
        </div>

        <button onClick={onDownload} style={{ ...submitStyle, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Download size={15} /> Descargar copia (.json)
        </button>
        <div style={{ fontSize: 11, color: COLORS.inkMuted, marginTop: -12, marginBottom: 20 }}>
          Recomendado: guarda el archivo directamente en la carpeta de tu ordenador que sincroniza con Google Drive.
        </div>

        <div style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Restaurar desde una copia</div>
          <div style={{ fontSize: 11.5, color: COLORS.inkMuted, marginBottom: 10 }}>
            Sustituye todos los datos actuales por los del archivo. Úsalo solo si necesitas recuperar la tienda tras perder los datos.
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100%', background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: '9px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Upload size={14} /> Elegir archivo de copia
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) onRestore(e.target.files[0]); e.target.value = ''; }}
          />
        </div>
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, children, onSubmit }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000055', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{ background: COLORS.surface, borderRadius: 12, padding: 24, width: 360, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div className="font-display" style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}><X size={18} /></button>
        </div>
        {children}
      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, boxSizing: 'border-box', marginBottom: 14 };
const labelStyle = { fontSize: 11, color: COLORS.inkMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 };
const submitStyle = { width: '100%', background: COLORS.amber, color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 500, cursor: 'pointer' };

function ProductModal({ onClose, onSave, initialProduct, categories }) {
  const [name, setName] = useState(initialProduct?.name || '');
  const [price, setPrice] = useState(initialProduct ? String(initialProduct.price) : '');
  const [cost, setCost] = useState(initialProduct?.cost ? String(initialProduct.cost) : '');
  const [category, setCategory] = useState(initialProduct?.category || '');
  const [stock, setStock] = useState(initialProduct ? String(initialProduct.stock) : '');
  const [minStock, setMinStock] = useState(initialProduct ? String(initialProduct.minStock) : '3');
  const [barcode, setBarcode] = useState(initialProduct?.barcode || '');
  return (
    <ModalShell title={initialProduct ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} onSubmit={(e) => {
      e.preventDefault();
      if (!name || !price) return;
      onSave({ id: initialProduct?.id || ('p' + Date.now()), name, price: parseFloat(price), cost: cost ? parseFloat(cost) : 0, category: category || undefined, stock: parseInt(stock || '0'), minStock: parseInt(minStock || '0'), barcode: barcode || undefined });
    }}>
      <label style={labelStyle}>Nombre</label>
      <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Precio de venta (€)</label>
          <input style={inputStyle} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Precio de coste (€)</label>
          <input style={inputStyle} type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <label style={labelStyle}>Categoría (opcional)</label>
      <input style={inputStyle} list="category-options" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej. bebidas, limpieza…" />
      <datalist id="category-options">
        {(categories || []).map((c) => <option key={c} value={c} />)}
      </datalist>
      <label style={labelStyle}>Stock {initialProduct ? 'actual' : 'inicial'}</label>
      <input style={inputStyle} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
      <label style={labelStyle}>Aviso de stock bajo (uds)</label>
      <input style={inputStyle} type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
      <label style={labelStyle}>Código de barras (opcional)</label>
      <input style={inputStyle} value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Escanea o escribe el código" />
      <button style={submitStyle} type="submit">{initialProduct ? 'Guardar cambios' : 'Guardar producto'}</button>
    </ModalShell>
  );
}

function ClientModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <ModalShell title="Nuevo cliente" onClose={onClose} onSubmit={(e) => {
      e.preventDefault();
      if (!name) return;
      onSave({ id: 'c' + Date.now(), name, phone });
    }}>
      <label style={labelStyle}>Nombre</label>
      <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
      <label style={labelStyle}>Teléfono (opcional)</label>
      <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <button style={submitStyle} type="submit">Guardar cliente</button>
    </ModalShell>
  );
}

function SaleModal({ products, clients, onClose, onSaveCart, onCreateProduct }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [date, setDate] = useState(todayISO());
  const [cart, setCart] = useState([]);
  const [scanValue, setScanValue] = useState('');
  const [manualProductId, setManualProductId] = useState(products[0]?.id || '');
  const [manualQty, setManualQty] = useState('1');
  const [error, setError] = useState('');
  const [pendingBarcode, setPendingBarcode] = useState(null);
  const [npName, setNpName] = useState('');
  const [npPrice, setNpPrice] = useState('');
  const [npStock, setNpStock] = useState('1');
  const [savedCart, setSavedCart] = useState(null);
  const scanRef = useRef(null);

  useEffect(() => {
    if (!savedCart && !pendingBarcode) scanRef.current?.focus();
  }, [cart, savedCart, pendingBarcode]);

  const addToCart = (productId, qtyToAdd) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const existing = cart.find((c) => c.productId === productId);
    const newQty = (existing?.qty || 0) + qtyToAdd;
    if (newQty > product.stock) {
      setError(`Stock insuficiente de "${product.name}" (disponible: ${product.stock})`);
      return;
    }
    setError('');
    if (existing) {
      setCart(cart.map((c) => c.productId === productId ? { ...c, qty: newQty } : c));
    } else {
      setCart([...cart, { productId, qty: newQty }]);
    }
  };

  const handleScan = (e) => {
    e.preventDefault();
    const code = scanValue.trim();
    setScanValue('');
    if (!code) return;
    const product = products.find((p) => p.barcode === code);
    if (product) {
      addToCart(product.id, 1);
    } else {
      setError('');
      setPendingBarcode(code);
    }
  };

  const handleCreateFromScan = (e) => {
    e.preventDefault();
    if (!npName || !npPrice) return;
    const product = onCreateProduct(pendingBarcode, { name: npName, price: npPrice, stock: npStock });
    setPendingBarcode(null);
    setNpName(''); setNpPrice(''); setNpStock('1');
    addToCart(product.id, 1);
  };

  const handleManualAdd = () => {
    if (!manualProductId) return;
    addToCart(manualProductId, parseInt(manualQty || '1'));
  };

  const updateQty = (productId, delta) => {
    const product = products.find((p) => p.id === productId);
    setCart((prev) => prev
      .map((c) => {
        if (c.productId !== productId) return c;
        const newQty = c.qty + delta;
        if (newQty > (product?.stock || 0)) { setError(`Stock insuficiente de "${product?.name}"`); return c; }
        setError('');
        return { ...c, qty: newQty };
      })
      .filter((c) => c.qty > 0));
  };

  const removeFromCart = (productId) => setCart(cart.filter((c) => c.productId !== productId));

  const cartTotal = cart.reduce((sum, c) => {
    const p = products.find((x) => x.id === c.productId);
    return sum + (p ? p.price * c.qty : 0);
  }, 0);

  const resetForNewSale = () => {
    setSavedCart(null);
    setCart([]);
    setDate(todayISO());
  };

  const handleRegister = () => {
    if (!clientId) { setError('Selecciona un cliente.'); return; }
    if (cart.length === 0) { setError('Añade al menos un producto al carrito.'); return; }
    const result = onSaveCart(cart, clientId, date);
    if (result) setSavedCart(result);
  };

  if (savedCart) {
    const savedClient = clients.find((c) => c.id === clientId);
    const total = savedCart.reduce((sum, s) => sum + s.total, 0);
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#00000055', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: 12, padding: 24, width: 380, maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="font-display" style={{ fontSize: 17, fontWeight: 600 }}>Venta registrada</div>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}><X size={18} /></button>
          </div>
          <div style={{ background: `${COLORS.sage}12`, border: `1px solid ${COLORS.sage}33`, borderRadius: 8, padding: 14, marginBottom: 18, fontSize: 13 }}>
            {savedCart.map((s) => {
              const p = products.find((x) => x.id === s.productId);
              return <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span>{p?.name} × {s.qty}</span><span className="font-mono">{eur(s.total)}</span></div>;
            })}
            <div style={{ color: COLORS.inkMuted, fontSize: 12, marginTop: 6 }}>{savedClient?.name}</div>
            <div className="font-mono" style={{ fontWeight: 700, fontSize: 16, marginTop: 6, borderTop: `1px solid ${COLORS.sage}33`, paddingTop: 6 }}>{eur(total)}</div>
          </div>
          <button onClick={() => printCartTicket(savedCart, products, savedClient)} style={{ ...submitStyle, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            🖨️ Imprimir ticket
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={resetForNewSale} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: '9px', fontSize: 13, cursor: 'pointer' }}>Otra venta</button>
            <button onClick={onClose} style={{ flex: 1, background: COLORS.ink, color: COLORS.paper, border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  if (clients.length === 0 || products.length === 0) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#00000055', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: 12, padding: 24, width: 360, maxWidth: '100%' }}>
          <div style={{ fontSize: 13, color: COLORS.inkMuted }}>Necesitas al menos un cliente y un producto antes de registrar una venta.</div>
          <button type="button" onClick={onClose} style={{ ...submitStyle, marginTop: 14 }}>Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000055', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: 12, padding: 24, width: 420, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="font-display" style={{ fontSize: 17, fontWeight: 600 }}>Registrar venta</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}><X size={18} /></button>
        </div>

        <label style={labelStyle}>Cliente</label>
        <select style={inputStyle} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label style={labelStyle}>Fecha</label>
        <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <form onSubmit={handleScan} style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Escanear producto</label>
          <input
            ref={scanRef}
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            placeholder="Esperando código…"
            style={{ ...inputStyle, marginBottom: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, textAlign: 'center' }}
          />
        </form>

        <details style={{ marginBottom: 14 }}>
          <summary style={{ fontSize: 12, color: COLORS.inkMuted, cursor: 'pointer', marginBottom: 8 }}>Añadir manualmente</summary>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <select style={{ ...inputStyle, marginBottom: 0, flex: 2 }} value={manualProductId} onChange={(e) => setManualProductId(e.target.value)}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock} uds)</option>)}
            </select>
            <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} type="number" min="1" value={manualQty} onChange={(e) => setManualQty(e.target.value)} />
            <button type="button" onClick={handleManualAdd} style={{ background: COLORS.ink, color: COLORS.paper, border: 'none', borderRadius: 8, padding: '0 14px', fontSize: 13, cursor: 'pointer' }}>+</button>
          </div>
        </details>

        {pendingBarcode && (
          <form onSubmit={handleCreateFromScan} style={{ background: `${COLORS.amber}12`, border: `1px solid ${COLORS.amber}44`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, marginBottom: 10 }}>
              Código <span className="font-mono">{pendingBarcode}</span> no reconocido. Créalo para añadirlo directamente a esta venta:
            </div>
            <label style={labelStyle}>Nombre</label>
            <input style={inputStyle} value={npName} onChange={(e) => setNpName(e.target.value)} autoFocus required />
            <label style={labelStyle}>Precio (€)</label>
            <input style={inputStyle} type="number" step="0.01" min="0" value={npPrice} onChange={(e) => setNpPrice(e.target.value)} required />
            <label style={labelStyle}>Stock inicial</label>
            <input style={{ ...inputStyle, marginBottom: 10 }} type="number" min="0" value={npStock} onChange={(e) => setNpStock(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setPendingBarcode(null)} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: '9px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ flex: 1, ...submitStyle }}>Crear y añadir</button>
            </div>
          </form>
        )}

        {error && <div style={{ fontSize: 12, color: COLORS.rust, background: `${COLORS.rust}12`, border: `1px solid ${COLORS.rust}33`, borderRadius: 6, padding: '8px 10px', marginBottom: 14 }}>{error}</div>}

        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}>
          {cart.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12.5, color: COLORS.inkMuted, textAlign: 'center' }}>Carrito vacío — escanea o añade productos.</div>
          ) : (
            cart.map((c) => {
              const p = products.find((x) => x.id === c.productId);
              return (
                <div key={c.productId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderBottom: `1px solid ${COLORS.line}`, fontSize: 13 }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name}</span>
                  <button type="button" onClick={() => updateQty(c.productId, -1)} style={{ flexShrink: 0, background: COLORS.paper, border: `1px solid ${COLORS.line}`, borderRadius: 5, width: 22, height: 22, cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>−</button>
                  <span className="font-mono" style={{ flexShrink: 0, width: 18, textAlign: 'center' }}>{c.qty}</span>
                  <button type="button" onClick={() => updateQty(c.productId, 1)} style={{ flexShrink: 0, background: COLORS.paper, border: `1px solid ${COLORS.line}`, borderRadius: 5, width: 22, height: 22, cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>+</button>
                  <span className="font-mono" style={{ flexShrink: 0, width: 54, textAlign: 'right' }}>{p ? eur(p.price * c.qty) : ''}</span>
                  <button type="button" onClick={() => removeFromCart(c.productId)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}><X size={14} /></button>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: COLORS.inkMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
          <span className="font-mono" style={{ fontWeight: 700, fontSize: 18 }}>{eur(cartTotal)}</span>
        </div>

        <button onClick={handleRegister} style={submitStyle}>
          <ShoppingCart size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Registrar venta
        </button>
      </div>
    </div>
  );
}

function ScannerModal({ products, onClose, onIncrement, onDecrement, onCreate }) {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(null);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('1');
  const [log, setLog] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!pending) inputRef.current?.focus();
  }, [pending, log]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = value.trim();
    setValue('');
    if (!code) return;
    const product = products.find((p) => p.barcode === code);
    if (product) {
      onIncrement(product.id);
      setLog((l) => [{ id: Date.now(), text: `+1 uds · ${product.name}`, productId: product.id }, ...l].slice(0, 8));
    } else {
      setPending(code);
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName || !newPrice) return;
    onCreate(pending, { name: newName, price: newPrice, stock: newStock });
    setLog((l) => [{ id: Date.now(), text: `Nuevo producto · ${newName}` }, ...l].slice(0, 8));
    setPending(null);
    setNewName(''); setNewPrice(''); setNewStock('1');
  };

  const handleUndo = (entryId, productId) => {
    onDecrement(productId);
    setLog((l) => l.map((entry) => entry.id === entryId ? { ...entry, undone: true } : entry));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000055', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: 12, padding: 24, width: 380, maxWidth: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div className="font-display" style={{ fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Barcode size={17} /> Escanear
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12, color: COLORS.inkMuted, marginBottom: 16 }}>
          Cada código escaneado suma 1 unidad de stock. Si te equivocas y escaneas de más, pulsa "deshacer" en esa línea del historial.
        </div>

        {!pending ? (
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Esperando código…"
              autoFocus
              style={{ ...inputStyle, marginBottom: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, textAlign: 'center' }}
            />
          </form>
        ) : (
          <form onSubmit={handleCreate} style={{ background: `${COLORS.amber}12`, border: `1px solid ${COLORS.amber}44`, borderRadius: 8, padding: 14, marginBottom: 4 }}>
            <div style={{ fontSize: 12.5, marginBottom: 10 }}>
              Código <span className="font-mono">{pending}</span> no coincide con ningún producto. Créalo:
            </div>
            <label style={labelStyle}>Nombre</label>
            <input style={inputStyle} value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus required />
            <label style={labelStyle}>Precio (€)</label>
            <input style={inputStyle} type="number" step="0.01" min="0" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required />
            <label style={labelStyle}>Stock inicial</label>
            <input style={{ ...inputStyle, marginBottom: 10 }} type="number" min="0" value={newStock} onChange={(e) => setNewStock(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setPending(null)} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: '9px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ flex: 1, ...submitStyle }}>Crear</button>
            </div>
          </form>
        )}

        {log.length > 0 && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.line}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {log.map((l) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="font-mono" style={{ fontSize: 11.5, color: l.undone ? COLORS.inkMuted : COLORS.sage, textDecoration: l.undone ? 'line-through' : 'none' }}>
                  {l.text}{l.undone ? ' (deshecho)' : ''}
                </span>
                {l.productId && !l.undone && (
                  <button type="button" onClick={() => handleUndo(l.id, l.productId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.rust, fontSize: 11, textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                    deshacer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Ventas({ sales, clientMap, productMap, search, setSearch, editingSale, setEditingSale, onEditSale, onRemoveItem, onVoidOrder }) {
  const orders = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      const key = `${s.clientId}__${s.date}`;
      if (!map[key]) map[key] = { key, clientId: s.clientId, date: s.date, items: [] };
      map[key].items.push(s);
    });
    return Object.values(map).sort((a, b) => (b.date + b.key).localeCompare(a.date + a.key));
  }, [sales]);

  const q = search.toLowerCase();
  const filtered = orders.filter((o) => {
    if (!q) return true;
    const clientName = (clientMap[o.clientId]?.name || '').toLowerCase();
    if (clientName.includes(q)) return true;
    return o.items.some((it) => (productMap[it.productId]?.name || '').toLowerCase().includes(q));
  });

  return (
    <div>
      <div style={{ position: 'relative', maxWidth: 320, marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: COLORS.inkMuted }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente o producto…"
          style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, background: COLORS.surface, boxSizing: 'border-box' }}
        />
      </div>

      {filtered.length === 0 ? (
        <Card><div style={{ color: COLORS.inkMuted, fontSize: 13 }}>No hay pedidos que coincidan.</div></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filtered.map((o) => {
            const total = o.items.reduce((sum, it) => sum + it.total, 0);
            return (
              <div key={o.key} className="receipt" style={{ padding: '22px 20px 16px', borderRadius: 4 }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div className="font-display" style={{ fontWeight: 600, fontSize: 16 }}>{clientMap[o.clientId]?.name || 'Cliente'}</div>
                  <div className="font-mono" style={{ fontSize: 10, color: COLORS.inkMuted, letterSpacing: '0.08em', marginTop: 2 }}>{new Date(o.date).toLocaleDateString('es-ES').toUpperCase()}</div>
                </div>
                <div style={{ borderTop: `1.5px dashed ${COLORS.line}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {o.items.map((it) => {
                    const p = productMap[it.productId];
                    return (
                      <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                        <span style={{ flex: 1 }}>{p?.name || '—'} {it.qty > 1 ? `×${it.qty}` : ''}</span>
                        <span className="font-mono">{eur(it.total)}</span>
                        <button onClick={() => setEditingSale(it)} title="Editar cantidad" style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted, padding: 2 }}>
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`¿Devolver "${p?.name || 'este producto'}"? Se repondrá el stock.`)) onRemoveItem(it.id); }}
                          title="Devolver este producto"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted, padding: 2 }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop: `1.5px dashed ${COLORS.line}`, marginTop: 14, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                  <span className="font-mono" style={{ fontWeight: 700, fontSize: 16 }}>{eur(total)}</span>
                </div>
                <button
                  onClick={() => { if (window.confirm('¿Anular todo el pedido? Se repondrá el stock de todos los productos.')) onVoidOrder(o.items.map((it) => it.id)); }}
                  style={{ width: '100%', marginTop: 12, background: 'none', border: `1px solid ${COLORS.rust}55`, color: COLORS.rust, borderRadius: 6, padding: '6px', fontSize: 11.5, cursor: 'pointer' }}
                >
                  Anular pedido completo
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          product={productMap[editingSale.productId]}
          onClose={() => setEditingSale(null)}
          onSave={(newQty) => { const ok = onEditSale(editingSale.id, newQty); if (ok) setEditingSale(null); }}
        />
      )}
    </div>
  );
}

function EditSaleModal({ sale, product, onClose, onSave }) {
  const [qty, setQty] = useState(String(sale.qty));
  const availableStock = (product?.stock || 0) + sale.qty;
  return (
    <ModalShell title="Editar venta" onClose={onClose} onSubmit={(e) => {
      e.preventDefault();
      const q = parseInt(qty || '0');
      if (q < 1) return;
      onSave(q);
    }}>
      <div style={{ fontSize: 13, marginBottom: 14 }}>
        <div style={{ fontWeight: 600 }}>{product?.name || '—'}</div>
        <div style={{ color: COLORS.inkMuted, fontSize: 12, marginTop: 2 }}>Disponible para esta venta: {availableStock} uds</div>
      </div>
      <label style={labelStyle}>Cantidad</label>
      <input style={inputStyle} type="number" min="1" max={availableStock} value={qty} onChange={(e) => setQty(e.target.value)} />
      {product && <div style={{ fontSize: 13, color: COLORS.inkMuted, marginBottom: 14 }}>Nuevo total: <strong className="font-mono" style={{ color: COLORS.ink }}>{eur(product.price * parseInt(qty || '0'))}</strong></div>}
      <button style={submitStyle} type="submit">Guardar cambios</button>
    </ModalShell>
  );
}

function LabelModal({ product, onClose }) {
  const [copies, setCopies] = useState('1');
  return (
    <ModalShell title="Imprimir etiqueta" onClose={onClose} onSubmit={(e) => {
      e.preventDefault();
      printProductLabels(product, Math.max(1, parseInt(copies || '1')));
      onClose();
    }}>
      <div style={{ fontSize: 13, marginBottom: 14 }}>
        <div style={{ fontWeight: 600 }}>{product.name}</div>
        <div className="font-mono" style={{ color: COLORS.inkMuted, fontSize: 12, marginTop: 2 }}>{product.barcode}</div>
      </div>
      <label style={labelStyle}>Número de etiquetas</label>
      <input style={inputStyle} type="number" min="1" value={copies} onChange={(e) => setCopies(e.target.value)} />
      <button style={submitStyle} type="submit"><Tag size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Imprimir</button>
    </ModalShell>
  );
}
