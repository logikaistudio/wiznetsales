import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap, useMapEvents } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { Map, Search, Layers, Plus, Upload, Trash2, Pencil, Save, FileSpreadsheet, Settings as SettingsIcon, Loader2, RefreshCw, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { kml } from '@tmcw/togeojson';
import useDebounce from '../../hooks/useDebounce';

import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const APP_FIELDS = [
    { key: 'networkType', label: 'Network', required: true },
    { key: 'siteId', label: 'Site ID', required: false },
    { key: 'homepassId', label: 'Homepass ID', required: false },
    { key: 'ampliLat', label: 'Ampli Lat', required: true },
    { key: 'ampliLong', label: 'Ampli Long', required: true },
    { key: 'locality', label: 'Locality', required: false },
];

// Helper to fix potential coordinate issues (Leaflet [lat, lng] vs GeoJSON [lng, lat])
const fixPolygon = (coords) => {
    if (!Array.isArray(coords)) return [];
    // Check first point
    if (coords.length > 0 && Array.isArray(coords[0])) {
        const first = coords[0];
        // If lat > 90, likely swapped. Max lat is 90.
        if (Math.abs(first[0]) > 90) {
            return coords.map(p => [p[1], p[0]]);
        }
    }
    return coords;
};

// Map Bounds Handler to optimize rendering
const MapBoundsHandler = ({ onBoundsChange }) => {
    const map = useMap();

    useEffect(() => {
        if (map) {
            onBoundsChange(map.getBounds());
        }
    }, [map, onBoundsChange]);

    useMapEvents({
        moveend: () => onBoundsChange(map.getBounds()),
        zoomend: () => onBoundsChange(map.getBounds())
    });
    return null;
};

const CoverageManagement = () => {
    // Data State
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('All'); // Added network filter
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

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState([]);

    // Map Optimization
    const [mapBounds, setMapBounds] = useState(null);
    const debouncedBounds = useDebounce(mapBounds, 500);
    const [visibleCount, setVisibleCount] = useState(0);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(coverageData.map(item => item.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id, e) => {
        e.stopPropagation(); // Prevent row click
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!confirm(`Delete ${selectedIds.length} items? This action cannot be undone.`)) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/coverage/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });
            if (res.ok) {
                setSelectedIds([]);
                fetchData(currentPage); // Refresh data
            } else {
                alert('Failed to delete items');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting items');
        } finally {
            setIsLoading(false);
        }
    };



    // Info Panel State
    const [showInfoPanel, setShowInfoPanel] = useState(true);

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
    const [importMode, setImportMode] = useState('insert'); // 'insert' = add new, 'upsert' = update existing + add new
    const fileInputRef = useRef(null);
    const kmzFileInputRef = useRef(null);

    // FETCH DATA (Table View)
    const fetchData = useCallback(async (page = 1, search = '', view = 'table') => {
        // Guard: Only fetch for table view here
        if (view === 'map') return;

        setIsLoading(true);
        setLoadingMessage('Loading data...');
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '50',
                search,
                networkType: typeFilter // Pass filter
            });

            const res = await fetch(`/api/coverage?${queryParams.toString()}`);
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
    }, [typeFilter]); // Reload when filter changes

    // FETCH MAP DATA (BBOX)
    useEffect(() => {
        if (activeView === 'map' && debouncedBounds) {
            const fetchMapData = async () => {
                setIsLoading(true); // Don't block UI too much but show spinner
                try {
                    const { _southWest, _northEast } = debouncedBounds;
                    const queryParams = new URLSearchParams({
                        minLat: _southWest.lat,
                        maxLat: _northEast.lat,
                        minLng: _southWest.lng,
                        maxLng: _northEast.lng,
                        search: searchTerm, // Search applies to map too
                        networkType: typeFilter // Apply filter
                    });

                    // We can add type filter if 'typeFilter' is in scope. 
                    // It seems 'typeFilter' is not in the scope of this replace block but available in component?
                    // I will check if typeFilter exists. It does in component. However, this replacement block replaces fetchData definition.
                    // The useEffect is best placed after fetchData.

                    const res = await fetch(`/api/coverage?${queryParams.toString()}`);
                    const json = await res.json();
                    if (json.data) {
                        setCoverageData(json.data);
                        setTotalRows(json.pagination.totalRows);
                    }
                } catch (e) { console.error(e); }
                finally { setIsLoading(false); }
            };
            fetchMapData();
        }
    }, [activeView, debouncedBounds, searchTerm, typeFilter]); // Add typeFilter and searchTerm dependencies

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            setIsSettingsOpen(false);
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        }
    };

    // Start with more comprehensive defaults
    const [settings, setSettings] = useState({
        coverageRadius: 50,
        coverageColor: '#22c55e',
        ftthNodeColor: '#2563eb',
        hfcNodeColor: '#ea580c', // Orange default for distinction, or keep blue
        ftthRadiusColor: '#22c55e',
        hfcRadiusColor: '#eab308', // Yellow default
        ftthRadius: 50,
        hfcRadius: 50
    });

    const [colorZones, setColorZones] = useState([
        { id: 1, label: 'Standard', color: '#22c55e', radius: 50 }
    ]);

    // ... (other states)

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();

            // Merge loaded settings with defaults
            setSettings(prev => ({
                ...prev,
                ...data,
                // Ensure specific network settings exist if not in DB yet
                ftthNodeColor: data.ftthNodeColor || prev.ftthNodeColor,
                hfcNodeColor: data.hfcNodeColor || prev.hfcNodeColor,
                ftthRadiusColor: data.ftthRadiusColor || prev.ftthRadiusColor,
                hfcRadiusColor: data.hfcRadiusColor || prev.hfcRadiusColor,
                ftthRadius: data.ftthRadius || data.coverageRadius || prev.ftthRadius,
                hfcRadius: data.hfcRadius || data.coverageRadius || prev.hfcRadius,
                coverageOpacity: parseFloat(data.coverageOpacity) || 0.3
            }));

            // Load color zones from settings (Legacy support or advanced usage)
            if (data.coverageColorZones) {
                try {
                    const zones = JSON.parse(data.coverageColorZones);
                    setColorZones(zones);
                } catch (e) {
                    console.error('Error parsing color zones:', e);
                }
            }
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        // Fetch data whenever view mode changes or on initial load
        // If map -> fetch all. If table -> fetch page 1 (or current).
        fetchData(currentPage, searchTerm, activeView);
        fetchSettings();
    }, [fetchData, fetchSettings, activeView]); // Add activeView dependency

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => fetchData(1, searchTerm, activeView), 500);
        return () => clearTimeout(timer);
    }, [searchTerm, fetchData, activeView]);

    // Handlers
    const handlePageChange = (newPage) => fetchData(newPage, searchTerm, activeView);

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

    const handleDeleteAll = async () => {
        if (confirm(`⚠️ WARNING: This will delete ALL ${totalRows.toLocaleString()} coverage sites from the database. This action cannot be undone. Are you sure?`)) {
            if (confirm('Final confirmation: Delete all coverage data?')) {
                setIsLoading(true);
                setLoadingMessage('Deleting all data...');
                try {
                    await fetch('/api/coverage/all', { method: 'DELETE' });
                    await fetchData(1, '');
                    alert('All coverage data deleted successfully');
                } catch (error) {
                    alert('Error deleting all data: ' + error.message);
                } finally {
                    setIsLoading(false);
                }
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



    // Color Zone Management
    const addColorZone = () => {
        const newId = Math.max(...colorZones.map(z => z.id), 0) + 1;
        setColorZones([...colorZones, { id: newId, label: `Coverage ${newId}`, color: '#6366f1', radius: 250 }]);
    };

    const updateColorZone = (id, field, value) => {
        setColorZones(colorZones.map(zone =>
            zone.id === id ? { ...zone, [field]: value } : zone
        ));
    };

    const deleteColorZone = (id) => {
        if (colorZones.length > 1) {
            setColorZones(colorZones.filter(zone => zone.id !== id));
        } else {
            alert('At least one coverage zone is required');
        }
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
        const totalToImport = importPreview.length;
        // Bulk implementation
        try {
            // Small chunks to avoid Vercel serverless timeout (10s limit)
            const CHUNK = 30;
            let totalProcessed = 0;
            let totalErrors = [];

            for (let i = 0; i < importPreview.length; i += CHUNK) {
                const chunk = importPreview.slice(i, i + CHUNK);
                setLoadingMessage(`Importing ${i + 1} - ${Math.min(i + CHUNK, importPreview.length)} of ${importPreview.length}...`);

                const response = await fetch('/api/coverage/bulk', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: chunk, importMode })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                    console.error(`Chunk ${i}/${importPreview.length} failed:`, errData);
                    totalErrors.push(`Chunk ${i}: ${errData.error || 'Unknown error'}`);
                } else {
                    const result = await response.json();
                    totalProcessed += result.count || chunk.length;
                }
            }

            // Refresh data
            await fetchData(1, '');

            // Switch to map view to show imported data
            setActiveView('map');

            const modeLabel = importMode === 'upsert' ? 'updated/added' : 'added';
            if (totalErrors.length > 0) {
                alert(`⚠️ Import partially completed: ${totalProcessed} ${modeLabel}, ${totalErrors.length} chunk(s) failed.`);
            } else {
                alert(`✅ Import completed! ${totalProcessed} coverage points ${modeLabel} successfully.`);
            }
        } catch (e) {
            alert("Import failed: " + e.message);
        } finally {
            setIsLoading(false);
            setImportMode('insert'); // Reset mode
        }
    };

    // KMZ IMPORT LOGIC
    const handleKMZFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);
        setLoadingMessage('Reading KMZ file...');

        try {
            // Read KMZ file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();

            // Unzip KMZ (KMZ is a zipped KML file)
            const zip = await JSZip.loadAsync(arrayBuffer);

            // Find KML file inside (usually doc.kml or similar)
            let kmlContent = null;
            for (const filename of Object.keys(zip.files)) {
                if (filename.endsWith('.kml')) {
                    kmlContent = await zip.files[filename].async('string');
                    break;
                }
            }

            if (!kmlContent) {
                throw new Error('No KML file found in KMZ');
            }

            setLoadingMessage('Parsing KML data...');

            // Parse KML to GeoJSON
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');

            // Check for XML parse errors
            const parseError = kmlDoc.querySelector('parsererror');
            if (parseError) {
                console.error('KMZ Import - XML Parse Error:', parseError.textContent);
                throw new Error('Failed to parse KML XML');
            }

            const geoJson = kml(kmlDoc);

            // EXTENSIVE DEBUGGING
            console.log('=== KMZ IMPORT DEBUG START ===');
            console.log('GeoJSON type:', geoJson.type);
            console.log('Total features:', geoJson.features?.length || 0);

            // Count geometry types
            const geometryTypeCounts = {};
            geoJson.features?.forEach(f => {
                const gType = f.geometry?.type || 'NO_GEOMETRY';
                geometryTypeCounts[gType] = (geometryTypeCounts[gType] || 0) + 1;
            });
            console.log('Geometry type counts:', geometryTypeCounts);

            // Log first 5 features for debugging
            console.log('First 5 features:', geoJson.features?.slice(0, 5).map(f => ({
                name: f.properties?.name,
                geometryType: f.geometry?.type,
                hasCoordinates: !!f.geometry?.coordinates,
                coordsLength: f.geometry?.coordinates?.length,
                firstCoord: f.geometry?.coordinates?.[0]
            })));

            // Find and log first polygon
            const firstPolygon = geoJson.features?.find(f =>
                f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
            );
            if (firstPolygon) {
                console.log('First Polygon found:', {
                    name: firstPolygon.properties?.name,
                    type: firstPolygon.geometry.type,
                    outerRingLength: firstPolygon.geometry.coordinates?.[0]?.length,
                    firstCoords: firstPolygon.geometry.coordinates?.[0]?.slice(0, 3)
                });
            } else {
                console.warn('NO POLYGONS FOUND IN GEOJSON!');
            }
            console.log('=== KMZ IMPORT DEBUG END ===');

            // Extract coordinates from GeoJSON
            const extracted = [];
            let counter = 1;

            const processFeature = (feature) => {
                if (!feature.geometry) return;

                const { geometry, properties } = feature;

                // For Polygon/MultiPolygon, store the full polygon data
                if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
                    let polygonCoords = [];
                    let centerLat = 0, centerLng = 0, pointCount = 0;

                    if (geometry.type === 'Polygon') {
                        // Polygon: coordinates[0] is outer ring
                        polygonCoords = geometry.coordinates[0].map(coord => [coord[1], coord[0]]); // [lat, lng]

                        // Calculate center
                        geometry.coordinates[0].forEach(coord => {
                            centerLng += coord[0];
                            centerLat += coord[1];
                            pointCount++;
                        });
                    } else if (geometry.type === 'MultiPolygon') {
                        // MultiPolygon: take first polygon
                        polygonCoords = geometry.coordinates[0][0].map(coord => [coord[1], coord[0]]);

                        geometry.coordinates[0][0].forEach(coord => {
                            centerLng += coord[0];
                            centerLat += coord[1];
                            pointCount++;
                        });
                    }

                    if (pointCount > 0) {
                        centerLat /= pointCount;
                        centerLng /= pointCount;

                        extracted.push({
                            networkType: properties?.networkType || properties?.Network || 'HFC',
                            siteId: properties?.name || properties?.siteId || `AREA-${counter++}`,
                            ampliLat: parseFloat(centerLat) || 0,
                            ampliLong: parseFloat(centerLng) || 0,
                            locality: properties?.description || properties?.locality || properties?.address || 'Imported from KMZ',
                            status: 'Active',
                            polygonData: polygonCoords // Store full polygon coordinates
                        });
                    }
                }
                // For Point, store as before
                else if (geometry.type === 'Point') {
                    const [longitude, latitude] = geometry.coordinates;
                    extracted.push({
                        networkType: properties?.networkType || properties?.Network || 'HFC',
                        siteId: properties?.name || properties?.siteId || `POINT-${counter++}`,
                        ampliLat: parseFloat(latitude) || 0,
                        ampliLong: parseFloat(longitude) || 0,
                        locality: properties?.description || properties?.locality || properties?.address || 'Imported from KMZ',
                        status: 'Active',
                        polygonData: null
                    });
                }
                // For LineString, convert to points along the line
                else if (geometry.type === 'LineString') {
                    geometry.coordinates.forEach(coord => {
                        const [longitude, latitude] = coord;
                        extracted.push({
                            networkType: properties?.networkType || properties?.Network || 'HFC',
                            siteId: properties?.name || properties?.siteId || `LINE-${counter++}`,
                            ampliLat: parseFloat(latitude) || 0,
                            ampliLong: parseFloat(longitude) || 0,
                            locality: properties?.description || properties?.locality || properties?.address || 'Imported from KMZ',
                            status: 'Active',
                            polygonData: null
                        });
                    });
                }
            };

            // Process all features
            if (geoJson.type === 'FeatureCollection') {
                geoJson.features.forEach(processFeature);
            } else if (geoJson.type === 'Feature') {
                processFeature(geoJson);
            }

            console.log('KMZ Import - Extracted points:', extracted.length);
            console.log('KMZ Import - Sample data:', extracted.slice(0, 3));

            if (extracted.length === 0) {
                throw new Error('No valid coordinates found in KMZ file');
            }

            // Validate coordinates
            const validPoints = extracted.filter(p => {
                const latValid = !isNaN(p.ampliLat) && Math.abs(p.ampliLat) <= 90;
                const lngValid = !isNaN(p.ampliLong) && Math.abs(p.ampliLong) <= 180;
                return latValid && lngValid && p.ampliLat !== 0 && p.ampliLong !== 0;
            });

            // Count polygons vs points
            const polygonCount = validPoints.filter(p => p.polygonData && Array.isArray(p.polygonData) && p.polygonData.length > 0).length;
            const pointCount = validPoints.length - polygonCount;

            console.log('KMZ Import - Valid items:', validPoints.length);
            console.log('KMZ Import - Polygons:', polygonCount);
            console.log('KMZ Import - Points:', pointCount);

            // Log sample polygon data for debugging
            if (polygonCount > 0) {
                const samplePolygon = validPoints.find(p => p.polygonData);
                console.log('KMZ Import - Sample polygon data:', {
                    siteId: samplePolygon.siteId,
                    polygonPoints: samplePolygon.polygonData?.length,
                    firstPoint: samplePolygon.polygonData?.[0]
                });
            }

            if (validPoints.length === 0) {
                throw new Error(`Extracted ${extracted.length} items but none have valid coordinates`);
            }

            if (validPoints.length < extracted.length) {
                console.warn(`Filtered out ${extracted.length - validPoints.length} invalid items`);
            }

            setLoadingMessage(`Found ${validPoints.length} items (${polygonCount} polygons, ${pointCount} points). Preparing import...`);

            // Set preview and open import modal
            setImportPreview(validPoints);
            setIsImportModalOpen(true);

        } catch (error) {
            console.error('KMZ Import Error:', error);
            alert(`Failed to import KMZ: ${error.message}`);
        } finally {
            setIsLoading(false);
            e.target.value = ''; // Reset file input
        }
    };

    // Map Center
    const mapCenter = coverageData.length > 0 && coverageData[0].ampliLat ? [coverageData[0].ampliLat, coverageData[0].ampliLong] : [-6.2088, 106.8456];

    // Marker Icon
    // Marker Icon
    const createNodeIcon = (networkType) => {
        const type = networkType ? String(networkType).trim().toUpperCase() : '';
        const isFTTH = type === 'FTTH';
        const color = isFTTH ? (settings.ftthNodeColor || '#2563eb') : (settings.hfcNodeColor || '#ea580c');

        // Use distinct colors for types, but SAME shape (round) as requested
        const borderRadius = '50%';

        return divIcon({
            className: 'custom-node-marker',
            html: `<div style="background-color:${color};width:12px;height:12px;border-radius:${borderRadius};border:1px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.4);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
    };

    // DOWNLOAD SAMPLE EXCEL
    const handleDownloadSample = () => {
        const headers = APP_FIELDS.map(f => f.key);
        const sampleData = [
            {
                networkType: 'FTTH',
                siteId: 'SITE-001',
                homepassId: 'HP-001',
                ampliLat: -6.200000,
                ampliLong: 106.816666,
                locality: 'Jakarta Pusat'
            },
            {
                networkType: 'HFC',
                siteId: 'SITE-002',
                homepassId: '',
                ampliLat: -6.210000,
                ampliLong: 106.820000,
                locality: 'Jakarta Selatan'
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "Coverage_Import_Template.xlsx");
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
                    <p className="text-gray-500 text-sm">{totalRows.toLocaleString()} sites in database</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="ghost" onClick={() => setIsSettingsOpen(true)}>
                        <SettingsIcon className="w-4 h-4 text-gray-600" />
                    </Button>
                    <div className="w-px bg-gray-300 h-8 mx-1"></div>
                    <Button variant="outline" onClick={handleDownloadSample}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Sample XLS
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" /> Export XLS
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx,.xls" className="hidden" />
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" /> Import XLS
                    </Button>
                    <input type="file" ref={kmzFileInputRef} onChange={handleKMZFileSelect} accept=".kmz,.kml" className="hidden" />
                    <Button variant="secondary" onClick={() => kmzFileInputRef.current?.click()}>
                        <Map className="w-4 h-4 mr-2" /> Import KMZ
                    </Button>
                    {selectedIds.length > 0 ? (
                        <Button variant="danger" onClick={handleBulkDelete}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedIds.length})
                        </Button>
                    ) : (
                        <Button variant="danger" onClick={handleDeleteAll}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete All
                        </Button>
                    )}
                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="w-4 h-4 mr-2" /> Add Site
                    </Button>
                </div>
            </div>

            {/* Info Panel - Data Description */}
            {showInfoPanel && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 relative">
                    <button
                        onClick={() => setShowInfoPanel(false)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-500 rounded-lg p-2 mt-0.5">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2">📋 Data Coverage - Panduan Pengisian</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                                <div>
                                    <span className="font-medium text-blue-700">• Network:</span> Jenis jaringan (FTTH/HFC)
                                </div>
                                <div>
                                    <span className="font-medium text-blue-700">• Site ID:</span> ID unik lokasi coverage
                                </div>
                                <div>
                                    <span className="font-medium text-blue-700">• Ampli Lat:</span> Latitude koordinat amplifier (contoh: -6.2088)
                                </div>
                                <div>
                                    <span className="font-medium text-blue-700">• Ampli Long:</span> Longitude koordinat amplifier (contoh: 106.8456)
                                </div>
                                <div className="md:col-span-2">
                                    <span className="font-medium text-blue-700">• Locality:</span> Nama lokasi/daerah (contoh: Jakarta Pusat, Tangerang Selatan)
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-blue-200">
                                <p className="text-xs text-gray-600">
                                    💡 <strong>Tips:</strong> Gunakan file Excel dengan 5 kolom tersebut untuk import data.
                                    File contoh: <code className="bg-white px-2 py-0.5 rounded text-blue-600">sample-coverage-import.xlsx</code>
                                </p>
                                <p className="text-xs text-gray-600 mt-2">
                                    🗺️ <strong>Import KMZ:</strong> Anda juga bisa import file KMZ/KML dari Google Earth atau Google Maps.
                                    Sistem akan otomatis extract koordinat dari file tersebut.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveView('map')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeView === 'map' ? "bg-white text-primary shadow-sm" : "text-gray-500")}>
                        <Map className="w-4 h-4" /> Map
                    </button>
                    <button onClick={() => setActiveView('table')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeView === 'table' ? "bg-white text-primary shadow-sm" : "text-gray-500")}>
                        <Layers className="w-4 h-4" /> Table
                    </button>
                </div>

                {/* Network Filter */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
                    {['All', 'FTTH', 'HFC'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                typeFilter === type
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search site/ampli/city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm bg-white" />
                </div>
            </div>

            {activeView === 'map' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden relative group">


                    <div className="h-[500px] relative">
                        <MapContainer center={mapCenter} zoom={12} className="h-full w-full z-0" scrollWheelZoom={true}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapBoundsHandler onBoundsChange={setMapBounds} />

                            {/* Render Logic: Optimize large datasets */}
                            {(() => {
                                // Filter data based on bounds to prevent rendering 20k markers
                                const polygons = [];
                                const points = [];

                                coverageData.forEach(site => {
                                    // 1. Always prioritize Polygons
                                    if (site.polygonData && Array.isArray(site.polygonData) && site.polygonData.length > 0) {
                                        polygons.push(site);
                                    }
                                    // 2. For points, check if within bounds
                                    else if ((site.ampliLat || site.ampliLat === 0) && (site.ampliLong || site.ampliLong === 0)) {
                                        // If bounds available, check intersection. Else (initial), show limited set
                                        if (mapBounds) {
                                            if (mapBounds.contains([site.ampliLat, site.ampliLong])) {
                                                points.push(site);
                                            }
                                        } else {
                                            // Fallback if bounds not ready (initial load)
                                            if (points.length < 100) points.push(site);
                                        }
                                    }
                                });

                                // Limit visible points to reasonable number for DOM performance (e.g., 500)
                                // If too many points in view, we slice them.
                                const renderedPoints = points.slice(0, 500);
                                const renderList = [...polygons, ...renderedPoints];

                                return renderList.map((site) => (
                                    <React.Fragment key={`site-${site.id}`}>
                                        {/* If site has polygon data, render polygon border */}
                                        {site.polygonData && Array.isArray(site.polygonData) && site.polygonData.length > 0 ? (
                                            <Polygon
                                                positions={fixPolygon(site.polygonData)}
                                                pathOptions={{
                                                    color: '#ef4444',
                                                    fillColor: '#ef4444',
                                                    fillOpacity: 0.1,
                                                    weight: 2
                                                }}
                                                eventHandlers={{ click: () => handleOpenModal(site) }}
                                            >
                                                <Popup>
                                                    <div className="text-xs space-y-1 min-w-[150px]">
                                                        <div className="flex items-center gap-2 border-b pb-1 mb-1">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">{site.networkType}</span>
                                                            <span className="text-red-600 font-semibold text-[10px]">Area</span>
                                                        </div>
                                                        <p><span className="text-gray-500">Site ID:</span> <strong>{site.siteId}</strong></p>
                                                        {site.homepassId && <p><span className="text-gray-500">Homepass:</span> <strong className="text-purple-600">{site.homepassId}</strong></p>}
                                                        <p><span className="text-gray-500">Locality:</span> {site.locality}</p>
                                                    </div>
                                                </Popup>
                                            </Polygon>
                                        ) : (
                                            <>
                                                {/* Render Coverage Radius Circles based on Network Type */}
                                                {site.status !== 'Inactive' && (
                                                    <Circle
                                                        key={`c-${site.id}`}
                                                        center={[site.ampliLat, site.ampliLong]}
                                                        radius={site.networkType === 'FTTH' ? (settings.ftthRadius || 50) : (settings.hfcRadius || 50)}
                                                        pathOptions={{
                                                            color: site.networkType === 'FTTH' ? (settings.ftthRadiusColor || '#22c55e') : (settings.hfcRadiusColor || '#eab308'),
                                                            fillColor: site.networkType === 'FTTH' ? (settings.ftthRadiusColor || '#22c55e') : (settings.hfcRadiusColor || '#eab308'),
                                                            fillOpacity: settings.coverageOpacity || 0.1, // Use setting or default
                                                            weight: 1
                                                        }}
                                                    />
                                                )}

                                                {/* Marker on top */}
                                                <Marker
                                                    position={[site.ampliLat, site.ampliLong]}
                                                    icon={createNodeIcon(site.networkType)}
                                                    eventHandlers={{ click: () => handleOpenModal(site) }}
                                                >
                                                    <Popup>
                                                        <div className="text-xs space-y-1 min-w-[150px]">
                                                            <div className="flex items-center gap-2 border-b pb-1 mb-1">
                                                                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", site.networkType === 'FTTH' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700")}>
                                                                    {site.networkType}
                                                                </span>
                                                                <span className="text-sky-600 font-semibold text-[10px]">Point</span>
                                                            </div>
                                                            <p><span className="text-gray-500">Site ID:</span> <strong>{site.siteId}</strong></p>
                                                            {site.homepassId && <p><span className="text-gray-500">Homepass:</span> <strong className="text-purple-600">{site.homepassId}</strong></p>}
                                                            <p><span className="text-gray-500">Locality:</span> {site.locality}</p>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            </>
                                        )}
                                    </React.Fragment>
                                ));
                            })()}
                        </MapContainer>

                        {/* Dynamic Legend based on Settings */}
                        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000] border">
                            <h4 className="text-xs font-semibold mb-2 text-gray-700">Map Legend</h4>
                            <div className="space-y-1.5">
                                {/* Polygon coverage legend */}
                                {coverageData.some(s => s.polygonData && Array.isArray(s.polygonData) && s.polygonData.length > 0) && (
                                    <div className="flex items-center gap-2 text-xs border-b pb-1.5 mb-1.5">
                                        <div className="w-3 h-3 border-2 border-red-500 bg-red-500/10" style={{ borderRadius: '2px' }}></div>
                                        <span className="text-gray-700">Area Coverage</span>
                                    </div>
                                )}
                                {/* FTTH Legend */}
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 border border-white shadow" style={{ backgroundColor: settings.ftthRadiusColor || '#22c55e', borderRadius: '50%' }}></div>
                                    <span className="text-gray-700">FTTH Radius ({settings.ftthRadius || 50}m)</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 border border-white shadow" style={{ backgroundColor: settings.ftthNodeColor || '#2563eb', borderRadius: '50%' }}></div>
                                    <span className="text-gray-700">FTTH Node</span>
                                </div>

                                <div className="border-t my-1"></div>

                                {/* HFC Legend */}
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 border border-white shadow" style={{ backgroundColor: settings.hfcRadiusColor || '#eab308', borderRadius: '50%' }}></div>
                                    <span className="text-gray-700">HFC Radius ({settings.hfcRadius || 50}m)</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 border border-white shadow" style={{ backgroundColor: settings.hfcNodeColor || '#ea580c', borderRadius: '50%' }}></div>
                                    <span className="text-gray-700">HFC Node</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'table' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="px-4 py-3 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                            onChange={handleSelectAll}
                                            checked={coverageData.length > 0 && selectedIds.length === coverageData.length}
                                        />
                                    </th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Network</th>
                                    <th className="px-4 py-3">Site ID</th>
                                    <th className="px-4 py-3">Homepass ID</th>
                                    <th className="px-4 py-3">Ampli Lat</th>
                                    <th className="px-4 py-3">Ampli Long</th>
                                    <th className="px-4 py-3">Locality</th>
                                    <th className="px-4 py-3">Created</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {coverageData.length > 0 ? coverageData.map((site) => (
                                    <tr key={site.id} onClick={() => handleOpenModal(site)} className={cn("hover:bg-gray-50 cursor-pointer group transtion-colors", selectedIds.includes(site.id) && "bg-blue-50")}>
                                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                checked={selectedIds.includes(site.id)}
                                                onChange={(e) => handleSelectRow(site.id, e)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {site.polygonData && Array.isArray(site.polygonData) && site.polygonData.length > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                                                    🗺️ Area
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                                    📍 Point
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold", site.networkType === 'FTTH' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>
                                                {site.networkType || 'HFC'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{site.siteId}</td>
                                        <td className="px-4 py-3 text-gray-600">{site.homepassId || '-'}</td>
                                        <td className="px-4 py-3 text-gray-600">{site.ampliLat}</td>
                                        <td className="px-4 py-3 text-gray-600">{site.ampliLong}</td>
                                        <td className="px-4 py-3 text-gray-600">{site.locality}</td>
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                                            {site.createdAt ? new Date(site.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">Edit</Button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">No data found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                            <span className="text-xs text-gray-500">
                                Page {currentPage} of {totalPages} ({totalRows} total rows)
                            </span>
                            <div className="flex items-center gap-3">
                                {/* Jump to page */}
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500">Go to:</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={totalPages}
                                        placeholder={currentPage}
                                        className="w-16 px-2 py-1 text-xs border rounded text-center"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const page = parseInt(e.target.value);
                                                if (page >= 1 && page <= totalPages) {
                                                    handlePageChange(page);
                                                    e.target.value = '';
                                                }
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const page = parseInt(e.target.value);
                                            if (page >= 1 && page <= totalPages) {
                                                handlePageChange(page);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                </div>
                                {/* Navigation buttons */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={currentPage === 1}
                                        className="px-2 py-1 text-xs rounded border bg-white disabled:opacity-50"
                                        title="First Page"
                                    >«</button>
                                    <button
                                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 text-xs rounded border bg-white disabled:opacity-50"
                                    >Prev</button>
                                    <button
                                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 text-xs rounded border bg-white disabled:opacity-50"
                                    >Next</button>
                                    <button
                                        onClick={() => handlePageChange(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="px-2 py-1 text-xs rounded border bg-white disabled:opacity-50"
                                        title="Last Page"
                                    >»</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )
            }

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
            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Coverage Settings" className="max-w-xl">
                <div className="space-y-6">
                    <p className="text-sm text-gray-500">Configure appearance for map elements by network type.</p>

                    {/* FTTH Settings */}
                    <div className="border rounded-xl p-4 bg-blue-50/50 border-blue-100">
                        <div className="flex items-center gap-2 mb-4 border-b border-blue-100 pb-2">
                            <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                            <h3 className="font-semibold text-blue-900">FTTH Configuration</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Node Marker Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={settings.ftthNodeColor || '#2563eb'}
                                        onChange={e => setSettings({ ...settings, ftthNodeColor: e.target.value })}
                                        className="h-8 w-12 rounded border cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-500">{settings.ftthNodeColor}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Coverage Radius (m)</label>
                                <input
                                    type="number"
                                    value={settings.ftthRadius || 50}
                                    onChange={e => setSettings({ ...settings, ftthRadius: parseInt(e.target.value) || 0 })}
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Coverage Area Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={settings.ftthRadiusColor || '#22c55e'}
                                        onChange={e => setSettings({ ...settings, ftthRadiusColor: e.target.value })}
                                        className="h-8 w-12 rounded border cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-500">{settings.ftthRadiusColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HFC Settings */}
                    <div className="border rounded-xl p-4 bg-orange-50/50 border-orange-100">
                        <div className="flex items-center gap-2 mb-4 border-b border-orange-100 pb-2">
                            <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                            <h3 className="font-semibold text-orange-900">HFC / Hybrid Configuration</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Node Marker Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={settings.hfcNodeColor || '#ea580c'}
                                        onChange={e => setSettings({ ...settings, hfcNodeColor: e.target.value })}
                                        className="h-8 w-12 rounded border cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-500">{settings.hfcNodeColor}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Coverage Radius (m)</label>
                                <input
                                    type="number"
                                    value={settings.hfcRadius || 50}
                                    onChange={e => setSettings({ ...settings, hfcRadius: parseInt(e.target.value) || 0 })}
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Coverage Area Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={settings.hfcRadiusColor || '#eab308'}
                                        onChange={e => setSettings({ ...settings, hfcRadiusColor: e.target.value })}
                                        className="h-8 w-12 rounded border cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-500">{settings.hfcRadiusColor}</span>
                                </div>
                            </div>
                        </div>

                        {/* General Settings */}
                        <div className="border rounded-xl p-4 bg-gray-50 border-gray-200">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Coverage Opacity (Transparency)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1.0"
                                    step="0.1"
                                    value={settings.coverageOpacity || 0.3}
                                    onChange={e => setSettings({ ...settings, coverageOpacity: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-sm font-bold text-gray-700 w-12 text-center">
                                    {Math.round((settings.coverageOpacity || 0.3) * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
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
                                    name="importMode"
                                    value="insert"
                                    checked={importMode === 'insert'}
                                    onChange={() => setImportMode('insert')}
                                    className="mt-1 text-blue-600"
                                />
                                <div>
                                    <span className="font-semibold text-gray-900 text-sm">➕ Tambah Data Baru</span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Semua data di file akan ditambahkan sebagai data baru. Data yang sudah ada di database tidak akan berubah.
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
                                    name="importMode"
                                    value="upsert"
                                    checked={importMode === 'upsert'}
                                    onChange={() => setImportMode('upsert')}
                                    className="mt-1 text-amber-600"
                                />
                                <div>
                                    <span className="font-semibold text-gray-900 text-sm">🔄 Update & Tambah</span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Data dengan <strong>Site ID</strong> yang sama akan diperbarui. Data baru akan ditambahkan.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Statistics Banner */}
                    {importPreview.some(r => r.polygonData) && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">Polygon Data Detected!</span>
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                                {importPreview.filter(r => r.polygonData && Array.isArray(r.polygonData) && r.polygonData.length > 0).length} items with polygon boundaries will be rendered as areas on the map.
                            </div>
                        </div>
                    )}

                    <div className="max-h-[300px] overflow-auto border rounded text-xs">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="p-2">Type</th>
                                    <th className="p-2">Network</th>
                                    <th className="p-2">Site ID</th>
                                    <th className="p-2">Ampli Lat</th>
                                    <th className="p-2">Ampli Long</th>
                                    <th className="p-2">Locality</th>
                                </tr>
                            </thead>
                            <tbody>
                                {importPreview.slice(0, 50).map((r, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-2">
                                            {r.polygonData && Array.isArray(r.polygonData) && r.polygonData.length > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                    🗺️ Polygon ({r.polygonData.length} pts)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    📍 Point
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2">{r.networkType}</td>
                                        <td className="p-2">{r.siteId}</td>
                                        <td className="p-2">{r.ampliLat?.toFixed(6)}</td>
                                        <td className="p-2">{r.ampliLong?.toFixed(6)}</td>
                                        <td className="p-2 max-w-[200px] truncate">{r.locality}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                            Previewing first 50 rows.
                            Total: {importPreview.length} items
                            ({importPreview.filter(r => r.polygonData && Array.isArray(r.polygonData) && r.polygonData.length > 0).length} polygons,
                            {importPreview.filter(r => !r.polygonData || !Array.isArray(r.polygonData) || r.polygonData.length === 0).length} points)
                        </p>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                            <Button onClick={confirmImport}>
                                {importMode === 'upsert' ? '🔄 Update & Import' : '➕ Start Import'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CoverageManagement;
