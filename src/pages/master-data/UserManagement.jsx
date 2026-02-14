import React, { useState, useEffect } from 'react';
import { User, Lock, Plus, Pencil, Trash2, Search, X, Save, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

// Menu definitions for permissions
const MENUS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'achievement', label: 'Achievement' },
    { id: 'prospect_subscriber', label: 'Prospect Subscriber' },
    { id: 'coverage', label: 'Coverage' },
    { id: 'omniflow', label: 'Omniflow' },
    { id: 'person_incharge', label: 'Person Incharge' },
    { id: 'targets', label: 'Targets' },
    { id: 'coverage_management', label: 'Coverage Management' },
    { id: 'product_management', label: 'Product Management' },
    { id: 'promo', label: 'Promo' },
    { id: 'hot_news', label: 'Hot News' },
    { id: 'user_management', label: 'User Management' },
    { id: 'application_settings', label: 'Application Settings' } // Added new menu
];

const ACTIONS = [
    { id: 'view', label: 'View' },
    { id: 'create', label: 'Add' },
    { id: 'edit', label: 'Edit' },
    { id: 'delete', label: 'Delete' },
    { id: 'import', label: 'Import' },
    { id: 'export', label: 'Export' }
];

const UserManagement = () => {
    const [isLoading, setIsLoading] = useState(false);

    // --- USERS STATE ---
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [userFormData, setUserFormData] = useState({
        username: '', email: '', password: '', fullName: '', role: 'user', isActive: true
    });
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isUserEditMode, setIsUserEditMode] = useState(false);
    const [viewingUserPermissions, setViewingUserPermissions] = useState(false);

    // --- ROLES STATE ---
    const [roles, setRoles] = useState([]);
    const [editingRole, setEditingRole] = useState(null);
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [roleFormData, setRoleFormData] = useState({
        name: '', description: '', permissions: {}, data_scope: 'all', allowed_clusters: [], allowed_provinces: []
    });

    // --- DATA SCOPE STATE ---
    const [clusters, setClusters] = useState([]);
    const [provinces, setProvinces] = useState([]);

    // --- DATA FETCHING ---
    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsers(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchRoles = async () => {
        try {
            const res = await fetch('/api/roles');
            if (res.ok) setRoles(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchDataScopes = async () => {
        try {
            const [clustersRes, provincesRes] = await Promise.all([
                fetch('/api/clusters'),
                fetch('/api/provinces')
            ]);
            if (clustersRes.ok) setClusters(await clustersRes.json());
            if (provincesRes.ok) setProvinces(await provincesRes.json());
        } catch (e) { console.error(e); }
    };

    const { user: currentUser } = useAuth(); // Import useAuth

    useEffect(() => {
        setIsLoading(true);
        Promise.all([fetchUsers(), fetchRoles(), fetchDataScopes()]).finally(() => setIsLoading(false));
    }, []);

    // Filter users based on role hierarchy
    const getVisibleUsers = () => {
        if (!currentUser) return [];
        if (currentUser.role === 'super_admin') return users;

        // Admin can see:
        // 1. Themselves
        // 2. Other Admins (read-only usually, but prompt says "seeing")
        // 3. Roles below (user, staff, etc)
        // Admin CANNOT see: super_admin

        return users.filter(u => u.role !== 'super_admin');
    };

    // Filter roles based on hierarchy
    const getVisibleRoles = () => {
        if (!currentUser) return [];
        if (currentUser.role === 'super_admin') return roles;

        // Admin cannot assign super_admin role
        return roles.filter(r => r.name !== 'super_admin');
    };

    // --- USER HANDLERS ---
    const handleOpenUserModal = (item = null) => {
        setEditingUser(item);
        if (item) {
            setUserFormData({ ...item, password: '', isActive: item.is_active });
            setIsUserEditMode(false);
            setViewingUserPermissions(true);
        } else {
            setUserFormData({ username: '', email: '', password: '', fullName: '', role: 'user', isActive: true });
            setIsUserEditMode(true);
            setViewingUserPermissions(false);
        }
        setUserModalOpen(true);
    };

    const saveUser = async (e) => {
        e.preventDefault();
        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';
            const payload = { ...userFormData };
            if (!payload.password) delete payload.password;

            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await response.json();

            if (!response.ok) {
                // Handle specific error messages from backend
                alert(data.error || 'Error saving user');
                return;
            }

            // Close modal first for better UX
            setUserModalOpen(false);

            // Refresh user list
            await fetchUsers();

            alert('User saved successfully!');
        } catch (e) {
            console.error('Error saving user:', e);
            alert('Error saving user: ' + e.message);
        }
    };

    const deleteUser = async (id) => {
        if (!confirm('Delete user?')) return;
        try {
            await fetch(`/api/users/${id}`, { method: 'DELETE' });
            fetchUsers();
            setUserModalOpen(false);
        } catch (e) { alert('Error deleting user'); }
    };

    // --- ROLE HANDLERS ---
    const handleOpenRoleModal = (role = null) => {
        setEditingRole(role);

        // Helper to parse JSON fields safely
        const safeJSON = (val, defaultVal) => {
            if (!val) return defaultVal;
            if (typeof val === 'object') return val;
            try { return JSON.parse(val); } catch (e) { return defaultVal; }
        };

        if (role) {
            setRoleFormData({
                name: role.name,
                description: role.description || '',
                permissions: safeJSON(role.permissions, {}),
                data_scope: role.data_scope || 'all',
                allowed_clusters: safeJSON(role.allowed_clusters, []),
                allowed_provinces: safeJSON(role.allowed_provinces, [])
            });
        } else {
            setRoleFormData({
                name: '',
                description: '',
                permissions: {}, // Structure: { 'menu_id': { view: true, create: false, ... } }
                data_scope: 'all',
                allowed_clusters: [],
                allowed_provinces: []
            });
        }
        setRoleModalOpen(true);
    };

    const togglePermission = (menuId, actionId) => {
        setRoleFormData(prev => {
            const currentPerms = { ...prev.permissions };
            if (!currentPerms[menuId]) {
                currentPerms[menuId] = {};
            }
            // Toggle boolean
            currentPerms[menuId][actionId] = !currentPerms[menuId][actionId];
            return { ...prev, permissions: currentPerms };
        });
    };

    const toggleAllRow = (menuId, checked) => {
        setRoleFormData(prev => {
            const currentPerms = { ...prev.permissions };
            currentPerms[menuId] = {};
            if (checked) {
                ACTIONS.forEach(a => currentPerms[menuId][a.id] = true);
            }
            return { ...prev, permissions: currentPerms };
        });
    }

    const toggleArrayItem = (field, value) => {
        setRoleFormData(prev => {
            const current = inputToArray(prev[field]);
            if (current.includes(value)) {
                return { ...prev, [field]: current.filter(item => item !== value) };
            } else {
                return { ...prev, [field]: [...current, value] };
            }
        });
    };

    // Helper helper
    const inputToArray = (val) => Array.isArray(val) ? val : [];

    const saveRole = async (e) => {
        e.preventDefault();
        try {
            const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
            const method = editingRole ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roleFormData)
            });

            await fetchRoles();
            setRoleModalOpen(false);
            alert('Role saved!');
        } catch (e) {
            alert('Error saving role');
            console.error(e);
        }
    };

    const deleteRole = async (id) => {
        if (!confirm('Delete this role? Users with this role will need to be reassigned.')) return;
        try {
            await fetch(`/api/roles/${id}`, { method: 'DELETE' });
            await fetchRoles();
            setRoleModalOpen(false);
            alert('Role deleted!');
        } catch (e) {
            alert('Error deleting role');
        }
    };

    // --- RENDER HELPERS ---
    const visibleUsers = getVisibleUsers();
    const filteredUsers = visibleUsers.filter(u =>
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">Manage users and role-based access control.</p>
                </div>
            </div>

            {/* SECTION 1: USER LOGIN TABLE */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        User Login List
                    </h2>
                    <Button onClick={() => handleOpenUserModal()}>
                        <Plus className="w-4 h-4 mr-2" /> Add User
                    </Button>
                </div>

                <div className="flex justify-between mb-4">
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">{u.username.substring(0, 2)}</div>
                                            <div>
                                                <div className="font-medium text-gray-900">{u.full_name}</div>
                                                <div className="text-xs text-gray-500">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs capitalize">{u.role}</span></td>
                                    <td className="px-6 py-4">
                                        {u.is_active
                                            ? <span className="text-green-600 flex items-center gap-1 text-xs font-medium"><CheckCircle className="w-3 h-3" /> Active</span>
                                            : <span className="text-red-500 flex items-center gap-1 text-xs font-medium"><XCircle className="w-3 h-3" /> Inactive</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenUserModal(u)}>Details</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 2: ROLE MANAGEMENT */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Role Management
                        </h2>
                        <p className="text-sm text-gray-500">Define granular permissions for each role.</p>
                    </div>
                    <Button onClick={() => handleOpenRoleModal()}>
                        <Plus className="w-4 h-4 mr-2" /> Add Role
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map(role => (
                        <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 capitalize">{role.name}</h3>
                                        <p className="text-sm text-gray-500">{role.description || 'No description'}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleOpenRoleModal(role)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => deleteRole(role.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-center text-gray-500">
                                    Click edit to view/modify detailed permissions
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* USER MODAL */}
            <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? (viewingUserPermissions ? 'User Details' : 'Edit User') : 'Add User'}>
                {viewingUserPermissions && editingUser ? (
                    <div className="space-y-6">
                        {/* User Info */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-500">Username:</span><span className="ml-2 font-medium">{userFormData.username}</span></div>
                                <div><span className="text-gray-500">Email:</span><span className="ml-2 font-medium">{userFormData.email}</span></div>
                                <div><span className="text-gray-500">Role:</span><span className="ml-2 font-medium capitalize">{userFormData.role}</span></div>
                                <div><span className="text-gray-500">Status:</span><span className={`ml-2 font-medium ${userFormData.isActive ? 'text-green-600' : 'text-red-600'}`}>{userFormData.isActive ? 'Active' : 'Inactive'}</span></div>
                            </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex justify-between border-t pt-4">
                            <Button type="button" variant="danger" onClick={() => deleteUser(editingUser.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete User</Button>
                            <Button type="button" onClick={() => { setViewingUserPermissions(false); setIsUserEditMode(true); }}><Pencil className="w-4 h-4 mr-2" /> Edit Info</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={saveUser} className="space-y-6">
                        <Input label="Full Name" value={userFormData.fullName} onChange={e => setUserFormData({ ...userFormData, fullName: e.target.value })} disabled={!isUserEditMode} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Username" value={userFormData.username} onChange={e => setUserFormData({ ...userFormData, username: e.target.value })} disabled={!isUserEditMode && editingUser} />
                            <Input label="Email" value={userFormData.email} onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} disabled={!isUserEditMode} />
                        </div>
                        {isUserEditMode && (
                            <Input label="Password" type="password" value={userFormData.password} onChange={e => setUserFormData({ ...userFormData, password: e.target.value })} placeholder={editingUser ? "Leave blank to keep current" : "Enter password"} />
                        )}
                        <Select label="Role" value={userFormData.role} onChange={e => setUserFormData({ ...userFormData, role: e.target.value })} options={getVisibleRoles().map(r => ({ value: r.name, label: r.name.toUpperCase() }))} disabled={!isUserEditMode} />

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="text-sm font-medium text-gray-700 block mb-3">Account Status</span>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={userFormData.isActive} onChange={() => isUserEditMode && setUserFormData({ ...userFormData, isActive: true })} className="text-green-600" disabled={!isUserEditMode} />
                                    <span className="text-sm">Active</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={!userFormData.isActive} onChange={() => isUserEditMode && setUserFormData({ ...userFormData, isActive: false })} className="text-red-600" disabled={!isUserEditMode} />
                                    <span className="text-sm">Inactive</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4"><Button type="submit"><Save className="w-4 h-4 mr-2" /> Save</Button></div>
                    </form>
                )}
            </Modal>

            {/* ROLE PERMISSION MODAL (MATRIX) */}
            <Modal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} title={editingRole ? 'Edit Permissions' : 'New Role'} maxWidth="max-w-5xl">
                <form onSubmit={saveRole} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Role Name" value={roleFormData.name} onChange={e => setRoleFormData({ ...roleFormData, name: e.target.value })} required />
                        <Input label="Description" value={roleFormData.description} onChange={e => setRoleFormData({ ...roleFormData, description: e.target.value })} />
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto border rounded-xl">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left">Menu / Feature</th>
                                    <th className="px-2 py-3 text-center">All</th>
                                    {ACTIONS.map(act => <th key={act.id} className="px-2 py-3 text-center">{act.label}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {MENUS.map(menu => {
                                    const perms = roleFormData.permissions[menu.id] || {};
                                    return (
                                        <tr key={menu.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">{menu.label}</td>
                                            <td className="px-2 py-3 text-center">
                                                <input type="checkbox" onChange={(e) => toggleAllRow(menu.id, e.target.checked)} className="rounded text-blue-600" />
                                            </td>
                                            {ACTIONS.map(act => (
                                                <td key={act.id} className="px-2 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!perms[act.id]}
                                                        onChange={() => togglePermission(menu.id, act.id)}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* DATA SCOPE */}
                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-bold text-gray-900">Data Visibility Scope</h4>
                        <Select label="Scope Level" value={roleFormData.data_scope || 'all'} onChange={e => setRoleFormData({ ...roleFormData, data_scope: e.target.value })} options={[{ value: 'all', label: 'All Data' }, { value: 'province', label: 'By Province' }, { value: 'cluster', label: 'By Cluster' }]} />

                        {roleFormData.data_scope === 'province' && (
                            <div className="grid grid-cols-3 gap-2 border p-3 rounded-lg max-h-40 overflow-y-auto">
                                {provinces.map(prov => (
                                    <label key={prov.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inputToArray(roleFormData.allowed_provinces).includes(prov.name)} onChange={() => toggleArrayItem('allowed_provinces', prov.name)} /> {prov.name}</label>
                                ))}
                            </div>
                        )}
                        {roleFormData.data_scope === 'cluster' && (
                            <div className="grid grid-cols-3 gap-2 border p-3 rounded-lg max-h-40 overflow-y-auto">
                                {clusters.map(cl => (
                                    <label key={cl.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inputToArray(roleFormData.allowed_clusters).includes(cl.name)} onChange={() => toggleArrayItem('allowed_clusters', cl.name)} /> {cl.name}</label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between border-t pt-4">
                        {editingRole && <Button type="button" variant="danger" onClick={() => deleteRole(editingRole.id)}>Delete Role</Button>}
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="secondary" onClick={() => setRoleModalOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Permissions</Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default UserManagement;
