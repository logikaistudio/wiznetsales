import React, { useState, useEffect } from 'react';
import { Target, Plus, MapPin, Calculator, Search, Trash2, ArrowRight, CheckSquare, Square, X, Pencil, Save, Eye, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { INDONESIA_REGIONS } from '../../data/indonesia';

const Targets = () => {
    const [clusters, setClusters] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCluster, setEditingCluster] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        provinces: [],
        cities: []
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/targets');
            const data = await res.json();
            if (Array.isArray(data)) {
                setClusters(data);
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

    const handleOpenModal = (cluster = null) => {
        setEditingCluster(cluster);
        if (cluster) {
            // Ensure deep copy to avoid mutating state directly
            const deepCopy = JSON.parse(JSON.stringify(cluster));
            // Ensure provinces array exists if not returned by API (it is returned now)
            if (!deepCopy.provinces) deepCopy.provinces = [];
            setFormData(deepCopy);
            setIsEditMode(false);
        } else {
            setFormData({ name: '', provinces: [], cities: [] });
            setIsEditMode(true);
        }
        setIsModalOpen(true);
    };

    const handleProvinceChange = (e) => {
        const selectedProv = e.target.value;
        if (!selectedProv) return;
        if (!formData.provinces.includes(selectedProv)) {
            setFormData(prev => ({
                ...prev,
                provinces: [...prev.provinces, selectedProv]
            }));
        }
    };

    const removeProvince = (prov) => {
        setFormData(prev => ({
            ...prev,
            provinces: prev.provinces.filter(p => p !== prov),
            cities: prev.cities.filter(c => c.province !== prov)
        }));
    };

    const toggleCitySelection = (cityName, provinceName) => {
        if (!isEditMode) return;
        const isSelected = formData.cities.some(c => c.name === cityName);

        if (isSelected) {
            setFormData(prev => ({
                ...prev,
                cities: prev.cities.filter(c => c.name !== cityName)
            }));
        } else {
            const newCity = {
                name: cityName,
                province: provinceName,
                homepass: 0,
                percentage: 0,
                target: 0
            };
            setFormData(prev => ({
                ...prev,
                cities: [...prev.cities, newCity]
            }));
        }
    };

    const removeCity = (cityName) => {
        setFormData(prev => ({
            ...prev,
            cities: prev.cities.filter(c => c.name !== cityName)
        }));
    };

    const updateCityData = (cityName, field, value) => {
        setFormData(prev => {
            const newCities = prev.cities.map(city => {
                if (city.name === cityName) {
                    const updatedCity = { ...city, [field]: Number(value) };
                    updatedCity.target = Math.floor((updatedCity.homepass * updatedCity.percentage) / 100);
                    return updatedCity;
                }
                return city;
            });
            return { ...prev, cities: newCities };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (editingCluster) {
                await fetch(`/api/targets/${editingCluster.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            } else {
                await fetch('/api/targets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
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

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this cluster?')) {
            setIsSaving(true);
            try {
                await fetch(`/api/targets/${id}`, { method: 'DELETE' });
                await fetchData();
            } catch (error) {
                alert('Delete failed');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const filteredClusters = clusters.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <h1 className="text-3xl font-bold text-gray-900">Target Management</h1>
                    <p className="text-gray-500 mt-1">Manage sales targets by regional clusters</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={fetchData}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Cluster
                    </Button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search clusters..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClusters.map((cluster) => (
                    <div key={cluster.id} onClick={() => handleOpenModal(cluster)} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Target className="w-6 h-6" />
                            </div>
                            <button onClick={(e) => handleDelete(e, cluster.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{cluster.name}</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {cluster.provinces && cluster.provinces.map(prov => (
                                <span key={prov} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{prov}</span>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Coverage Cities</span>
                                <span className="font-medium text-gray-900">{cluster.cities ? cluster.cities.length : 0} Cities</span>
                            </div>
                            <div className="w-full h-px bg-gray-100" />
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Total Target</span>
                                <span className="text-xl font-bold text-primary">{cluster.totalTarget ? cluster.totalTarget.toLocaleString() : 0}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={
                <div className="flex items-center gap-3">
                    <span>{editingCluster ? (isEditMode ? 'Edit Cluster' : 'Cluster Details') : 'Create New Cluster'}</span>
                    {!isEditMode && editingCluster && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-normal">Read Only</span>}
                </div>
            } className="max-w-6xl h-[80vh] flex flex-col">
                <div className="flex-1 overflow-hidden flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                        <Input label="Cluster Name" placeholder="e.g. Cluster Sumatera 1" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-600"} />
                        <Select label="Add Province" options={Object.keys(INDONESIA_REGIONS).map(k => ({ value: k, label: k }))} onChange={handleProvinceChange} value="" placeholder={!isEditMode ? "Edit to add provinces..." : "Select province to add..."} disabled={!isEditMode} className={!isEditMode && "bg-gray-50 text-gray-400 cursor-not-allowed"} />
                    </div>

                    {formData.provinces.length > 0 && (
                        <div className="flex flex-wrap gap-2 shrink-0">
                            {formData.provinces.map(prov => (
                                <div key={prov} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                                    {prov}
                                    {isEditMode && <button onClick={() => removeProvince(prov)} className="hover:text-red-500"><Trash2 className="w-3 h-3" /></button>}
                                </div>
                            ))}
                        </div>
                    )}

                    {formData.provinces.length > 0 && (
                        <div className="flex-1 flex gap-6 overflow-hidden min-h-0 border-t border-gray-100 pt-4">
                            <div className="w-1/3 flex flex-col gap-2 min-h-0">
                                <h3 className="text-sm font-semibold text-gray-700 shrink-0">Available Cities</h3>
                                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl p-2 custom-scrollbar bg-gray-50 space-y-1">
                                    {formData.provinces.flatMap(prov => INDONESIA_REGIONS[prov].map(city => ({ name: city, province: prov }))).map((cityItem) => {
                                        const isSelected = formData.cities.some(c => c.name === cityItem.name);
                                        return (
                                            <div key={cityItem.name} onClick={() => toggleCitySelection(cityItem.name, cityItem.province)} className={cn("flex items-center gap-2 p-2 rounded-lg border transition-all text-sm", isEditMode ? "cursor-pointer" : "cursor-default opacity-80", isSelected ? "bg-primary/5 border-primary text-primary" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-100")}>
                                                {isSelected ? <CheckSquare className="w-4 h-4 shrink-0 text-primary" /> : <Square className="w-4 h-4 shrink-0 text-gray-400" />}
                                                <div className="flex flex-col"><span className="font-medium truncate">{cityItem.name}</span><span className="text-xs text-gray-400">{cityItem.province}</span></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col gap-2 min-h-0">
                                <h3 className="text-sm font-semibold text-gray-700 shrink-0">Target Configuration</h3>
                                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl overflow-hidden custom-scrollbar">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3 bg-gray-50">City</th>
                                                <th className="px-4 py-3 bg-gray-50 w-32">Homepass</th>
                                                <th className="px-4 py-3 bg-gray-50 w-28">Target %</th>
                                                <th className="px-4 py-3 bg-gray-50 w-32 text-right">Target</th>
                                                <th className="px-4 py-3 bg-gray-50 w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {formData.cities.map((city) => (
                                                <tr key={`${city.province}-${city.name}`} className="hover:bg-gray-50 group">
                                                    <td className="px-4 py-2"><div className="font-medium">{city.name}</div><div className="text-xs text-gray-400">{city.province}</div></td>
                                                    <td className="px-4 py-2"><input type="number" min="0" className={cn("w-full border rounded px-2 py-1 text-right focus:outline-primary", !isEditMode && "bg-transparent border-none")} value={city.homepass} onChange={(e) => updateCityData(city.name, 'homepass', e.target.value)} disabled={!isEditMode} /></td>
                                                    <td className="px-4 py-2"><div className="flex items-center gap-1 justify-end"><input type="number" min="0" max="100" className={cn("w-16 border rounded px-2 py-1 text-right focus:outline-primary", !isEditMode && "bg-transparent border-none w-auto")} value={city.percentage} onChange={(e) => updateCityData(city.name, 'percentage', e.target.value)} disabled={!isEditMode} /><span>%</span></div></td>
                                                    <td className="px-4 py-2 text-right font-bold text-gray-900">{city.target.toLocaleString()}</td>
                                                    <td className="px-4 py-2 text-right">{isEditMode && <button onClick={() => removeCity(city.name)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><X className="w-4 h-4" /></button>}</td>
                                                </tr>
                                            ))}
                                            {formData.cities.length === 0 && <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">Select cities from the left panel to configure targets.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex justify-between items-center shrink-0">
                                    <span className="font-medium text-gray-600">Total Target</span>
                                    <span className="text-xl font-bold text-primary">{formData.cities.reduce((acc, curr) => acc + curr.target, 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0 mt-4">
                    {editingCluster && !isEditMode ? (
                        <><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Close</Button><Button onClick={() => setIsEditMode(true)}><Pencil className="w-4 h-4 mr-2" /> Edit Cluster</Button></>
                    ) : (
                        <><Button variant="ghost" onClick={() => editingCluster ? setIsEditMode(false) : setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Cluster</Button></>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Targets;
