import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { Map, Search, Layers, Plus, Upload, Trash2, Pencil, Save, FileSpreadsheet, Settings2, Loader2, RefreshCw } from 'lucide-react';
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

const createCustomIcon = (isActive) => divIcon({
    className: 'custom-marker',
    html: `<div style="background-color:${isActive ? '#317873' : '#ef4444'};width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24],
});

const APP_FIELDS = [
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
    { key: 'siteId', label: 'Site Id', required: true },
    { key: 'location', label: 'Location' },
    { key: 'streetName', label: 'Street Name' },
    { key: 'streetBlock', label: 'Street Block' },
    { key: 'streetNo', label: 'Street No' },
    { key: 'rtrw', label: 'RTRW' },
    { key: 'dwelling', label: 'Dwelling' },
];

const CoverageManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [coverageData, setCoverageData] = useState([]);
    const [activeView, setActiveView] = useState('table');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({});

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // Import States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
    const [rawExcelData, setRawExcelData] = useState([]);
    const [excelColumns, setExcelColumns] = useState([]);
    const [columnMapping, setColumnMapping] = useState({});
    const [importPreview, setImportPreview] = useState([]);
    const [totalImportRows, setTotalImportRows] = useState(0);
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
            alert('Failed to fetch data. Ensure backend server is running.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial Load
    useEffect(() => {
        fetchData(1, '');
    }, [fetchData]);

    // Handle Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(1, searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, fetchData]);

    const handlePageChange = (newPage) => {
        fetchData(newPage, searchTerm);
    };

    const mapCenter = coverageData.length > 0 && coverageData[0].ampliLat
        ? [coverageData[0].ampliLat, coverageData[0].ampliLong]
        : [-6.268, 106.752];

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(JSON.parse(JSON.stringify(item)));
            setIsEditMode(false);
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

        const payload = {
            ...formData,
            ampliLat: parseFloat(formData.ampliLat) || 0,
            ampliLong: parseFloat(formData.ampliLong) || 0,
            areaLat: parseFloat(formData.areaLat) || 0,
            areaLong: parseFloat(formData.areaLong) || 0,
        };

        try {
            if (editingItem) {
                await fetch(`/api/coverage/${editingItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                await fetch('/api/coverage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            await fetchData(currentPage, searchTerm);
            setIsEditMode(false);
            setIsModalOpen(false);
        } catch (error) {
            alert('Error saving data');
        } finally {
            setIsSaving(false);
        }
    };

    // EXCEL IMPORT
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);
        setLoadingMessage('Reading Excel file...');

        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const wb = XLSX.read(evt.target.result, { type: 'binary' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const range = XLSX.utils.decode_range(ws['!ref']);
                    const headers = [];
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
                        headers.push(cell ? String(cell.v) : `Column${C}`);
                    }

                    const previewData = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, range: 0, header: headers });
                    const sampleData = previewData.slice(1, 101);
                    setRawExcelData(sampleData); // Only sample for mapping

                    // For full import, we should ideally read streamed or handle backend upload
                    // But for now we'll read full json to memory to send to backend
                    // WARN: With 80k rows, this might still be heavy for browser memory
                    const allData = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }); // Read all

                    setTotalImportRows(allData.length);
                    setExcelColumns(headers);
                    setColumnMapping({});
                    setIsLoading(false);
                    setIsMappingModalOpen(true);

                    // Store full data in a ref or state if needed, here we'll re-parse or use rawExcelData for simple preview
                    window.tempImportData = allData;
                } catch (error) {
                    console.error('Parse error:', error);
                    alert('Error: ' + error.message);
                    setIsLoading(false);
                }
            };
            reader.readAsBinaryString(file);
        }, 100);
        e.target.value = '';
    };

    const applyMapping = () => {
        const mappedData = window.tempImportData.map((row) => {
            const mapped = {};
            APP_FIELDS.forEach(field => {
                const excelCol = columnMapping[field.key];
                let value = excelCol ? row[excelCol] : '';
                if (['ampliLat', 'ampliLong', 'areaLat', 'areaLong'].includes(field.key)) {
                    value = parseFloat(value) || 0;
                } else {
                    value = String(value || '');
                }
                mapped[field.key] = value;
            });
            return mapped;
        });
        setImportPreview(mappedData); // This can be huge, be careful
        setIsMappingModalOpen(false);
        setIsImportModalOpen(true);
    };

    const confirmImport = async () => {
        setIsImportModalOpen(false);
        setIsLoading(true);
        setLoadingMessage(`Importing ${importPreview.length} rows...`);

        try {
            // Send in chunks of 2000 to avoid request payload limits
            const CHUNK_SIZE = 2000;
            const chunks = [];
            for (let i = 0; i < importPreview.length; i += CHUNK_SIZE) {
                chunks.push(importPreview.slice(i, i + CHUNK_SIZE));
            }

            let completed = 0;
            for (const chunk of chunks) {
                await fetch('/api/coverage/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: chunk })
                });
                completed += chunk.length;
                setLoadingMessage(`Imported ${completed} of ${importPreview.length}...`);
            }

            alert('Import successful!');
            setImportPreview([]);
            window.tempImportData = null;
            await fetchData(1, '');
        } catch (error) {
            alert('Import failed: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

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
                    <p className="text-gray-500 text-sm">
                        {totalRows.toLocaleString()} sites in database
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => fetchData(currentPage, searchTerm)}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx,.xls" className="hidden" />
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" /> Import XLS
                    </Button>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="w-4 h-4 mr-2" /> Add Site
                    </Button>
                    <Button variant="danger" onClick={async () => {
                        if (confirm('WARNING: This will delete ALL coverage data. This action cannot be undone. Are you sure?')) {
                            const doubleCheck = prompt('To confirm, type "DELETE ALL" in the box below:');
                            if (doubleCheck === 'DELETE ALL') {
                                setIsLoading(true);
                                setLoadingMessage('Deleting all data...');
                                try {
                                    await fetch('/api/coverage/all', { method: 'DELETE' });
                                    await fetchData(1, '');
                                    alert('All data deleted successfully.');
                                } catch (error) {
                                    alert('Failed to delete data.');
                                } finally {
                                    setIsLoading(false);
                                }
                            }
                        }
                    }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete All
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
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm bg-white" />
                </div>
            </div>

            {activeView === 'map' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="h-[450px] relative">
                        <MapContainer center={mapCenter} zoom={12} className="h-full w-full z-0" scrollWheelZoom={true}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {coverageData.filter(s => s.ampliLat && s.ampliLong).map((site) => (
                                <Marker key={site.id} position={[site.ampliLat, site.ampliLong]} icon={createCustomIcon(true)} eventHandlers={{ click: () => handleOpenModal(site) }}>
                                    <Popup><div className="text-xs"><strong>{site.siteId}</strong><br />{site.ampli}</div></Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 text-xs text-gray-500 border-t">
                        <span>Map shows current page data only ({coverageData.length} items)</span>
                    </div>
                </div>
            )}

            {activeView === 'table' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="px-3 py-2 whitespace-nowrap">Site Id</th>
                                    <th className="px-3 py-2 whitespace-nowrap">Ampli</th>
                                    <th className="px-3 py-2 whitespace-nowrap">City Town</th>
                                    <th className="px-3 py-2 whitespace-nowrap">Kecamatan</th>
                                    <th className="px-3 py-2 whitespace-nowrap">Kelurahan</th>
                                    <th className="px-3 py-2 whitespace-nowrap">Network</th>
                                    <th className="px-3 py-2 whitespace-nowrap">Fibernode</th>
                                    <th className="px-3 py-2 whitespace-nowrap">Cluster Id</th>
                                    <th className="px-3 py-2 whitespace-nowrap">Ampli Lat</th>
                                    <th className="px-3 py-2 whitespace-nowrap">Ampli Long</th>
                                    <th className="px-3 py-2 whitespace-nowrap">Location</th>
                                    <th className="px-3 py-2 whitespace-nowrap">Street</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {coverageData.length > 0 ? coverageData.map((site) => (
                                    <tr key={site.id} onClick={() => handleOpenModal(site)} className="hover:bg-gray-50 cursor-pointer">
                                        <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{site.siteId}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{site.ampli}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{site.cityTown}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{site.kecamatan}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{site.kelurahan}</td>
                                        <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{site.networkType}</span></td>
                                        <td className="px-3 py-2 whitespace-nowrap">{site.fibernode}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{site.clusterId}</td>
                                        <td className="px-3 py-2 font-mono text-gray-500">{site.ampliLat}</td>
                                        <td className="px-3 py-2 font-mono text-gray-500">{site.ampliLong}</td>
                                        <td className="px-3 py-2 max-w-[120px] truncate">{site.location}</td>
                                        <td className="px-3 py-2 max-w-[100px] truncate">{site.streetName}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={12} className="px-3 py-10 text-center text-gray-400">No data found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                            <span className="text-xs text-gray-500">
                                Showing page {currentPage} of {totalPages} ({totalRows} items total)
                            </span>
                            <div className="flex gap-1">
                                <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 text-xs rounded border bg-white disabled:opacity-50">Prev</button>
                                <span className="px-3 py-1 text-xs">{currentPage}</span>
                                <button onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-xs rounded border bg-white disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Components */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Edit Site' : 'Add New Site'} className="max-w-3xl">
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {APP_FIELDS.map(field => (
                            <Input key={field.key} label={field.label} type={['ampliLat', 'ampliLong', 'areaLat', 'areaLong'].includes(field.key) ? 'number' : 'text'} step="any" value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} required={field.required} disabled={!isEditMode} className={cn(!isEditMode && "bg-gray-50", "text-sm")} />
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                        {isEditMode && editingItem ? <Button type="button" variant="danger" onClick={() => handleDelete(editingItem.id)}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button> : <div />}
                        <div className="flex gap-2">
                            {editingItem && !isEditMode ? (
                                <><Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Close</Button><Button type="button" onClick={(e) => { e.preventDefault(); setIsEditMode(true); }}><Pencil className="w-4 h-4 mr-1" /> Edit</Button></>
                            ) : (
                                <><Button type="button" variant="ghost" onClick={() => editingItem ? setIsEditMode(false) : setIsModalOpen(false)}>Cancel</Button><Button type="submit"><Save className="w-4 h-4 mr-1" /> Save</Button></>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isMappingModalOpen} onClose={() => { setIsMappingModalOpen(false); }} title="Column Mapping" className="max-w-3xl">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-auto pr-2">
                        {APP_FIELDS.map(field => (
                            <div key={field.key} className="flex items-center gap-2">
                                <span className="w-28 text-xs font-medium text-gray-700 flex-shrink-0">{field.label}{field.required && <span className="text-red-500">*</span>}</span>
                                <select value={columnMapping[field.key] || ''} onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })} className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs">
                                    <option value="">-- Select --</option>
                                    {excelColumns.map(col => <option key={col} value={col}>{col}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button variant="ghost" onClick={() => { setIsMappingModalOpen(false); }}>Cancel</Button>
                        <Button onClick={applyMapping}>Apply & Preview</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); }} title={`Preview Import (${importPreview.length} rows)`} className="max-w-6xl">
                <div className="space-y-3">
                    <div className="max-h-[300px] overflow-auto border rounded-lg">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-2 py-1.5">Site Id</th>
                                    <th className="px-2 py-1.5">Ampli</th>
                                    <th className="px-2 py-1.5">City</th>
                                </tr>
                            </thead>
                            <tbody>
                                {importPreview.slice(0, 100).map((row, idx) => (
                                    <tr key={idx}><td className="px-2 py-1.5">{row.siteId}</td><td className="px-2 py-1.5">{row.ampli}</td><td className="px-2 py-1.5">{row.cityTown}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-gray-500">Showing first 100 of {importPreview.length}</p>
                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button variant="ghost" onClick={() => { setIsImportModalOpen(false); }}>Cancel</Button>
                        <Button onClick={confirmImport}><Upload className="w-4 h-4 mr-1" /> Import All</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CoverageManagement;
