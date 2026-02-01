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
    Menu,
    X,
    User,
    Target,
    MapPin,
    Box,
    Tag,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const MobileNav = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const [isMasterDataOpen, setIsMasterDataOpen] = useState(false);

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
    ];

    const sidebarBg = "#011F5B"; // Updated Brand Color

    return (
        <div className="md:hidden">
            {/* Mobile Top Bar */}
            <div className="flex items-center justify-between p-4 bg-white shadow-sm border-b border-gray-100 dark:bg-gray-900 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">N</div>
                    <span className="font-bold text-gray-800 dark:text-white">Netsales</span>
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Overlay & Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 z-50 w-64 h-full shadow-2xl"
                            style={{ backgroundColor: sidebarBg }}
                        >
                            <div className="flex flex-col h-full text-white">
                                <div className="p-6 flex items-center justify-between border-b border-white/10">
                                    <div>
                                        <h1 className="text-2xl font-bold tracking-wider">Netsales</h1>
                                        <p className="text-[10px] uppercase tracking-widest text-blue-200 mt-1">ISP Sales Dashboard</p>
                                    </div>
                                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                                    {navItems.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setIsOpen(false)}
                                            className={({ isActive }) => cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                                isActive
                                                    ? "bg-white/20 font-semibold shadow-md"
                                                    : "hover:bg-white/10"
                                            )}
                                        >
                                            <item.icon className="w-5 h-5" />
                                            <span>{item.name}</span>
                                        </NavLink>
                                    ))}

                                    {/* Master Data Group Mobile */}
                                    <div>
                                        <button
                                            onClick={() => setIsMasterDataOpen(!isMasterDataOpen)}
                                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-left hover:bg-white/10"
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
                                                        onClick={() => setIsOpen(false)}
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

                                <div className="p-4 border-t border-white/10 text-sm text-center text-white/60">
                                    v1.0.0
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MobileNav;
