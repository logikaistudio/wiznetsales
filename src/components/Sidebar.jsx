import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Trophy,
    Users,
    Map,
    Headphones,
    Database,
    ChevronDown,
    ChevronRight,
    User,
    Target,
    Box,
    Tag,
    MapPin,
    Bell,
    Shield,
    Settings,
    LogOut
} from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, canAccessRoute, logout } = useAuth();

    const [isMasterDataOpen, setIsMasterDataOpen] = useState(
        location.pathname.startsWith('/master-data')
    );
    const [appSettings, setAppSettings] = useState({ app_name: 'Netsales', app_description: 'ISP Sales Dashboard', app_logo: '' });

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                setAppSettings({
                    app_name: data.app_name || 'Netsales',
                    app_description: data.app_description || 'ISP Sales Dashboard',
                    app_logo: data.app_logo || ''
                });
            })
            .catch(err => console.error(err));
    }, []);

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Achievement', path: '/achievement', icon: Trophy },
        { name: 'Prospect Subscriber', path: '/prospect', icon: Users },
        { name: 'Coverage', path: '/coverage', icon: Map },
        { name: 'Omniflow', path: '/omniflow', icon: Headphones },
    ].filter(item => canAccessRoute(item.path));

    // Master Data only for Admin/Leader/Manager/SuperAdmin
    const showMasterData = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'leader' || user.role === 'manager');
    const showUserManagement = user && (user.role === 'admin' || user.role === 'super_admin');

    const masterDataItems = [
        { name: 'Person Incharge', path: '/master-data/person-incharge', icon: User },
        { name: 'Targets', path: '/master-data/targets', icon: Target },
        { name: 'Coverage Management', path: '/master-data/coverage-management', icon: MapPin },
        { name: 'Product Management', path: '/master-data/product-management', icon: Box },
        { name: 'Promo', path: '/master-data/promo', icon: Tag },
        { name: 'Hot News', path: '/master-data/hotnews', icon: Bell },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="hidden md:flex flex-col w-[280px] bg-[#011F5B] text-white h-full shadow-xl overflow-y-auto">
            <div className="p-6 flex flex-col items-center justify-center border-b border-white/10 shrink-0 text-center">
                {appSettings.app_logo ? (
                    <img src={appSettings.app_logo} alt="Logo" className="h-10 w-auto mb-3 object-contain" />
                ) : null}
                <h1 className="text-2xl font-bold tracking-wider">{appSettings.app_name}</h1>
                <span className="text-[10px] uppercase tracking-widest text-blue-200 mt-1">{appSettings.app_description}</span>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full mt-2 text-blue-100 capitalize">
                    {user?.role || 'Guest'}
                </span>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                            isActive
                                ? "bg-white/20 font-semibold shadow-md"
                                : "hover:bg-white/10 hover:translate-x-1"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        <span>{item.name}</span>
                    </NavLink>
                ))}

                {/* User Management - Separate Menu for Admin Only */}
                {showUserManagement && (
                    <>
                        <NavLink
                            to="/user-management"
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                                isActive
                                    ? "bg-white/20 font-semibold shadow-md"
                                    : "hover:bg-white/10 hover:translate-x-1"
                            )}
                        >
                            <Shield className="w-5 h-5" />
                            <span>User Management</span>
                        </NavLink>

                        <NavLink
                            to="/application-settings"
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                                isActive
                                    ? "bg-white/20 font-semibold shadow-md"
                                    : "hover:bg-white/10 hover:translate-x-1"
                            )}
                        >
                            <Settings className="w-5 h-5" />
                            <span>App Settings</span>
                        </NavLink>
                    </>
                )}

                {/* Master Data Group */}
                {showMasterData && (
                    <div>
                        <button
                            onClick={() => setIsMasterDataOpen(!isMasterDataOpen)}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-left hover:bg-white/10",
                                location.pathname.startsWith('/master-data') && "bg-white/10"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Database className="w-5 h-5" />
                                <span>Master Data</span>
                            </div>
                            {isMasterDataOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        {isMasterDataOpen && (
                            <div className="mt-2 space-y-1 ml-4 border-l border-white/20 pl-2">
                                {masterDataItems.map((subItem) => (
                                    <NavLink
                                        key={subItem.path}
                                        to={subItem.path}
                                        className={({ isActive }) => cn(
                                            "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm",
                                            isActive
                                                ? "bg-white/20 font-semibold text-white"
                                                : "text-white/80 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        <subItem.icon className="w-4 h-4" />
                                        <span>{subItem.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </nav>
            <div className="p-4 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-red-200 hover:bg-white/10 hover:text-red-100 transition-all duration-200"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                </button>
                <div className="mt-4 text-xs text-center text-white/50">
                    © 2026 Netsales - LogikAi
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
