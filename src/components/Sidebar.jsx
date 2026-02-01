import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
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
    Bell
} from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();
    const [isMasterDataOpen, setIsMasterDataOpen] = useState(
        location.pathname.startsWith('/master-data')
    );

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Achievement', path: '/achievement', icon: Trophy },
        { name: 'Prospect Subscriber', path: '/prospect', icon: Users },
        { name: 'Coverage', path: '/coverage', icon: Map },
        { name: 'Omniflow', path: '/omniflow', icon: Headphones },
    ];

    const masterDataItems = [
        { name: 'Person Incharge', path: '/master-data/person-incharge', icon: User },
        { name: 'Targets', path: '/master-data/targets', icon: Target },
        { name: 'Coverage Management', path: '/master-data/coverage-management', icon: MapPin },
        { name: 'Product Management', path: '/master-data/product-management', icon: Box },
        { name: 'Promo', path: '/master-data/promo', icon: Tag },
        { name: 'Hot News', path: '/master-data/hotnews', icon: Bell },
    ];

    return (
        <aside className="hidden md:flex flex-col w-[280px] bg-[#011F5B] text-white h-full shadow-xl overflow-y-auto">
            <div className="p-6 flex items-center justify-center border-b border-white/10 shrink-0">
                <img src="/wiznet_logo.png" alt="Wiznet" className="h-10 w-auto object-contain" />
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

                {/* Master Data Group */}
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

            </nav>
            <div className="p-4 border-t border-white/10 text-sm text-center text-white/60 shrink-0">
                © 2026 Netsales - LogikAi
            </div>
        </aside>
    );
};

export default Sidebar;
