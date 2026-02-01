import React, { useState, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    TrendingUp,
    Users,
    MapPin,
    Award,
    ArrowUpRight,
    Bell,
    Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, change, icon: Icon, trend }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between mb-4 relative">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Icon className="w-6 h-6" />
            </div>
            {change && (
                <div className={cn(
                    "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
                    trend === 'up' ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                )}>
                    {trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                    {change}
                </div>
            )}
        </div>
        <div className="relative">
            <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
            <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
    </motion.div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        activeHomepass: 0,
        totalCities: 0,
        achievement: 0,
        monthlySales: []
    });
    const [hotNews, setHotNews] = useState([]);
    const [chartPeriod, setChartPeriod] = useState('year'); // 'year' or 'month'
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        fetchHotNews();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/dashboard/stats');
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHotNews = async () => {
        try {
            const res = await fetch('/api/hotnews');
            const data = await res.json();
            if (Array.isArray(data)) setHotNews(data.slice(0, 5)); // Max 5 items
        } catch (error) {
            console.error('Error fetching hot news:', error);
        }
    };

    // Transform monthly sales data for chart
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = monthNames.map((name, index) => {
        const monthData = stats.monthlySales.find(m => parseInt(m.month) === index + 1);
        return {
            name,
            sales: monthData ? parseInt(monthData.count) : 0
        };
    });

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 mt-1">Overview of sales performance</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border shadow-sm">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Active Homepass"
                    value={isLoading ? '...' : stats.activeHomepass.toLocaleString()}
                    icon={TrendingUp}
                />
                <StatCard
                    title="New Subscribers"
                    value={isLoading ? '...' : stats.monthlySales.reduce((sum, m) => sum + parseInt(m.count || 0), 0).toLocaleString()}
                    change="+8.2%"
                    trend="up"
                    icon={Users}
                />
                <StatCard
                    title="Total Cities"
                    value={isLoading ? '...' : stats.totalCities.toLocaleString()}
                    icon={MapPin}
                />
                <StatCard
                    title="Achievement"
                    value={isLoading ? '...' : stats.achievement.toLocaleString()}
                    change="+4.5%"
                    trend="up"
                    icon={Award}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Sales Analytics</h2>
                        <select
                            className="bg-gray-50 border-none text-sm text-gray-500 rounded-lg p-2 outline-none cursor-pointer"
                            value={chartPeriod}
                            onChange={(e) => setChartPeriod(e.target.value)}
                        >
                            <option value="year">This Year (Jan-Dec)</option>
                            <option value="month">This Month (Daily)</option>
                        </select>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#317873" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#317873" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#317873' }}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#317873" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Hot News Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <Bell className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-gray-800">Hot News</h2>
                    </div>
                    <div className="space-y-4">
                        {hotNews.length > 0 ? hotNews.map((news) => (
                            <div key={news.id} className="border-l-4 border-primary pl-4 py-2 hover:bg-gray-50 transition-colors rounded-r">
                                <h4 className="text-sm font-semibold text-gray-800 mb-1">{news.title}</h4>
                                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{news.content}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(news.startDate).toLocaleDateString()}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>No announcements at the moment</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
