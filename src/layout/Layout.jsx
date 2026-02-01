import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

const Layout = () => {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 flex-col md:flex-row">
            <Sidebar />
            <MobileNav />
            <main className="flex-1 overflow-y-auto overflow-x-hidden w-full relative">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
