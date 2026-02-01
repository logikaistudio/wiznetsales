import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { Map as MapIcon, Search, Navigation, Info, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import Button from '../components/ui/Button';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// Icons
const anchorIcon = divIcon({
    className: 'custom-anchor',
    html: `<div style="background-color:#0ea5e9;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [12, 12], iconAnchor: [6, 6]
});

const customerIcon = (status) => divIcon({
    className: 'customer-marker',
    html: `<div style="background-color:${status === 'Covered' ? '#22c55e' : '#ef4444'};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10]
});

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
    COVERAGE_RADIUS_METERS: 300, // Distance to consider "Covered"
    DEFAULT_CENTER: [-6.2088, 106.8456] // Jakarta
};

const Coverage = () => {
    const [coveragePoints, setCoveragePoints] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [analyzedCustomers, setAnalyzedCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ covered: 0, uncovered: 0, total: 0 });

    // Fetch Data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch Coverage Points
                // Note: Fetching all might be heavy. Ideally backend should do bounds query.
                // For demo/prototype, we fetch max 1000 or implement pagination loop if needed.
                const resCov = await fetch('/api/coverage?limit=1000');
                const jsonCov = await resCov.json();
                const points = jsonCov.data || [];
                setCoveragePoints(points);

                // Fetch Customers
                const resCust = await fetch('/api/customers');
                const customersLinks = await resCust.json();
                setCustomers(customersLinks);

            } catch (err) {
                console.error("Failed to load map data", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Analyze Coverage Logic
    useEffect(() => {
        if (coveragePoints.length === 0 || customers.length === 0) return;

        // Simple Nearest Neighbor Analysis
        // Warning: O(N*M) complexity. If data > 1000, this will freeze UI.
        // Optimization: In real app, use spatial index (RBush/Quadtree).

        let coveredCount = 0;

        const analyzed = customers.map(cust => {
            // Parse Lat/Long from customer data if available (Assuming key names)
            // If customer has no coords, we skip map render or try to geocode (omitted for now)
            const lat = parseFloat(cust.latitude || cust.lat);
            const lng = parseFloat(cust.longitude || cust.long || cust.lng);

            if (isNaN(lat) || isNaN(lng)) return { ...cust, hasCoords: false };

            // Find closest coverage point
            let minDist = Infinity;
            let nearestPoint = null;

            for (const point of coveragePoints) {
                // Use ampliLat/ampliLong
                const d = getDistance(lat, lng, point.ampliLat, point.ampliLong);
                if (d < minDist) {
                    minDist = d;
                    nearestPoint = point;
                }
            }

            const isCovered = minDist <= CONSTANTS.COVERAGE_RADIUS_METERS;
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

    }, [coveragePoints, customers]);

    const mapCenter = useMemo(() => {
        if (analyzedCustomers.length > 0) return [analyzedCustomers[0].lat, analyzedCustomers[0].lng];
        if (coveragePoints.length > 0 && coveragePoints[0].ampliLat) return [coveragePoints[0].ampliLat, coveragePoints[0].ampliLong];
        return CONSTANTS.DEFAULT_CENTER;
    }, [analyzedCustomers, coveragePoints]);

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col relative">
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-[400] bg-white p-4 rounded-xl shadow-lg border border-gray-100 max-w-sm">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <MapIcon className="w-5 h-5 text-primary" /> Coverage Check
                </h1>
                <p className="text-xs text-gray-500 mb-3">
                    Visualizing customer locations against network coverage points ({CONSTANTS.COVERAGE_RADIUS_METERS}m radius).
                </p>

                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing geospatial data...
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                            <p className="text-lg font-bold text-green-600">{stats.covered}</p>
                            <p className="text-[10px] uppercase font-bold text-green-500">In Coverage</p>
                        </div>
                        <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                            <p className="text-lg font-bold text-red-600">{stats.uncovered}</p>
                            <p className="text-[10px] uppercase font-bold text-red-500">Uncovered</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Map Area */}
            <div className="flex-1 bg-gray-100 z-0">
                <MapContainer center={mapCenter} zoom={13} className="h-full w-full" scrollWheelZoom={true}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Render Coverage Points (Network Nodes) */}
                    {coveragePoints.filter(p => p.ampliLat).map((point, idx) => (
                        <Circle
                            key={`cov-${point.id || idx}`}
                            center={[point.ampliLat, point.ampliLong]}
                            pathOptions={{ fillColor: '#0ea5e9', color: '#0ea5e9', weight: 1, opacity: 0.3, fillOpacity: 0.1 }}
                            radius={CONSTANTS.COVERAGE_RADIUS_METERS}
                        >
                            <Marker position={[point.ampliLat, point.ampliLong]} icon={anchorIcon}>
                                <Popup>
                                    <div className="text-xs font-sans">
                                        <p className="font-bold">{point.siteId}</p>
                                        <p>{point.ampli}</p>
                                        <p className="text-gray-500">{point.networkType} Node</p>
                                    </div>
                                </Popup>
                            </Marker>
                        </Circle>
                    ))}

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
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                    <span>Customer Covered</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
                    <span>Out of Coverage</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-sky-500 border-2 border-white shadow-sm"></div>
                    <span>Network Node</span>
                </div>
            </div>
        </div>
    );
};

export default Coverage;
