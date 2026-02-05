
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage on mount
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const hasPermission = (permission) => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'leader') return true;

        // Define simple permissions map based on roles
        const permissions = {
            'sales': ['view_dashboard', 'view_coverage', 'view_achievement', 'manage_prospects'],
            'user': ['view_dashboard']
        };

        const userPerms = permissions[user.role] || [];
        return userPerms.includes(permission);
    };

    // Specific check for access logic
    const canAccessRoute = (path) => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'leader') return true;

        if (user.role === 'sales') {
            const allowed = ['/', '/achievement', '/coverage', '/prospect'];
            // Allow exact match or sub-paths if logic dictates, here we use precise paths mostly
            return allowed.includes(path);
        }

        return path === '/';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, hasPermission, canAccessRoute, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
