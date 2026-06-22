import React, { useState, useEffect } from 'react';
import { X, Utensils } from 'lucide-react';
import { db } from '../../firebase.config';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { MenuCategory, MenuProduct } from '../../types';

interface PublicMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
    businessName: string;
}

export const PublicMenuModal: React.FC<PublicMenuModalProps> = ({ isOpen, onClose, businessId, businessName }) => {
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [products, setProducts] = useState<MenuProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('all');

    const allergenMap: Record<string, string> = {
        gluten: '🌾 Gluten',
        lacteos: '🥛 Lácteos',
        mariscos: '🦐 Mariscos',
        mani: '🥜 Maní',
        huevo: '🥚 Huevo',
        soya: '🫘 Soya',
        picante: '🌶️ Picante'
    };

    useEffect(() => {
        if (!isOpen) return;
        loadMenu();
    }, [isOpen, businessId]);

    const loadMenu = async () => {
        try {
            setLoading(true);
            
            // Fetch categories
            const catsQuery = query(
                collection(db, 'businesses', businessId, 'menu_categories'), 
                orderBy('order_index', 'asc')
            );
            const catsSnap = await getDocs(catsQuery);
            const loadedCats = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuCategory));
            setCategories(loadedCats);

            // Fetch products
            const prodsQuery = query(
                collection(db, 'businesses', businessId, 'menu_products'), 
                orderBy('order_index', 'asc')
            );
            const prodsSnap = await getDocs(prodsQuery);
            const loadedProds = prodsSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as MenuProduct))
                .filter(p => p.disponible); // Only show available products
            setProducts(loadedProds);

            if (loadedCats.length > 0) {
                setActiveTab('all');
            }
        } catch (err) {
            console.error('Error loading menu:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredProducts = activeTab === 'all' 
        ? products 
        : products.filter(p => p.categoryId === activeTab);

    return (
        <div className="fixed inset-0 z-[5000] bg-slate-950/95 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-[#0b0f19] rounded-t-[3.5rem] sm:rounded-[3rem] border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[90vh] text-left">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <Utensils className="w-5 h-5 text-pink-500" />
                            Menú de {businessName}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Carta Digital QR</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors group">
                        <X className="w-5 h-5 text-slate-400 group-hover:text-white" />
                    </button>
                </div>

                {/* Categories Tabs Scroll */}
                {categories.length > 0 && (
                    <div className="flex gap-2 mb-6 border-b border-white/5 pb-3 overflow-x-auto no-scrollbar shrink-0">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${activeTab === 'all' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                        >
                            Todo
                        </button>
                        {categories.map((cat) => {
                            const count = products.filter(p => p.categoryId === cat.id).length;
                            if (count === 0) return null; // Hide empty categories in public view
                            return (
                                <button 
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${activeTab === cat.id ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                                >
                                    {cat.name} ({count})
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Menu List */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
                    {loading ? (
                        <div className="py-12 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-12">No hay platos disponibles en este momento.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredProducts.map((prod) => (
                                <div key={prod.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-3xl flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {prod.image_url ? (
                                            <img src={prod.image_url} alt={prod.name} className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-white/5 shadow-md" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-600 shrink-0">
                                                <Utensils className="w-6 h-6" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-white">{prod.name}</span>
                                                <span className="text-xs font-black text-pink-400">${prod.price.toFixed(2)}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">{prod.description || 'Sin descripción.'}</p>
                                            {prod.etiquetas_alergenos && prod.etiquetas_alergenos.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {prod.etiquetas_alergenos.map(al => (
                                                        <span key={al} className="text-[8px] font-black uppercase bg-white/5 border border-white/5 py-0.5 px-1.5 rounded-lg text-slate-400">
                                                            {allergenMap[al] || al}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
