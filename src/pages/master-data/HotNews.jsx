import React, { useState, useEffect } from 'react';
import { Bell, Plus, Edit, Trash2, Save, X, Calendar, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { cn } from '../../lib/utils';

const HotNews = () => {
    const [newsList, setNewsList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        priority: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
        createdBy: 'Admin'
    });

    const fetchNews = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/hotnews/all');
            const data = await res.json();
            if (Array.isArray(data)) setNewsList(data);
        } catch (error) {
            console.error('Error fetching news:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                title: item.title,
                content: item.content,
                priority: item.priority,
                startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
                endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
                isActive: item.isActive,
                createdBy: item.createdBy || 'Admin'
            });
        } else {
            setEditingItem(null);
            setFormData({
                title: '',
                content: '',
                priority: 1,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                isActive: true,
                createdBy: 'Admin'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const url = editingItem ? `/api/hotnews/${editingItem.id}` : '/api/hotnews';
            const method = editingItem ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            await fetchNews();
            setIsModalOpen(false);
            alert('Hot news saved successfully!');
        } catch (error) {
            alert('Failed to save hot news');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this news item?')) {
            try {
                await fetch(`/api/hotnews/${id}`, { method: 'DELETE' });
                await fetchNews();
            } catch (error) {
                alert('Failed to delete');
            }
        }
    };

    const isActive = (item) => {
        const now = new Date();
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        return item.isActive && now >= start && now <= end;
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Hot News Management</h1>
                    <p className="text-gray-500 mt-1">Manage dashboard announcements and notifications</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="w-4 h-4 mr-2" /> Add News
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4">Start Date</th>
                                <th className="px-6 py-4">End Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {newsList.length > 0 ? newsList.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Bell className={cn("w-4 h-4", isActive(item) ? "text-green-500" : "text-gray-400")} />
                                            <span className="font-medium text-gray-900">{item.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-1 rounded text-xs font-medium",
                                            item.priority === 1 ? "bg-red-100 text-red-700" :
                                                item.priority === 2 ? "bg-yellow-100 text-yellow-700" :
                                                    "bg-blue-100 text-blue-700"
                                        )}>
                                            Priority {item.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(item.startDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(item.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-medium",
                                            isActive(item) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                        )}>
                                            {isActive(item) ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No news items found. Create your first announcement!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Edit Hot News' : 'Add Hot News'} className="max-w-2xl">
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Title"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="Enter news title"
                    />

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Content</label>
                        <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            rows={4}
                            value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            required
                            placeholder="Enter announcement content..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Priority</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                            >
                                <option value={1}>High (1)</option>
                                <option value={2}>Medium (2)</option>
                                <option value={3}>Low (3)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Status</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                value={formData.isActive ? 'true' : 'false'}
                                onChange={e => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                            >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Start Date"
                            type="date"
                            value={formData.startDate}
                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            required
                        />
                        <Input
                            label="End Date"
                            type="date"
                            value={formData.endDate}
                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button type="submit">
                            <Save className="w-4 h-4 mr-1" /> Save
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default HotNews;
