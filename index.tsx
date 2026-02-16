
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Constantes y Tipos ---
const DEFAULT_CATEGORIES = [
  'Pan', 'Fiambres', 'Bebidas con alcohol', 
  'Bebidas sin alcohol', 'Golosinas', 'Galletitas', 
  'Kiosco', 'Otros'
];

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

const App = () => {
  const [view, setView] = useState('DASHBOARD'); 
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Rango de fechas para reportes (Mes actual por defecto)
  const [reportRange, setReportRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Persistencia de Categorías (Rubros)
  const [categories, setCategories] = useState<string[]>(() => 
    JSON.parse(localStorage.getItem('tm_v3_categories') || JSON.stringify(DEFAULT_CATEGORIES))
  );

  // Persistencia de Transacciones y Clientes
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    JSON.parse(localStorage.getItem('tm_v3_transactions') || '[]')
  );
  const [customers, setCustomers] = useState<Customer[]>(() => 
    JSON.parse(localStorage.getItem('tm_v3_customers') || '[]')
  );
  
  // Estados de formularios de Caja
  const [amount, setAmount] = useState('');
  const [selectedCat, setSelectedCat] = useState(categories[0] || 'Otros');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseMethod, setExpenseMethod] = useState<'Efectivo' | 'MercadoPago'>('Efectivo');

  // Guardado en LocalStorage
  useEffect(() => {
    localStorage.setItem('tm_v3_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('tm_v3_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('tm_v3_customers', JSON.stringify(customers));
  }, [customers]);

  // --- Lógica de Negocio: Transacciones ---
  const addTransaction = (type: string, data: any) => {
    const numAmount = parseFloat(data.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor, ingrese un monto válido.');
      return;
    }

    const newTx: Transaction = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      amount: numAmount,
      method: data.method,
      category: data.category || 'N/A',
      note: data.note || '',
      customerId: data.customerId || null
    };

    if (data.method === 'Fiado' && !data.customerId) {
      alert('Debe seleccionar un cliente para ventas a fiado.');
      return;
    }

    setTransactions(prev => [newTx, ...prev]);

    // Actualizar saldo de cliente si corresponde
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
    
    // Resetear formulario
    setAmount('');
    setExpenseNote('');
    if (type === TX_TYPES.EXPENSE) alert('Gasto registrado con éxito.');
    if (type === TX_TYPES.SALE) alert('Venta registrada con éxito.');
  };

  const addCustomer = (name: string) => {
    if (!name) return;
    const newCustomer = { id: Date.now().toString(), name, balance: 0 };
    setCustomers(prev => [...prev, newCustomer]);
  };

  const handleAddCategory = () => {
    const name = prompt('Nombre del nuevo rubro:');
    if (name && !categories.includes(name)) {
      setCategories(prev => [...prev, name]);
    }
  };

  const handleEditCategory = (oldName: string) => {
    const newName = prompt('Editar nombre de rubro:', oldName);
    if (newName && newName !== oldName) {
      setCategories(prev => prev.map(c => c === oldName ? newName : c));
      setTransactions(prev => prev.map(t => t.category === oldName ? { ...t, category: newName } : t));
    }
  };

  const handleDeleteCategory = (name: string) => {
    if (confirm(`¿Eliminar rubro "${name}"?`)) {
      setCategories(prev => prev.filter(c => c !== name));
      if (selectedCat === name) setSelectedCat(categories[0] || 'Otros');
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const todayTxs = transactions.filter(t => new Date(t.timestamp).toLocaleDateString() === todayStr);
    const ingresosEfeHoy = todayTxs
      .filter(t => (t.type === TX_TYPES.SALE || t.type === TX_TYPES.COLLECTION) && t.method === 'Efectivo')
      .reduce((a, b) => a + b.amount, 0);
    const ingresosMPHoy = todayTxs
      .filter(t => (t.type === TX_TYPES.SALE || t.type === TX_TYPES.COLLECTION) && t.method === 'MercadoPago')
      .reduce((a, b) => a + b.amount, 0);
    const gastosEfeHoy = todayTxs
      .filter(t => t.type === TX_TYPES.EXPENSE && t.method === 'Efectivo')
      .reduce((a, b) => a + b.amount, 0);
    const gastosMPHoy = todayTxs
      .filter(t => t.type === TX_TYPES.EXPENSE && t.method === 'MercadoPago')
      .reduce((a, b) => a + b.amount, 0);

    const efeNetoHoy = ingresosEfeHoy - gastosEfeHoy;
    const mpNetoHoy = ingresosMPHoy - gastosMPHoy;
    const cajaRealHoy = efeNetoHoy + mpNetoHoy;

    const totalFiadoPendiente = customers.reduce((a, b) => a + b.balance, 0);
    const capitalTotal = cajaRealHoy + totalFiadoPendiente;

    return { efeNetoHoy, mpNetoHoy, cajaRealHoy, totalFiadoPendiente, capitalTotal };
  }, [transactions, customers]);

  // --- LÓGICA DE REPORTES ---
  const reportData = useMemo(() => {
    const start = new Date(reportRange.start);
    const end = new Date(reportRange.end);
    end.setHours(23, 59, 59, 999);

    const filtered = transactions.filter(t => {
      const d = new Date(t.timestamp);
      return d >= start && d <= end;
    });

    // Totales de Ventas estrictas (sin incluir cobros de fiado)
    const vEfectivo = filtered.filter(t => t.type === TX_TYPES.SALE && t.method === 'Efectivo').reduce((a, b) => a + b.amount, 0);
    const vMP = filtered.filter(t => t.type === TX_TYPES.SALE && t.method === 'MercadoPago').reduce((a, b) => a + b.amount, 0);
    const vFiado = filtered.filter(t => t.type === TX_TYPES.SALE && t.method === 'Fiado').reduce((a, b) => a + b.amount, 0);
    
    // Cobros de fiado en el rango
    const totalCobros = filtered.filter(t => t.type === TX_TYPES.COLLECTION).reduce((a, b) => a + b.amount, 0);

    // Gráfico Circular: Ventas por Rubro
    const catCounts: Record<string, number> = {};
    filtered.forEach(t => {
      if (t.type === TX_TYPES.SALE) {
        catCounts[t.category] = (catCounts[t.category] || 0) + t.amount;
      }
    });
    const pieData = Object.entries(catCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);

    return { vEfectivo, vMP, vFiado, totalCobros, pieData, filtered };
  }, [transactions, reportRange]);

  // --- EXPORTACIÓN PDF ---
  const handleExportPDF = (reportType: 'RANGE' | 'DAILY' | 'MONTHLY' | 'CUSTOMERS') => {
    try {
      const doc = new jsPDF();
      const now = new Date();
      let title = 'Reporte Despensa Tia Malen';
      let dataToPrint: any[] = [];
      let headers = [['Fecha', 'Tipo', 'Detalle', 'Medio', 'Importe']];

      if (reportType === 'CUSTOMERS') {
        title = 'Reporte de Clientes y Deudas Pendientes';
        headers = [['Cliente', 'Saldo Pendiente']];
        dataToPrint = customers.map(c => [c.name, `$${c.balance.toLocaleString()}`]);
      } else {
        let filterFn = (t: Transaction) => true;
        if (reportType === 'DAILY') {
          title = `Reporte Diario - ${now.toLocaleDateString()}`;
          filterFn = (t) => new Date(t.timestamp).toLocaleDateString() === now.toLocaleDateString();
        } else if (reportType === 'MONTHLY') {
          title = `Reporte Mensual - ${now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}`;
          filterFn = (t) => {
            const d = new Date(t.timestamp);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          };
        } else {
          title = `Reporte del ${reportRange.start} al ${reportRange.end}`;
          const start = new Date(reportRange.start);
          const end = new Date(reportRange.end);
          end.setHours(23, 59, 59, 999);
          filterFn = (t) => {
            const d = new Date(t.timestamp);
            return d >= start && d <= end;
          };
        }

        dataToPrint = transactions.filter(filterFn).map(t => [
          new Date(t.timestamp).toLocaleString(),
          t.type,
          t.type === TX_TYPES.SALE ? t.category : t.note,
          t.method,
          `$${t.amount.toLocaleString()}`
        ]);
      }

      doc.setFontSize(18);
      doc.setTextColor(249, 115, 22); // Orange TM
      doc.text(title, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Fecha de emisión: ${now.toLocaleString()}`, 14, 28);

      autoTable(doc, {
        head: headers,
        body: dataToPrint,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
      });

      doc.save(`Tia_Malen_${reportType}_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Error generating PDF", err);
      alert("Hubo un error al generar el PDF. Asegúrate de que todos los datos sean correctos.");
    }
  };

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const customerHistory = transactions.filter(t => t.customerId === selectedCustomerId);

  const menuItems = [
    { id: 'DASHBOARD', label: 'Inicio', icon: '🏠' },
    { id: 'POS', label: 'Ventas', icon: '🛒' },
    { id: 'CONFIG', label: 'Categorías', icon: '🏷️' },
    { id: 'CUSTOMERS', label: 'Clientes', icon: '👥' },
    { id: 'EXPENSES', label: 'Gastos', icon: '🚛' },
    { id: 'REPORTS', label: 'Reportes', icon: '📊' }
  ];

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden">
      {/* SIDEBAR (Escritorio) */}
      <aside className="hidden md:flex w-72 bg-[#0F172A] text-white flex-col p-6 shrink-0 shadow-2xl z-20">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-[#F97316] rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-500/20">TM</div>
          <div>
            <h1 className="font-black text-xl leading-none">Tia Malen</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión de Negocio</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-3">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSelectedCustomerId(null); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                view === item.id 
                  ? 'bg-[#F97316] text-white shadow-xl shadow-orange-500/30 font-bold translate-x-1' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
          <button
              onClick={() => { setView('LOGS'); setSelectedCustomerId(null); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                view === 'LOGS' 
                  ? 'bg-[#F97316] text-white shadow-xl shadow-orange-500/30 font-bold' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-xl">📜</span>
              <span className="text-sm font-semibold">Movimientos</span>
          </button>
        </nav>

        <div className="mt-auto">
          <div className="p-5 bg-slate-800/40 rounded-[2rem] border border-slate-700/50">
            <p className="text-[10px] uppercase font-black text-slate-500 mb-2">Capital Hoy</p>
            <p className="text-2xl font-black text-[#F97316]">${stats.capitalTotal.toLocaleString()}</p>
          </div>
        </div>
      </aside>

      {/* NAVEGACIÓN MOBILE BOTTOM */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around p-3 z-[100] shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => { setView(item.id); setSelectedCustomerId(null); }}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
              view === item.id ? 'text-[#F97316]' : 'text-slate-400'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth pb-24 md:pb-10">
        
        {/* DASHBOARD */}
        {view === 'DASHBOARD' && (
          <div className="max-w-7xl mx-auto space-y-8 md:space-y-10 animate-in fade-in duration-500">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Inicio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-emerald-600 text-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-xl relative overflow-hidden h-48 md:h-64 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-80 tracking-widest mb-1">Caja Real Hoy (Neto)</p>
                  <h4 className="text-4xl md:text-5xl font-black">${stats.cajaRealHoy.toLocaleString()}</h4>
                </div>
                <p className="text-[10px] md:text-xs opacity-60 font-bold">Ingresos - Gastos del día</p>
                <div className="absolute -bottom-8 -right-8 text-8xl md:text-9xl opacity-10">💵</div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 md:gap-6">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Efectivo Neto Hoy</p>
                  <h4 className="text-2xl md:text-3xl font-black text-emerald-600">${stats.efeNetoHoy.toLocaleString()}</h4>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MercadoPago Neto Hoy</p>
                  <h4 className="text-2xl md:text-3xl font-black text-blue-600">${stats.mpNetoHoy.toLocaleString()}</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:gap-6">
                <div className="bg-[#1E293B] text-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl h-24 md:h-28 flex flex-col justify-center">
                  <p className="text-[10px] font-black opacity-60 tracking-widest mb-1">Fiado Pendiente</p>
                  <h4 className="text-2xl md:text-3xl font-black text-orange-400">${stats.totalFiadoPendiente.toLocaleString()}</h4>
                </div>
                <div className="bg-[#F97316] text-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl h-24 md:h-28 flex flex-col justify-center">
                  <p className="text-[10px] font-black opacity-70 tracking-widest mb-1">Capital Total</p>
                  <h4 className="text-2xl md:text-3xl font-black">${stats.capitalTotal.toLocaleString()}</h4>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* POS / CAJA */}
        {view === 'POS' && (
          <div className="max-w-4xl mx-auto space-y-8 md:space-y-10 animate-in slide-in-from-bottom-6 duration-400">
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Ventas</h1>
            
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 flex flex-col items-center shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] mb-4 md:mb-6 text-center">Importe</span>
              <div className="flex items-center gap-2 md:gap-4 w-full">
                <span className="text-4xl md:text-6xl font-black text-slate-200">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  className="text-6xl md:text-8xl font-black text-slate-800 bg-transparent border-none focus:ring-0 w-full text-center outline-none"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Rubro</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCat(cat)}
                    className={`p-4 md:p-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase transition-all ${
                      selectedCat === cat ? 'bg-[#F97316] text-white shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-orange-200 shadow-sm'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
              <button onClick={() => addTransaction(TX_TYPES.SALE, { amount, category: selectedCat, method: 'Efectivo' })} className="h-24 md:h-32 bg-emerald-500 text-white rounded-2xl md:rounded-[2.5rem] font-black text-lg md:text-xl flex flex-col items-center justify-center gap-1 md:gap-2 shadow-lg">
                <span className="text-2xl md:text-3xl">💵</span> Efectivo
              </button>
              <button onClick={() => addTransaction(TX_TYPES.SALE, { amount, category: selectedCat, method: 'MercadoPago' })} className="h-24 md:h-32 bg-blue-500 text-white rounded-2xl md:rounded-[2.5rem] font-black text-lg md:text-xl flex flex-col items-center justify-center gap-1 md:gap-2 shadow-lg">
                <span className="text-2xl md:text-3xl">📱</span> M.Pago
              </button>
              <button onClick={() => {
                const query = prompt('¿Qué cliente fía?');
                if (!query) return;
                const found = customers.find(c => c.name.toLowerCase().includes(query.toLowerCase()));
                if (found) addTransaction(TX_TYPES.SALE, { amount, category: selectedCat, method: 'Fiado', customerId: found.id });
                else alert('Cliente no encontrado.');
              }} className="h-24 md:h-32 bg-slate-800 text-white rounded-2xl md:rounded-[2.5rem] font-black text-lg md:text-xl flex flex-col items-center justify-center gap-1 md:gap-2 shadow-lg">
                <span className="text-2xl md:text-3xl">📝</span> Fiado
              </button>
            </div>
          </div>
        )}

        {/* GASTOS */}
        {view === 'EXPENSES' && (
          <div className="max-w-4xl mx-auto space-y-8 md:space-y-10 animate-in slide-in-from-bottom-6 duration-400">
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Gastos</h1>
            
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 flex flex-col items-center shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] mb-4 md:mb-6 text-center">Importe</span>
              <div className="flex items-center gap-2 md:gap-4 w-full">
                <span className="text-4xl md:text-6xl font-black text-slate-200">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  className="text-6xl md:text-8xl font-black text-slate-800 bg-transparent border-none focus:ring-0 w-full text-center outline-none"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-200">
              <h3 className="text-lg md:text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <span className="text-2xl">🚛</span> Proveedor / Gasto
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor / Detalle</p>
                    <input
                      placeholder="Ej: Panadería El Sol..."
                      className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl outline-none font-bold text-slate-700 border border-transparent focus:border-red-200 transition-all"
                      value={expenseNote}
                      onChange={(e) => setExpenseNote(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Medio de Pago</p>
                    <select 
                      className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-slate-700 outline-none"
                      value={expenseMethod}
                      onChange={(e: any) => setExpenseMethod(e.target.value)}
                    >
                      <option value="Efectivo">💵 Efectivo</option>
                      <option value="MercadoPago">📱 MercadoPago</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!amount || !expenseNote) return alert('Ingrese monto y detalle');
                    addTransaction(TX_TYPES.EXPENSE, { amount, note: expenseNote, method: expenseMethod });
                    setView('DASHBOARD');
                  }}
                  className="w-full py-5 bg-red-100 text-red-600 font-black rounded-xl md:rounded-2xl hover:bg-red-200 transition-colors uppercase text-sm"
                >
                  Registrar Salida
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REPORTES */}
        {view === 'REPORTS' && (
          <div className="max-w-7xl mx-auto space-y-8 md:space-y-10 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Reportes</h2>
                <p className="text-slate-500 font-medium">Analítica y Exportación PDF</p>
              </div>
              <div className="grid grid-cols-2 sm:flex flex-wrap gap-2 w-full md:w-auto">
                <button onClick={() => handleExportPDF('DAILY')} className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-50">Diario</button>
                <button onClick={() => handleExportPDF('MONTHLY')} className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-50">Mensual</button>
                <button onClick={() => handleExportPDF('CUSTOMERS')} className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-50">Saldos Clientes</button>
                <button onClick={() => handleExportPDF('RANGE')} className="col-span-2 bg-[#F97316] text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-orange-500/20">💾 Exportar Selección</button>
              </div>
            </div>

            {/* Selector de Rango */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 md:gap-6 items-end">
               <div className="space-y-1 w-full md:flex-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desde</p>
                 <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-200"
                  value={reportRange.start}
                  onChange={(e) => setReportRange(prev => ({ ...prev, start: e.target.value }))}
                 />
               </div>
               <div className="space-y-1 w-full md:flex-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hasta</p>
                 <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-200"
                  value={reportRange.end}
                  onChange={(e) => setReportRange(prev => ({ ...prev, end: e.target.value }))}
                 />
               </div>
            </div>

            {/* Resumen y Gráfico (Previsualización Obligatoria) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
               <div className="lg:col-span-2 space-y-6 md:space-y-8">
                  <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-sm border border-slate-200 min-h-[400px]">
                    <h3 className="text-xl font-black text-slate-800 mb-8 uppercase text-[10px] tracking-widest">Ventas por Categoría</h3>
                    {reportData.pieData.length > 0 ? (
                      <div className="h-[300px] md:h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={8}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {reportData.pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-slate-300 font-bold italic text-sm">
                        No hay ventas en el rango seleccionado.
                      </div>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Ventas Efectivo</p>
                    <h4 className="text-2xl font-black text-emerald-700">${reportData.vEfectivo.toLocaleString()}</h4>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Ventas M.Pago</p>
                    <h4 className="text-2xl font-black text-blue-700">${reportData.vMP.toLocaleString()}</h4>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Total Ventas Fiadas</p>
                    <h4 className="text-2xl font-black text-orange-700">${reportData.vFiado.toLocaleString()}</h4>
                  </div>
                  <div className="bg-slate-800 text-white p-6 rounded-[2rem] shadow-xl">
                    <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Fiado Pendiente Acumulado</p>
                    <h4 className="text-2xl font-black text-orange-400">${stats.totalFiadoPendiente.toLocaleString()}</h4>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {view === 'CUSTOMERS' && (
          <div className="max-w-6xl mx-auto space-y-8 md:space-y-10 animate-in fade-in duration-300">
            {selectedCustomerId && selectedCustomer ? (
              <div className="space-y-6 md:space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <button onClick={() => setSelectedCustomerId(null)} className="flex items-center gap-2 text-slate-400 font-bold hover:text-slate-600 text-sm">
                    <span>←</span> Lista de Clientes
                  </button>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800">Ficha: {selectedCustomer.name}</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-200 col-span-1 h-fit">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deuda Pendiente</p>
                    <p className={`text-4xl md:text-5xl font-black ${selectedCustomer.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      ${selectedCustomer.balance.toLocaleString()}
                    </p>
                    {selectedCustomer.balance > 0 && (
                      <button
                        onClick={() => {
                          const val = prompt(`Monto que entrega ${selectedCustomer.name}:`, selectedCustomer.balance.toString());
                          if (val && parseFloat(val) > 0) {
                            const method = confirm('¿Paga en Efectivo? (Ok=Efectivo, Cancelar=MercadoPago)') ? 'Efectivo' : 'MercadoPago';
                            addTransaction(TX_TYPES.COLLECTION, { amount: val, customerId: selectedCustomer.id, method });
                          }
                        }}
                        className="w-full mt-6 bg-emerald-500 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-sm uppercase shadow-lg shadow-emerald-500/20"
                      >
                        Registrar Cobro
                      </button>
                    )}
                  </div>
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-200 col-span-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Últimos Movimientos</h3>
                    <div className="max-h-[400px] overflow-y-auto pr-1 space-y-3">
                      {customerHistory.length === 0 ? (
                        <p className="text-slate-300 font-bold italic text-center py-10">Sin historial.</p>
                      ) : (
                        customerHistory.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400">{new Date(t.timestamp).toLocaleString()}</p>
                              <p className="font-black text-slate-700 text-sm">{t.type === TX_TYPES.SALE ? `Venta Fiada` : 'Entrega'}</p>
                            </div>
                            <div className={`text-right font-black text-lg md:text-xl ${t.type === TX_TYPES.SALE ? 'text-red-500' : 'text-emerald-500'}`}>
                              {t.type === TX_TYPES.SALE ? '+' : '-'}${t.amount.toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Clientes</h2>
                    <p className="text-slate-500 font-medium">Control de Fiados</p>
                  </div>
                  <button onClick={() => {
                      const name = prompt('Nombre del cliente:');
                      if (name) addCustomer(name);
                  }} className="w-full md:w-auto bg-[#F97316] text-white px-8 py-4 rounded-xl md:rounded-2xl font-black shadow-lg shadow-orange-500/20">+ Nuevo Cliente</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {customers.map(c => (
                    <div key={c.id} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer group" onClick={() => setSelectedCustomerId(c.id)}>
                      <h3 className="text-xl font-black text-slate-800">{c.name}</h3>
                      <div className="mt-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo</p>
                        <p className={`text-3xl md:text-4xl font-black ${c.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          ${c.balance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* CATEGORÍAS */}
        {view === 'CONFIG' && (
          <div className="max-w-4xl mx-auto space-y-8 md:space-y-10 animate-in fade-in duration-300">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Rubros</h2>
              <button onClick={handleAddCategory} className="w-full md:w-auto bg-[#F97316] text-white px-8 py-4 rounded-xl md:rounded-2xl font-black">+ Agregar Rubro</button>
            </div>
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 overflow-hidden p-6 md:p-8 space-y-3">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                   <span className="font-black text-slate-700">{cat}</span>
                   <div className="flex gap-2">
                      <button onClick={() => handleEditCategory(cat)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center">✏️</button>
                      <button onClick={() => handleDeleteCategory(cat)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-red-400">🗑️</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MOVIMIENTOS (Log General) */}
        {view === 'LOGS' && (
          <div className="max-w-7xl mx-auto space-y-8 md:space-y-10 animate-in fade-in duration-300">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Movimientos</h2>
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="p-6 md:p-8">Fecha</th>
                        <th className="p-6 md:p-8">Tipo</th>
                        <th className="p-6 md:p-8">Concepto</th>
                        <th className="p-6 md:p-8 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map(t => (
                        <tr key={t.id}>
                          <td className="p-6 md:p-8 text-[10px] md:text-xs font-bold text-slate-500">
                            {new Date(t.timestamp).toLocaleDateString()}<br/>
                            <span className="opacity-40">{new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </td>
                          <td className="p-6 md:p-8">
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${
                              t.type === TX_TYPES.SALE ? 'bg-blue-50 text-blue-600' :
                              t.type === TX_TYPES.EXPENSE ? 'bg-red-50 text-red-600' :
                              'bg-emerald-50 text-emerald-600'
                            }`}>{t.type}</span>
                          </td>
                          <td className="p-6 md:p-8 text-xs md:text-sm font-black text-slate-800">
                            {t.type === TX_TYPES.SALE ? t.category : (t.customerId ? `Cli: ${customers.find(c => c.id === t.customerId)?.name || '?'}` : t.note)}
                          </td>
                          <td className={`p-6 md:p-8 text-right font-black text-lg md:text-xl ${t.type === TX_TYPES.EXPENSE ? 'text-red-500' : 'text-slate-800'}`}>
                            {t.type === TX_TYPES.EXPENSE ? '-' : ''}${t.amount.toLocaleString()}
                          </td>
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
