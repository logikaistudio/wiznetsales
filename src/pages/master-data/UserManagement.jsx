import React, { useState, useEffect } from 'react';
import { User, Lock, Plus, Pencil, Trash2, Search, X, Save, Shield, CheckCircle, XCircle, Loader2, RefreshCw, Settings, Sliders, Image } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

// Menu labels matching sidebar
const menuLabels = {
    'dashboard': 'Dashboard',
    'achievement': 'Achievement',
    'prospect_subscriber': 'Prospect Subscriber',
    'coverage': 'Coverage',
    'omniflow': 'Omniflow',
    'person_incharge': 'Person Incharge',
    'targets': 'Targets',
    'coverage_management': 'Coverage Management',
    'product_management': 'Product Management',
    'promo': 'Promo',
    'hot_news': 'Hot News',
    'user_management': 'User Management'
};

const UserManagement = () => {
    const [activeTab, setActiveTab] = useState('users');
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

    // --- ROLES STATE ---
    const [roles, setRoles] = useState([]);
    const [editingRole, setEditingRole] = useState(null);
    const [roleModalOpen, setRoleModalOpen] = useState(false);

    // --- SETTINGS STATE ---
    const [appSettings, setAppSettings] = useState({ app_name: '', app_logo: '', app_description: '' });

    // --- USER PERMISSIONS VIEW STATE ---
    const [viewingUserPermissions, setViewingUserPermissions] = useState(null);

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

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) setAppSettings(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        setIsLoading(true);
        Promise.all([fetchUsers(), fetchRoles(), fetchSettings()]).finally(() => setIsLoading(false));
    }, []);

    // --- USER HANDLERS ---
    const handleOpenUserModal = (item = null) => {
        setEditingUser(item);
        if (item) {
            // When viewing existing user, show permissions by default
            setUserFormData({ ...item, password: '', isActive: item.is_active });
            setIsUserEditMode(false);
            setViewingUserPermissions(true);
        } else {
            // When adding new user, show form
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

            await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            await fetchUsers();
            setUserModalOpen(false);
            alert('User saved!');
        } catch (e) { alert('Error saving user'); }
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
    const toggleRoleStatus = async (role, status) => {
        try {
            await fetch(`/api/roles/${role.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: status })
            });
            fetchRoles();
        } catch (e) { alert('Error updating role'); }
    };

    const updateRolePermission = async (roleId, menu, action, value) => {
        try {
            // Find the role
            const role = roles.find(r => r.id === roleId);
            if (!role) return;

            // Update permissions object
            const updatedPermissions = {
                ...role.permissions,
                [menu]: {
                    ...role.permissions[menu],
                    [action]: value
                }
            };

            // Send to backend
            await fetch(`/api/roles/${roleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissions: updatedPermissions })
            });

            // Refresh roles
            fetchRoles();
        } catch (e) {
            alert('Error updating permission');
            console.error(e);
        }
    };

    // --- SETTINGS HANDLERS ---
    const saveSettings = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appSettings)
            });
            alert('Settings saved!');
            // Force reload to update sidebar
            window.location.reload();
        } catch (e) { alert('Error saving settings'); }
    };

    // --- RENDER HELPERS ---
    const filteredUsers = users.filter(u =>
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage users, roles, and application settings.</p>
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

            {/* SECTION 2: ROLE MANAGEMENT TABLE */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Role Management & Permissions
                </h2>
                <p className="text-sm text-gray-500">Manage role permissions for each menu. Each role can have specific access to View, Create, Edit, Delete, Import, and Export actions.</p>

                {roles.map(role => (
                    <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold capitalize text-gray-900">{role.name}</h3>
                                <p className="text-sm text-gray-500">{role.description}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`role_status_${role.id}`}
                                        checked={role.is_active}
                                        onChange={() => toggleRoleStatus(role, true)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium">Active</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`role_status_${role.id}`}
                                        checked={!role.is_active}
                                        onChange={() => toggleRoleStatus(role, false)}
                                        className="text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm font-medium">Inactive</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Menu</th>
                                            <th className="text-center py-3 px-2 font-semibold text-gray-700">View</th>
                                            <th className="text-center py-3 px-2 font-semibold text-gray-700">Create</th>
                                            <th className="text-center py-3 px-2 font-semibold text-gray-700">Edit</th>
                                            <th className="text-center py-3 px-2 font-semibold text-gray-700">Delete</th>
                                            <th className="text-center py-3 px-2 font-semibold text-gray-700">Import</th>
                                            <th className="text-center py-3 px-2 font-semibold text-gray-700">Export</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {Object.entries(role.permissions || {}).map(([menu, perms]) => (
                                            <tr key={menu} className="hover:bg-gray-50">
                                                <td className="py-3 px-4 font-medium text-gray-900">
                                                    {menuLabels[menu] || menu.replace(/_/g, ' ')}
                                                </td>
                                                {['view', 'create', 'edit', 'delete', 'import', 'export'].map(action => (
                                                    <td key={action} className="text-center py-3 px-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={perms[action] || false}
                                                            onChange={(e) => updateRolePermission(role.id, menu, action, e.target.checked)}
                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* SECTION 3: APPLICATION SETTINGS */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Application Settings
                </h2>
                <div className="max-w-2xl bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <form onSubmit={saveSettings} className="space-y-6">
                        <Input
                            label="Application Name"
                            value={appSettings.app_name || ''}
                            onChange={e => setAppSettings({ ...appSettings, app_name: e.target.value })}
                            placeholder="e.g. Netsales"
                        />
                        <Input
                            label="App Description (Sidebar Subtitle)"
                            value={appSettings.app_description || ''}
                            onChange={e => setAppSettings({ ...appSettings, app_description: e.target.value })}
                            placeholder="e.g. ISP Sales Dashboard"
                        />
                        <div>
                            <Input
                                label="Logo URL"
                                value={appSettings.app_logo || ''}
                                onChange={e => setAppSettings({ ...appSettings, app_logo: e.target.value })}
                                placeholder="https://..."
                            />
                            {appSettings.app_logo && (
                                <div className="mt-2 p-2 border rounded bg-gray-50 inline-block">
                                    <img src={appSettings.app_logo} alt="Preview" className="h-12 w-auto object-contain" />
                                </div>
                            )}
                        </div>
                        <Button type="submit"><Save className="w-4 h-4 mr-2" /> Save Settings</Button>
                    </form>
                </div>
            </div>

            {/* USER MODAL */}
            <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? (viewingUserPermissions ? `${userFormData.fullName} - Access Permissions` : 'Edit User') : 'Add User'}>
                {viewingUserPermissions && editingUser ? (
                    // PERMISSIONS VIEW MODE
                    <div className="space-y-6">
                        {/* User Info Summary */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Username:</span>
                                    <span className="ml-2 font-medium">{userFormData.username}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Email:</span>
                                    <span className="ml-2 font-medium">{userFormData.email}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Role:</span>
                                    <span className="ml-2 font-medium capitalize">{userFormData.role}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Status:</span>
                                    <span className={`ml-2 font-medium ${userFormData.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                        {userFormData.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Permissions Matrix */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Access Permissions (Based on Role: {userFormData.role})</h3>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Menu</th>
                                                <th className="text-center py-3 px-2 font-semibold text-gray-700">View</th>
                                                <th className="text-center py-3 px-2 font-semibold text-gray-700">Create</th>
                                                <th className="text-center py-3 px-2 font-semibold text-gray-700">Edit</th>
                                                <th className="text-center py-3 px-2 font-semibold text-gray-700">Delete</th>
                                                <th className="text-center py-3 px-2 font-semibold text-gray-700">Import</th>
                                                <th className="text-center py-3 px-2 font-semibold text-gray-700">Export</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(() => {
                                                const userRole = roles.find(r => r.name === userFormData.role);
                                                if (!userRole || !userRole.permissions) {
                                                    return (
                                                        <tr>
                                                            <td colSpan="7" className="text-center py-4 text-gray-500">
                                                                No permissions found for this role
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                return Object.entries(userRole.permissions).map(([menu, perms]) => (
                                                    <tr key={menu} className="hover:bg-gray-50">
                                                        <td className="py-3 px-4 font-medium text-gray-900">
                                                            {menuLabels[menu] || menu.replace(/_/g, ' ')}
                                                        </td>
                                                        {['view', 'create', 'edit', 'delete', 'import', 'export'].map(action => (
                                                            <td key={action} className="text-center py-3 px-2">
                                                                {perms[action] ? (
                                                                    <CheckCircle className="w-4 h-4 text-green-600 inline-block" />
                                                                ) : (
                                                                    <XCircle className="w-4 h-4 text-gray-300 inline-block" />
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between border-t pt-4">
                            <Button type="button" variant="danger" onClick={() => deleteUser(editingUser.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete User
                            </Button>
                            <Button type="button" onClick={() => { setViewingUserPermissions(false); setIsUserEditMode(true); }}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit User Info
                            </Button>
                        </div>
                    </div>
                ) : (
                    // EDIT/ADD FORM MODE
                    <form onSubmit={saveUser} className="space-y-6">
                        <div className="space-y-4">
                            <Input
                                label="Full Name"
                                value={userFormData.fullName}
                                onChange={e => setUserFormData({ ...userFormData, fullName: e.target.value })}
                                disabled={!isUserEditMode}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Username"
                                    value={userFormData.username}
                                    onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
                                    disabled={!isUserEditMode}
                                />
                                <Input
                                    label="Email"
                                    value={userFormData.email}
                                    onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                                    disabled={!isUserEditMode}
                                />
                            </div>
                            {isUserEditMode && (
                                <Input
                                    label="Password"
                                    type="password"
                                    value={userFormData.password}
                                    onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                                    placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                                />
                            )}
                            <Select
                                label="Role"
                                value={userFormData.role}
                                onChange={e => setUserFormData({ ...userFormData, role: e.target.value })}
                                options={roles.map(r => ({ value: r.name, label: r.name.toUpperCase() }))}
                                disabled={!isUserEditMode}
                            />
                        </div>

                        {/* Radio Button Status for User */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="text-sm font-medium text-gray-700 block mb-3">Account Status</span>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="userStatus"
                                        checked={userFormData.isActive}
                                        onChange={() => isUserEditMode && setUserFormData({ ...userFormData, isActive: true })}
                                        className="text-green-600 focus:ring-green-500 w-4 h-4"
                                        disabled={!isUserEditMode}
                                    />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="userStatus"
                                        checked={!userFormData.isActive}
                                        onChange={() => isUserEditMode && setUserFormData({ ...userFormData, isActive: false })}
                                        className="text-red-600 focus:ring-red-500 w-4 h-4"
                                        disabled={!isUserEditMode}
                                    />
                                    <span className="text-sm font-medium text-gray-700">Inactive</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-between border-t pt-4">
                            {editingUser && (
                                <Button type="button" onClick={() => { setViewingUserPermissions(true); setIsUserEditMode(false); }}>
                                    View Permissions
                                </Button>
                            )}
                            {!editingUser && <div></div>}
                            <Button type="submit"><Save className="w-4 h-4 mr-2" /> Save</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default UserManagement;
