
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const validateSession = async () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    // Validate session with server
                    const res = await fetch('/api/me', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: userData.id })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.valid) {
                            setUser(data.user);
                            // Update localStorage with fresh data from server
                            localStorage.setItem('user', JSON.stringify(data.user));
                        } else {
                            // User no longer valid
                            localStorage.removeItem('user');
                            setUser(null);
                        }
                    } else {
                        // Server rejected - clear session
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                } catch (error) {
                    // Network error - keep stored user as fallback (offline support)
                    console.warn('Session validation failed (offline?):', error.message);
                    setUser(JSON.parse(storedUser));
                }
            }
            setLoading(false);
        };

        validateSession();
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
