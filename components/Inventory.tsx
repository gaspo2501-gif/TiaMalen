
import React, { useState } from 'react';
import { Product } from '../types';

interface InventoryProps {
  products: Product[];
  onUpdate: (p: Product) => void;
  onDelete: (id: string) => void;
  onAdd: (p: Product) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, onUpdate, onDelete, onAdd }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Product>>({
    name: '', price: 0, stock: 0, category: 'Almacén'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price === undefined || form.stock === undefined) return;

    if (editingId) {
      onUpdate({ ...form, id: editingId } as Product);
      setEditingId(null);
    } else {
      onAdd({
        ...form,
        id: Date.now().toString(),
      } as Product);
      setIsAdding(false);
    }
    setForm({ name: '', price: 0, stock: 0, category: 'Almacén' });
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm(p);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="text-center px-4 border-r border-gray-100">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Productos</p>
            <p className="text-xl font-black text-gray-800">{products.length}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Valor Inventario</p>
            <p className="text-xl font-black text-orange-600">
              ${products.reduce((acc, p) => acc + (p.price * p.stock), 0).toLocaleString()}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setForm({ name: '', price: 0, stock: 0, category: 'Almacén' });
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-orange-100 flex items-center gap-2"
        >
          <span>➕ Nuevo Producto</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-orange-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editingId ? 'Editar Producto' : 'Agregar Nuevo Producto'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
              <input
                required
                className="w-full p-2.5 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-orange-500"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Precio ($)</label>
              <input
                required
                type="number"
                className="w-full p-2.5 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-orange-500"
                value={form.price}
                onChange={e => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Stock Inicial</label>
              <input
                required
                type="number"
                className="w-full p-2.5 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-orange-500"
                value={form.stock}
                onChange={e => setForm({ ...form, stock: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Categoría</label>
              <select
                className="w-full p-2.5 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-orange-500"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                <option>Almacén</option>
                <option>Lácteos</option>
                <option>Panadería</option>
                <option>Bebidas</option>
                <option>Limpieza</option>
                <option>Fiambrería</option>
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md"
              >
                {editingId ? 'Guardar Cambios' : 'Registrar Producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Producto</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Categoría</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Precio</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-800">{product.name}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className="font-bold text-gray-800">${product.price.toLocaleString()}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`font-bold ${product.stock < 5 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                    {product.stock}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-3">
                    <button 
                      onClick={() => startEdit(product)}
                      className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('¿Eliminar producto?')) onDelete(product.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
