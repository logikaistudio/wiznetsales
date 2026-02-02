import React, { useState, useEffect } from 'react';
import { User, Headphones, Plus, Pencil, Trash2, Search, X, Save, Calendar, Clock, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const PersonIncharge = () => {
    const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'support'
    const [peopleData, setPeopleData] = useState([]);
    const [targetCities, setTargetCities] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // null = add mode
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({});

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/person-incharge');
            const data = await res.json();
            if (Array.isArray(data)) {
                setPeopleData(data);

                // Fetch Target Cities for Sales Area dropdown
                const resTargets = await fetch('/api/targets');
                const dataTargets = await resTargets.json();
                if (Array.isArray(dataTargets)) {
                    // Flatten all cities from all clusters
                    const cities = [];
                    dataTargets.forEach(cluster => {
                        if (cluster.cities && Array.isArray(cluster.cities)) {
                            cluster.cities.forEach(city => {
                                // Ensure unique cities
                                if (!cities.some(c => c.value === city.name)) {
                                    cities.push({ value: city.name, label: city.name });
                                }
                            });
                        }
                    });
                    setTargetCities(cities.sort((a, b) => a.label.localeCompare(b.label)));
                }
            } catch (error) {
                console.error('Failed to fetch', error);
            } finally {
                setIsLoading(false);
            }
        };

        useEffect(() => {
            fetchData();
        }, []);

        const handleTabChange = (tab) => {
            setActiveTab(tab);
            setSearchTerm('');
        };

        const handleOpenModal = (item = null) => {
            setEditingItem(item);
            if (item) {
                setFormData(JSON.parse(JSON.stringify(item))); // Deep copy
                setIsEditMode(false); // Default Read-Only
            } else {
                const today = new Date().toISOString().split('T')[0];
                setFormData({
                    name: '',
                    employeeId: '',
                    phone: '',
                    area: '',
                    position: 'Helpdesk',
                    status: 'active',
                    activeDate: today,
                    inactiveDate: null,
                    role: activeTab === 'sales' ? 'Sales' : 'Support'
                });
                setIsEditMode(true); // Default Edit for new
            }
            setIsModalOpen(true);
        };

        const handleDelete = async (id) => {
            if (confirm('Are you sure you want to delete this person? This action cannot be undone.')) {
                setIsSaving(true);
                try {
                    await fetch(`/api/person-incharge/${id}`, { method: 'DELETE' });
                    await fetchData();
                    setIsModalOpen(false);
                } catch (error) {
                    alert('Failed to delete');
                } finally {
                    setIsSaving(false);
                }
            }
        };

        const toggleStatus = () => {
            const newStatus = formData.status === 'active' || formData.status === 'Active' ? 'inactive' : 'active';

            setFormData(prev => ({
                ...prev,
                status: newStatus
            }));
        };

        const handleSave = async (e) => {
            e.preventDefault();
            setIsSaving(true);

            // Ensure role is correct based on tab if creating new
            const role = editingItem ? formData.role : (activeTab === 'sales' ? 'Sales' : 'Support');

            const payload = {
                ...formData,
                role,
                status: formData.status || 'Active'
            };

            try {
                if (editingItem) {
                    await fetch(`/api/person-incharge/${editingItem.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    await fetch('/api/person-incharge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }
                await fetchData();
                setIsEditMode(false);
                setIsModalOpen(false);
            } catch (error) {
                alert('Failed to save');
                console.error(error);
            } finally {
                setIsSaving(false);
            }
        };

        const salesData = peopleData.filter(p => p.role === 'Sales');
        const supportData = peopleData.filter(p => p.role === 'Support');

        const filteredData = (activeTab === 'sales' ? salesData : supportData).filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.employeeId && item.employeeId.toLowerCase().includes(searchTerm.toLowerCase()))
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
                        <h1 className="text-3xl font-bold text-gray-900">Person Incharge</h1>
                        <p className="text-gray-500 mt-1">Manage Sales and Support personnel</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={fetchData}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleOpenModal()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Person
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                    <button onClick={() => handleTabChange('sales')} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all", activeTab === 'sales' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                        <User className="w-4 h-4" /> Sales Team
                    </button>
                    <button onClick={() => handleTabChange('support')} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all", activeTab === 'support' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                        <Headphones className="w-4 h-4" /> Support Team
                    </button>
                </div>

                {/* Search & Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative max-w-xs">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input type="text" placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">ID / NIP</th>
                                    <th className="px-6 py-4">Phone</th>
                                    <th className="px-6 py-4">{activeTab === 'sales' ? 'Sales Area' : 'Position'}</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredData.length > 0 ? (
                                    filteredData.map((item) => (
                                        <tr key={item.id} onClick={() => handleOpenModal(item)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                            <td className="px-6 py-4 text-gray-500">{item.employeeId}</td>
                                            <td className="px-6 py-4 text-gray-500">{item.phone}</td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {item.role === 'Sales' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{item.area}</span>
                                                ) : (
                                                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", item.position === 'Helpdesk' && "bg-purple-50 text-purple-700", item.position === 'Technical Support' && "bg-orange-50 text-orange-700", item.position === 'Customer Service' && "bg-green-50 text-green-700")}>{item.position}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", item.status === 'active' || item.status === 'Active' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100")}>
                                                    <span className={cn("w-1.5 h-1.5 rounded-full", item.status === 'active' || item.status === 'Active' ? "bg-green-600" : "bg-red-600")} />
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No data found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Editor Modal */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={
                    <div className="flex items-center gap-3">
                        <span>{editingItem ? (isEditMode ? 'Edit Person' : 'Person Details') : 'Add Person'}</span>
                        {!isEditMode && editingItem && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-normal">Read Only</span>}
                    </div>
                }>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-4">
                            <Input label="Full Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. Budi Santoso" disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="ID / NIP" value={formData.employeeId || ''} onChange={e => setFormData({ ...formData, employeeId: e.target.value })} required placeholder="e.g. SAL001" disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                                <Input label="Phone Number" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} required placeholder="e.g. 0812..." disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                            </div>
                            {activeTab === 'sales' ? (
                                <Select
                                    label="Sales Area (City)"
                                    value={formData.area || ''}
                                    onChange={e => setFormData({ ...formData, area: e.target.value })}
                                    required
                                    options={targetCities}
                                    placeholder="Select City"
                                    disabled={!isEditMode}
                                    className={!isEditMode && "bg-gray-50 text-gray-600 cursor-not-allowed"}
                                />
                            ) : (
                                <Select label="Position" value={formData.position || ''} onChange={e => setFormData({ ...formData, position: e.target.value })} required options={[{ value: 'Helpdesk', label: 'Helpdesk' }, { value: 'Customer Service', label: 'Customer Service' }, { value: 'Technical Support', label: 'Technical Support' }]} placeholder="Select Position" disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600 cursor-not-allowed"} />
                            )}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col"><span className="text-sm font-medium text-gray-700">Status</span><span className="text-xs text-gray-500">Current personnel status</span></div>
                                {isEditMode ? (
                                    <button type="button" onClick={toggleStatus} className={cn("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none", formData.status === 'active' || formData.status === 'Active' ? "bg-green-600" : "bg-gray-200")}>
                                        <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", formData.status === 'active' || formData.status === 'Active' ? "translate-x-5" : "translate-x-0")} />
                                    </button>
                                ) : (
                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", formData.status === 'active' || formData.status === 'Active' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100")}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full", formData.status === 'active' || formData.status === 'Active' ? "bg-green-600" : "bg-red-600")} />
                                        {formData.status}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200/50">
                                <Input
                                    type="date"
                                    label="Active Since"
                                    value={formData.activeDate || ''}
                                    onChange={e => setFormData({ ...formData, activeDate: e.target.value })}
                                    disabled={!isEditMode}
                                    className={!isEditMode && "bg-gray-50 text-gray-600"}
                                />
                                <Input
                                    type="date"
                                    label="Inactive Since"
                                    value={formData.inactiveDate || ''}
                                    onChange={e => setFormData({ ...formData, inactiveDate: e.target.value })}
                                    disabled={!isEditMode}
                                    className={!isEditMode && "bg-gray-50 text-gray-600"}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            {isEditMode && editingItem ? <Button type="button" variant="danger" onClick={() => handleDelete(editingItem.id)} className="px-3"><Trash2 className="w-4 h-4 mr-2" /> Delete Person</Button> : <div></div>}
                            <div className="flex gap-3">
                                {editingItem && !isEditMode ? (
                                    <><Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Close</Button><Button type="button" onClick={(e) => { e.preventDefault(); setIsEditMode(true); }}><Pencil className="w-4 h-4 mr-2" /> Edit</Button></>
                                ) : (
                                    <><Button type="button" variant="ghost" onClick={() => editingItem ? setIsEditMode(false) : setIsModalOpen(false)}>Cancel</Button><Button type="submit"><Save className="w-4 h-4 mr-2" /> Save Changes</Button></>
                                )}
                            </div>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    };

    export default PersonIncharge;
