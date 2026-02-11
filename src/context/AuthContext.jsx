import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes in milliseconds

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const timeoutRef = useRef(null);

    const logout = useCallback(() => {
        setUser(null);
        // localStorage.removeItem('user'); // No longer using storage
        // localStorage.removeItem('lastActive');
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    // Reset inactivity timer
    const resetInactivityTimer = useCallback(() => {
        // Store last active timestamp (in memory or storage if we wanted persistence, but we don't)
        // localStorage.setItem('lastActive', Date.now().toString()); 

        // Clear existing timer
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timer
        timeoutRef.current = setTimeout(() => {
            alert('Sesi Anda telah berakhir karena tidak ada aktivitas selama 20 menit. Silakan login kembali.');
            logout();
        }, SESSION_TIMEOUT_MS);
    }, [logout]);

    // Track user activity
    useEffect(() => {
        if (!user) return;

        // Debounce activity handler slightly to avoid excessive calls if functionality was heavy, 
        // but for simple reset it's fine. 
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

        const handleActivity = () => {
            resetInactivityTimer();
        };

        // Attach event listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Start initial timer
        resetInactivityTimer();

        return () => {
            // Cleanup
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [user, resetInactivityTimer]);

    // Validate session on mount
    useEffect(() => {
        // Requirement: Logout on refresh. 
        // We simply do NOT restore from localStorage.
        // User starts as null (logged out).
        setLoading(false);

        /* 
        // Previous persistence logic disabled:
        const validateSession = async () => {
             const storedUser = localStorage.getItem('user');
             // ... restoration logic ...
        };
        validateSession();
        */
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
                // We do NOT save to localStorage to ensure logout on refresh
                // localStorage.setItem('user', JSON.stringify(data.user));
                // localStorage.setItem('lastActive', Date.now().toString());
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    };

    const hasPermission = (permissionString) => {
        if (!user) return false;

        // Super Admin & Admin always have full access
        if (user.role === 'super_admin' || user.role === 'admin') return true;

        // If no dynamic permissions found, fallback to basic role check (backward compatibility)
        if (!user.role_permissions) {
            if (user.role === 'leader' || user.role === 'manager') return true; // Temporary fallback for legacy roles
            if (user.role === 'sales') {
                const allowed = ['dashboard:view', 'achievement:view', 'prospect_subscriber:view', 'coverage:view'];
                return allowed.includes(permissionString);
            }
            return false;
        }

        // Parse permission string "menu_id:action"
        const [menuId, action] = permissionString.split(':');

        // Check if menu exists in permissions
        if (!user.role_permissions[menuId]) return false;

        // Check specific action (e.g. view, create, edit)
        // If action is not specified, check if ANY permission exists for this menu
        if (!action) return true;

        return !!user.role_permissions[menuId][action];
    };

    const canAccessRoute = (path) => {
        if (!user) return false;

        // Super Admin & Admin always have full access
        if (user.role === 'super_admin' || user.role === 'admin') return true;

        // Route to Menu ID Mapping
        const routeMap = {
            '/': 'dashboard',
            '/achievement': 'achievement',
            '/prospect': 'prospect_subscriber',
            '/coverage': 'coverage',
            '/omniflow': 'omniflow',
            '/master-data/person-incharge': 'person_incharge',
            '/master-data/targets': 'targets',
            '/master-data/coverage-management': 'coverage_management',
            '/master-data/product-management': 'product_management',
            '/master-data/promo': 'promo',
            '/master-data/hotnews': 'hot_news',
            '/user-management': 'user_management',
            '/application-settings': 'application_settings'
        };

        const menuId = routeMap[path];

        // If path is not in map (public or unknown), allow access? Or deny?
        // Let's deny by default for secure approach, unless it's a known public route
        if (!menuId) return true; // Allow unmapped routes or handle them elsewhere

        return hasPermission(`${menuId}:view`);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, hasPermission, canAccessRoute, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
