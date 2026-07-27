import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, Users, Receipt, TrendingUp, Plus, X, Trash2, AlertTriangle, Search, ShoppingCart, ChevronDown, Barcode, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

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
  const [clientOpen, setClientOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));
  const [productSearch, setProductSearch] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get('store-data', false);
        const data = JSON.parse(res.value);
        setProducts(data.products || []);
        setClients(data.clients || []);
        setSales(data.sales || []);
      } catch {
        const seeded = { ...SEED, sales: seedSales() };
        setProducts(seeded.products);
        setClients(seeded.clients);
        setSales(seeded.sales);
        try { await window.storage.set('store-data', JSON.stringify(seeded), false); } catch {}
      }
      setLoading(false);
    })();
  }, []);

  const persist = async (next) => {
    try { await window.storage.set('store-data', JSON.stringify(next), false); } catch {}
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const updateAll = (p, c, s) => {
    setProducts(p); setClients(c); setSales(s);
    persist({ products: p, clients: c, sales: s });
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthSales = useMemo(() => sales.filter((s) => monthKey(s.date) === currentMonth), [sales, currentMonth]);
  const monthRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);
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
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${COLORS.line}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: COLORS.ink, color: COLORS.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt size={18} />
              </div>
              <div>
                <div className="font-display" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>Cuaderno de Tienda</div>
                <div className="font-mono" style={{ fontSize: 11, color: COLORS.inkMuted, marginTop: 2 }}>gestión diaria</div>
              </div>
            </div>
            <button
              onClick={() => setSaleOpen(true)}
              style={{ background: COLORS.amber, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, cursor: 'pointer' }}
            >
              <Plus size={16} /> Nueva venta
            </button>
          </div>
          <nav style={{ display: 'flex', gap: 28 }}>
            {[
              ['resumen', 'Resumen', TrendingUp],
              ['inventario', 'Inventario', Package],
              ['clientes', 'Clientes', Users],
              ['facturacion', 'Facturación', Receipt],
            ].map(([key, label, Icon]) => (
              <button
                key={key}
                className={`tab-btn ${tab === key ? 'active' : ''}`}
                onClick={() => setTab(key)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: tab === key ? COLORS.ink : COLORS.inkMuted, fontWeight: tab === key ? 600 : 400, fontSize: 14 }}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 24px 60px' }}>
        {tab === 'resumen' && (
          <Resumen
            monthRevenue={monthRevenue}
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
            onAdd={() => setProductOpen(true)}
            onScan={() => setScannerOpen(true)}
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
          onSave={(sale) => {
            const product = productMap[sale.productId];
            if (!product || product.stock < sale.qty) { showToast('Stock insuficiente'); return; }
            const newSales = [...sales, sale];
            const newProducts = products.map((p) => p.id === sale.productId ? { ...p, stock: p.stock - sale.qty } : p);
            updateAll(newProducts, clients, newSales);
            setSaleOpen(false);
            showToast('Venta registrada');
          }}
        />
      )}
      {productOpen && (
        <ProductModal
          onClose={() => setProductOpen(false)}
          onSave={(p) => { updateAll([...products, p], clients, sales); setProductOpen(false); }}
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
          onCreate={(barcode, { name, price, stock }) => {
            const product = { id: 'p' + Date.now(), name, price: parseFloat(price), stock: parseInt(stock || '0'), minStock: 3, barcode };
            updateAll([...products, product], clients, sales);
            return product;
          }}
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

function Resumen({ monthRevenue, monthSalesCount, avgTicket, lowStock, topProducts, chartData }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 24 }}>
        <span className="font-mono" style={{ fontSize: 11, color: COLORS.inkMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Este mes</span>
        <span style={{ height: 1, flex: 1, background: COLORS.line }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.inkMuted, marginBottom: 6 }}>Facturación</div>
          <div className="font-mono" style={{ fontSize: 28, fontWeight: 600, color: COLORS.sage }}>{eur(monthRevenue)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.inkMuted, marginBottom: 6 }}>Ventas</div>
          <div className="font-mono" style={{ fontSize: 28, fontWeight: 600 }}>{monthSalesCount}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.inkMuted, marginBottom: 6 }}>Ticket medio</div>
          <div className="font-mono" style={{ fontSize: 28, fontWeight: 600 }}>{eur(avgTicket)}</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
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

function Inventario({ products, search, setSearch, onAdd, onScan, onDelete }) {
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: COLORS.inkMuted }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, background: COLORS.surface, boxSizing: 'border-box' }}
          />
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 40px', padding: '10px 20px', fontSize: 11, color: COLORS.inkMuted, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${COLORS.line}` }}>
          <span>Producto</span><span>Precio</span><span>Stock</span><span>Estado</span><span></span>
        </div>
        {filtered.length === 0 && <div style={{ padding: 24, color: COLORS.inkMuted, fontSize: 13 }}>No hay productos.</div>}
        {filtered.map((p) => {
          const low = p.stock <= p.minStock;
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 40px', padding: '14px 20px', alignItems: 'center', borderBottom: `1px solid ${COLORS.line}`, fontSize: 14 }}>
              <span>
                {p.name}
                {p.barcode && <div className="font-mono" style={{ fontSize: 10, color: COLORS.inkMuted, marginTop: 2 }}>{p.barcode}</div>}
              </span>
              <span className="font-mono">{eur(p.price)}</span>
              <span className="font-mono">{p.stock} uds</span>
              <span>
                <span className="stamp" style={{ color: low ? COLORS.rust : COLORS.sage }}>{low ? 'bajo' : 'ok'}</span>
              </span>
              <button onClick={() => onDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkMuted }}>
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
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

function ModalShell({ title, onClose, children, onSubmit }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000055', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{ background: COLORS.surface, borderRadius: 12, padding: 24, width: 360, maxWidth: '100%' }}
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

function ProductModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('3');
  const [barcode, setBarcode] = useState('');
  return (
    <ModalShell title="Nuevo producto" onClose={onClose} onSubmit={(e) => {
      e.preventDefault();
      if (!name || !price) return;
      onSave({ id: 'p' + Date.now(), name, price: parseFloat(price), stock: parseInt(stock || '0'), minStock: parseInt(minStock || '0'), barcode: barcode || undefined });
    }}>
      <label style={labelStyle}>Nombre</label>
      <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
      <label style={labelStyle}>Precio (€)</label>
      <input style={inputStyle} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
      <label style={labelStyle}>Stock inicial</label>
      <input style={inputStyle} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
      <label style={labelStyle}>Aviso de stock bajo (uds)</label>
      <input style={inputStyle} type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
      <label style={labelStyle}>Código de barras (opcional)</label>
      <input style={inputStyle} value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Escanea o escribe el código" />
      <button style={submitStyle} type="submit">Guardar producto</button>
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

function SaleModal({ products, clients, onClose, onSave }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [qty, setQty] = useState('1');
  const [date, setDate] = useState(todayISO());
  const product = products.find((p) => p.id === productId);
  return (
    <ModalShell title="Registrar venta" onClose={onClose} onSubmit={(e) => {
      e.preventDefault();
      if (!clientId || !productId) return;
      const q = parseInt(qty || '1');
      onSave({ id: 's' + Date.now(), clientId, productId, qty: q, date, total: +(product.price * q).toFixed(2) });
    }}>
      {clients.length === 0 || products.length === 0 ? (
        <div style={{ fontSize: 13, color: COLORS.inkMuted, marginBottom: 14 }}>Necesitas al menos un cliente y un producto antes de registrar una venta.</div>
      ) : (
        <>
          <label style={labelStyle}>Cliente</label>
          <select style={inputStyle} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label style={labelStyle}>Producto</label>
          <select style={inputStyle} value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {eur(p.price)} ({p.stock} uds)</option>)}
          </select>
          <label style={labelStyle}>Cantidad</label>
          <input style={inputStyle} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          <label style={labelStyle}>Fecha</label>
          <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {product && <div style={{ fontSize: 13, color: COLORS.inkMuted, marginBottom: 14 }}>Total: <strong className="font-mono" style={{ color: COLORS.ink }}>{eur(product.price * parseInt(qty || '0'))}</strong></div>}
          <button style={submitStyle} type="submit"><ShoppingCart size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Registrar</button>
        </>
      )}
    </ModalShell>
  );
}

function ScannerModal({ products, onClose, onIncrement, onCreate }) {
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
      setLog((l) => [{ id: Date.now(), text: `+1 uds · ${product.name}` }, ...l].slice(0, 8));
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
          Cada código escaneado suma 1 unidad de stock. Deja esta ventana abierta y sigue disparando el lector.
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
          <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.line}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {log.map((l) => (
              <div key={l.id} className="font-mono" style={{ fontSize: 11.5, color: COLORS.sage }}>{l.text}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
