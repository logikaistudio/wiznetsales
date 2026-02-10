import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 180 * 60 * 1000; // 180 minutes in milliseconds

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const timeoutRef = useRef(null);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('lastActive');
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    // Reset inactivity timer
    const resetInactivityTimer = useCallback(() => {
        // Store last active timestamp
        localStorage.setItem('lastActive', Date.now().toString());

        // Clear existing timer
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timer
        timeoutRef.current = setTimeout(() => {
            alert('Sesi Anda telah berakhir karena tidak ada aktivitas selama 180 menit. Silakan login kembali.');
            logout();
        }, SESSION_TIMEOUT_MS);
    }, [logout]);

    // Track user activity
    useEffect(() => {
        if (!user) return;

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
        const validateSession = async () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                // Check if session has expired based on last activity
                const lastActive = parseInt(localStorage.getItem('lastActive') || '0');
                if (lastActive > 0 && Date.now() - lastActive > SESSION_TIMEOUT_MS) {
                    // Session expired
                    localStorage.removeItem('user');
                    localStorage.removeItem('lastActive');
                    setUser(null);
                    setLoading(false);
                    return;
                }

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
                            localStorage.setItem('user', JSON.stringify(data.user));
                        } else {
                            localStorage.removeItem('user');
                            localStorage.removeItem('lastActive');
                            setUser(null);
                        }
                    } else {
                        localStorage.removeItem('user');
                        localStorage.removeItem('lastActive');
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
                localStorage.setItem('lastActive', Date.now().toString());
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    };

    const hasPermission = (permission) => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'leader') return true;

        const permissions = {
            'sales': ['view_dashboard', 'view_coverage', 'view_achievement', 'manage_prospects'],
            'user': ['view_dashboard']
        };

        const userPerms = permissions[user.role] || [];
        return userPerms.includes(permission);
    };

    const canAccessRoute = (path) => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'leader') return true;

        if (user.role === 'sales') {
            const allowed = ['/', '/achievement', '/coverage', '/prospect'];
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
