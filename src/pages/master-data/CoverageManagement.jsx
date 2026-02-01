import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { Map, Search, Layers, Plus, Upload, Trash2, Pencil, Save, FileSpreadsheet, Settings as SettingsIcon, Loader2, RefreshCw, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import * as XLSX from 'xlsx';

import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const APP_FIELDS = [
    { key: 'siteId', label: 'Site Id', required: true },
    { key: 'cityTown', label: 'City Town' },
    { key: 'kecamatan', label: 'Kecamatan/District' },
    { key: 'kelurahan', label: 'Kelurahan' },
    { key: 'networkType', label: 'Network Type' },
    { key: 'fibernode', label: 'Fibernode' },
    { key: 'fibernodeDesc', label: 'Fibernode Description' },
    { key: 'areaLat', label: 'Area Lat' },
    { key: 'areaLong', label: 'Area Long' },
    { key: 'clusterId', label: 'Cluster Id' },
    { key: 'ampli', label: 'Ampli', required: true },
    { key: 'ampliLat', label: 'Ampli Lat', required: true },
    { key: 'ampliLong', label: 'Ampli Long', required: true },
    { key: 'location', label: 'Location' },
    { key: 'streetName', label: 'Street Name' },
    { key: 'streetBlock', label: 'Street Block' },
    { key: 'streetNo', label: 'Street No' },
    { key: 'rtrw', label: 'RTRW' },
    { key: 'dwelling', label: 'Dwelling' },
];

const CoverageManagement = () => {
    // Data State
    const [searchTerm, setSearchTerm] = useState('');
    const [coverageData, setCoverageData] = useState([]);
    const [activeView, setActiveView] = useState('table');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({});

    // Settings State
    const [settings, setSettings] = useState({
        coverageRadius: 250,
        coverageColor: '#0ea5e9',
        uncoveredColor: '#ef4444'
    });

    // Loading State
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
    const [excelColumns, setExcelColumns] = useState([]);
    const [columnMapping, setColumnMapping] = useState({});
    const [importPreview, setImportPreview] = useState([]);
    const fileInputRef = useRef(null);

    // FETCH DATA
    const fetchData = useCallback(async (page = 1, search = '') => {
        setIsLoading(true);
        setLoadingMessage('Loading data...');
        try {
            const res = await fetch(`/api/coverage?page=${page}&limit=50&search=${search}`);
            const json = await res.json();
            if (json.data) {
                setCoverageData(json.data);
                setTotalPages(json.pagination.totalPages);
                setTotalRows(json.pagination.totalRows);
                setCurrentPage(json.pagination.page);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.coverageRadius) setSettings(prev => ({ ...prev, ...data }));
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        fetchData(1, '');
        fetchSettings();
    }, [fetchData, fetchSettings]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => fetchData(1, searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm, fetchData]);

    // Handlers
    const handlePageChange = (newPage) => fetchData(newPage, searchTerm);

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(JSON.parse(JSON.stringify(item)));
            setIsEditMode(false); // View mode first
        } else {
            const empty = { networkType: 'HFC' };
            APP_FIELDS.forEach(f => { if (!empty[f.key]) empty[f.key] = ''; });
            setFormData(empty);
            setIsEditMode(true);
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this coverage point?')) {
            setIsSaving(true);
            try {
                await fetch(`/api/coverage/${id}`, { method: 'DELETE' });
                await fetchData(currentPage, searchTerm);
                setIsModalOpen(false);
            } catch (error) {
                alert('Error deleting site');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const payload = { ...formData };
        ['ampliLat', 'ampliLong', 'areaLat', 'areaLong'].forEach(k => {
            payload[k] = parseFloat(payload[k]) || 0;
        });

        try {
            const url = editingItem ? `/api/coverage/${editingItem.id}` : '/api/coverage';
            const method = editingItem ? 'PUT' : 'POST';
            await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            await fetchData(currentPage, searchTerm);
            setIsEditMode(false);
            setIsModalOpen(false);
        } catch (error) {
            alert('Error saving data');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await Promise.all([
                fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'coverageRadius', value: settings.coverageRadius }) }),
                fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'coverageColor', value: settings.coverageColor }) })
            ]);
            setIsSettingsOpen(false);
            alert("Settings saved!");
        } catch (e) { alert("Failed to save settings"); }
    };

    // EXPORT EXCEL
    const handleExport = async () => {
        setIsLoading(true);
        setLoadingMessage('Preparing export...');
        try {
            // Fetch ALL data (or large limit) for export
            const res = await fetch(`/api/coverage?limit=10000`);
            const json = await res.json();
            const data = json.data || [];

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Coverage Data");
            XLSX.writeFile(workbook, `Coverage_Export_${new Date().toISOString().split('T')[0]}.xlsx`);

        } catch (error) {
            console.error(error);
            alert("Export failed");
        } finally {
            setIsLoading(false);
        }
    };

    // IMPORT EXCEL LOGIC (As before)
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsLoading(true);
        setLoadingMessage('Reading Excel...');
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' }); // Raw Import
                window.tempImportData = jsonData;

                // Extract Headers
                if (jsonData.length > 0) {
                    setExcelColumns(Object.keys(jsonData[0]));
                }
                setLoadingMessage('');
                setIsLoading(false);
                setColumnMapping({});
                setIsMappingModalOpen(true);
            } catch (err) { alert(err.message); setIsLoading(false); }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const applyMapping = () => {
        const mapped = window.tempImportData.map(row => {
            const item = {};
            APP_FIELDS.forEach(f => {
                const col = columnMapping[f.key];
                item[f.key] = col ? row[col] : '';
            });
            // Parse numbers
            ['ampliLat', 'ampliLong', 'areaLat', 'areaLong'].forEach(k => item[k] = parseFloat(item[k]) || 0);
            return item;
        });
        setImportPreview(mapped);
        setIsMappingModalOpen(false);
        setIsImportModalOpen(true);
    };

    const confirmImport = async () => {
        setIsImportModalOpen(false);
        setIsLoading(true);
        // Bulk implementation
        try {
            // Chunk it
            const CHUNK = 1000;
            for (let i = 0; i < importPreview.length; i += CHUNK) {
                const chunk = importPreview.slice(i, i + CHUNK);
                await fetch('/api/coverage/bulk', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: chunk })
                });
                setLoadingMessage(`Importing ${i + chunk.length} / ${importPreview.length}...`);
            }
            alert("Import completed!");
            await fetchData(1, '');
        } catch (e) { alert("Import failed: " + e.message); }
        finally { setIsLoading(false); }
    };

    // Map Center
    const mapCenter = coverageData.length > 0 && coverageData[0].ampliLat ? [coverageData[0].ampliLat, coverageData[0].ampliLong] : [-6.2088, 106.8456];

    // Marker Icon
    const createCustomIcon = () => divIcon({
        className: 'custom-marker',
        html: `<div style="background-color:${settings.coverageColor};width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10]
    });

    return (
        <div className="p-4 md:p-6 max-w-full mx-auto space-y-4">
            {(isLoading || isSaving) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-gray-600">{loadingMessage || 'Processing...'}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Coverage Management</h1>
                    <p className="text-gray-500 text-sm">{totalRows.toLocaleString()} sites in database</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="ghost" onClick={() => setIsSettingsOpen(true)}>
                        <SettingsIcon className="w-4 h-4 text-gray-600" />
                    </Button>
                    <div className="w-px bg-gray-300 h-8 mx-1"></div>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" /> Export XLS
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx,.xls" className="hidden" />
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" /> Import XLS
                    </Button>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="w-4 h-4 mr-2" /> Add Site
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveView('map')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeView === 'map' ? "bg-white text-primary shadow-sm" : "text-gray-500")}>
                        <Map className="w-4 h-4" /> Map
                    </button>
                    <button onClick={() => setActiveView('table')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeView === 'table' ? "bg-white text-primary shadow-sm" : "text-gray-500")}>
                        <Layers className="w-4 h-4" /> Table
                    </button>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search site/ampli/city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm bg-white" />
                </div>
            </div>

            {activeView === 'map' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="h-[500px] relative">
                        <MapContainer center={mapCenter} zoom={12} className="h-full w-full z-0" scrollWheelZoom={true}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {coverageData.filter(s => s.ampliLat && s.ampliLong).map((site) => (
                                <Circle
                                    key={`c-${site.id}`}
                                    center={[site.ampliLat, site.ampliLong]}
                                    radius={parseInt(settings.coverageRadius)}
                                    pathOptions={{ color: settings.coverageColor, fillColor: settings.coverageColor, fillOpacity: 0.1 }}
                                >
                                    <Marker position={[site.ampliLat, site.ampliLong]} icon={createCustomIcon()} eventHandlers={{ click: () => handleOpenModal(site) }}>
                                        <Popup><div className="text-xs"><strong>{site.siteId}</strong><br />{site.ampli}</div></Popup>
                                    </Marker>
                                </Circle>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            )}

            {activeView === 'table' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="px-4 py-3">Site ID / Ampli</th>
                                    <th className="px-4 py-3">City / Town</th>
                                    <th className="px-4 py-3">Kecamatan</th>
                                    <th className="px-4 py-3">Fibernode Desc</th>
                                    <th className="px-4 py-3">Network Type</th>
                                    <th className="px-4 py-3">Location</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {coverageData.length > 0 ? coverageData.map((site) => (
                                    <tr key={site.id} onClick={() => handleOpenModal(site)} className="hover:bg-gray-50 cursor-pointer group">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-900">{site.siteId}</div>
                                            <div className="text-gray-500">{site.ampli}</div>
                                        </td>
                                        <td className="px-4 py-3">{site.cityTown}</td>
                                        <td className="px-4 py-3">{site.kecamatan}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate" title={site.fibernodeDesc}>{site.fibernodeDesc}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold", site.networkType === 'FTTH' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>
                                                {site.networkType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{site.location}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">Edit</Button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No data found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                            <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
                            <div className="flex gap-1">
                                <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 text-xs rounded border bg-white disabled:opacity-50">Prev</button>
                                <button onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-xs rounded border bg-white disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Edit/Add Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? (isEditMode ? 'Edit Site' : 'Site Details') : 'Add New Site'} className="max-w-4xl">
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-1">
                        {APP_FIELDS.map(field => (
                            <div key={field.key}>
                                <Input
                                    label={field.label}
                                    type={['ampliLat', 'ampliLong', 'areaLat', 'areaLong'].includes(field.key) ? 'number' : 'text'}
                                    step="any"
                                    value={formData[field.key] || ''}
                                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                    disabled={!isEditMode && editingItem} // Disabled if viewing logic
                                    required={field.required}
                                    className="text-xs"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                        {editingItem ? (
                            <Button type="button" variant="danger" onClick={() => handleDelete(editingItem.id)}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
                        ) : <div></div>}

                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Close</Button>
                            {editingItem && !isEditMode ? (
                                <Button type="button" onClick={(e) => { e.preventDefault(); setIsEditMode(true); }}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
                            ) : (
                                <Button type="submit"><Save className="w-4 h-4 mr-1" /> Save</Button>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Settings Modal */}
            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Coverage Settings" className="max-w-md">
                <div className="space-y-4">
                    <Input
                        label="Coverage Radius (meters)"
                        type="number"
                        value={settings.coverageRadius}
                        onChange={e => setSettings({ ...settings, coverageRadius: e.target.value })}
                    />
                    <div>
                        <label className="text-sm font-medium mb-1 block">Coverage Color</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="color"
                                value={settings.coverageColor}
                                onChange={e => setSettings({ ...settings, coverageColor: e.target.value })}
                                className="h-10 w-20 border rounded cursor-pointer"
                            />
                            <span className="text-xs text-gray-500">{settings.coverageColor}</span>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSaveSettings}>Save Settings</Button>
                    </div>
                </div>
            </Modal>

            {/* Import Models (Mapping & Preview) - Reuse logic from before but cleaner markup */}
            <Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)} title="Map Excel Columns">
                <div className="space-y-4 max-h-[400px] overflow-auto">
                    {APP_FIELDS.map(f => (
                        <div key={f.key} className="flex gap-2 items-center text-sm">
                            <span className="w-1/3 font-medium">{f.label}</span>
                            <select className="flex-1 border rounded p-1" value={columnMapping[f.key] || ''} onChange={e => setColumnMapping({ ...columnMapping, [f.key]: e.target.value })}>
                                <option value="">-- Ignore --</option>
                                {excelColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    ))}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button onClick={applyMapping}>Next: Preview</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title={`Preview Import (${importPreview.length} rows)`} className="max-w-4xl">
                <div className="space-y-3">
                    <div className="max-h-[300px] overflow-auto border rounded text-xs">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="p-2">Site ID</th>
                                    <th className="p-2">Ampli</th>
                                    <th className="p-2">City</th>
                                </tr>
                            </thead>
                            <tbody>
                                {importPreview.slice(0, 50).map((r, i) => (
                                    <tr key={i} className="border-b"><td className="p-2">{r.siteId}</td><td className="p-2">{r.ampli}</td><td className="p-2">{r.cityTown}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-gray-500">Previewing first 50 rows.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmImport}>Start Import</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CoverageManagement;
