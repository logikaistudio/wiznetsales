import React, { useState, useEffect } from 'react';
import { Tag, Plus, Pencil, Trash2, Search, Calendar, Save, Percent, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';

const Promo = () => {
    const [promos, setPromos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({});

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/promos');
            const data = await res.json();
            if (Array.isArray(data)) {
                setPromos(data);
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
            setFormData({
                ...item,
                validFrom: item.validFrom ? new Date(item.validFrom).toISOString().split('T')[0] : '',
                validTo: item.validTo ? new Date(item.validTo).toISOString().split('T')[0] : ''
            });
            setIsEditMode(false); // Default Read-Only
        } else {
            const today = new Date().toISOString().split('T')[0];
            setFormData({
                name: '',
                validFrom: today,
                validTo: '',
                price: '',
                cogs: '',
                description: ''
            });
            setIsEditMode(true);
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this promo?')) {
            setIsSaving(true);
            try {
                await fetch(`/api/promos/${id}`, { method: 'DELETE' });
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
            cogs: Number(formData.cogs)
        };

        try {
            let response;
            if (editingItem) {
                response = await fetch(`/api/promos/${editingItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch('/api/promos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Save failed');
            }

            await fetchData();
            setIsEditMode(false);
            setIsModalOpen(false);
        } catch (error) {
            alert('Save failed: ' + error.message);
            console.error('Save error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredPromos = promos.filter(item =>
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
                    <h1 className="text-3xl font-bold text-gray-900">Promo Management</h1>
                    <p className="text-gray-500 mt-1">Manage sales promotions and special offers</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={fetchData}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Promo
                    </Button>
                </div>
            </div>

            {/* Search & Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input type="text" placeholder="Search promos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Promo Name</th>
                                <th className="px-6 py-4">Valid Period</th>
                                <th className="px-6 py-4">Promo Price (IDR)</th>
                                <th className="px-6 py-4">COGS (IDR)</th>
                                <th className="px-6 py-4">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPromos.length > 0 ? (
                                filteredPromos.map((item) => (
                                    <tr key={item.id} onClick={() => handleOpenModal(item)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            <span className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {item.validTo ? new Date(item.validTo).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">Rp {item.price.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-gray-500">Rp {item.cogs.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{item.description}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No active promos found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Editor Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={
                <div className="flex items-center gap-3">
                    <span>{editingItem ? (isEditMode ? 'Edit Promo' : 'Promo Details') : 'Add Promo'}</span>
                    {!isEditMode && editingItem && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-normal">Read Only</span>}
                </div>
            }>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-4">
                        <Input label="Promo Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. End of Year Sale" disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Promo Price (IDR)" type="number" min="0" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: e.target.value })} required placeholder="0" disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                            <Input label="COGS Adjusted (IDR)" type="number" min="0" value={formData.cogs || ''} onChange={e => setFormData({ ...formData, cogs: e.target.value })} required placeholder="0" disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Valid From" type="date" value={formData.validFrom || ''} onChange={e => setFormData({ ...formData, validFrom: e.target.value })} required disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                            <Input label="Valid Until" type="date" value={formData.validTo || ''} onChange={e => setFormData({ ...formData, validTo: e.target.value })} required disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Description</label>
                            <textarea className={cn("flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all", !isEditMode && "bg-gray-50 text-gray-600")} rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} disabled={!isEditMode} placeholder="Describe terms and conditions..." />
                        </div>
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

export default Promo;
