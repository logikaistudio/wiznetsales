import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, MapPin, FileText, Save, Search, Plus, Trash2, CheckCircle, Loader2, Edit, AlertCircle, Upload, Download, Image, X, Camera } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';

// ─── Wilayah Cache Helper ──────────────────────────────────────────────────
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const cacheGet = (key) => {
    try {
        const raw = localStorage.getItem(`wilayah_${key}`);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`wilayah_${key}`); return null; }
        return data;
    } catch { return null; }
};

const cacheSet = (key, data) => {
    try { localStorage.setItem(`wilayah_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch { }
};

const fetchWithCache = async (url, cacheKey) => {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cacheSet(cacheKey, data);
    return data;
};

// Normalise region name (strip prefix, uppercase)
const normalizeRegionName = (name) => {
    if (!name) return '';
    return name.toUpperCase()
        .replace(/^(KABUPATEN|KOTA|KAB\.?)\s+/, '')
        .replace(/\s+DI$/, '')
        .trim();
};

// ─── Photo Upload Helper ───────────────────────────────────────────────────
const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ─── Main Component ────────────────────────────────────────────────────────
const Prospect = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Data States
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [salesPeople, setSalesPeople] = useState([]);

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Covered');

    // Import/Export States
    const fileInputRef = useRef(null);
    const photoInputRef = useRef(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importPreview, setImportPreview] = useState([]);
    const [importLoading, setImportLoading] = useState(false);
    const [importMode, setImportMode] = useState('insert');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Form State
    const defaultForm = {
        customerId: '',
        type: 'Broadband Home',
        name: '',
        address: '',
        area: '',
        province: '',
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
        isActive: true,
        files: [],
        fat: '',
        homepassId: '',
        siteId: '',
        catatan: '',
        prospectStatus: 'Covered'
    };
    const [formData, setFormData] = useState(defaultForm);

    // Location states
    const [clusters, setClusters] = useState([]);
    const [filteredCities, setFilteredCities] = useState([]);
    const [kecamatanList, setKecamatanList] = useState([]);
    const [kelurahanList, setKelurahanList] = useState([]);
    const [loadingKec, setLoadingKec] = useState(false);
    const [loadingKel, setLoadingKel] = useState(false);

    // Coverage status
    const [coverageStatus, setCoverageStatus] = useState({ checked: false, isCovered: false, distance: 0, node: null, loading: false, message: '' });

    const { hasPermission } = useAuth();

    // ── Field map for table / export ──────────────────────────────────────
    const FIELD_MAP = [
        { header: 'Customer ID', key: 'customerId', width: 20 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Phone (WA)', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Address', key: 'address', width: 40 },
        { header: 'Homepass ID', key: 'homepassId', width: 20 },
        { header: 'Site ID', key: 'siteId', width: 20 },
        { header: 'FAT (Fiber Access Terminal)', key: 'fat', width: 20 },
        { header: 'Cluster/Area', key: 'area', width: 20 },
        { header: 'Kabupaten/City', key: 'kabupaten', width: 20 },
        { header: 'Kecamatan', key: 'kecamatan', width: 20 },
        { header: 'Kelurahan', key: 'kelurahan', width: 20 },
        { header: 'Latitude', key: 'latitude', width: 15 },
        { header: 'Longitude', key: 'longitude', width: 15 },
        { header: 'Product', key: 'productName', width: 25 },
        { header: 'Sales Person', key: 'salesName', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Prospect Status', key: 'prospectStatus', width: 15 },
        { header: 'Notes/Catatan', key: 'catatan', width: 30 },
        { header: 'Prospect Date', key: 'prospectDate', width: 15 },
        { header: 'RFS Date', key: 'rfsDate', width: 15 },
    ];

    // ── Fetchers ──────────────────────────────────────────────────────────
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

    const fetchAuxData = async () => {
        try {
            const cRes = await fetch('/api/targets');
            const cData = await cRes.json();
            if (Array.isArray(cData)) setClusters(cData);
        } catch (e) {
            console.error('Location Fetch Error', e);
        }
    };

    useEffect(() => {
        fetchData();
        fetchAuxData();
    }, []);

    // ── Auto-fill Site ID & FAT based on Homepass ID ──────────────────────
    useEffect(() => {
        const timer = setTimeout(async () => {
            const hid = formData.homepassId;
            if (!hid || hid.length < 3) return;
            try {
                const res = await fetch(`/api/coverage?search=${encodeURIComponent(hid)}&limit=10`);
                const json = await res.json();
                if (json.data && Array.isArray(json.data)) {
                    const match = json.data.find(d =>
                        (d.homepassId && d.homepassId.toLowerCase() === hid.toLowerCase()) ||
                        (d.siteId && d.siteId.toLowerCase() === hid.toLowerCase())
                    );
                    if (match) {
                        setFormData(prev => ({
                            ...prev,
                            siteId: match.siteId || '',
                            fat: match.siteId || '',
                            latitude: (!prev.latitude && match.ampliLat) ? match.ampliLat.toString() : prev.latitude,
                            longitude: (!prev.longitude && match.ampliLong) ? match.ampliLong.toString() : prev.longitude
                        }));
                    }
                }
            } catch (e) { console.error('Homepass lookup failed', e); }
        }, 800);
        return () => clearTimeout(timer);
    }, [formData.homepassId]);

    // ── Coverage check debounce ───────────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(async () => {
            const lat = parseFloat(formData.latitude);
            const lng = parseFloat(formData.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
                if (coverageStatus.checked && coverageStatus.node && !coverageStatus.loading) return;
                setCoverageStatus(prev => ({ ...prev, loading: true, message: 'Checking coverage...' }));
                try {
                    const res = await fetch(`/api/coverage/check-point?lat=${lat}&long=${lng}`);
                    const data = await res.json();
                    if (data.covered) {
                        setCoverageStatus({ checked: true, isCovered: true, distance: data.distance, node: data.nearestNode, loading: false, message: `Covered! (${data.distance}m from ${data.nearestNode.site_id})` });
                    } else {
                        setCoverageStatus({ checked: true, isCovered: false, distance: data.distance, node: null, loading: false, message: data.distance > -1 ? `Out of Coverage (${data.distance}m from nearest node)` : 'No coverage data available' });
                    }
                } catch { setCoverageStatus(prev => ({ ...prev, loading: false, message: 'Check failed' })); }
            } else {
                setCoverageStatus({ checked: false, isCovered: false, distance: 0, node: null, loading: false, message: '' });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData.latitude, formData.longitude]);

    // ── Navigate-in (from Coverage page) ─────────────────────────────────
    useEffect(() => {
        if (location.state && location.state.lat && location.state.lng) {
            const { lat, lng, coverageStatus: status, nearestDistance, nearestPoint } = location.state;
            setFormData({
                ...defaultForm,
                customerId: `CUST-${Date.now()}`,
                latitude: lat, longitude: lng,
                fat: nearestPoint?.siteId || '',
                homepassId: nearestPoint?.homepassId || nearestPoint?.siteId || '',
                siteId: nearestPoint?.siteId || '',
                prospectStatus: status === 'Covered' ? 'Covered' : 'Case Activation',
                catatan: status === 'Covered' ? 'In Coverage area.' : 'Out of coverage - requires case activation review.'
            });
            setCoverageStatus({
                checked: true, isCovered: status === 'Covered', distance: nearestDistance,
                node: nearestPoint, loading: false,
                message: status === 'Covered'
                    ? `Covered! (${Math.round(nearestDistance)}m from ${nearestPoint?.siteId || 'Node'})`
                    : `Out of Coverage (${Math.round(nearestDistance)}m from nearest node)`
            });
            setIsModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state]);

    // ── Kecamatan loading (with cache) ────────────────────────────────────
    useEffect(() => {
        if (!formData.kabupaten) {
            setKecamatanList([]);
            setKelurahanList([]);
            return;
        }
        let cancelled = false;
        const loadKecamatan = async () => {
            setLoadingKec(true);
            try {
                // 1. Try to get province ID from selected province name
                let regencyId = null;
                const kabNorm = normalizeRegionName(formData.kabupaten);

                // Check cache for the kabupaten key
                const cacheKey = `kec_${kabNorm}`;
                const cachedKecs = cacheGet(cacheKey);
                if (cachedKecs) {
                    if (!cancelled) { setKecamatanList(cachedKecs); setLoadingKec(false); }
                    return;
                }

                // Find province ID
                let preferredProvId = null;
                if (formData.province) {
                    try {
                        const provs = await fetchWithCache(
                            'https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json',
                            'all_provinces'
                        );
                        const provNorm = normalizeRegionName(formData.province);
                        const mProv = provs.find(p => normalizeRegionName(p.name) === provNorm || normalizeRegionName(p.name).includes(provNorm));
                        if (mProv) preferredProvId = mProv.id;
                    } catch { }
                }

                // Try preferred province first
                if (preferredProvId) {
                    try {
                        const regs = await fetchWithCache(
                            `https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${preferredProvId}.json`,
                            `regs_${preferredProvId}`
                        );
                        const match = regs.find(r => {
                            const rn = normalizeRegionName(r.name);
                            return rn === kabNorm || rn.includes(kabNorm) || kabNorm.includes(rn);
                        });
                        if (match) regencyId = match.id;
                    } catch { }
                }

                // Fallback: search all regencies from cache/API
                if (!regencyId) {
                    try {
                        const allRegs = await fetchWithCache(
                            'https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/regencies.json',
                            'all_regencies'
                        );
                        // This API returns { id: name } OR array
                        let regsArray;
                        if (Array.isArray(allRegs)) {
                            regsArray = allRegs;
                        } else {
                            regsArray = Object.entries(allRegs).map(([id, name]) => ({ id, name }));
                        }
                        const match = regsArray.find(r => {
                            const rn = normalizeRegionName(r.name);
                            return rn === kabNorm || rn.includes(kabNorm) || kabNorm.includes(rn);
                        });
                        if (match) regencyId = match.id;
                    } catch { }
                }

                if (regencyId && !cancelled) {
                    const dists = await fetchWithCache(
                        `https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regencyId}.json`,
                        `dists_${regencyId}`
                    );
                    if (!cancelled) {
                        cacheSet(cacheKey, dists); // also cache by kabupaten name
                        setKecamatanList(dists);
                    }
                } else if (!cancelled) {
                    setKecamatanList([]);
                }
            } catch (e) {
                console.warn('Kecamatan load error:', e);
                if (!cancelled) setKecamatanList([]);
            } finally {
                if (!cancelled) setLoadingKec(false);
            }
        };
        loadKecamatan();
        return () => { cancelled = true; };
    }, [formData.kabupaten, formData.province]);

    // ── Kelurahan loading (with cache) ────────────────────────────────────
    useEffect(() => {
        if (!formData.kecamatan || kecamatanList.length === 0) {
            setKelurahanList([]);
            return;
        }
        const kecNorm = normalizeRegionName(formData.kecamatan);
        const dist = kecamatanList.find(d => {
            const dn = normalizeRegionName(d.name);
            return dn === kecNorm || d.name.toUpperCase() === formData.kecamatan.toUpperCase();
        });
        if (!dist) { setKelurahanList([]); return; }

        let cancelled = false;
        const loadKelurahan = async () => {
            setLoadingKel(true);
            try {
                const vils = await fetchWithCache(
                    `https://www.emsifa.com/api-wilayah-indonesia/api/villages/${dist.id}.json`,
                    `vils_${dist.id}`
                );
                if (!cancelled) setKelurahanList(vils);
            } catch (e) {
                console.warn('Kelurahan load error:', e);
            } finally {
                if (!cancelled) setLoadingKel(false);
            }
        };
        loadKelurahan();
        return () => { cancelled = true; };
    }, [formData.kecamatan, kecamatanList]);

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleOpenModal = (customer = null) => {
        setCoverageStatus({ checked: false, isCovered: false, distance: 0, node: null, loading: false, message: '' });
        setKecamatanList([]);
        setKelurahanList([]);
        if (customer) {
            setSelectedId(customer.id);
            setFormData({
                ...defaultForm,
                ...customer,
                rfsDate: customer.rfsDate ? customer.rfsDate.split('T')[0] : '',
                prospectDate: customer.prospectDate ? customer.prospectDate.split('T')[0] : new Date().toISOString().split('T')[0],
                files: customer.files || [],
                homepassId: customer.homepassId || ''
            });
            // Pre-fill filtered cities based on province
            if (customer.province) {
                const relCluster = clusters.find(c => c.provinces && c.provinces.includes(customer.province));
                if (relCluster) {
                    const citiesInProv = relCluster.cities.filter(city => city.province === customer.province);
                    setFilteredCities(citiesInProv);
                }
            } else if (customer.area) {
                const cluster = clusters.find(c => c.name === customer.area);
                if (cluster) setFilteredCities(cluster.cities || []);
            }
        } else {
            setSelectedId(null);
            setFormData({ ...defaultForm, customerId: `CUST-${Date.now()}` });
            setFilteredCities([]);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const url = selectedId ? `/api/customers/${selectedId}` : '/api/customers';
            const method = selectedId ? 'PUT' : 'POST';
            const payload = { ...formData };
            if (payload.latitude === '') payload.latitude = null;
            if (payload.longitude === '') payload.longitude = null;
            if (payload.productId === '') payload.productId = null;
            if (payload.salesId === '') payload.salesId = null;
            if (payload.rfsDate === '') payload.rfsDate = null;
            if (payload.prospectDate === '') payload.prospectDate = new Date().toISOString().split('T')[0];

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Save failed');
            }
            await fetchData();
            setIsModalOpen(false);
            alert('Data saved successfully!');
        } catch (error) {
            alert('Failed to save data: ' + error.message);
            console.error('Save error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Photo Upload ──────────────────────────────────────────────────────
    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const invalid = files.filter(f => !ALLOWED_TYPES.includes(f.type));
        if (invalid.length) {
            alert(`File tidak didukung: ${invalid.map(f => f.name).join(', ')}\nFormat yang didukung: JPEG, PNG, PDF`);
            return;
        }
        const tooBig = files.filter(f => f.size > MAX_FILE_SIZE);
        if (tooBig.length) {
            alert(`File terlalu besar (max 5MB): ${tooBig.map(f => f.name).join(', ')}`);
            return;
        }
        setUploadingPhoto(true);
        try {
            const base64Files = await Promise.all(
                files.map(async (file) => ({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: await toBase64(file),
                }))
            );
            setFormData(prev => ({
                ...prev,
                files: [...(prev.files || []), ...base64Files]
            }));
        } catch (err) {
            alert('Gagal membaca file: ' + err.message);
        } finally {
            setUploadingPhoto(false);
            e.target.value = '';
        }
    };

    const handleRemovePhoto = (index) => {
        setFormData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    // ── Export ────────────────────────────────────────────────────────────
    const handleExport = () => {
        const dataToExport = customers.map(c => {
            const row = {};
            FIELD_MAP.forEach(field => {
                let val = c[field.key];
                if ((field.key === 'prospectDate' || field.key === 'rfsDate') && val && typeof val === 'string') {
                    val = val.split('T')[0];
                }
                row[field.header] = val || '';
            });
            return row;
        });
        const headers = FIELD_MAP.map(f => f.header);
        const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
        worksheet['!cols'] = FIELD_MAP.map(f => ({ wch: f.width }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Prospects Data');
        XLSX.writeFile(workbook, `Prospects_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // ── Import ────────────────────────────────────────────────────────────
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const mapped = jsonData.map(row => {
                    const obj = {};
                    FIELD_MAP.forEach(field => {
                        const val = row[field.header];
                        if (val !== undefined) obj[field.key] = val;
                    });
                    if (!obj.status) obj.status = 'Prospect';
                    if (!obj.type) obj.type = 'Broadband Home';
                    if (obj.latitude) obj.latitude = parseFloat(obj.latitude);
                    if (obj.longitude) obj.longitude = parseFloat(obj.longitude);
                    if (obj.phone) obj.phone = String(obj.phone);
                    return obj;
                });
                setImportPreview(mapped);
                setIsImportModalOpen(true);
            } catch (err) { alert('Failed to parse Excel: ' + err.message); }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const confirmImport = async () => {
        setImportLoading(true);
        try {
            await fetch('/api/customers/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: importPreview, importMode })
            });
            const modeLabel = importMode === 'upsert' ? 'updated/added' : 'imported';
            alert(`Import successful! ${importPreview.length} records ${modeLabel}.`);
            setIsImportModalOpen(false);
            await fetchData();
        } catch (e) {
            alert('Import failed: ' + e.message);
        } finally {
            setImportLoading(false);
            setImportMode('insert');
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Prospects & Customers</h1>
                    <p className="text-gray-500 mt-1">Manage pipeline, customers, and subscriptions.</p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    {hasPermission('prospect_subscriber:export') && (
                        <Button variant="outline" onClick={handleExport} className="h-9 text-xs">
                            <Download className="w-4 h-4 mr-2" /> Export
                        </Button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx,.xls" className="hidden" />
                    {hasPermission('prospect_subscriber:import') && (
                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="h-9 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                            <Upload className="w-4 h-4 mr-2" /> Import
                        </Button>
                    )}
                    <div className="w-px h-6 bg-gray-300 mx-2" />
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm w-48 lg:w-64 shadow-sm"
                        />
                    </div>
                    {hasPermission('prospect_subscriber:create') && (
                        <Button onClick={() => handleOpenModal()} className="shadow-blue-500/20 shadow-lg">
                            <Plus className="w-4 h-4 mr-2" /> Add New
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                {['Covered', 'Case Activation'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn("px-6 py-3 text-sm font-semibold transition-all relative", activeTab === tab ? "text-blue-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        {tab}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-250px)]">
                {!isLoading ? (
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse min-w-[2000px]">
                            <thead className="bg-gray-50/90 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    {FIELD_MAP.map(field => (
                                        <th key={field.key} className="p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                            {field.header}
                                        </th>
                                    ))}
                                    <th className="p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right sticky right-0 bg-gray-50/90 z-20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {customers.filter(c => {
                                    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.customerId || '').toLowerCase().includes(searchTerm.toLowerCase());
                                    const matchesTab = c.prospectStatus === activeTab;
                                    return matchesSearch && matchesTab;
                                }).map((customer) => (
                                    <tr key={customer.id} className="hover:bg-blue-50/30 transition-colors group text-sm text-gray-700">
                                        {FIELD_MAP.map(field => {
                                            const val = customer[field.key];
                                            let content = val;
                                            if (field.key === 'status') {
                                                content = <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", val === 'Active' ? "bg-green-100 text-green-700" : val === 'Churned' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")}>{val || 'Prospect'}</span>;
                                            } else if (field.key === 'prospectStatus') {
                                                content = <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", val === 'Covered' ? "bg-green-50 text-green-600 border border-green-100" : "bg-orange-50 text-orange-600 border border-orange-100")}>{val}</span>;
                                            } else if (field.key === 'catatan') {
                                                content = <div className="max-w-[300px] truncate" title={val}>{val || '-'}</div>;
                                            } else if (field.key === 'prospectDate' || field.key === 'rfsDate') {
                                                content = val ? val.split('T')[0] : '-';
                                            } else if (!val && val !== 0) {
                                                content = <span className="text-gray-300">-</span>;
                                            }
                                            return <td key={field.key} className="p-3 whitespace-nowrap border-b border-gray-50">{content}</td>;
                                        })}
                                        <td className="p-3 whitespace-nowrap text-right sticky right-0 bg-white group-hover:bg-blue-50/30 border-b border-gray-50 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                            <div className="flex justify-end gap-2">
                                                {hasPermission('prospect_subscriber:edit') && (
                                                    <Button size="icon" variant="ghost" onClick={() => handleOpenModal(customer)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {hasPermission('prospect_subscriber:delete') && (
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                        onClick={async () => {
                                                            if (confirm('Delete this customer?')) {
                                                                await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
                                                                fetchData();
                                                            }
                                                        }}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {customers.length === 0 && <div className="p-8 text-center text-gray-400">No data found</div>}
                    </div>
                ) : (
                    <div className="p-20 flex justify-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
                )}
            </div>

            {/* ── Modal Form ── */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedId ? 'Edit Customer' : 'New Prospect'} className="max-w-5xl">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* ─── Left: Personal Details ─── */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                                <User className="w-4 h-4" /> Personal Details
                            </h4>
                            <Input label="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Phone (WA)" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="62..." />
                                <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <Input label="Address (Street/Block/No)" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />

                            {/* Homepass ID & FAT */}
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Homepass ID / Site ID"
                                    value={formData.homepassId || ''}
                                    onChange={e => setFormData({ ...formData, homepassId: e.target.value })}
                                    placeholder="HP-1234 or SITE-001..."
                                />
                                <Input
                                    label="FAT (Fiber Access Terminal)"
                                    value={formData.fat || ''}
                                    onChange={e => setFormData({ ...formData, fat: e.target.value })}
                                    placeholder="FAT-01-02"
                                />
                            </div>

                            {/* ─── Photo Upload Section ─── */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2 mb-3">
                                    <Camera className="w-4 h-4" /> Foto & Dokumen
                                    <span className="text-xs text-gray-400 font-normal ml-1">(JPEG, PNG, PDF - max 5MB)</span>
                                </h4>

                                {/* Upload button */}
                                <input
                                    type="file"
                                    ref={photoInputRef}
                                    onChange={handlePhotoUpload}
                                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                    multiple
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    disabled={uploadingPhoto}
                                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                                >
                                    {uploadingPhoto ? (
                                        <div className="flex items-center justify-center gap-2 text-blue-500">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span className="text-sm">Mengupload...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1">
                                            <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                            <span className="text-sm text-gray-500 group-hover:text-blue-600">Klik untuk upload foto/dokumen</span>
                                            <span className="text-xs text-gray-400">Bisa pilih beberapa file sekaligus</span>
                                        </div>
                                    )}
                                </button>

                                {/* Preview uploaded files */}
                                {formData.files && formData.files.length > 0 && (
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        {formData.files.map((file, idx) => {
                                            const isImage = file.type?.startsWith('image/') ||
                                                (typeof file === 'string' && (file.startsWith('data:image') || /\.(jpg|jpeg|png|webp)$/i.test(file)));
                                            const isPdf = file.type === 'application/pdf' ||
                                                (typeof file === 'string' && file.includes('application/pdf'));
                                            const src = file.data || (typeof file === 'string' ? file : null);
                                            const name = file.name || `File ${idx + 1}`;

                                            return (
                                                <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                                    {isImage && src ? (
                                                        <img src={src} alt={name} className="w-full h-20 object-cover" />
                                                    ) : (
                                                        <div className="w-full h-20 flex flex-col items-center justify-center bg-red-50">
                                                            <FileText className="w-6 h-6 text-red-400" />
                                                            <span className="text-[10px] text-gray-500 mt-1 px-1 truncate w-full text-center">{name}</span>
                                                        </div>
                                                    )}
                                                    {/* Remove button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePhoto(idx)}
                                                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] px-1 py-0.5 truncate">
                                                        {name}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Right: Location & Coverage ─── */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Location & Coverage
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Latitude" type="number" step="any" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} placeholder="-6.xxxxx" />
                                <Input label="Longitude" type="number" step="any" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} placeholder="106.xxxxx" />
                            </div>

                            {/* Coverage Alert */}
                            {(coverageStatus.checked || coverageStatus.loading) && (
                                <div className={cn("p-3 rounded-lg border text-sm flex items-start gap-3 transition-all", coverageStatus.loading ? "bg-gray-50 border-gray-200 text-gray-500" : coverageStatus.isCovered ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700")}>
                                    {coverageStatus.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : coverageStatus.isCovered ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                                    <div>
                                        <p className="font-bold">{coverageStatus.loading ? 'Checking coverage...' : (coverageStatus.isCovered ? 'IN COVERAGE AREA' : 'OUT OF COVERAGE')}</p>
                                        {!coverageStatus.loading && <p className="text-xs opacity-90 mt-0.5">{coverageStatus.message}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Province */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Province (Area)</label>
                                <Select
                                    options={Array.from(new Set(clusters.flatMap(c => c.provinces || []))).sort().map(p => ({ value: p, label: p }))}
                                    value={formData.province || ''}
                                    onChange={(e) => {
                                        const prov = e.target.value;
                                        const relatedCluster = clusters.find(c => c.provinces && c.provinces.includes(prov));
                                        setFormData(prev => ({ ...prev, province: prov, area: relatedCluster ? relatedCluster.name : '', kabupaten: '', kecamatan: '', kelurahan: '' }));
                                        if (relatedCluster) {
                                            setFilteredCities(relatedCluster.cities.filter(city => city.province === prov));
                                        } else {
                                            setFilteredCities([]);
                                        }
                                        setKecamatanList([]);
                                        setKelurahanList([]);
                                    }}
                                />
                            </div>

                            {/* Kabupaten */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Kabupaten/City</label>
                                <Select
                                    options={filteredCities.map(c => ({ value: c.name, label: c.name }))}
                                    value={formData.kabupaten}
                                    onChange={e => {
                                        setFormData(prev => ({ ...prev, kabupaten: e.target.value, kecamatan: '', kelurahan: '' }));
                                        setKecamatanList([]);
                                        setKelurahanList([]);
                                    }}
                                    disabled={!formData.province}
                                />
                            </div>

                            {/* Kecamatan & Kelurahan */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                                        Kecamatan
                                        {loadingKec && <Loader2 className="inline w-3 h-3 animate-spin text-blue-500" />}
                                    </label>
                                    <Select
                                        options={[
                                            { value: '', label: loadingKec ? 'Loading kecamatan...' : '- Select -' },
                                            ...(formData.kecamatan && !kecamatanList.some(k => k.name.toUpperCase() === formData.kecamatan.toUpperCase())
                                                ? [{ value: formData.kecamatan, label: formData.kecamatan }] : []),
                                            ...kecamatanList.map(k => ({ value: k.name, label: k.name }))
                                        ]}
                                        value={formData.kecamatan}
                                        onChange={e => {
                                            setFormData(prev => ({ ...prev, kecamatan: e.target.value, kelurahan: '' }));
                                            setKelurahanList([]);
                                        }}
                                        disabled={loadingKec && !formData.kecamatan}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                                        Kelurahan
                                        {loadingKel && <Loader2 className="inline w-3 h-3 animate-spin text-blue-500" />}
                                    </label>
                                    <Select
                                        options={[
                                            { value: '', label: loadingKel ? 'Loading kelurahan...' : '- Select -' },
                                            ...(formData.kelurahan && !kelurahanList.some(k => k.name.toUpperCase() === formData.kelurahan.toUpperCase())
                                                ? [{ value: formData.kelurahan, label: formData.kelurahan }] : []),
                                            ...kelurahanList.map(k => ({ value: k.name, label: k.name }))
                                        ]}
                                        value={formData.kelurahan}
                                        onChange={e => setFormData(prev => ({ ...prev, kelurahan: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Bottom: Subscription Plan ─── */}
                    <div className="border-t pt-4 space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Subscription Plan
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select
                                label="Choose Product"
                                options={[{ value: '', label: '- Select Product -' }, ...products.map(p => ({ value: p.id, label: `${p.name} - Rp ${p.price?.toLocaleString() || 0}` }))]}
                                value={formData.productId}
                                onChange={(e) => {
                                    const prod = products.find(p => p.id == e.target.value);
                                    if (prod) setFormData({ ...formData, productId: String(prod.id), productName: prod.name });
                                    else setFormData({ ...formData, productId: '', productName: '' });
                                }}
                            />
                            <Select
                                label="Sales Person"
                                options={[{ value: '', label: '- Select Sales -' }, ...salesPeople.map(s => ({ value: s.id, label: s.name }))]}
                                value={formData.salesId}
                                onChange={(e) => {
                                    const sales = salesPeople.find(s => s.id == e.target.value);
                                    if (sales) setFormData({ ...formData, salesId: String(sales.id), salesName: sales.name });
                                    else setFormData({ ...formData, salesId: '', salesName: '' });
                                }}
                            />
                            <Select
                                label="Status"
                                options={[{ value: 'Prospect', label: 'High Potential' }, { value: 'Active', label: 'Active Subscriber' }, { value: 'Churned', label: 'Churned' }]}
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select
                                label="Prospect Status"
                                options={[{ value: 'Covered', label: '✅ Covered' }, { value: 'Case Activation', label: '⚠️ Case Activation' }]}
                                value={formData.prospectStatus || 'Covered'}
                                onChange={e => setFormData({ ...formData, prospectStatus: e.target.value })}
                            />
                            <Input label="Prospect Date" type="date" value={formData.prospectDate || ''} onChange={e => setFormData({ ...formData, prospectDate: e.target.value })} />
                            <Input label="RFS Date" type="date" value={formData.rfsDate || ''} onChange={e => setFormData({ ...formData, rfsDate: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">Catatan / Notes</label>
                            <textarea
                                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                rows={3}
                                value={formData.catatan || ''}
                                onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                                placeholder="Tambah catatan di sini..."
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Data'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ── Import Modal ── */}
            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Prospects">
                <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-3">📦 Pilih Mode Import:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { value: 'insert', label: '➕ Tambah Data Baru', desc: 'Semua data di file akan ditambahkan sebagai record baru. Data lama tidak berubah.', color: 'blue' },
                                { value: 'upsert', label: '🔄 Update & Tambah', desc: 'Data dengan Customer ID yang sama akan diperbarui. Data baru akan ditambahkan.', color: 'amber' }
                            ].map(({ value, label, desc, color }) => (
                                <label key={value} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${importMode === value ? `border-${color}-500 bg-${color}-50 shadow-sm` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                    <input type="radio" name="importModeProspect" value={value} checked={importMode === value} onChange={() => setImportMode(value)} className="mt-1" />
                                    <div>
                                        <span className="font-semibold text-gray-900 text-sm">{label}</span>
                                        <p className="text-xs text-gray-500 mt-1">{desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <p className="text-sm text-gray-600">Ready to import {importPreview.length} records. Please review the first few rows.</p>
                    <div className="max-h-[300px] overflow-auto border rounded text-xs">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b sticky top-0">
                                <tr><th className="p-2">Name</th><th className="p-2">Phone</th><th className="p-2">Product</th></tr>
                            </thead>
                            <tbody>
                                {importPreview.slice(0, 20).map((r, i) => (
                                    <tr key={i} className="border-b"><td className="p-2">{r.name}</td><td className="p-2">{r.phone}</td><td className="p-2">{r.productName}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmImport} disabled={importLoading}>
                            {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (importMode === 'upsert' ? '🔄 Update & Import' : '➕ Confirm Import')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Prospect;
