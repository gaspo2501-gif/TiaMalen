
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Tipos e Interfaces ---
const TX_TYPES = { 
  SALE: 'Venta', 
  EXPENSE: 'Gasto', 
  COLLECTION: 'Cobro Fiado' 
};

interface Transaction {
  id: number;
  timestamp: string;
  type: string;
  amount: number;
  method: 'Efectivo' | 'MercadoPago' | 'Fiado';
  category: string;
  note: string;
  customerId: string | null;
}

interface Customer {
  id: string;
  name: string;
  balance: number;
}

const DEFAULT_CATEGORIES = [
  'Pan', 'Fiambres', 'Bebidas con alcohol', 
  'Bebidas sin alcohol', 'Golosinas', 'Galletitas', 
  'Kiosco', 'Otros'
];

// --- Componente Principal ---
const App = () => {
  const [view, setView] = useState('DASHBOARD'); 
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Persistencia de Datos en LocalStorage (Vital para GitHub Pages)
  const [categories, setCategories] = useState<string[]>(() => 
    JSON.parse(localStorage.getItem('tm_categories') || JSON.stringify(DEFAULT_CATEGORIES))
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    JSON.parse(localStorage.getItem('tm_transactions') || '[]')
  );
  const [customers, setCustomers] = useState<Customer[]>(() => 
    JSON.parse(localStorage.getItem('tm_customers') || '[]')
  );

  // Estados de Formulario
  const [amount, setAmount] = useState('');
  const [selectedCat, setSelectedCat] = useState(categories[0] || 'Otros');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseMethod, setExpenseMethod] = useState<'Efectivo' | 'MercadoPago'>('Efectivo');
  
  // Rango de Reporte
  const [reportRange, setReportRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Efectos de Guardado
  useEffect(() => localStorage.setItem('tm_categories', JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem('tm_transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('tm_customers', JSON.stringify(customers)), [customers]);

  // --- Lógica de Negocio ---
  const addTransaction = (type: string, data: any) => {
    const numAmount = parseFloat(data.amount);
    if (isNaN(numAmount) || numAmount <= 0) return alert('Ingrese un monto válido');

    const newTx: Transaction = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      amount: numAmount,
      method: data.method,
      category: data.category || 'Varios',
      note: data.note || '',
      customerId: data.customerId || null
    };

    if (data.method === 'Fiado' && !data.customerId) return alert('Seleccione un cliente');

    setTransactions(prev => [newTx, ...prev]);

    if (data.customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id === data.customerId) {
          const balanceChange = (type === TX_TYPES.SALE && data.method === 'Fiado') ? newTx.amount : 
                               (type === TX_TYPES.COLLECTION) ? -newTx.amount : 0;
          return { ...c, balance: c.balance + balanceChange };
        }
        return c;
      }));
    }
    
    setAmount('');
    setExpenseNote('');
    alert('Registrado con éxito');
  };

  const addCustomer = (name: string) => {
    if (!name) return;
    const newCustomer = { id: Date.now().toString(), name, balance: 0 };
    setCustomers(prev => [...prev, newCustomer]);
  };

  // Fix: Added handleAddCategory function to resolve missing reference error
  const handleAddCategory = () => {
    const name = prompt('Nombre del nuevo rubro:');
    if (name && !categories.includes(name)) {
      setCategories(prev => [...prev, name]);
    } else if (name && categories.includes(name)) {
      alert('El rubro ya existe');
    }
  };

  // Fix: Added handleEditCategory function to resolve missing reference error
  const handleEditCategory = (oldName: string) => {
    const newName = prompt('Nuevo nombre para el rubro:', oldName);
    if (newName && newName !== oldName) {
      if (categories.includes(newName)) return alert('El rubro ya existe');
      setCategories(prev => prev.map(c => c === oldName ? newName : c));
      setTransactions(prev => prev.map(t => t.category === oldName ? { ...t, category: newName } : t));
    }
  };

  // Fix: Added handleDeleteCategory function to resolve missing reference error
  const handleDeleteCategory = (name: string) => {
    if (confirm(`¿Eliminar rubro "${name}"?`)) {
      setCategories(prev => prev.filter(c => c !== name));
      setTransactions(prev => prev.map(t => t.category === name ? { ...t, category: 'Otros' } : t));
    }
  };

  // --- Estadísticas y Reportes ---
  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString();
    const todayTxs = transactions.filter(t => new Date(t.timestamp).toLocaleDateString() === today);
    
    const ingresosEfe = todayTxs.filter(t => (t.type !== TX_TYPES.EXPENSE) && t.method === 'Efectivo').reduce((a, b) => a + b.amount, 0);
    const ingresosMP = todayTxs.filter(t => (t.type !== TX_TYPES.EXPENSE) && t.method === 'MercadoPago').reduce((a, b) => a + b.amount, 0);
    const gastosEfe = todayTxs.filter(t => t.type === TX_TYPES.EXPENSE && t.method === 'Efectivo').reduce((a, b) => a + b.amount, 0);
    const gastosMP = todayTxs.filter(t => t.type === TX_TYPES.EXPENSE && t.method === 'MercadoPago').reduce((a, b) => a + b.amount, 0);

    const cajaReal = (ingresosEfe + ingresosMP) - (gastosEfe + gastosMP);
    const totalFiado = customers.reduce((a, b) => a + b.balance, 0);

    return { cajaReal, efeNeto: ingresosEfe - gastosEfe, mpNeto: ingresosMP - gastosMP, totalFiado, capital: cajaReal + totalFiado };
  }, [transactions, customers]);

  const reportData = useMemo(() => {
    const start = new Date(reportRange.start);
    const end = new Date(reportRange.end);
    end.setHours(23, 59, 59, 999);
    
    const filtered = transactions.filter(t => {
      const d = new Date(t.timestamp);
      return d >= start && d <= end;
    });

    const counts: Record<string, number> = {};
    filtered.forEach(t => { if(t.type === TX_TYPES.SALE) counts[t.category] = (counts[t.category] || 0) + t.amount; });
    const pieData = Object.entries(counts).map(([name, value]) => ({ name, value }));
    
    const vEfe = filtered.filter(t => t.type === TX_TYPES.SALE && t.method === 'Efectivo').reduce((a,b) => a+b.amount, 0);
    const vMP = filtered.filter(t => t.type === TX_TYPES.SALE && t.method === 'MercadoPago').reduce((a,b) => a+b.amount, 0);
    const vFiado = filtered.filter(t => t.type === TX_TYPES.SALE && t.method === 'Fiado').reduce((a,b) => a+b.amount, 0);

    return { pieData, vEfe, vMP, vFiado, filtered };
  }, [transactions, reportRange]);

  // --- Exportación PDF ---
  const handleExportPDF = (type: string) => {
    const doc = new jsPDF();
    let title = 'Reporte Tia Malen';
    let rows: any[] = [];
    let head = [['Fecha', 'Tipo', 'Detalle', 'Medio', 'Monto']];

    if (type === 'CUSTOMERS') {
      title = 'Reporte de Saldos Clientes';
      head = [['Cliente', 'Saldo Pendiente']];
      rows = customers.map(c => [c.name, `$${c.balance.toLocaleString()}`]);
    } else {
      const now = new Date();
      let filter = (t: Transaction) => true;
      if (type === 'DAILY') {
        title = `Reporte Diario ${now.toLocaleDateString()}`;
        filter = (t) => new Date(t.timestamp).toLocaleDateString() === now.toLocaleDateString();
      } else if (type === 'RANGE') {
        title = `Reporte ${reportRange.start} al ${reportRange.end}`;
        const start = new Date(reportRange.start);
        const end = new Date(reportRange.end);
        end.setHours(23,59,59,999);
        filter = (t) => { const d = new Date(t.timestamp); return d >= start && d <= end; };
      }
      rows = transactions.filter(filter).map(t => [
        new Date(t.timestamp).toLocaleString(),
        t.type, t.type === TX_TYPES.SALE ? t.category : t.note,
        t.method, `$${t.amount.toLocaleString()}`
      ]);
    }

    doc.setFontSize(16);
    doc.setTextColor(249, 115, 22);
    doc.text(title, 14, 20);
    autoTable(doc, { head, body: rows, startY: 30, theme: 'grid', headStyles: { fillColor: [249, 115, 22] } });
    doc.save(`TiaMalen_${type}_${Date.now()}.pdf`);
  };

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];

  const menuItems = [
    { id: 'DASHBOARD', label: 'Inicio', icon: '🏠' },
    { id: 'POS', label: 'Ventas', icon: '🛒' },
    { id: 'CONFIG', label: 'Categorías', icon: '🏷️' },
    { id: 'CUSTOMERS', label: 'Clientes', icon: '👥' },
    { id: 'EXPENSES', label: 'Gastos', icon: '🚛' },
    { id: 'REPORTS', label: 'Reportes', icon: '📊' }
  ];

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden flex-col md:flex-row">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-72 bg-[#0F172A] text-white flex-col p-6 shadow-2xl z-20">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center font-black text-2xl">TM</div>
          <span className="font-black text-xl">Tia Malen</span>
        </div>
        <nav className="flex-1 space-y-2">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === item.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <span>{item.icon}</span> <span className="text-sm font-bold">{item.label}</span>
            </button>
          ))}
          <button onClick={() => setView('LOGS')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'LOGS' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span>📜</span> <span className="text-sm font-bold">Movimientos</span>
          </button>
        </nav>
      </aside>

      {/* MOBILE NAV BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-around z-[100] shadow-lg">
        {menuItems.map(item => (
          <button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${view === item.id ? 'text-orange-500 bg-orange-50' : 'text-slate-400'}`}>
            <span className="text-xl">{item.icon}</span>
            <span className="text-[9px] font-black uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10">
        {view === 'DASHBOARD' && (
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Inicio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-emerald-600 text-white p-6 rounded-[2rem] shadow-xl flex flex-col justify-between h-40">
                <p className="text-[10px] font-bold uppercase opacity-80">Caja Real Hoy</p>
                <h4 className="text-4xl font-black">${stats.cajaReal.toLocaleString()}</h4>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Efectivo Hoy</p>
                <h4 className="text-2xl font-black text-emerald-600">${stats.efeNeto.toLocaleString()}</h4>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">MercadoPago Hoy</p>
                <h4 className="text-2xl font-black text-blue-600">${stats.mpNeto.toLocaleString()}</h4>
              </div>
              <div className="bg-slate-800 text-white p-6 rounded-[2rem] shadow-xl">
                <p className="text-[10px] font-bold opacity-60 uppercase">Fiado Pendiente</p>
                <h4 className="text-2xl font-black text-orange-400">${stats.totalFiado.toLocaleString()}</h4>
              </div>
            </div>
          </div>
        )}

        {view === 'POS' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
            <h1 className="text-3xl font-black text-slate-800">Caja</h1>
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 text-center shadow-sm">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Importe</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-black text-slate-200">$</span>
                <input type="number" className="text-6xl md:text-8xl font-black text-slate-800 bg-transparent border-none text-center outline-none w-full" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCat(cat)} className={`p-4 rounded-xl font-bold text-[10px] uppercase transition-all ${selectedCat === cat ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-slate-500 border'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <button onClick={() => addTransaction(TX_TYPES.SALE, { amount, category: selectedCat, method: 'Efectivo' })} className="h-24 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-lg">💵 Efectivo</button>
              <button onClick={() => addTransaction(TX_TYPES.SALE, { amount, category: selectedCat, method: 'MercadoPago' })} className="h-24 bg-blue-500 text-white rounded-2xl font-black text-lg shadow-lg">📱 M.Pago</button>
              <button onClick={() => {
                const q = prompt('Cliente?'); if(!q) return;
                const c = customers.find(x => x.name.toLowerCase().includes(q.toLowerCase()));
                if(c) addTransaction(TX_TYPES.SALE, { amount, category: selectedCat, method: 'Fiado', customerId: c.id });
                else alert('No existe el cliente');
              }} className="h-24 bg-slate-800 text-white rounded-2xl font-black text-lg shadow-lg">📝 Fiado</button>
            </div>
          </div>
        )}

        {view === 'EXPENSES' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
            <h1 className="text-3xl font-black text-slate-800">Gastos</h1>
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border space-y-6">
               <input type="number" className="text-5xl font-black text-slate-800 w-full text-center outline-none" value={amount} onChange={e => setAmount(e.target.value)} placeholder="$ 0.00" />
               <input placeholder="Proveedor / Detalle..." className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" value={expenseNote} onChange={e => setExpenseNote(e.target.value)} />
               <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" value={expenseMethod} onChange={e => setExpenseMethod(e.target.value as any)}>
                 <option value="Efectivo">💵 Pagar con Efectivo</option>
                 <option value="MercadoPago">📱 Pagar con MercadoPago</option>
               </select>
               <button onClick={() => addTransaction(TX_TYPES.EXPENSE, { amount, note: expenseNote, method: expenseMethod })} className="w-full py-5 bg-red-100 text-red-600 font-black rounded-2xl uppercase tracking-widest hover:bg-red-200">Registrar Salida</button>
            </div>
          </div>
        )}

        {view === 'REPORTS' && (
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Reportes</h2>
                <p className="text-slate-500">Visualización previa y PDF</p>
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2 w-full md:w-auto">
                <button onClick={() => handleExportPDF('DAILY')} className="bg-white border p-3 rounded-xl font-bold text-[10px] uppercase">Diario</button>
                <button onClick={() => handleExportPDF('CUSTOMERS')} className="bg-white border p-3 rounded-xl font-bold text-[10px] uppercase">Saldos</button>
                <button onClick={() => handleExportPDF('RANGE')} className="col-span-2 bg-orange-500 text-white p-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-orange-500/20">💾 Exportar PDF Rango</button>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] border flex flex-col md:flex-row gap-4">
               <div className="flex-1 space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase">Desde</p>
                 <input type="date" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none" value={reportRange.start} onChange={e => setReportRange(p => ({ ...p, start: e.target.value }))} />
               </div>
               <div className="flex-1 space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase">Hasta</p>
                 <input type="date" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none" value={reportRange.end} onChange={e => setReportRange(p => ({ ...p, end: e.target.value }))} />
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border shadow-sm min-h-[400px]">
                <h3 className="text-xl font-black text-slate-800 mb-8 uppercase text-xs tracking-widest">Rubros más vendidos</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reportData.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                        {reportData.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase">Efectivo</p>
                  <h4 className="text-2xl font-black text-emerald-700">${reportData.vEfe.toLocaleString()}</h4>
                </div>
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase">MercadoPago</p>
                  <h4 className="text-2xl font-black text-blue-700">${reportData.vMP.toLocaleString()}</h4>
                </div>
                <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100">
                  <p className="text-[10px] font-black text-orange-600 uppercase">Fiado</p>
                  <h4 className="text-2xl font-black text-orange-700">${reportData.vFiado.toLocaleString()}</h4>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'CUSTOMERS' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800">Clientes</h2>
              <button onClick={() => { const n = prompt('Nombre?'); if(n) addCustomer(n); }} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black shadow-lg">+ Nuevo Cliente</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map(c => (
                <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm group">
                  <h3 className="text-xl font-black text-slate-800">{c.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase">Saldo Pendiente</p>
                  <p className={`text-3xl font-black ${c.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>${c.balance.toLocaleString()}</p>
                  {c.balance > 0 && <button onClick={() => {
                    const v = prompt(`Monto que entrega ${c.name}:`, c.balance.toString());
                    if(v) addTransaction(TX_TYPES.COLLECTION, { amount: v, customerId: c.id, method: confirm('Efectivo?') ? 'Efectivo' : 'MercadoPago' });
                  }} className="w-full mt-4 bg-emerald-500 text-white p-3 rounded-xl font-black text-xs uppercase shadow-md hover:bg-emerald-600 transition-all">Registrar Cobro</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'CONFIG' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800">Rubros</h2>
              <button onClick={handleAddCategory} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black shadow-lg">+ Nuevo</button>
            </div>
            <div className="bg-white rounded-[2rem] border overflow-hidden p-6 space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="font-bold text-slate-700">{cat}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditCategory(cat)} className="p-2 hover:bg-white rounded-lg">✏️</button>
                    <button onClick={() => handleDeleteCategory(cat)} className="p-2 hover:bg-white rounded-lg text-red-500">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'LOGS' && (
          <div className="max-w-7xl mx-auto space-y-8">
            <h2 className="text-3xl font-black text-slate-800">Historial</h2>
            <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                    <tr><th className="p-6">Fecha</th><th className="p-6">Tipo</th><th className="p-6">Detalle</th><th className="p-6">Monto</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(t => (
                      <tr key={t.id} className="text-sm">
                        <td className="p-6 font-bold text-slate-500">{new Date(t.timestamp).toLocaleDateString()} <span className="text-[10px] opacity-40 ml-1">{new Date(t.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></td>
                        <td className="p-6">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${t.type === TX_TYPES.SALE ? 'bg-blue-100 text-blue-600' : t.type === TX_TYPES.EXPENSE ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="p-6 font-bold text-slate-800">{t.type === TX_TYPES.SALE ? t.category : (t.customerId ? `Cli: ${customers.find(c => c.id === t.customerId)?.name || '?'}` : t.note)} <span className="text-[9px] text-slate-300 ml-1 uppercase">{t.method}</span></td>
                        <td className={`p-6 text-right font-black text-lg ${t.type === TX_TYPES.EXPENSE ? 'text-red-500' : 'text-slate-800'}`}>{t.type === TX_TYPES.EXPENSE ? '-' : ''}${t.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
