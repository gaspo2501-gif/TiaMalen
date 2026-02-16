
import React from 'react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const menuItems = [
    { id: View.POS, label: 'Ventas (POS)', icon: '🛒' },
    { id: View.INVENTORY, label: 'Inventario', icon: '📦' },
    { id: View.SALES_HISTORY, label: 'Historial', icon: '📜' },
    { id: View.DASHBOARD, label: 'Panel Control', icon: '📊' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm hidden md:flex">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xl font-bold">
            TM
          </div>
          <span className="text-xl font-bold text-gray-800">Tia Malen</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentView === item.id
                ? 'bg-orange-50 text-orange-600 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="bg-orange-50 p-4 rounded-xl">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Usuario</p>
          <p className="text-sm font-bold text-gray-800">Administrador</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
