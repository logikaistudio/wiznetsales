import React, { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, Calendar, FileText, Save, Search, Plus, Trash2, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { cn } from '../lib/utils';

const Prospect = () => {
    // Data States
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [salesPeople, setSalesPeople] = useState([]);

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState(null); // ID of customer being edited/viewed

    // Form State
    const [formData, setFormData] = useState({
        customerId: '',
        type: 'Broadband Home',
        name: '',
        address: '',
        area: '',
        kabupaten: '',
        kecamatan: '',
        kelurahan: '',
        latitude: '',
        longitude: '',
        phone: '',
        email: '',
        productId: '',
        productName: '', // Cached/Autopopulated
        rfsDate: '',
        salesId: '',
        salesName: '',
        status: 'Prospect',
        prospectDate: new Date().toISOString().split('T')[0],
        files: [] // Array of { name, data, type }
    });

    // Initial Fetch
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [custRes, prodRes, salesRes] = await Promise.all([
                fetch('/api/customers'),
                fetch('/api/products'),
                fetch('/api/person-incharge')
            ]);

            const custData = await custRes.json();
            const prodData = await prodRes.json();
            const salesData = await salesRes.json();

            if (Array.isArray(custData)) setCustomers(custData);
            if (Array.isArray(prodData)) setProducts(prodData);
            if (Array.isArray(salesData)) setSalesPeople(salesData.filter(p => p.role === 'Sales'));

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handlers
    const handleReset = () => {
        setSelectedId(null);
        setFormData({
            customerId: `CUST-${Date.now()}`,
            type: 'Broadband Home',
            name: '',
            address: '',
            area: '',
            kabupaten: '',
            kecamatan: '',
            kelurahan: '',
            latitude: '',
            longitude: '',
            phone: '',
            email: '',
            productId: '',
            productName: '',
            rfsDate: '',
            salesId: '',
            salesName: '',
            status: 'Prospect',
            prospectDate: new Date().toISOString().split('T')[0],
            files: []
        });
        setFilteredCities([]);
        setDistricts([]);
        setVillages([]);
    };

    const handleSelectCustomer = (customer) => {
        setSelectedId(customer.id);
        const data = {
            ...customer,
            rfsDate: customer.rfsDate ? customer.rfsDate.split('T')[0] : '',
            prospectDate: customer.prospectDate ? customer.prospectDate.split('T')[0] : '',
            files: customer.files || []
        };
        setFormData(data);

        // Trigger population logic for edit
        if (data.area) { // Area is Cluster Name, find cluster
            const cluster = clusters.find(c => c.name === data.area);
            if (cluster) {
                setFilteredCities(cluster.cities || []);
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    files: [...prev.files, {
                        name: file.name,
                        type: file.type,
                        data: reader.result // Base64
                    }]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const removeFile = (index) => {
        setFormData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const url = selectedId ? `/api/customers/${selectedId}` : '/api/customers';
            const method = selectedId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to save');

            await fetchData();
            if (!selectedId) handleReset(); // Clear form if new
            alert('Data saved successfully!');

        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save data');
        } finally {
            setIsSaving(false);
        }
    };

    // --- AUTO POPULATE LOCATION LOGIC ---

    // 1. Clusters (Area)
    const [clusters, setClusters] = useState([]);
    // 2. Cities (Kabupaten) - derived from selected Cluster
    const [filteredCities, setFilteredCities] = useState([]);

    // 3. API Data for Districts/Villages
    const [provincesAPI, setProvincesAPI] = useState([]);
    const [districts, setDistricts] = useState([]); // Kecamatan
    const [villages, setVillages] = useState([]); // Kelurahan

    const fetchAuxData = async () => {
        try {
            const cRes = await fetch('/api/targets');
            const cData = await cRes.json();
            if (Array.isArray(cData)) {
                setClusters(cData);
            }

            const pRes = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
            if (pRes.ok) {
                const pData = await pRes.json();
                setProvincesAPI(pData);
            }
        } catch (e) {
            console.error("Location Fetch Error", e);
        }
    };

    useEffect(() => {
        fetchAuxData();
    }, []);

    const handleAreaChange = (e) => {
        const clusterName = e.target.value;
        const cluster = clusters.find(c => c.name === clusterName);

        setFormData(prev => ({
            ...prev,
            area: clusterName,
            kabupaten: '',
            kecamatan: '',
            kelurahan: ''
        }));
        setFilteredCities(cluster ? cluster.cities : []);
        setDistricts([]);
        setVillages([]);
    };

    const handleCityChange = async (e) => {
        const cityName = e.target.value;
        const selectedCityObj = filteredCities.find(c => c.name === cityName);

        setFormData(prev => ({
            ...prev,
            kabupaten: cityName,
            kecamatan: '',
            kelurahan: ''
        }));

        if (selectedCityObj && provincesAPI.length > 0) {
            const provName = selectedCityObj.province.toUpperCase();
            // Fuzzy match logic if needed, but usually simple match works for standard names
            const provApi = provincesAPI.find(p => p.name === provName) || provincesAPI.find(p => provName.includes(p.name));

            if (provApi) {
                try {
                    const rRes = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provApi.id}.json`);
                    const rData = await rRes.json();

                    const cityApi = rData.find(r => r.name === cityName.toUpperCase());

                    if (cityApi) {
                        const dRes = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${cityApi.id}.json`);
                        const dData = await dRes.json();
                        setDistricts(dData);
                    }
                } catch (error) {
                    console.error("API location fetch error", error);
                }
            }
        }
    };

    const handleDistrictChange = async (e) => {
        const districtName = e.target.value;
        const selectedDist = districts.find(d => d.name === districtName);

        setFormData(prev => ({
            ...prev,
            kecamatan: districtName,
            kelurahan: ''
        }));

        if (selectedDist) {
            try {
                const vRes = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${selectedDist.id}.json`);
                const vData = await vRes.json();
                setVillages(vData);
            } catch (err) { console.error(err); }
        }
    };

    const handleVillageChange = (e) => {
        setFormData(prev => ({ ...prev, kelurahan: e.target.value }));
    };

    // Filter Logic
    const filteredProducts = products.filter(p =>
        (formData.type === 'Broadband Home' && p.category === 'Broadband Home') ||
        (formData.type === 'Corporate' && p.category === 'Corporate')
    );

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customerId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Prospect & Customers</h1>
                    <p className="text-gray-500 mt-1">Manage customer data and prospect lifecycle</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
                    <Button onClick={handleReset}><Plus className="w-4 h-4 mr-2" /> New Prospect</Button>
                </div>
            </div>

            {/* TOP SECTION: FORM */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                    <User className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-gray-800">
                        {selectedId ? 'Edit Customer Details' : 'New Customer Entry'}
                    </h2>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Row 1: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Input label="Customer ID" value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })} placeholder="Auto-generated" />
                        <Select
                            label="Type Customer"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value, productId: '', productName: '' })}
                            options={[{ value: 'Broadband Home', label: 'Broadband Home' }, { value: 'Corporate', label: 'Corporate' }]}
                        />
                        <Input label="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Enter customer name" />
                        <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                    </div>

                    {/* Row 2: Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Address</label>
                            <textarea
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                rows={3}
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Full address..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Area (Cluster)"
                                value={formData.area}
                                onChange={handleAreaChange}
                                options={clusters.map(c => ({ value: c.name, label: c.name }))}
                                placeholder="Select Cluster"
                            />
                            <Select
                                label="Kabupaten (City)"
                                value={formData.kabupaten}
                                onChange={handleCityChange}
                                options={filteredCities.map(c => ({ value: c.name, label: c.name }))}
                                disabled={!formData.area}
                                placeholder="Select City"
                            />

                            {districts.length > 0 ? (
                                <Select
                                    label="Kecamatan"
                                    value={formData.kecamatan}
                                    onChange={handleDistrictChange}
                                    options={districts.map(d => ({ value: d.name, label: d.name }))}
                                    placeholder="Select District"
                                />
                            ) : (
                                <Input label="Kecamatan" value={formData.kecamatan} onChange={e => setFormData({ ...formData, kecamatan: e.target.value })} placeholder="Type manual if needed" />
                            )}

                            {villages.length > 0 ? (
                                <Select
                                    label="Kelurahan"
                                    value={formData.kelurahan}
                                    onChange={handleVillageChange}
                                    options={villages.map(v => ({ value: v.name, label: v.name }))}
                                    placeholder="Select Village"
                                />
                            ) : (
                                <Input label="Kelurahan" value={formData.kelurahan} onChange={e => setFormData({ ...formData, kelurahan: e.target.value })} placeholder="Type manual if needed" />
                            )}
                        </div>
                    </div>

                    {/* Row 3: Technical & Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Input label="Longitude" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} placeholder="106.xxx" />
                        <Input label="Latitude" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} placeholder="-6.xxx" />
                        <Input label="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="08xxx" />
                        <Select
                            label="Plan / Product"
                            value={formData.productId}
                            onChange={e => {
                                const prod = products.find(p => p.id.toString() === e.target.value);
                                setFormData({
                                    ...formData,
                                    productId: e.target.value,
                                    productName: prod ? prod.name : ''
                                });
                            }}
                            options={filteredProducts.map(p => ({ value: p.id, label: p.name }))}
                            placeholder="Select Plan"
                        />
                    </div>

                    {/* Row 4: Sales & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Input label="RFS Date" type="date" value={formData.rfsDate} onChange={e => setFormData({ ...formData, rfsDate: e.target.value })} />
                        <Select
                            label="Sales Person"
                            value={formData.salesId}
                            onChange={e => {
                                const sales = salesPeople.find(s => s.id.toString() === e.target.value);
                                setFormData({
                                    ...formData,
                                    salesId: e.target.value,
                                    salesName: sales ? sales.name : ''
                                });
                            }}
                            options={salesPeople.map(s => ({ value: s.id, label: `${s.name} (${s.area || '-'})` }))}
                            placeholder="Select Sales"
                        />
                        <Input label="Prospect Date" type="date" value={formData.prospectDate} onChange={e => setFormData({ ...formData, prospectDate: e.target.value })} />
                        <Select
                            label="Current Status"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            options={[
                                { value: 'Prospect', label: 'Prospect' },
                                { value: 'Survey', label: 'Survey' },
                                { value: 'Installation', label: 'Installation' },
                                { value: 'Billing', label: 'Billing' },
                                { value: 'Blockir', label: 'Blockir' },
                                { value: 'Churn', label: 'Churn' }
                            ]}
                        />
                    </div>

                    {/* Row 5: Documents */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Data Pendukung (PDF/JPG - Max 4 Files)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative">
                            <div className="space-y-1 text-center">
                                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                                        <span>Upload data pendukung</span>
                                        <input type="file" className="sr-only" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500">KTP, Foto Rumah (PDF, JPG up to 10MB)</p>
                            </div>
                        </div>
                        {formData.files.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                {formData.files.map((file, idx) => (
                                    <div key={idx} className="relative group border rounded-lg p-2 bg-gray-50 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-gray-500" />
                                        <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                                        <button type="button" onClick={() => removeFile(idx)} className="ml-auto text-gray-400 hover:text-red-500">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-100">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Record
                        </Button>
                    </div>
                </form>
            </div>

            {/* BOTTOM SECTION: LIST */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Prospect List</h2>
                        <p className="text-sm text-gray-500">History and status of customer acquisitions</p>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search prospects..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Customer ID</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Prospect Date</th>
                                <th className="px-6 py-4">Sales Person</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCustomers.length > 0 ? filteredCustomers.map((cust) => (
                                <tr key={cust.id} onClick={() => handleSelectCustomer(cust)} className={cn("hover:bg-gray-50 transition-colors cursor-pointer", selectedId === cust.id && "bg-blue-50/50")}>
                                    <td className="px-6 py-4 font-medium text-gray-900">{cust.customerId}</td>
                                    <td className="px-6 py-4 text-gray-600">{cust.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{cust.prospectDate ? new Date(cust.prospectDate).toLocaleDateString() : '-'}</td>
                                    <td className="px-6 py-4 text-gray-500">{cust.salesName || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                            cust.status === 'Billing' ? "bg-green-100 text-green-700 border-green-200" :
                                                cust.status === 'Blockir' || cust.status === 'Churn' ? "bg-red-100 text-red-700 border-red-200" :
                                                    "bg-blue-100 text-blue-700 border-blue-200"
                                        )}>
                                            {cust.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSelectCustomer(cust); }}>Edit</Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No prospects found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Simple Close Icon Helper
function X({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
}

export default Prospect;
