import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvents, useMap } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { Map as MapIcon, Search, Navigation, Info, Loader2, CheckCircle, XCircle, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import Button from '../components/ui/Button';
import 'leaflet/dist/leaflet.css';
import useDebounce from '../hooks/useDebounce';

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
    const borderRadius = isFTTH ? '0px' : '50%'; // Square for FTTH, circle for HFC

    return divIcon({
        className: 'custom-node-marker',
        html: `<div style="background-color:${nodeColor};width:12px;height:12px;border-radius:${borderRadius};border:1px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.4);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
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

const Coverage = () => {
    const navigate = useNavigate();
    const [coveragePoints, setCoveragePoints] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [analyzedCustomers, setAnalyzedCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ covered: 0, uncovered: 0, total: 0 });
    const [mapBounds, setMapBounds] = useState(null);
    const debouncedBounds = useDebounce(mapBounds, 500);
    const [typeFilter, setTypeFilter] = useState('All');

    // Settings state - same as Coverage Management
    const [settings, setSettings] = useState({
        coverageRadius: 50,
        coverageColor: '#22c55e',
        ftthNodeColor: '#2563eb',
        hfcNodeColor: '#ea580c',
        ftthRadiusColor: '#22c55e',
        hfcRadiusColor: '#eab308',
        ftthRadius: 50,
        hfcRadius: 50
    });

    // Manual Check State
    const [isPickingLocation, setIsPickingLocation] = useState(false);
    const [manualCheckPoint, setManualCheckPoint] = useState(null);

    // Manual Input State
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
                    ftthRadiusColor: data.ftthRadiusColor || '#22c55e',
                    hfcRadiusColor: data.hfcRadiusColor || '#eab308',
                    ftthRadius: parseInt(data.ftthRadius) || 50,
                    hfcRadius: parseInt(data.hfcRadius) || 50,
                    coverageOpacity: parseFloat(data.coverageOpacity) || 0.3
                });
            } catch (err) {
                console.error('Failed to load settings', err);
            }
        };
        fetchSettings();
    }, []);

    // Fetch Data
    // Fetch Customers (On Mount)
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const resCust = await fetch('/api/customers');
                const customersLinks = await resCust.json();
                setCustomers(customersLinks);
            } catch (err) {
                console.error("Failed to load customers", err);
            }
        };
        fetchCustomers();
    }, []);

    // Fetch Coverage Data (BBOX + Filter)
    useEffect(() => {
        const loadCoverage = async () => {
            // If bounds are not yet ready, we skip (map initializes quickly)
            if (!debouncedBounds) return;

            setIsLoading(true);
            try {
                const { _southWest, _northEast } = debouncedBounds;
                const params = new URLSearchParams({
                    minLat: _southWest.lat, maxLat: _northEast.lat,
                    minLng: _southWest.lng, maxLng: _northEast.lng,
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
    }, [debouncedBounds, typeFilter]);

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
            const coverageRadius = nearestPoint?.networkType === 'FTTH'
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
        const coverageRadius = nearestPoint?.networkType === 'FTTH'
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

    const mapCenter = useMemo(() => {
        if (manualCheckPoint) return [manualCheckPoint.lat, manualCheckPoint.lng];
        if (analyzedCustomers.length > 0) return [analyzedCustomers[0].lat, analyzedCustomers[0].lng];
        if (coveragePoints.length > 0 && coveragePoints[0].ampliLat) return [coveragePoints[0].ampliLat, coveragePoints[0].ampliLong];
        return CONSTANTS.DEFAULT_CENTER;
    }, [analyzedCustomers, coveragePoints, manualCheckPoint]);

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col relative">
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-[400] bg-white p-4 rounded-xl shadow-lg border border-gray-100 max-w-sm w-full">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <MapIcon className="w-5 h-5 text-primary" /> Coverage Check
                </h1>
                <p className="text-xs text-gray-500 mb-3">
                    Visualizing customer locations (FTTH: {settings.ftthRadius}m, HFC: {settings.hfcRadius}m radius).
                </p>

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
                    <MapEvents onMapClick={handleMapClick} isPicking={isPickingLocation} onBoundsChange={setMapBounds} />

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

                    {/* Render Coverage Points (Network Nodes) - Optimized */}
                    {(() => {
                        const polygons = [];
                        const points = [];

                        coveragePoints.forEach(point => {
                            if (point.polygonData && Array.isArray(point.polygonData) && point.polygonData.length > 0) {
                                polygons.push(point);
                            } else if ((point.ampliLat || point.ampliLat === 0) && (point.ampliLong || point.ampliLong === 0)) {
                                if (mapBounds) {
                                    if (mapBounds.contains([point.ampliLat, point.ampliLong])) {
                                        points.push(point);
                                    }
                                } else {
                                    // Fallback
                                    if (points.length < 1000) points.push(point);
                                }
                            }
                        });

                        const renderedPoints = points.slice(0, 2000);
                        const renderList = [...polygons, ...renderedPoints];

                        return renderList.map((point, idx) => {
                            // If point has polygon data, render as Polygon
                            if (point.polygonData && Array.isArray(point.polygonData) && point.polygonData.length > 0) {
                                return (
                                    <Polygon
                                        key={`cov-poly-${point.id || idx}`}
                                        positions={fixPolygon(point.polygonData)}
                                        pathOptions={{
                                            fillColor: '#ef4444',
                                            color: '#ef4444',
                                            weight: 2,
                                            opacity: 0.8,
                                            fillOpacity: 0.15
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

                            // Default: render as Circle with marker
                            const isFTTH = point.networkType === 'FTTH';
                            const radiusColor = isFTTH ? (settings.ftthRadiusColor || '#22c55e') : (settings.hfcRadiusColor || '#eab308');
                            const radius = isFTTH ? (settings.ftthRadius || 50) : (settings.hfcRadius || 50);

                            return (
                                <>
                                    <Circle
                                        key={`cov-circle-${point.id || idx}`}
                                        center={[point.ampliLat, point.ampliLong]}
                                        pathOptions={{
                                            fillColor: radiusColor,
                                            color: radiusColor,
                                            weight: 1,
                                            opacity: settings.coverageOpacity || 0.3,
                                            fillOpacity: (settings.coverageOpacity || 0.3) * 0.5 // Keep fill slightly more transparent than stroke
                                        }}
                                        radius={radius}
                                    />
                                    <Marker
                                        key={`cov-marker-${point.id || idx}`}
                                        position={[point.ampliLat, point.ampliLong]}
                                        icon={createNodeIcon(point.networkType, settings)}
                                    >
                                        <Popup>
                                            <div className="text-xs font-sans space-y-1 min-w-[150px]">
                                                <div className="flex items-center gap-2 border-b pb-1 mb-1">
                                                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", isFTTH ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700")}>
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
                                </>
                            );
                        });
                    })()}

                    {/* Render Customer Points */}
                    {analyzedCustomers.map((cust, idx) => (
                        <Marker
                            key={`cust-${cust.id || idx}`}
                            position={[cust.lat, cust.lng]}
                            icon={customerIcon(cust.coverageStatus)}
                        >
                            <Popup>
                                <div className="text-xs font-sans p-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "w-2 h-2 rounded-full",
                                            cust.coverageStatus === 'Covered' ? "bg-green-500" : "bg-red-500"
                                        )} />
                                        <strong className={cn(cust.coverageStatus === 'Covered' ? "text-green-600" : "text-red-600")}>
                                            {cust.coverageStatus}
                                        </strong>
                                    </div>
                                    <p className="font-bold text-sm text-gray-800">{cust.name}</p>
                                    <p className="text-gray-500 mb-2">{cust.address}</p>

                                    <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                        <p className="text-[10px] text-gray-400 uppercase">Nearest Node</p>
                                        {cust.nearestPoint ? (
                                            <>
                                                <p className="font-medium text-gray-700">{cust.nearestPoint.siteId} - {cust.nearestPoint.ampli}</p>
                                                <p className="text-xs text-blue-600">
                                                    Distance: {Math.round(cust.nearestDistance)} m
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-gray-500 italic">No node found.</p>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                </MapContainer>
            </div>

            {/* Legend */}
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
                        <div className="w-3 h-3 border border-white shadow-sm" style={{ backgroundColor: settings.ftthNodeColor || '#2563eb', borderRadius: '0px' }}></div>
                        <span>FTTH Node ({settings.ftthRadius}m)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-white shadow-sm" style={{ backgroundColor: settings.hfcNodeColor || '#ea580c', borderRadius: '50%' }}></div>
                        <span>HFC Node ({settings.hfcRadius}m)</span>
                    </div>
                </div>

                {coveragePoints.some(p => p.polygonData && Array.isArray(p.polygonData) && p.polygonData.length > 0) && (
                    <div className="flex items-center gap-2 border-t pt-2 mt-2">
                        <div className="w-3 h-3 border-2 border-red-500 bg-red-500/20" style={{ borderRadius: '2px' }}></div>
                        <span>Coverage Area</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Coverage;
