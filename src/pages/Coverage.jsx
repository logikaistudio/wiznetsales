import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvents, useMap } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { Map as MapIcon, Search, Navigation, Info, Loader2, CheckCircle, XCircle, Plus, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import Button from '../components/ui/Button';
import 'leaflet/dist/leaflet.css';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';

// Fix Leaflet Icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });


// Dynamic Node Icon based on network type and settings
const createNodeIcon = (networkType, settings) => {
    const type = networkType ? String(networkType).trim().toUpperCase() : '';
    const isFTTH = type === 'FTTH';

    const nodeColor = isFTTH ? (settings.ftthNodeColor || '#2563eb') : (settings.hfcNodeColor || '#ea580c');
    const borderRadius = '50%'; // Always round
    const size = parseInt(settings.nodeSize) || 12;

    return divIcon({
        className: 'custom-node-marker',
        html: `<div style="background-color:${nodeColor};width:${size}px;height:${size}px;border-radius:${borderRadius};border:1px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.4);"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
};

const customerIcon = (status) => divIcon({
    className: 'customer-marker',
    html: `<div style="background-color:${status === 'Covered' ? '#22c55e' : '#ef4444'};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10]
});

// Helper to fix potential coordinate issues
const fixPolygon = (coords) => {
    if (!Array.isArray(coords)) return [];
    if (coords.length > 0 && Array.isArray(coords[0])) {
        const first = coords[0];
        if (Math.abs(first[0]) > 90) { // If lat > 90, swap
            return coords.map(p => [p[1], p[0]]);
        }
    }
    return coords;
};

/**
 * CoverageLayer — a component that MUST be rendered inside MapContainer.
 * It injects a <style> tag to control SVG fill-opacity of coverage areas
 * via CSS, bypassing react-leaflet's pathOptions update limitations in v5.
 */
const CoverageLayer = ({ coveragePoints, settings, mapBounds, createNodeIcon, fixPolygon }) => {
    const opacityVal = settings.coverageOpacity ?? 0.3;
    const strokeOpacity = Math.min(opacityVal + 0.2, 1);

    // Inject a <style> tag that overrides SVG fill-opacity for coverage areas
    useEffect(() => {
        let styleEl = document.getElementById('coverage-opacity-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'coverage-opacity-style';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            path.coverage-area {
                fill-opacity: ${opacityVal} !important;
                stroke-opacity: ${strokeOpacity} !important;
            }
        `;
        return () => { /* keep style tag alive while component exists */ };
    }, [opacityVal, strokeOpacity]);

    const polygons = [];
    const points = [];

    coveragePoints.forEach(point => {
        if (point.polygonData && Array.isArray(point.polygonData) && point.polygonData.length > 0) {
            polygons.push(point);
        } else if ((point.ampliLat || point.ampliLat === 0) && (point.ampliLong || point.ampliLong === 0)) {
            if (mapBounds) {
                if (mapBounds.contains([point.ampliLat, point.ampliLong])) points.push(point);
            } else {
                if (points.length < 1000) points.push(point);
            }
        }
    });

    const renderList = [...polygons, ...points.slice(0, 1500)];

    return renderList.map((point, idx) => {
        // Polygon path
        if (point.polygonData && Array.isArray(point.polygonData) && point.polygonData.length > 0) {
            return (
                <Polygon
                    key={`cov-poly-${point.id || idx}-${opacityVal}`}
                    positions={fixPolygon(point.polygonData)}
                    pathOptions={{
                        className: "coverage-area",
                        fillColor: '#ef4444',
                        color: '#ef4444',
                        weight: 2,
                        fillOpacity: opacityVal,
                        opacity: opacityVal
                    }}
                >
                    <Popup>
                        <div className="text-xs font-sans space-y-1 min-w-[150px]">
                            <div className="flex items-center gap-2 border-b pb-1 mb-1">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">{point.networkType}</span>
                                <span className="text-red-600 font-semibold text-[10px]">Area</span>
                            </div>
                            <p><span className="text-gray-500">Site ID:</span> <strong>{point.siteId}</strong></p>
                            {point.homepassId && <p><span className="text-gray-500">Homepass:</span> <strong className="text-purple-600">{point.homepassId}</strong></p>}
                            <p><span className="text-gray-500">Locality:</span> {point.locality}</p>
                        </div>
                    </Popup>
                </Polygon>
            );
        }

        // Circle + Marker
        const type = point.networkType ? String(point.networkType).trim().toUpperCase() : '';
        const isFTTH = type === 'FTTH';
        const radiusColor = isFTTH ? (settings.ftthRadiusColor || '#22c55e') : (settings.hfcRadiusColor || '#eab308');
        const radius = isFTTH ? (settings.ftthRadius || 50) : (settings.hfcRadius || 50);

        return (
            <React.Fragment key={`cov-group-${point.id || idx}`}>
                <Circle
                    key={`cov-circle-${point.id || idx}-${opacityVal}`}
                    center={[point.ampliLat, point.ampliLong]}
                    pathOptions={{
                        className: "coverage-area",
                        fillColor: radiusColor,
                        color: radiusColor,
                        weight: 1,
                        fillOpacity: opacityVal,
                        opacity: strokeOpacity
                    }}
                    radius={radius}
                />
                <Marker
                    position={[point.ampliLat, point.ampliLong]}
                    icon={createNodeIcon(point.networkType, settings)}
                >
                    <Popup>
                        <div className="text-xs font-sans space-y-1 min-w-[150px]">
                            <div className="flex items-center gap-2 border-b pb-1 mb-1">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isFTTH ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {point.networkType}
                                </span>
                                <span className="text-sky-600 font-semibold text-[10px]">Node</span>
                            </div>
                            <p><span className="text-gray-500">Site ID:</span> <strong>{point.siteId}</strong></p>
                            {point.homepassId && <p><span className="text-gray-500">Homepass:</span> <strong className="text-purple-600">{point.homepassId}</strong></p>}
                            <p><span className="text-gray-500">Locality:</span> {point.locality}</p>
                        </div>
                    </Popup>
                </Marker>
            </React.Fragment>
        );
    });
};


// Helper: Haversine Distance (in meters)
function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const CONSTANTS = {
    DEFAULT_CENTER: [-6.2088, 106.8456] // Jakarta
};

// Component for Map Events (Click Handling)
const MapEvents = ({ onMapClick, isPicking, onBoundsChange }) => {
    const map = useMap();

    // Initial bounds
    useEffect(() => {
        if (map && onBoundsChange) {
            onBoundsChange(map.getBounds());
        }
    }, [map, onBoundsChange]);

    useMapEvents({
        click(e) {
            if (isPicking) {
                onMapClick(e.latlng);
            }
        },
        moveend: () => onBoundsChange && onBoundsChange(map.getBounds()),
        zoomend: () => onBoundsChange && onBoundsChange(map.getBounds())
    });
    // Change cursor
    useEffect(() => {
        if (isPicking) {
            map.getContainer().style.cursor = 'crosshair';
        } else {
            map.getContainer().style.cursor = 'grab';
        }
    }, [isPicking, map]);
    return null;
};

// Component to handle map centering when center prop changes
const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

const Coverage = () => {

    const navigate = useNavigate();
    const { user } = useAuth();
    const canEditSettings = user && ['super_admin', 'admin', 'manager', 'superadmin'].includes(user.role);
    const [showSettings, setShowSettings] = useState(false);
    const [showRadius, setShowRadius] = useState(true);
    const [searchAddress, setSearchAddress] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const [coveragePoints, setCoveragePoints] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [analyzedCustomers, setAnalyzedCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ covered: 0, uncovered: 0, total: 0 });
    const [mapBounds, setMapBounds] = useState(null);
    const debouncedBounds = useDebounce(mapBounds, 300);
    const [typeFilter, setTypeFilter] = useState('All');

    // Stable callback for MapEvents (must be at component level, not inside JSX)
    const handleBoundsChange = useCallback((b) => setMapBounds(b), []);

    // Settings state - same as Coverage Management
    const [settings, setSettings] = useState({
        coverageRadius: 50,
        coverageColor: '#22c55e',
        ftthNodeColor: '#2563eb',
        hfcNodeColor: '#ea580c',
        ftthRadiusColor: '#2563eb', // Match Node Color Default
        hfcRadiusColor: '#ea580c', // Match Node Color Default
        ftthRadius: 50,
        hfcRadius: 50,
        coverageOpacity: 0.3,  // MUST be in initial state to avoid undefined
        nodeSize: 12
    });

    // Manual Check State
    const [isPickingLocation, setIsPickingLocation] = useState(false);
    const [manualCheckPoint, setManualCheckPoint] = useState(null);

    const [manualInput, setManualInput] = useState({ lat: '', lng: '' });
    const [showInputForm, setShowInputForm] = useState(false);


    // Fetch Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                setSettings({
                    coverageRadius: parseInt(data.coverageRadius) || 50,
                    coverageColor: data.coverageColor || '#22c55e',
                    ftthNodeColor: data.ftthNodeColor || '#2563eb',
                    hfcNodeColor: data.hfcNodeColor || '#ea580c',
                    // Fallback to Node Color if Radius Color is not set
                    ftthRadiusColor: data.ftthRadiusColor || data.ftthNodeColor || '#2563eb',
                    hfcRadiusColor: data.hfcRadiusColor || data.hfcNodeColor || '#ea580c',
                    ftthRadius: parseInt(data.ftthRadius) || 50,
                    hfcRadius: parseInt(data.hfcRadius) || 50,
                    coverageOpacity: parseFloat(data.coverageOpacity) || 0.3,
                    nodeSize: parseInt(data.nodeSize) || 12
                });
            } catch (err) {
                console.error('Failed to load settings', err);
            }
        };
        fetchSettings();
    }, []);

    // Fetch Customers with coords only (On Mount)
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const resCust = await fetch('/api/customers');
                const customersLinks = await resCust.json();
                // Pre-filter: only keep customers with valid coordinates
                const withCoords = customersLinks.filter(c => {
                    const lat = parseFloat(c.latitude || c.lat);
                    const lng = parseFloat(c.longitude || c.long || c.lng);
                    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
                });
                setCustomers(withCoords);
            } catch (err) {
                console.error("Failed to load customers", err);
            }
        };
        fetchCustomers();
    }, []);

    // Fetch ALL Coverage Data (no BBOX filter — ensures all data always shows on map)
    useEffect(() => {
        const loadCoverage = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    page: '1',
                    limit: '5000', // Load all data
                    map: 'true',   // Tell backend to include polygon_data & skip BBOX filter
                    networkType: typeFilter
                });

                const res = await fetch(`/api/coverage?${params.toString()}`);
                const json = await res.json();

                setCoveragePoints(json.data || []);
            } catch (err) {
                console.error("Failed to load coverage", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadCoverage();
    }, [typeFilter]); // Only re-fetch when filter changes, not on every pan/zoom

    // Analyze Coverage Logic
    useEffect(() => {
        if (coveragePoints.length === 0 || customers.length === 0) return;

        let coveredCount = 0;

        const analyzed = customers.map(cust => {
            const lat = parseFloat(cust.latitude || cust.lat);
            const lng = parseFloat(cust.longitude || cust.long || cust.lng);

            if (isNaN(lat) || isNaN(lng)) return { ...cust, hasCoords: false };

            // Find closest coverage point
            let minDist = Infinity;
            let nearestPoint = null;

            for (const point of coveragePoints) {
                const d = getDistance(lat, lng, point.ampliLat, point.ampliLong);
                if (d < minDist) {
                    minDist = d;
                    nearestPoint = point;
                }
            }

            // Use network-type-specific radius
            const type = nearestPoint?.networkType ? String(nearestPoint.networkType).trim().toUpperCase() : '';
            const isFTTH = type === 'FTTH';

            const coverageRadius = isFTTH
                ? (settings.ftthRadius || 50)
                : (settings.hfcRadius || 50);

            const isCovered = minDist <= coverageRadius;
            if (isCovered) coveredCount++;

            return {
                ...cust,
                lat,
                lng,
                hasCoords: true,
                coverageStatus: isCovered ? 'Covered' : 'Uncovered',
                nearestDistance: minDist,
                nearestPoint
            };
        }).filter(c => c.hasCoords);

        setAnalyzedCustomers(analyzed);
        setStats({
            total: analyzed.length,
            covered: coveredCount,
            uncovered: analyzed.length - coveredCount
        });

    }, [coveragePoints, customers, settings]);

    const handleMapClick = (latlng) => {
        const lat = latlng.lat;
        const lng = latlng.lng;

        // Find nearest point Logic
        let minDist = Infinity;
        let nearestPoint = null;

        for (const point of coveragePoints) {
            const d = getDistance(lat, lng, point.ampliLat, point.ampliLong);
            if (d < minDist) {
                minDist = d;
                nearestPoint = point;
            }
        }

        // Use network-type-specific radius
        const type = nearestPoint?.networkType ? String(nearestPoint.networkType).trim().toUpperCase() : '';
        const isFTTH = type === 'FTTH';

        const coverageRadius = isFTTH
            ? (settings.ftthRadius || 50)
            : (settings.hfcRadius || 50);

        const isCovered = minDist <= coverageRadius;

        setManualCheckPoint({
            lat,
            lng,
            coverageStatus: isCovered ? 'Covered' : 'Uncovered',
            nearestDistance: minDist,
            nearestPoint
        });
        setIsPickingLocation(false); // Disable picking after click
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        const lat = parseFloat(manualInput.lat);
        const lng = parseFloat(manualInput.lng);

        if (isNaN(lat) || isNaN(lng)) {
            alert("Please enter valid decimal coordinates");
            return;
        }

        handleMapClick({ lat, lng });
        setManualInput({ lat: '', lng: '' });
        setShowInputForm(false);
    };

    const handleAddressSearch = async (e) => {
        e.preventDefault();
        if (!searchAddress.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                handleMapClick({ lat, lng: lon });
            } else {
                alert('Location not found');
            }
        } catch (err) {
            console.error('Search failed', err);
            alert('Search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSaveSettings = async () => {

        try {
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            setShowSettings(false);
            alert('Map settings saved!');
        } catch (e) {
            alert('Failed to save settings');
        }
    };

    const mapCenter = useMemo(() => {
        if (manualCheckPoint) return [manualCheckPoint.lat, manualCheckPoint.lng];
        if (analyzedCustomers.length > 0) return [analyzedCustomers[0].lat, analyzedCustomers[0].lng];
        if (coveragePoints.length > 0 && coveragePoints[0].ampliLat) return [coveragePoints[0].ampliLat, coveragePoints[0].ampliLong];
        return CONSTANTS.DEFAULT_CENTER;
    }, [analyzedCustomers, coveragePoints, manualCheckPoint]);

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col relative">
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-[400] bg-white p-4 rounded-xl shadow-lg border border-gray-100 max-w-sm w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <MapIcon className="w-5 h-5 text-primary" /> Coverage Check
                        </h1>
                        <p className="text-xs text-gray-500">
                            Visualizing FTTH ({settings.ftthRadius}m) & HFC ({settings.hfcRadius}m).
                        </p>
                    </div>
                    {canEditSettings && (
                        <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className={cn("h-8 w-8", showSettings && "bg-blue-50 text-blue-600")}>
                            <Settings className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-blue-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center border-b border-blue-200 pb-1 mb-2">
                            <h3 className="text-xs font-bold text-blue-800 uppercase">Map Visualization</h3>
                        </div>

                        {/* Node Size Slider */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex justify-between items-center">
                                <span>Node Size</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="rounded-full border border-gray-300 bg-gray-400"
                                        style={{ width: `${settings.nodeSize || 12}px`, height: `${settings.nodeSize || 12}px`, maxWidth: '24px', maxHeight: '24px' }}
                                    />
                                    <span className="font-mono">{settings.nodeSize || 12}px</span>
                                </div>
                            </label>
                            <div className="relative mt-1.5">
                                <input
                                    type="range" min="4" max="24" step="1"
                                    value={settings.nodeSize || 12}
                                    onChange={e => setSettings({ ...settings, nodeSize: parseInt(e.target.value) })}
                                    className="w-full cursor-pointer accent-blue-600"
                                    style={{ height: '4px' }}
                                />
                                <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                                    <span>4px</span><span>24px</span>
                                </div>
                            </div>
                        </div>

                        {/* Opacity Slider */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex justify-between items-center">
                                <span>Coverage Opacity</span>
                                <span className="font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                                    {Math.round((settings.coverageOpacity || 0.3) * 100)}%
                                </span>
                            </label>
                            <div className="relative mt-1.5">
                                <input
                                    type="range" min="0.05" max="1.0" step="0.01"
                                    value={settings.coverageOpacity || 0.3}
                                    onChange={e => setSettings({ ...settings, coverageOpacity: parseFloat(e.target.value) })}
                                    className="w-full cursor-pointer accent-blue-600"
                                    style={{ height: '4px' }}
                                />
                                <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                                    <span>5%</span><span>Solid</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1.5 bg-blue-50 rounded-lg p-2 border border-blue-100">
                                <p className="font-bold text-blue-700 text-[10px] border-b border-blue-200 pb-1">FTTH</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Radius (m)</span>
                                    <input type="number" className="w-14 p-0.5 border rounded text-[10px] text-center bg-white" value={settings.ftthRadius} onChange={e => setSettings({ ...settings, ftthRadius: parseInt(e.target.value) })} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Node</span>
                                    <div className="flex items-center gap-1">
                                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: settings.ftthNodeColor }} />
                                        <input type="color" className="w-5 h-5 p-0 border-0 rounded overflow-hidden cursor-pointer opacity-0 absolute" value={settings.ftthNodeColor} onChange={e => setSettings({ ...settings, ftthNodeColor: e.target.value })} />
                                        <input type="color" className="w-5 h-5 cursor-pointer rounded" value={settings.ftthNodeColor} onChange={e => setSettings({ ...settings, ftthNodeColor: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Area</span>
                                    <input type="color" className="w-5 h-5 cursor-pointer rounded" value={settings.ftthRadiusColor} onChange={e => setSettings({ ...settings, ftthRadiusColor: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1.5 bg-orange-50 rounded-lg p-2 border border-orange-100">
                                <p className="font-bold text-orange-700 text-[10px] border-b border-orange-200 pb-1">HFC</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Radius (m)</span>
                                    <input type="number" className="w-14 p-0.5 border rounded text-[10px] text-center bg-white" value={settings.hfcRadius} onChange={e => setSettings({ ...settings, hfcRadius: parseInt(e.target.value) })} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Node</span>
                                    <input type="color" className="w-5 h-5 cursor-pointer rounded" value={settings.hfcNodeColor} onChange={e => setSettings({ ...settings, hfcNodeColor: e.target.value })} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Area</span>
                                    <input type="color" className="w-5 h-5 cursor-pointer rounded" value={settings.hfcRadiusColor} onChange={e => setSettings({ ...settings, hfcRadiusColor: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <Button size="sm" onClick={handleSaveSettings} className="w-full text-xs h-7 mt-2">💾 Save Settings</Button>
                    </div>
                )}

                {/* Address Search */}
                <form onSubmit={handleAddressSearch} className="mt-3 relative">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search address..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={searchAddress}
                                onChange={(e) => setSearchAddress(e.target.value)}
                            />
                        </div>
                        <Button type="submit" size="sm" disabled={isSearching} className="h-8">
                            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
                        </Button>
                    </div>
                </form>

                {/* Visibility Toggle */}
                <div className="mt-3 flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-xs font-medium text-gray-700">Coverage Radius</span>
                    <button
                        onClick={() => setShowRadius(!showRadius)}
                        className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            showRadius ? "bg-primary" : "bg-gray-200"
                        )}
                    >
                        <span className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            showRadius ? "translate-x-4" : "translate-x-0"
                        )} />
                    </button>
                </div>

                {/* Manual Check Tools */}
                <div className="mt-3 space-y-2 border-t pt-3 border-gray-100">
                    <p className="text-xs font-semibold text-gray-700">Check Location Coverage</p>

                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant={isPickingLocation ? 'primary' : 'outline'}
                            className={cn("flex-1 justify-center text-xs", isPickingLocation && "ring-2 ring-primary")}
                            onClick={() => {
                                setIsPickingLocation(!isPickingLocation);
                                setShowInputForm(false);
                                // Only reset if we're starting a new pick
                                if (!isPickingLocation) {
                                    setManualCheckPoint(null);
                                }
                            }}
                        >
                            📍 Pick on Map
                        </Button>
                        <Button
                            size="sm"
                            variant={showInputForm ? 'primary' : 'outline'}
                            className="flex-1 justify-center text-xs"
                            onClick={() => {
                                setShowInputForm(!showInputForm);
                                setIsPickingLocation(false);
                            }}
                        >
                            ⌨️ Input Lat/Long
                        </Button>
                    </div>

                    {/* Manual Input Form */}
                    {showInputForm && (
                        <form onSubmit={handleManualSubmit} className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2 mt-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Latitude</label>
                                    <input
                                        type="number" step="any"
                                        className="w-full text-xs p-1.5 border rounded"
                                        value={manualInput.lat}
                                        onChange={e => setManualInput({ ...manualInput, lat: e.target.value })}
                                        placeholder="-6.2..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Longitude</label>
                                    <input
                                        type="number" step="any"
                                        className="w-full text-xs p-1.5 border rounded"
                                        value={manualInput.lng}
                                        onChange={e => setManualInput({ ...manualInput, lng: e.target.value })}
                                        placeholder="106.8..."
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" size="sm" className="w-full">Check Coordinates</Button>
                        </form>
                    )}

                    {isPickingLocation && <p className="text-[10px] text-gray-500 text-center animate-pulse">Click anywhere on the map...</p>}
                </div>


                {/* Manual Check Result */}
                {manualCheckPoint && (
                    <div className={cn(
                        "mt-2 p-3 rounded-lg border flex flex-col items-center text-center animate-in fade-in zoom-in duration-300",
                        manualCheckPoint.coverageStatus === 'Covered' ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    )}>
                        {manualCheckPoint.coverageStatus === 'Covered' ? (
                            <CheckCircle className="w-8 h-8 text-green-600 mb-1" />
                        ) : (
                            <XCircle className="w-8 h-8 text-red-600 mb-1" />
                        )}
                        <h3 className={cn("font-bold text-lg", manualCheckPoint.coverageStatus === 'Covered' ? "text-green-700" : "text-red-700")}>
                            {manualCheckPoint.coverageStatus}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                            Distance to Node: <strong>{Math.round(manualCheckPoint.nearestDistance)} m</strong>
                        </p>
                        <div className="flex gap-2 mt-3 w-full">
                            <Button
                                size="sm"
                                className="flex-1 text-xs shadow-sm"
                                onClick={() => navigate('/prospect', { state: manualCheckPoint })}
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add to Prospect
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => {
                                    setManualCheckPoint(null);
                                    setIsPickingLocation(false);
                                }}
                            >
                                Clear
                            </Button>
                        </div>
                    </div>
                )}

                {/* Network Filter */}
                <div className="flex justify-center mb-2 mt-2">
                    <div className="flex space-x-1 bg-white p-1 rounded-lg border shadow-sm w-full">
                        {['All', 'FTTH', 'HFC'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={cn(
                                    "flex-1 px-2 py-1.5 rounded-md text-xs font-bold transition-all",
                                    typeFilter === type
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 bg-gray-50"
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                {!manualCheckPoint && !isLoading && (
                    <div className="grid grid-cols-2 gap-2 text-center border-t pt-4 mt-2">
                        <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                            <p className="text-lg font-bold text-green-600">{stats.covered}</p>
                            <p className="text-[10px] uppercase font-bold text-green-500">Existing Covered</p>
                        </div>
                        <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                            <p className="text-lg font-bold text-red-600">{stats.uncovered}</p>
                            <p className="text-[10px] uppercase font-bold text-red-500">Uncovered</p>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="text-center py-4 text-xs text-gray-500">Loading map data...</div>
                )}
            </div>

            {/* Map Area */}
            <div className="flex-1 bg-gray-100 z-0">
                <MapContainer center={mapCenter} zoom={13} className="h-full w-full" scrollWheelZoom={true}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Handle Map Click & Bounds */}
                    <MapEvents onMapClick={handleMapClick} isPicking={isPickingLocation} onBoundsChange={handleBoundsChange} />
                    <RecenterMap center={mapCenter} />

                    {/* Render Manual Check Marker */}
                    {manualCheckPoint && (
                        <Marker
                            position={[manualCheckPoint.lat, manualCheckPoint.lng]}
                            icon={customerIcon(manualCheckPoint.coverageStatus)}
                        >
                            <Popup offset={[0, -10]}>
                                <div className="text-center p-1">
                                    <p className="font-bold text-sm">Checked Location</p>
                                    <p className={cn(
                                        "text-xs font-bold uppercase mb-1",
                                        manualCheckPoint.coverageStatus === 'Covered' ? "text-green-600" : "text-red-600"
                                    )}>{manualCheckPoint.coverageStatus}</p>
                                    <p className="text-xs text-gray-500">{manualCheckPoint.lat.toFixed(5)}, {manualCheckPoint.lng.toFixed(5)}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Coverage Layer (Polygons & Radius) */}
                    {showRadius && (
                        <CoverageLayer
                            coveragePoints={coveragePoints}
                            settings={settings}
                            mapBounds={mapBounds}
                            createNodeIcon={createNodeIcon}
                            fixPolygon={fixPolygon}
                        />
                    )}

                    {analyzedCustomers.map((cust, idx) => (
                        <Marker key={`cust-${cust.id || idx}`} position={[cust.lat, cust.lng]} icon={customerIcon(cust.coverageStatus)}>
                            <Popup>
                                <div className="text-xs p-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn("w-2 h-2 rounded-full", cust.coverageStatus === 'Covered' ? "bg-green-500" : "bg-red-500")} />
                                        <strong className={cust.coverageStatus === 'Covered' ? "text-green-600" : "text-red-600"}>{cust.coverageStatus}</strong>
                                    </div>
                                    <p className="font-bold text-sm">{cust.name}</p>
                                    <p className="text-gray-500 mb-1">{cust.address}</p>
                                    {cust.nearestPoint ? (
                                        <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                            <p className="text-[10px] text-gray-400">Nearest Node:</p>
                                            <p className="font-medium text-gray-700">{cust.nearestPoint.siteId} - {cust.nearestPoint.ampli}</p>
                                            <p className="text-xs text-blue-600">
                                                Distance: {Math.round(cust.nearestDistance)} m
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">No node found.</p>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>


            {/* Legend Overlay */}
            <div className="absolute bottom-6 right-6 z-[400] bg-white p-3 rounded-lg shadow-md border border-gray-200 text-xs">
                <h4 className="font-bold mb-2 text-gray-700 border-b pb-1">Map Legend</h4>

                {/* Customer Status */}
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                    <span>Covered Customer</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
                    <span>Uncovered Customer</span>
                </div>

                {/* Network Nodes */}
                <div className="border-t pt-2 mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="relative w-4 h-4 flex items-center justify-center">
                            <div className="absolute top-0 left-0 w-full h-full rounded-full" style={{ backgroundColor: settings.ftthRadiusColor || '#22c55e', opacity: settings.coverageOpacity || 0.3 }}></div>
                            <div className="w-2 h-2 rounded-full relative z-10" style={{ backgroundColor: settings.ftthNodeColor || '#2563eb' }}></div>
                        </div>
                        <span>FTTH ({settings.ftthRadius}m)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-4 h-4 flex items-center justify-center">
                            <div className="absolute top-0 left-0 w-full h-full rounded-full" style={{ backgroundColor: settings.hfcRadiusColor || '#eab308', opacity: settings.coverageOpacity || 0.3 }}></div>
                            <div className="w-2 h-2 rounded-full relative z-10" style={{ backgroundColor: settings.hfcNodeColor || '#ea580c' }}></div>
                        </div>
                        <span>HFC ({settings.hfcRadius}m)</span>
                    </div>
                </div>

                {coveragePoints.some(p => p.polygonData && Array.isArray(p.polygonData) && p.polygonData.length > 0) && (
                    <div className="flex items-center gap-2 border-t pt-2 mt-2">
                        <div className="w-3 h-3 border-2 border-red-500 bg-red-500" style={{ borderRadius: '2px', opacity: settings.coverageOpacity || 0.3 }}></div>
                        <span>Coverage Area</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Coverage;
