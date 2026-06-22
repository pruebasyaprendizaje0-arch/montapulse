import React, { useState, useEffect } from 'react';
import { X, Lock, CreditCard, Banknote, Sparkles, Plus, Trash2, CheckCircle, Info, Utensils, FolderOpen, Save, Check, Play, Edit3, ShieldAlert } from 'lucide-react';
import { db } from '../../firebase.config';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { useAuthContext } from '../../context/AuthContext';
import { OptimizedImageUploader } from '../OptimizedImageUploader';
import { MenuCategory, MenuProduct } from '../../types';
import { QRCodeSVG } from 'qrcode.react';

interface MenuQRManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
}

type TabType = 'addon' | 'qrcode' | 'categories' | 'products';

export const MenuQRManagerModal: React.FC<MenuQRManagerModalProps> = ({ isOpen, onClose, businessId }) => {
    const { user } = useAuthContext();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('addon');
    const [addonStatus, setAddonStatus] = useState<'inactive' | 'pending_approval' | 'active' | 'expired'>('inactive');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [businessName, setBusinessName] = useState('');
    const [businessSlug, setBusinessSlug] = useState('');

    // Manual Upload Receipt
    const [receiptUrl, setReceiptUrl] = useState('');
    const [submittingManual, setSubmittingManual] = useState(false);

    // Menu States
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [products, setProducts] = useState<MenuProduct[]>([]);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

    // Forms
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(null);
    const [productName, setProductName] = useState('');
    const [productDesc, setProductDesc] = useState('');
    const [productPrice, setProductPrice] = useState(0);
    const [productImage, setProductImage] = useState('');
    const [productCategoryId, setProductCategoryId] = useState('');
    const [allergens, setAllergens] = useState<string[]>([]);

    const allergenOptions = [
        { id: 'gluten', label: 'Gluten' },
        { id: 'lacteos', label: 'Lácteos' },
        { id: 'mariscos', label: 'Mariscos' },
        { id: 'mani', label: 'Maní' },
        { id: 'huevo', label: 'Huevo' },
        { id: 'soya', label: 'Soya' },
        { id: 'picante', label: 'Picante' }
    ];

    useEffect(() => {
        if (!isOpen) return;
        loadAddonAndConfig();
    }, [isOpen, businessId]);

    useEffect(() => {
        if (!isOpen || activeTab === 'addon') return;
        if (activeTab === 'categories') {
            loadCategories();
        } else if (activeTab === 'products') {
            loadCategories();
            loadProducts();
        }
    }, [activeTab]);

    const loadAddonAndConfig = async () => {
        try {
            setLoading(true);
            const bizRef = doc(db, 'businesses', businessId);
            const bizSnap = await getDoc(bizRef);

            if (bizSnap.exists()) {
                const data = bizSnap.data();
                setBusinessName(data.name || '');
                setBusinessSlug(data.slug || '');
                
                const isPremium = data.menu_premium_active || false;
                const sub = data.menu_subscription || {};
                
                if (isPremium) {
                    setAddonStatus('active');
                } else if (sub.status === 'pending_approval') {
                    setAddonStatus('pending_approval');
                } else if (sub.status === 'expired') {
                    setAddonStatus('expired');
                } else {
                    setAddonStatus('inactive');
                }

                if (sub.expiresAt) {
                    setExpiresAt(sub.expiresAt.toDate ? sub.expiresAt.toDate() : new Date(sub.expiresAt));
                }
            }
        } catch (err) {
            console.error('Error loading config:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const q = query(collection(db, 'businesses', businessId, 'menu_categories'), orderBy('order_index', 'asc'));
            const snap = await getDocs(q);
            const loadedCats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuCategory));
            setCategories(loadedCats);
            if (loadedCats.length > 0 && !productCategoryId) {
                setProductCategoryId(loadedCats[0].id);
            }
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    };

    const loadProducts = async () => {
        try {
            const q = query(collection(db, 'businesses', businessId, 'menu_products'), orderBy('order_index', 'asc'));
            const snap = await getDocs(q);
            setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuProduct)));
        } catch (err) {
            console.error('Error loading products:', err);
        }
    };

    const handleDlocalCheckout = async () => {
        try {
            const response = await fetch('/api/menu-addon/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId, email: user?.email })
            });
            const data = await response.json();
            if (data.success && data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                showToast(data.message || 'Error al conectar con dLocal Go', 'error');
            }
        } catch (err) {
            showToast('Error de comunicación con el servidor', 'error');
        }
    };

    const handleManualPaymentSubmit = async () => {
        if (!receiptUrl) {
            showToast('Por favor sube la foto del comprobante primero.', 'error');
            return;
        }

        setSubmittingManual(true);
        try {
            // Write manual payment request document
            await addDoc(collection(db, 'verificaciones_pago'), {
                businessId,
                businessName,
                amount: 5.00,
                payment_type: 'menu_digital',
                receipt_url: receiptUrl,
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date()
            });

            // Update business menu subscription to pending_approval
            const bizRef = doc(db, 'businesses', businessId);
            await updateDoc(bizRef, {
                'menu_subscription.status': 'pending_approval',
                'menu_subscription.payment_method': 'manual',
                'menu_subscription.manual_payment_receipt_url': receiptUrl,
                'menu_subscription.updatedAt': new Date()
            });

            setAddonStatus('pending_approval');
            showToast('Comprobante subido. Esperando aprobación del administrador.', 'success');
        } catch (err) {
            showToast('Error al registrar el pago manual', 'error');
        } finally {
            setSubmittingManual(false);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        try {
            const nextIndex = categories.length;
            const newCatRef = doc(collection(db, 'businesses', businessId, 'menu_categories'));
            await setDoc(newCatRef, {
                name: newCategoryName.trim(),
                order_index: nextIndex,
                created_at: new Date()
            });

            setNewCategoryName('');
            showToast('Categoría agregada.', 'success');
            loadCategories();
        } catch (err) {
            showToast('Error al crear categoría.', 'error');
        }
    };

    const handleDeleteCategory = async (catId: string) => {
        const hasProducts = products.some(p => p.categoryId === catId);
        if (hasProducts) {
            showToast('No puedes eliminar una categoría que contiene productos.', 'error');
            return;
        }

        const confirmDel = window.confirm('¿Deseas eliminar esta categoría?');
        if (!confirmDel) return;

        try {
            await deleteDoc(doc(db, 'businesses', businessId, 'menu_categories', catId));
            showToast('Categoría eliminada.', 'success');
            loadCategories();
        } catch (err) {
            showToast('Error al eliminar categoría.', 'error');
        }
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productName.trim() || !productCategoryId) {
            showToast('Por favor completa los campos obligatorios.', 'error');
            return;
        }

        try {
            if (editingProduct) {
                const prodRef = doc(db, 'businesses', businessId, 'menu_products', editingProduct.id);
                await updateDoc(prodRef, {
                    name: productName.trim(),
                    description: productDesc.trim(),
                    price: parseFloat(productPrice.toString()) || 0,
                    image_url: productImage,
                    etiquetas_alergenos: allergens,
                    categoryId: productCategoryId
                });
                showToast('Producto actualizado.', 'success');
                setEditingProduct(null);
            } else {
                const nextIndex = products.filter(p => p.categoryId === productCategoryId).length;
                const newProdRef = doc(collection(db, 'businesses', businessId, 'menu_products'));
                await setDoc(newProdRef, {
                    name: productName.trim(),
                    description: productDesc.trim(),
                    price: parseFloat(productPrice.toString()) || 0,
                    image_url: productImage,
                    disponible: true,
                    etiquetas_alergenos: allergens,
                    categoryId: productCategoryId,
                    order_index: nextIndex,
                    created_at: new Date()
                });
                showToast('Producto agregado al menú.', 'success');
            }

            setProductName('');
            setProductDesc('');
            setProductPrice(0);
            setProductImage('');
            setAllergens([]);
            loadProducts();
        } catch (err) {
            showToast('Error al guardar producto.', 'error');
        }
    };

    const handleStartEditProduct = (prod: MenuProduct) => {
        setEditingProduct(prod);
        setProductName(prod.name);
        setProductDesc(prod.description);
        setProductPrice(prod.price);
        setProductImage(prod.image_url);
        setProductCategoryId(prod.categoryId);
        setAllergens(prod.etiquetas_alergenos || []);
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
        setProductName('');
        setProductDesc('');
        setProductPrice(0);
        setProductImage('');
        setAllergens([]);
    };

    const handleDeleteProduct = async (prodId: string) => {
        const confirmDel = window.confirm('¿Deseas eliminar este plato/bebida?');
        if (!confirmDel) return;

        try {
            await deleteDoc(doc(db, 'businesses', businessId, 'menu_products', prodId));
            showToast('Producto eliminado.', 'success');
            loadProducts();
        } catch (err) {
            showToast('Error al eliminar producto.', 'error');
        }
    };

    const handleToggleAvailability = async (prodId: string, currentVal: boolean) => {
        try {
            await updateDoc(doc(db, 'businesses', businessId, 'menu_products', prodId), {
                disponible: !currentVal
            });
            setProducts(prev => prev.map(p => p.id === prodId ? { ...p, disponible: !currentVal } : p));
            showToast('Disponibilidad actualizada.', 'success');
        } catch (err) {
            showToast('Error al cambiar disponibilidad.', 'error');
        }
    };

    const toggleAllergen = (allergenId: string) => {
        setAllergens(prev => 
            prev.includes(allergenId) 
                ? prev.filter(x => x !== allergenId) 
                : [...prev, allergenId]
        );
    };

    if (!isOpen) return null;

    const filteredProducts = selectedCategoryFilter === 'all' 
        ? products 
        : products.filter(p => p.categoryId === selectedCategoryFilter);

    return (
        <div className="fixed inset-0 z-[4000] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#0b0f19] rounded-t-[3.5rem] sm:rounded-[3rem] border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[90vh] text-left">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            <Utensils className="w-6 h-6 text-pink-500" />
                            Menú Digital QR
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configuración y Administración</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors group">
                        <X className="w-6 h-6 text-slate-400 group-hover:text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-white/5 pb-3 overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('addon')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'addon' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                    >
                        Suscripción
                    </button>
                    {addonStatus === 'active' && (
                        <>
                            <button 
                                onClick={() => setActiveTab('qrcode')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'qrcode' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                            >
                                Código QR
                            </button>
                            <button 
                                onClick={() => setActiveTab('categories')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'categories' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                            >
                                Categorías
                            </button>
                            <button 
                                onClick={() => setActiveTab('products')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'products' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                            >
                                Productos / Platos
                            </button>
                        </>
                    )}
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                    {loading ? (
                        <div className="py-12 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'addon' && (
                                <div className="space-y-6">
                                    <div className="p-6 bg-slate-900/60 border border-white/5 rounded-3xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-white">Carta Digital QR Autogestionable</h3>
                                                <p className="text-xs text-slate-400 mt-1">Crea y edita tu menú en tiempo real con alérgenos y disponibilidad inmediata.</p>
                                            </div>
                                            <div className="px-4 py-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-2xl text-xs font-black uppercase tracking-widest shrink-0">
                                                $5.00 / mes
                                            </div>
                                        </div>

                                        <div className="border-t border-white/5 pt-4">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Estado del Add-on:</span>
                                            {addonStatus === 'active' ? (
                                                <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                                                    <CheckCircle className="w-5 h-5" />
                                                    ACTIVO (Vence el {expiresAt?.toLocaleDateString()})
                                                </div>
                                            ) : addonStatus === 'pending_approval' ? (
                                                <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                                                    <Info className="w-5 h-5 animate-pulse" />
                                                    PENDIENTE DE APROBACIÓN
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-400 font-black text-sm">
                                                    <Lock className="w-5 h-5" />
                                                    INACTIVO
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {addonStatus !== 'active' && addonStatus !== 'pending_approval' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Automatic Checkout */}
                                            <div className="p-5 bg-gradient-to-br from-pink-500/5 to-purple-500/5 border border-white/5 rounded-3xl space-y-4 text-center">
                                                <div className="w-12 h-12 rounded-2xl bg-pink-500/15 text-pink-500 flex items-center justify-center mx-auto">
                                                    <CreditCard className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Pago Online</h4>
                                                    <p className="text-[10px] text-slate-400 mt-1">Activa tu menú digital al instante pagando con tarjeta o medios locales vía dLocal.</p>
                                                </div>
                                                <button 
                                                    onClick={handleDlocalCheckout}
                                                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pink-500/15"
                                                >
                                                    Pagar con dLocal
                                                </button>
                                            </div>

                                            {/* Manual Bank Transfer */}
                                            <div className="p-5 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 border border-white/5 rounded-3xl space-y-4 text-center">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mx-auto">
                                                    <Banknote className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Transferencia Manual</h4>
                                                    <p className="text-[10px] text-slate-400 mt-1">Realiza tu transferencia de $5 y sube la foto del comprobante para aprobación.</p>
                                                </div>
                                                <div className="space-y-3">
                                                    <OptimizedImageUploader 
                                                        onImageProcessed={(url) => setReceiptUrl(url)}
                                                        path={`uploads/${user?.id}/menu_receipts`}
                                                    />
                                                    <button 
                                                        onClick={handleManualPaymentSubmit}
                                                        disabled={submittingManual}
                                                        className="w-full py-3 bg-slate-900 text-slate-200 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all"
                                                    >
                                                        {submittingManual ? 'Subiendo...' : 'Enviar Comprobante'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'qrcode' && (
                                <div className="space-y-6 flex flex-col items-center text-center p-6 bg-slate-900/60 border border-white/5 rounded-3xl">
                                    <div className="p-4 bg-white rounded-3xl shadow-xl">
                                        <QRCodeSVG 
                                            id="qr-code-canvas"
                                            value={`${window.location.origin}/negocio/${businessSlug || businessId}`}
                                            size={200}
                                            level="H"
                                            includeMargin={true}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Tu Carta QR está Lista</h3>
                                        <p className="text-xs text-slate-400 max-w-sm">Imprime este código y colócalo en tus mesas para que tus clientes escaneen y vean tu Menú Digital al instante.</p>
                                        <p className="text-[10px] font-mono text-slate-500 break-all bg-black/40 p-2.5 rounded-xl border border-white/5 select-all">
                                            {`${window.location.origin}/negocio/${businessSlug || businessId}`}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 w-full max-w-xs">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/negocio/${businessSlug || businessId}`);
                                                showToast('Enlace copiado al portapapeles.', 'success');
                                            }}
                                            className="flex-1 py-3 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 active:scale-95 transition-all border border-white/10"
                                        >
                                            Copiar Link
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const svg = document.getElementById('qr-code-canvas');
                                                if (svg) {
                                                    const svgData = new XMLSerializer().serializeToString(svg);
                                                    const canvas = document.createElement('canvas');
                                                    const ctx = canvas.getContext('2d');
                                                    const img = new Image();
                                                    img.onload = () => {
                                                        canvas.width = img.width;
                                                        canvas.height = img.height;
                                                        ctx?.drawImage(img, 0, 0);
                                                        const pngFile = canvas.toDataURL('image/png');
                                                        const downloadLink = document.createElement('a');
                                                        downloadLink.download = `qr-menu-${businessName.replace(/\s+/g, '-').toLowerCase()}.png`;
                                                        downloadLink.href = pngFile;
                                                        downloadLink.click();
                                                    };
                                                    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                                                }
                                            }}
                                            className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pink-500/15"
                                        >
                                            Descargar PNG
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'categories' && (
                                <div className="space-y-6">
                                    <form onSubmit={handleAddCategory} className="p-6 bg-slate-900/60 border border-white/5 rounded-3xl space-y-4">
                                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Nueva Categoría</h3>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Ej: Entradas, Platos Fuertes, Bebidas..." 
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                required
                                                className="flex-1 bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-pink-500/50"
                                            />
                                            <button 
                                                type="submit"
                                                className="py-3 px-6 bg-pink-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center gap-1.5 shrink-0"
                                            >
                                                <Plus className="w-4 h-4" /> Agregar
                                            </button>
                                        </div>
                                    </form>

                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Categorías Registradas</h3>
                                        {categories.length === 0 ? (
                                            <p className="text-xs text-slate-600">No hay categorías configuradas. Crea una arriba.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {categories.map((cat) => (
                                                    <div key={cat.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center justify-between">
                                                        <span className="text-xs font-bold text-white">{cat.name}</span>
                                                        <button 
                                                            onClick={() => handleDeleteCategory(cat.id)}
                                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'products' && (
                                <div className="space-y-6">
                                    <form onSubmit={handleAddProduct} className="p-6 bg-slate-900/60 border border-white/5 rounded-3xl space-y-4">
                                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Nuevo Plato / Bebida</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Nombre del Plato *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ej: Ceviche de Pescado" 
                                                    value={productName}
                                                    onChange={(e) => setProductName(e.target.value)}
                                                    required
                                                    className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-pink-500/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Precio ($ USD) *</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    placeholder="Ej: 8.50" 
                                                    value={productPrice || ''}
                                                    onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                                                    required
                                                    className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-pink-500/50"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Descripción</label>
                                            <textarea 
                                                placeholder="Ej: Acompañado de chifles, tostado y aguacate fresca." 
                                                value={productDesc}
                                                onChange={(e) => setProductDesc(e.target.value)}
                                                className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-pink-500/50 h-20 resize-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Categoría *</label>
                                                <select 
                                                    value={productCategoryId}
                                                    onChange={(e) => setProductCategoryId(e.target.value)}
                                                    required
                                                    className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-pink-500/50"
                                                >
                                                    {categories.map((cat) => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Imagen del Plato</label>
                                                <OptimizedImageUploader 
                                                    onImageProcessed={(url) => setProductImage(url)}
                                                    currentImageUrl={productImage}
                                                    path={`uploads/${user?.id}/menu_photos`}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Etiquetas / Alérgenos</label>
                                            <div className="flex flex-wrap gap-2">
                                                {allergenOptions.map((opt) => {
                                                    const active = allergens.includes(opt.id);
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => toggleAllergen(opt.id)}
                                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${active ? 'bg-pink-500/10 border-pink-500 text-pink-400' : 'bg-transparent border-white/5 text-slate-500 hover:text-white'}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {editingProduct && (
                                                <button 
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    className="flex-1 py-3.5 bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-widest rounded-2xl border border-white/5"
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                            <button 
                                                type="submit"
                                                className="flex-2 w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-1.5"
                                            >
                                                {editingProduct ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                {editingProduct ? 'Guardar Cambios' : 'Agregar Plato'}
                                            </button>
                                        </div>
                                    </form>

                                    {/* Products list filter */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Carta / Platos</h3>
                                            <select 
                                                value={selectedCategoryFilter}
                                                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                                                className="bg-slate-900 border border-white/5 rounded-xl py-1.5 px-3 text-[10px] font-black uppercase text-slate-400"
                                            >
                                                <option value="all">Todas las categorías</option>
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {filteredProducts.length === 0 ? (
                                            <p className="text-xs text-slate-600">No hay platos registrados en esta categoría.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {filteredProducts.map((prod) => (
                                                    <div key={prod.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-3xl flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3">
                                                            {prod.image_url ? (
                                                                <img src={prod.image_url} alt={prod.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/5" />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-600 shrink-0">
                                                                    <Utensils className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-white">{prod.name}</span>
                                                                    <span className="text-xs font-black text-pink-400">${prod.price.toFixed(2)}</span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{prod.description || 'Sin descripción.'}</p>
                                                                {prod.etiquetas_alergenos && prod.etiquetas_alergenos.length > 0 && (
                                                                    <div className="flex gap-1 mt-1">
                                                                        {prod.etiquetas_alergenos.map(al => (
                                                                            <span key={al} className="text-[7px] font-black uppercase bg-white/5 border border-white/5 py-0.5 px-1.5 rounded text-slate-400">{al}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 shrink-0">
                                                            {/* Availability Toggle Switch */}
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="text-[8px] font-black uppercase text-slate-600">Disponibilidad</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleAvailability(prod.id, prod.disponible)}
                                                                    className={`w-10 h-5 rounded-full transition-all relative ${prod.disponible ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${prod.disponible ? 'left-[calc(100%-1.1rem)]' : 'left-0.5'}`} />
                                                                </button>
                                                            </div>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleStartEditProduct(prod)}
                                                                className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-xl transition-all"
                                                                title="Editar Plato"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteProduct(prod.id)}
                                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
