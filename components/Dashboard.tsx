
import React, { useMemo } from 'react';
import { Sale, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
}

const Dashboard: React.FC<DashboardProps> = ({ sales, products }) => {
  const metrics = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const todaySales = sales.filter(s => s.timestamp >= today);
    const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
    const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
    const lowStockCount = products.filter(p => p.stock < 5).length;

    // Most sold products
    const productCounts: Record<string, number> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
      });
    });

    const chartData = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRevenue,
      todayRevenue,
      todayCount: todaySales.length,
      lowStockCount,
      chartData
    };
  }, [sales, products]);

  const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 text-2xl">💰</div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ventas Hoy</p>
              <h4 className="text-2xl font-black text-gray-800">${metrics.todayRevenue.toLocaleString()}</h4>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">Total de {metrics.todayCount} transacciones hoy</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 text-2xl">💎</div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Facturación Total</p>
              <h4 className="text-2xl font-black text-gray-800">${metrics.totalRevenue.toLocaleString()}</h4>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">Desde el inicio de los registros</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 text-2xl">⚠️</div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bajo Stock</p>
              <h4 className="text-2xl font-black text-gray-800">{metrics.lowStockCount}</h4>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">Productos con menos de 5 unidades</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-2xl">📦</div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inventario</p>
              <h4 className="text-2xl font-black text-gray-800">{products.length}</h4>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">Variedades únicas de productos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Productos Más Vendidos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                   {metrics.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Alertas de Stock</h3>
          <div className="space-y-4">
            {products.filter(p => p.stock < 5).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <span className="text-3xl mb-2">✅</span>
                <p>Todo el inventario está al día</p>
              </div>
            ) : (
              products.filter(p => p.stock < 5).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                   <div>
                     <p className="text-sm font-bold text-red-700">{p.name}</p>
                     <p className="text-[10px] text-red-500 uppercase font-black">Sólo quedan {p.stock} unidades</p>
                   </div>
                   <span className="text-xs bg-white text-red-600 px-3 py-1 rounded-full font-bold shadow-sm">Reponer</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
