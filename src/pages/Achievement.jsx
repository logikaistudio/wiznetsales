import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, MapPin, Users, Target, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const StatCard = ({ title, value, subtitle, icon: Icon, color = "primary" }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
        <div className="flex items-center justify-between mb-4">
            <div className={cn("p-3 rounded-xl", `bg-${color}/10 text-${color}`)}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
    </motion.div>
);

const ProgressBar = ({ percentage, color = "primary" }) => {
    const getColor = () => {
        if (percentage >= 100) return 'bg-green-500';
        if (percentage >= 75) return 'bg-blue-500';
        if (percentage >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
                className={cn("h-2.5 rounded-full transition-all duration-500", getColor())}
                style={{ width: `${Math.min(percentage, 100)}%` }}
            />
        </div>
    );
};

const Achievement = () => {
    const [data, setData] = useState({
        summary: { totalTarget: 0, totalActual: 0, percentage: 0 },
        byCity: [],
        bySales: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [expandedSection, setExpandedSection] = useState('city'); // 'city' or 'sales'

    useEffect(() => {
        fetchAchievementData();
    }, []);

    const fetchAchievementData = async () => {
        try {
            const res = await fetch('/api/achievement');
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching achievement data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Achievement Tracking</h1>
                    <p className="text-gray-500 mt-1">Monitor sales performance and target achievement</p>
                </div>
                <Trophy className="w-12 h-12 text-yellow-500" />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Target"
                    value={isLoading ? '...' : data.summary.totalTarget.toLocaleString()}
                    subtitle="Cumulative target from all cities"
                    icon={Target}
                    color="blue"
                />
                <StatCard
                    title="Total Achieved"
                    value={isLoading ? '...' : data.summary.totalActual.toLocaleString()}
                    subtitle="Active subscribers"
                    icon={TrendingUp}
                    color="green"
                />
                <StatCard
                    title="Achievement Rate"
                    value={isLoading ? '...' : `${data.summary.percentage.toFixed(1)}%`}
                    subtitle={`${data.summary.totalActual} of ${data.summary.totalTarget}`}
                    icon={Award}
                    color="yellow"
                />
            </div>

            {/* Overall Progress */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Overall Progress</h2>
                    <span className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        data.summary.percentage >= 100 ? "bg-green-100 text-green-700" :
                            data.summary.percentage >= 75 ? "bg-blue-100 text-blue-700" :
                                data.summary.percentage >= 50 ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                    )}>
                        {data.summary.percentage.toFixed(1)}%
                    </span>
                </div>
                <ProgressBar percentage={data.summary.percentage} />
            </motion.div>

            {/* Achievement by City */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
                <div
                    className="p-6 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedSection(expandedSection === 'city' ? null : 'city')}
                >
                    <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-gray-800">Achievement by City</h2>
                        <span className="text-sm text-gray-500">({data.byCity.length} cities)</span>
                    </div>
                    {expandedSection === 'city' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>

                {expandedSection === 'city' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">City</th>
                                    <th className="px-6 py-4">Province</th>
                                    <th className="px-6 py-4 text-right">Target</th>
                                    <th className="px-6 py-4 text-right">Actual</th>
                                    <th className="px-6 py-4">Progress</th>
                                    <th className="px-6 py-4 text-right">Achievement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.byCity.length > 0 ? data.byCity.map((city, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{city.cityName}</td>
                                        <td className="px-6 py-4 text-gray-600">{city.province}</td>
                                        <td className="px-6 py-4 text-right text-gray-900 font-medium">{city.target.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right text-gray-900 font-medium">{city.actual.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="w-32">
                                                <ProgressBar percentage={city.percentage} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-medium",
                                                city.percentage >= 100 ? "bg-green-100 text-green-700" :
                                                    city.percentage >= 75 ? "bg-blue-100 text-blue-700" :
                                                        city.percentage >= 50 ? "bg-yellow-100 text-yellow-700" :
                                                            "bg-red-100 text-red-700"
                                            )}>
                                                {city.percentage.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            No city data available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>

            {/* Achievement by Sales */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
                <div
                    className="p-6 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedSection(expandedSection === 'sales' ? null : 'sales')}
                >
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-gray-800">Achievement by Sales Person</h2>
                        <span className="text-sm text-gray-500">({data.bySales.length} sales)</span>
                    </div>
                    {expandedSection === 'sales' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>

                {expandedSection === 'sales' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Sales Person</th>
                                    <th className="px-6 py-4">Area</th>
                                    <th className="px-6 py-4 text-right">Active Customers</th>
                                    <th className="px-6 py-4">Rank</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.bySales.length > 0 ? data.bySales.map((sales, idx) => (
                                    <tr key={sales.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{sales.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{sales.area || '-'}</td>
                                        <td className="px-6 py-4 text-right text-gray-900 font-medium">{sales.actual.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-medium",
                                                idx === 0 ? "bg-yellow-100 text-yellow-700" :
                                                    idx === 1 ? "bg-gray-200 text-gray-700" :
                                                        idx === 2 ? "bg-orange-100 text-orange-700" :
                                                            "bg-blue-100 text-blue-700"
                                            )}>
                                                #{idx + 1}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                            No sales data available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Achievement;
