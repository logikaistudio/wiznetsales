import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, MapPin, Phone, Mail, FileText, Save, Search, Plus, Trash2, CheckCircle, Loader2, Edit, AlertCircle, Upload, Download, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';

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

    // Import/Export States
    const fileInputRef = useRef(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importPreview, setImportPreview] = useState([]);
    const [importLoading, setImportLoading] = useState(false);
    const [importMode, setImportMode] = useState('insert'); // 'insert' = add new, 'upsert' = update existing + add new

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
    });

    const [activeTab, setActiveTab] = useState('Covered'); // 'Covered' or 'Case Activation'


    // Auto-fill Site ID & FAT based on Homepass ID
    useEffect(() => {
        const checkHomepass = async () => {
            const hid = formData.homepassId;
            if (!hid || hid.length < 3) return;

            try {
                // Search for coverage with this Homepass ID
                const res = await fetch(`/api/coverage?search=${encodeURIComponent(hid)}&limit=10`);
                const json = await res.json();

                if (json.data && Array.isArray(json.data)) {
                    // Find exact match (case-insensitive) in homepassId OR siteId
                    const match = json.data.find(d =>
                        (d.homepassId && d.homepassId.toLowerCase() === hid.toLowerCase()) ||
                        (d.siteId && d.siteId.toLowerCase() === hid.toLowerCase())
                    );

                    if (match) {
                        // Found match! Auto-fill Site ID and FAT
                        setFormData(prev => ({
                            ...prev,
                            siteId: match.siteId || '',
                            fat: match.siteId || '', // Using Site ID as FAT ID if not distinct
                            // Optionally update location if empty
                            latitude: (!prev.latitude && match.ampliLat) ? match.ampliLat.toString() : prev.latitude,
                            longitude: (!prev.longitude && match.ampliLong) ? match.ampliLong.toString() : prev.longitude
                        }));

                        // Also trigger visual feedback?
                        // setCoverageStatus... maybe not needed as lat/long update triggers check.
                    }
                }
            } catch (e) {
                console.error("Homepass lookup failed", e);
            }
        };

        const timer = setTimeout(checkHomepass, 800); // 800ms debounce
        return () => clearTimeout(timer);
    }, [formData.homepassId]);

    // Coverage Check State
    const [coverageStatus, setCoverageStatus] = useState({ checked: false, isCovered: false, distance: 0, node: null, loading: false, message: '' });

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
        fetchAuxData();
    }, []);

    // Debounce Check Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            const lat = parseFloat(formData.latitude);
            const lng = parseFloat(formData.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

                // Skip auto-check if we already have a valid status from navigation (checked=true with node data)
                // This prevents overwriting the status passed from Coverage page
                if (coverageStatus.checked && coverageStatus.node && !coverageStatus.loading) {
                    // Status already set from Coverage page, don't re-check automatically
                    return;
                }

                setCoverageStatus(prev => ({ ...prev, loading: true, message: 'Checking coverage...' }));
                try {
                    const res = await fetch(`/api/coverage/check-point?lat=${lat}&long=${lng}`);
                    const data = await res.json();
                    if (data.covered) {
                        setCoverageStatus({
                            checked: true, isCovered: true, distance: data.distance, node: data.nearestNode, loading: false,
                            message: `Covered! (${data.distance}m from ${data.nearestNode.site_id})`
                        });
                    } else {
                        setCoverageStatus({
                            checked: true, isCovered: false, distance: data.distance, node: null, loading: false,
                            message: data.distance > -1 ? `Out of Coverage (${data.distance}m from nearest node)` : 'No coverage data available'
                        });
                    }
                } catch (error) {
                    setCoverageStatus(prev => ({ ...prev, loading: false, message: 'Check failed' }));
                }
            } else {
                setCoverageStatus({ checked: false, isCovered: false, distance: 0, node: null, loading: false, message: '' });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData.latitude, formData.longitude]);

    // Handle Incoming Navigation State (from Coverage Manual Check)
    useEffect(() => {
        if (location.state && location.state.lat && location.state.lng) {
            const { lat, lng, coverageStatus: status, nearestDistance, nearestPoint } = location.state;

            // Pre-fill form
            setFormData({
                customerId: `CUST-${Date.now()}`,
                type: 'Broadband Home',
                name: '', address: '', area: '', kabupaten: '', kecamatan: '', kelurahan: '',
                latitude: lat, longitude: lng,
                phone: '', email: '', productId: '', productName: '',
                rfsDate: '', salesId: '', salesName: '', status: 'Prospect',
                prospectDate: new Date().toISOString().split('T')[0], isActive: true, files: [],
                fat: nearestPoint?.siteId || '',
                homepassId: nearestPoint?.homepassId || nearestPoint?.siteId || '', // Use Homepass ID or Site ID
                siteId: nearestPoint?.siteId || '',
                prospectStatus: status === 'Covered' ? 'Covered' : 'Case Activation',
                catatan: status === 'Covered' ? 'In Coverage area.' : 'Out of coverage - requires case activation review.'
            });

            // Set coverage status immediately
            setCoverageStatus({
                checked: true,
                isCovered: status === 'Covered',
                distance: nearestDistance,
                node: nearestPoint,
                loading: false,
                message: status === 'Covered'
                    ? `Covered! (${Math.round(nearestDistance)}m from ${nearestPoint?.siteId || 'Node'})`
                    : `Out of Coverage (${Math.round(nearestDistance)}m from nearest node)`
            });

            setIsModalOpen(true);

            // Clear state to avoid loops
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    // Handlers
    const handleOpenModal = (customer = null) => {
        setCoverageStatus({ checked: false, isCovered: false, distance: 0, node: null, loading: false, message: '' });
        if (customer) {
            setSelectedId(customer.id);
            setFormData({
                ...customer,
                rfsDate: customer.rfsDate ? customer.rfsDate.split('T')[0] : '',
                prospectDate: customer.prospectDate ? customer.prospectDate.split('T')[0] : '',
                files: customer.files || [],
                homepassId: customer.homepassId || '' // Added homepassId
            });
            // Auto area select
            if (customer.area) {
                const cluster = clusters.find(c => c.name === customer.area);
                if (cluster) setFilteredCities(cluster.cities || []);
            }
        } else {
            setSelectedId(null);
            setFormData({
                customerId: `CUST-${Date.now()}`,
                type: 'Broadband Home',
                name: '', address: '', area: '', kabupaten: '', kecamatan: '', kelurahan: '',
                latitude: '', longitude: '', phone: '', email: '', productId: '', productName: '',
                rfsDate: '', salesId: '', salesName: '', status: 'Prospect',
                prospectDate: new Date().toISOString().split('T')[0], isActive: true, files: [],
                fat: '',
                homepassId: '' // Added homepassId
            });
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
            // Sanitize Data
            const payload = { ...formData };
            if (payload.latitude === '') payload.latitude = null;
            if (payload.longitude === '') payload.longitude = null;
            if (payload.productId === '') payload.productId = null;
            if (payload.salesId === '') payload.salesId = null;

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

    // EXPORT IMPORT LOGIC

    // Field Mapping Configuration
    // Field Mapping Configuration (Enhanced for Detailed Export)
    const FIELD_MAP = [
        { header: 'Customer ID', key: 'customerId', width: 20 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Phone (WA)', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Address', key: 'address', width: 40 },
        { header: 'Homepass ID', key: 'homepassId', width: 20 },
        { header: 'Site ID', key: 'siteId', width: 20 }, // Added Site ID
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
        { header: 'Prospect Status', key: 'prospectStatus', width: 15 }, // New Field
        { header: 'Notes/Catatan', key: 'catatan', width: 30 }, // New Field
        { header: 'Prospect Date', key: 'prospectDate', width: 15 },
        { header: 'RFS Date', key: 'rfsDate', width: 15 },
        { header: 'Photos', key: 'files', width: 50 },
    ];

    const handleExport = () => {
        // 1. Format Data
        // 1. Format Data
        const dataToExport = customers.map(c => {
            const row = {};
            FIELD_MAP.forEach(field => {
                let val = c[field.key];

                // Special formatting for Files/Photos
                if (field.key === 'files') {
                    if (Array.isArray(val) && val.length > 0) {
                        // Join all file URLs or paths with comma + newline
                        val = val.map(f => typeof f === 'string' ? f : (f.url || f.path || JSON.stringify(f))).join(',\n');
                    } else {
                        val = ''; // No photos
                    }
                }

                // Special formatting for dates if needed (e.g., removing T part)
                if ((field.key === 'prospectDate' || field.key === 'rfsDate') && val && typeof val === 'string') {
                    val = val.split('T')[0];
                }

                row[field.header] = val || '';
            });
            return row;
        });

        // 2. Create Sheet
        const headers = FIELD_MAP.map(f => f.header);
        const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });

        // 3. Style Header (Attempt) - Note: Community version might ignore this
        // Set column widths
        worksheet['!cols'] = FIELD_MAP.map(f => ({ wch: f.width }));

        // Apply basic styles loop (if supported)
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: 0, c: C });
            if (!worksheet[address]) continue;
            worksheet[address].s = {
                fill: { fgColor: { rgb: "E1F5FE" } }, // Light Blue
                font: { name: "Arial", sz: 12, bold: true, color: { rgb: "000000" } },
                alignment: { horizontal: "center" },
                border: { bottom: { style: "thin", color: { auto: 1 } } }
            };
        }

        // 4. Write File
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Prospects Data");
        XLSX.writeFile(workbook, `Prospects_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

                // Map back from Headers to Keys
                const mapped = jsonData.map(row => {
                    const obj = {};
                    FIELD_MAP.forEach(field => {
                        // Find value by Header Name or close match
                        const val = row[field.header];
                        if (val !== undefined) obj[field.key] = val;
                    });

                    // Defaults / Fallbacks
                    if (!obj.status) obj.status = 'Prospect';
                    if (!obj.type) obj.type = 'Broadband Home';
                    // Parse Numbers
                    if (obj.latitude) obj.latitude = parseFloat(obj.latitude);
                    if (obj.longitude) obj.longitude = parseFloat(obj.longitude);
                    // Stringify Phone
                    if (obj.phone) obj.phone = String(obj.phone);

                    return obj;
                });

                setImportPreview(mapped);
                setIsImportModalOpen(true);
            } catch (err) {
                alert("Failed to parse Excel: " + err.message);
            }
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
            alert("Import failed: " + e.message);
        } finally {
            setImportLoading(false);
            setImportMode('insert'); // Reset mode
        }
    };

    const [clusters, setClusters] = useState([]);
    const [filteredCities, setFilteredCities] = useState([]);
    const [availableProvinces, setAvailableProvinces] = useState([]);

    // Auto-complete States
    const [kecamatanList, setKecamatanList] = useState([]);
    const [kelurahanList, setKelurahanList] = useState([]);
    const [loadingRegions, setLoadingRegions] = useState(false);
    const [regencyId, setRegencyId] = useState(null);

    // Helper: normalize name for flexible matching (remove prefix, uppercase)
    const normalizeRegionName = (name) => {
        if (!name) return '';
        return name.toUpperCase()
            .replace(/^(KABUPATEN|KOTA|KAB\.?)\s+/, '')
            .replace(/\s+DI$/, '')
            .trim();
    };

    // Helper: find best matching regency - efficient, uses full regency list
    const findRegencyAcrossProvinces = async (kabNameInput, preferredProvId = null) => {
        const kabNorm = normalizeRegionName(kabNameInput);

        // If we have a preferred province, try it first (faster)
        if (preferredProvId) {
            try {
                const regRes = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${preferredProvId}.json`);
                const regs = await regRes.json();
                const match = findBestRegency(regs, kabNorm);
                if (match) return match;
            } catch (e) { /* continue to fallback */ }
        }

        // Fallback: use ibnux API which has a single endpoint for ALL regencies
        // This avoids looping all 34 provinces
        try {
            const allRegRes = await fetch('https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/regencies.json');
            if (allRegRes.ok) {
                const allRegs = await allRegRes.json();
                // This API returns { id: name } format
                const regsArray = Object.entries(allRegs).map(([id, name]) => ({ id, name }));
                const match = findBestRegency(regsArray, kabNorm);
                if (match) return match;
            }
        } catch (e) { /* continue */ }

        // Last fallback: loop emsifa provinces (slow but reliable)
        try {
            const provRes = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
            const provs = await provRes.json();
            for (const prov of provs) {
                if (prov.id === preferredProvId) continue;
                const regRes = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${prov.id}.json`);
                const regs = await regRes.json();
                const match = findBestRegency(regs, kabNorm);
                if (match) return match;
            }
        } catch (e) { /* give up */ }

        return null;
    };

    const findBestRegency = (regs, kabNorm) => {
        const candidates = regs.filter(r => {
            const rNorm = normalizeRegionName(r.name);
            return rNorm === kabNorm ||
                rNorm.includes(kabNorm) ||
                kabNorm.includes(rNorm);
        });

        if (!candidates.length) return null;

        return candidates.sort((a, b) => {
            const aNorm = normalizeRegionName(a.name);
            const bNorm = normalizeRegionName(b.name);
            // Prefer exact normalized match
            if (aNorm === kabNorm && bNorm !== kabNorm) return -1;
            if (bNorm === kabNorm && aNorm !== kabNorm) return 1;
            // Prefer shorter (less extra words)
            return aNorm.length - bNorm.length;
        })[0];
    };

    // 1. Get Kecamatan list when Kabupaten changes
    useEffect(() => {
        if (!formData.kabupaten) {
            setKecamatanList([]);
            setKelurahanList([]);
            setRegencyId(null);
            return;
        }

        let cancelled = false;
        const fetchKecamatan = async () => {
            setLoadingRegions(true);
            try {
                // Try to find province ID from selected province name
                let preferredProvId = null;
                if (formData.province) {
                    const provRes = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
                    const provs = await provRes.json();
                    const provNorm = normalizeRegionName(formData.province);
                    const matchedProv = provs.find(p => {
                        const pNorm = normalizeRegionName(p.name);
                        return pNorm === provNorm ||
                            pNorm.includes(provNorm) ||
                            provNorm.includes(pNorm);
                    });
                    if (matchedProv) preferredProvId = matchedProv.id;
                }

                // Find regency (with or without province)
                const matchedReg = await findRegencyAcrossProvinces(formData.kabupaten, preferredProvId);

                if (matchedReg && !cancelled) {
                    setRegencyId(matchedReg.id);
                    const distRes = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${matchedReg.id}.json`);
                    const dists = await distRes.json();
                    if (!cancelled) setKecamatanList(dists);
                } else if (!cancelled) {
                    console.warn('No matching regency found for:', formData.kabupaten);
                    setKecamatanList([]);
                    setRegencyId(null);
                }
            } catch (e) {
                if (!cancelled) {
                    console.warn('Region API error:', e);
                    setKecamatanList([]);
                }
            } finally {
                if (!cancelled) setLoadingRegions(false);
            }
        };

        fetchKecamatan();
        return () => { cancelled = true; };
    }, [formData.kabupaten, formData.province]);

    // 2. Get Villages (Kelurahan) when Kecamatan is selected
    useEffect(() => {
        if (!formData.kecamatan) {
            setKelurahanList([]);
            return;
        }

        // If we have the list already, find and load villages
        if (kecamatanList.length > 0) {
            const kecNorm = normalizeRegionName(formData.kecamatan);
            const dist = kecamatanList.find(d => {
                const dNorm = normalizeRegionName(d.name);
                return dNorm === kecNorm || d.name.toUpperCase() === formData.kecamatan.toUpperCase();
            });

            if (dist) {
                fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${dist.id}.json`)
                    .then(r => r.json())
                    .then(vils => setKelurahanList(vils))
                    .catch(e => console.warn('Village API error:', e));
            }
        } else if (regencyId) {
            // kecamatanList might not be loaded yet if editing existing record
            // fetch kecamatan list first, then find the district
            fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regencyId}.json`)
                .then(r => r.json())
                .then(dists => {
                    setKecamatanList(dists);
                    const kecNorm = normalizeRegionName(formData.kecamatan);
                    const dist = dists.find(d => {
                        const dNorm = normalizeRegionName(d.name);
                        return dNorm === kecNorm || d.name.toUpperCase() === formData.kecamatan.toUpperCase();
                    });
                    if (dist) {
                        return fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${dist.id}.json`);
                    }
                })
                .then(r => r && r.json())
                .then(vils => vils && setKelurahanList(vils))
                .catch(e => console.warn('Village fallback API error:', e));
        }
    }, [formData.kecamatan, regencyId]);

    const fetchAuxData = async () => {
        try {
            const cRes = await fetch('/api/targets');
            const cData = await cRes.json();
            if (Array.isArray(cData)) setClusters(cData);
        } catch (e) {
            console.error("Location Fetch Error", e);
        }
    };

    const { user } = useAuth();
    const canManageData = user && (user.role === 'admin' || user.role === 'leader' || user.role === 'manager');

    // ... (rest of component render)

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Prospects & Customers</h1>
                    <p className="text-gray-500 mt-1">Manage pipeline, customers, and subscriptions.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <div className="flex gap-2 flex-wrap items-center">
                        <Button variant="outline" onClick={handleExport} className="h-9 text-xs">
                            <Download className="w-4 h-4 mr-2" /> Export
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx,.xls" className="hidden" />
                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="h-9 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                            <Upload className="w-4 h-4 mr-2" /> Import
                        </Button>
                        <div className="w-px h-6 bg-gray-300 mx-2"></div>
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
                        <Button onClick={() => handleOpenModal()} className="shadow-blue-500/20 shadow-lg">
                            <Plus className="w-4 h-4 mr-2" /> Add New
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs for Filtering Prospect Status */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('Covered')}
                    className={cn(
                        "px-6 py-3 text-sm font-semibold transition-all relative",
                        activeTab === 'Covered' ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    Covered
                    {activeTab === 'Covered' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('Case Activation')}
                    className={cn(
                        "px-6 py-3 text-sm font-semibold transition-all relative",
                        activeTab === 'Case Activation' ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    Case Activation
                    {activeTab === 'Case Activation' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
                </button>
            </div>

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

                                            // Formatting
                                            if (field.key === 'status') {
                                                content = (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                        val === 'Active' ? "bg-green-100 text-green-700" :
                                                            val === 'Churned' ? "bg-red-100 text-red-700" :
                                                                "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {val || 'Prospect'}
                                                    </span>
                                                );
                                            } else if (field.key === 'prospectStatus') {
                                                content = (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold",
                                                        val === 'Covered' ? "bg-green-50 text-green-600 border border-green-100" : "bg-orange-50 text-orange-600 border border-orange-100"
                                                    )}>
                                                        {val}
                                                    </span>
                                                );
                                            } else if (field.key === 'catatan') {
                                                content = <div className="max-w-[300px] truncate" title={val}>{val || '-'}</div>;
                                            } else if (field.key === 'files') {
                                                content = (Array.isArray(val) && val.length > 0) ?
                                                    <span className="text-xs text-blue-600 flex items-center gap-1"><FileText className="w-3 h-3" /> {val.length} Files</span> :
                                                    <span className="text-gray-300">-</span>;
                                            } else if (field.key === 'prospectDate' || field.key === 'rfsDate') {
                                                content = val ? val.split('T')[0] : '-';
                                            } else if (!val && val !== 0) {
                                                content = <span className="text-gray-300">-</span>;
                                            }

                                            return (
                                                <td key={field.key} className="p-3 whitespace-nowrap border-b border-gray-50">
                                                    {content}
                                                </td>
                                            );
                                        })}

                                        <td className="p-3 whitespace-nowrap text-right sticky right-0 bg-white group-hover:bg-blue-50/30 border-b border-gray-50 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => handleOpenModal(customer)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                    onClick={async () => {
                                                        if (confirm('Delete this customer?')) {
                                                            await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
                                                            fetchData();
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
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

            {/* Modal Form */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedId ? 'Edit Customer' : 'New Prospect'} className="max-w-4xl">
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
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
                    </div>

                    {/* Location & Coverage */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Location & Coverage
                        </h4>

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Latitude"
                                type="number"
                                step="any"
                                value={formData.latitude}
                                onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                placeholder="-6.xxxxx"
                            />
                            <Input
                                label="Longitude"
                                type="number"
                                step="any"
                                value={formData.longitude}
                                onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                placeholder="106.xxxxx"
                            />
                        </div>

                        {/* Coverage Alert Box */}
                        {(coverageStatus.checked || coverageStatus.loading) && (
                            <div className={cn(
                                "p-3 rounded-lg border text-sm flex items-start gap-3 transition-all animate-in fade-in zoom-in duration-300",
                                coverageStatus.loading ? "bg-gray-50 border-gray-200 text-gray-500" :
                                    coverageStatus.isCovered ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                            )}>
                                {coverageStatus.loading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                    coverageStatus.isCovered ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" /> :
                                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}

                                <div>
                                    <p className="font-bold">{coverageStatus.loading ? "Checking coverage..." : (coverageStatus.isCovered ? "IN COVERAGE AREA (250m)" : "OUT OF COVERAGE")}</p>
                                    {!coverageStatus.loading && <p className="text-xs opacity-90 mt-0.5">{coverageStatus.message}</p>}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Province (Area)</label>
                                <Select
                                    options={Array.from(new Set(clusters.flatMap(c => c.provinces || []))).sort().map(p => ({ value: p, label: p }))}
                                    value={formData.province || ''}
                                    onChange={(e) => {
                                        const prov = e.target.value;
                                        // Find Cluster containing this province
                                        const relatedCluster = clusters.find(c => c.provinces && c.provinces.includes(prov));

                                        const updates = {
                                            province: prov,
                                            area: relatedCluster ? relatedCluster.name : '', // Auto-set Cluster
                                            kabupaten: ''
                                        };

                                        setFormData(prev => ({ ...prev, ...updates }));

                                        // Filter cities by this province (from the related cluster)
                                        if (relatedCluster) {
                                            const citiesInProv = relatedCluster.cities.filter(city => city.province === prov);
                                            setFilteredCities(citiesInProv);
                                        } else {
                                            setFilteredCities([]);
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Kabupaten/City</label>
                                <Select
                                    options={filteredCities.map(c => ({ value: c.name, label: c.name }))}
                                    value={formData.kabupaten}
                                    onChange={e => setFormData({ ...formData, kabupaten: e.target.value, kecamatan: '', kelurahan: '' })}
                                    disabled={!formData.province}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                    Kecamatan {loadingRegions && <Loader2 className="inline w-3 h-3 animate-spin ml-1 text-blue-500" />}
                                </label>
                                <Select
                                    label=""
                                    options={[
                                        { value: '', label: loadingRegions ? 'Loading...' : '- Select -' },
                                        // Include saved value as option if not already in list (edit mode)
                                        ...(formData.kecamatan && !kecamatanList.some(k => k.name.toUpperCase() === formData.kecamatan.toUpperCase())
                                            ? [{ value: formData.kecamatan, label: formData.kecamatan + (loadingRegions ? ' (loading...)' : '') }]
                                            : []),
                                        ...kecamatanList.map(k => ({ value: k.name, label: k.name }))
                                    ]}
                                    value={formData.kecamatan}
                                    onChange={e => setFormData({ ...formData, kecamatan: e.target.value, kelurahan: '' })}
                                    disabled={loadingRegions && !formData.kecamatan}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Kelurahan</label>
                                <Select
                                    label=""
                                    options={[
                                        { value: '', label: '- Select -' },
                                        // Include saved value as option if not already in list (edit mode)
                                        ...(formData.kelurahan && !kelurahanList.some(k => k.name.toUpperCase() === formData.kelurahan.toUpperCase())
                                            ? [{ value: formData.kelurahan, label: formData.kelurahan }]
                                            : []),
                                        ...kelurahanList.map(k => ({ value: k.name, label: k.name }))
                                    ]}
                                    value={formData.kelurahan}
                                    onChange={e => setFormData({ ...formData, kelurahan: e.target.value })}
                                    disabled={false}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product & Sales */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Subscription Plan
                        </h4>
                        <Select
                            label="Choose Product"
                            options={products.map(p => ({ value: p.id, label: `${p.name} - Rp ${p.price.toLocaleString()}` }))}
                            value={formData.productId}
                            onChange={(e) => {
                                const prod = products.find(p => p.id == e.target.value);
                                setFormData({ ...formData, productId: String(prod.id), productName: prod.name });
                            }}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                label="Sales Person"
                                options={salesPeople.map(s => ({ value: s.id, label: s.name }))}
                                value={formData.salesId}
                                onChange={(e) => {
                                    const sales = salesPeople.find(s => s.id == e.target.value);
                                    setFormData({ ...formData, salesId: String(sales.id), salesName: sales.name });
                                }}
                            />
                            <Select
                                label="Status"
                                options={[{ value: 'Prospect', label: 'High Potential' }, { value: 'Active', label: 'Active Subscriber' }, { value: 'Churned', label: 'Churned' }]}
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            />
                            <Select
                                label="Prospect Status"
                                options={[{ value: 'Covered', label: '✅ Covered' }, { value: 'Case Activation', label: '⚠️ Case Activation' }]}
                                value={formData.prospectStatus || 'Covered'}
                                onChange={e => setFormData({ ...formData, prospectStatus: e.target.value })}
                            />
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

                    {/* Footer Actions */}
                    <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t mt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Data'}
                        </Button>
                    </div>
                </form >
            </Modal >

            {/* Import Preview Modal */}
            < Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Prospects" >
                <div className="space-y-4">
                    {/* Import Mode Selector */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-3">📦 Pilih Mode Import:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label
                                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${importMode === 'insert'
                                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="importModeProspect"
                                    value="insert"
                                    checked={importMode === 'insert'}
                                    onChange={() => setImportMode('insert')}
                                    className="mt-1 text-blue-600"
                                />
                                <div>
                                    <span className="font-semibold text-gray-900 text-sm">➕ Tambah Data Baru</span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Semua data di file akan ditambahkan sebagai record baru. Data lama tidak berubah.
                                    </p>
                                </div>
                            </label>
                            <label
                                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${importMode === 'upsert'
                                    ? 'border-amber-500 bg-amber-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="importModeProspect"
                                    value="upsert"
                                    checked={importMode === 'upsert'}
                                    onChange={() => setImportMode('upsert')}
                                    className="mt-1 text-amber-600"
                                />
                                <div>
                                    <span className="font-semibold text-gray-900 text-sm">🔄 Update & Tambah</span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Data dengan <strong>Customer ID</strong> yang sama akan diperbarui. Data baru akan ditambahkan.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600">Ready to import {importPreview.length} records. Please review the first few rows.</p>
                    <div className="max-h-[300px] overflow-auto border rounded text-xs">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b sticky top-0">
                                <tr>
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Phone</th>
                                    <th className="p-2">Product</th>
                                </tr>
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
            </Modal >
        </div >
    );
};

export default Prospect;
