
import React, { useState, useMemo } from 'react';
import { Product, CartItem, Sale } from '../types';

interface POSProps {
  products: Product[];
  onCompleteSale: (sale: Sale) => void;
}

const POS: React.FC<POSProps> = ({ products, onCompleteSale }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('Efectivo');

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        const productRef = products.find(p => p.id === productId);
        if (productRef && newQty > productRef.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const newSale: Sale = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      items: [...cart],
      total,
      paymentMethod
    };
    
    onCompleteSale(newSale);
    setCart([]);
    alert('Venta realizada con éxito');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]">
      {/* Left: Product Selection */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <input 
              type="text"
              placeholder="Buscar productos por nombre o categoría..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                product.stock <= 0 
                  ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed' 
                  : 'bg-white border-gray-100 hover:border-orange-500 hover:shadow-md'
              }`}
            >
              <div>
                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase">
                  {product.category}
                </span>
                <h3 className="font-bold text-gray-800 mt-2 line-clamp-2">{product.name}</h3>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-extrabold text-gray-900">${product.price.toLocaleString()}</span>
                <span className={`text-xs font-semibold ${product.stock < 5 ? 'text-red-500' : 'text-gray-400'}`}>
                  Stock: {product.stock}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cart and Checkout */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-0">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-gray-800 text-lg">Carrito de Venta</h2>
          <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded-full">
            {cart.length} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-2">
              <span className="text-4xl">🛒</span>
              <p className="text-sm">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</h4>
                  <p className="text-xs text-gray-500">${item.price.toLocaleString()} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-orange-50 hover:text-orange-600"
                  >-</button>
                  <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-orange-50 hover:text-orange-600"
                  >+</button>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="text-gray-400 hover:text-red-500 ml-2"
                >✕</button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Método de Pago</p>
            <div className="grid grid-cols-3 gap-2">
              {(['Efectivo', 'Transferencia', 'Tarjeta'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                    paymentMethod === m 
                      ? 'bg-orange-500 border-orange-500 text-white' 
                      : 'bg-white border-gray-200 text-gray-500 hover:border-orange-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-end">
            <span className="text-gray-500 font-medium">Total</span>
            <span className="text-2xl font-black text-gray-900">${total.toLocaleString()}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2"
          >
            <span>Confirmar Venta</span>
            <span>✅</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default POS;
