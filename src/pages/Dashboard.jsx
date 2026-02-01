import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import {
    TrendingUp,
    Users,
    Target,
    Award,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

const data = [
    { name: 'Mon', sales: 40, prospects: 240 },
    { name: 'Tue', sales: 30, prospects: 139 },
    { name: 'Wed', sales: 20, prospects: 980 },
    { name: 'Thu', sales: 27, prospects: 390 },
    { name: 'Fri', sales: 18, prospects: 480 },
    { name: 'Sat', sales: 23, prospects: 380 },
    { name: 'Sun', sales: 34, prospects: 430 },
];

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
            <div className={cn(
                "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
                trend === 'up' ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
            )}>
                {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {change}
            </div>
        </div>
        <div className="relative">
            <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
            <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
    </motion.div>
);

const Dashboard = () => {
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
                    title="Total Sales"
                    value="Rp 128.5M"
                    change="+12.5%"
                    trend="up"
                    icon={TrendingUp}
                />
                <StatCard
                    title="New Subscribers"
                    value="482"
                    change="+8.2%"
                    trend="up"
                    icon={Users}
                />
                <StatCard
                    title="Conversion Rate"
                    value="24.8%"
                    change="-2.1%"
                    trend="down"
                    icon={Target}
                />
                <StatCard
                    title="Achievement"
                    value="92%"
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
                        <select className="bg-gray-50 border-none text-sm text-gray-500 rounded-lg p-2 outline-none">
                            <option>This Week</option>
                            <option>Last Week</option>
                            <option>This Month</option>
                        </select>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
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

                {/* Side Chart/List */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Recent Activities</h2>
                    <div className="space-y-6">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-bold">
                                    JS
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-gray-800">New subscriber added</h4>
                                    <p className="text-xs text-gray-500">2 minutes ago</p>
                                </div>
                                <span className="text-xs font-medium text-emerald-600">+Rp 350k</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
