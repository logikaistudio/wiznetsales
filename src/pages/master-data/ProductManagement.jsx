import React, { useState, useEffect } from 'react';
import { Package, Briefcase, Plus, Pencil, Trash2, Search, Calendar, Tag, Layers, Save, X, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';

const ProductManagement = () => {
    const [activeTab, setActiveTab] = useState('broadband'); // 'broadband' | 'corporate'
    const [allProducts, setAllProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({});

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            if (Array.isArray(data)) {
                setAllProducts(data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            // Format date for input
            const d = item.releaseDate ? new Date(item.releaseDate).toISOString().split('T')[0] : '';
            setFormData({ ...item, releaseDate: d });
            setIsEditMode(false); // Default Read-Only
        } else {
            const today = new Date().toISOString().split('T')[0];
            setFormData({
                name: '',
                price: '',
                cogs: '',
                releaseDate: today,
                bandwidth: activeTab === 'corporate' ? '' : undefined,
                category: activeTab === 'broadband' ? 'Broadband Home' : 'Corporate'
            });
            setIsEditMode(true);
        }
        setIsModalOpen(true);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchTerm('');
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this product?')) {
            setIsSaving(true);
            try {
                await fetch(`/api/products/${id}`, { method: 'DELETE' });
                await fetchData();
                setIsModalOpen(false);
            } catch (error) {
                alert('Delete failed');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = {
            ...formData,
            price: Number(formData.price),
            cogs: Number(formData.cogs),
            category: activeTab === 'broadband' ? 'Broadband Home' : 'Corporate' // Ensure current tab category
        };

        try {
            if (editingItem) {
                await fetch(`/api/products/${editingItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            await fetchData();
            setIsEditMode(false);
            setIsModalOpen(false);
        } catch (error) {
            alert('Save failed');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const retailData = allProducts.filter(p => p.category === 'Broadband Home');
    const corporateData = allProducts.filter(p => p.category === 'Corporate');

    const filteredData = (activeTab === 'broadband' ? retailData : corporateData).filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            {(isLoading || isSaving) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
                    <p className="text-gray-500 mt-1">Manage broadband and dedicated internet products</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={fetchData}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button onClick={() => handleTabChange('broadband')} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all", activeTab === 'broadband' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                    <Package className="w-4 h-4" /> Broadband Home
                </button>
                <button onClick={() => handleTabChange('corporate')} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all", activeTab === 'corporate' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                    <Briefcase className="w-4 h-4" /> Corporate
                </button>
            </div>

            {/* Search & Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Product Name</th>
                                {activeTab === 'corporate' && <th className="px-6 py-4">Bandwidth</th>}
                                <th className="px-6 py-4">Price (IDR)</th>
                                <th className="px-6 py-4">COGS (IDR)</th>
                                <th className="px-6 py-4">Release Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <tr key={item.id} onClick={() => handleOpenModal(item)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                        {activeTab === 'corporate' && <td className="px-6 py-4 text-gray-500">{item.bandwidth}</td>}
                                        <td className="px-6 py-4 text-gray-900 font-medium">Rp {item.price.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-gray-500">Rp {item.cogs.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-gray-500">{item.releaseDate ? new Date(item.releaseDate).toLocaleDateString() : '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={activeTab === 'corporate' ? 5 : 4} className="px-6 py-12 text-center text-gray-500">No products found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Editor Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={
                <div className="flex items-center gap-3">
                    <span>{editingItem ? (isEditMode ? 'Edit Product' : 'Product Details') : 'Add Product'}</span>
                    {!isEditMode && editingItem && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-normal">Read Only</span>}
                </div>
            }>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-4">
                        <Input label="Product Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. Home Fiber 100Mbps" disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                        {activeTab === 'corporate' && (
                            <Input label="Bandwidth" value={formData.bandwidth || ''} onChange={e => setFormData({ ...formData, bandwidth: e.target.value })} required placeholder="e.g. 100 Mbps" disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Price (IDR)" type="number" min="0" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: e.target.value })} required placeholder="0" disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                            <Input label="COGS (IDR)" type="number" min="0" value={formData.cogs || ''} onChange={e => setFormData({ ...formData, cogs: e.target.value })} required placeholder="0" disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                        </div>
                        <Input label="Release Date" type="date" value={formData.releaseDate || ''} onChange={e => setFormData({ ...formData, releaseDate: e.target.value })} required disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        {isEditMode && editingItem ? <Button type="button" variant="danger" onClick={() => handleDelete(editingItem.id)} className="px-3"><Trash2 className="w-4 h-4 mr-2" /> Delete</Button> : <div></div>}
                        <div className="flex gap-3">
                            {editingItem && !isEditMode ? (
                                <><Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Close</Button><Button type="button" onClick={(e) => { e.preventDefault(); setIsEditMode(true); }}><Pencil className="w-4 h-4 mr-2" /> Edit</Button></>
                            ) : (
                                <><Button type="button" variant="ghost" onClick={() => editingItem ? setIsEditMode(false) : setIsModalOpen(false)}>Cancel</Button><Button type="submit"><Save className="w-4 h-4 mr-2" /> Save</Button></>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProductManagement;
