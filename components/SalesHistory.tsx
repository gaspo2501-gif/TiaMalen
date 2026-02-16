
import React from 'react';
import { Sale } from '../types';

interface SalesHistoryProps {
  sales: Sale[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-xl font-bold text-gray-800">Historial Reciente</h2>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-white border border-gray-200 text-xs font-bold rounded-lg hover:bg-gray-50">Descargar CSV</button>
           <button className="px-4 py-2 bg-white border border-gray-200 text-xs font-bold rounded-lg hover:bg-gray-50">Filtrar Fecha</button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Fecha y Hora</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Detalle de Productos</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Pago</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center">
                    <span className="text-4xl mb-2">📄</span>
                    No hay ventas registradas aún.
                  </div>
                </td>
              </tr>
            ) : (
              sales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">
                      {new Date(sale.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-6 py-4 max-w-md">
                    <div className="flex flex-wrap gap-1">
                      {sale.items.map(item => (
                        <span key={item.id} className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-md">
                          {item.quantity}x {item.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      sale.paymentMethod === 'Efectivo' ? 'bg-green-100 text-green-700' :
                      sale.paymentMethod === 'Transferencia' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-black text-gray-900 text-lg">${sale.total.toLocaleString()}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesHistory;
