import React, { useState, useEffect } from 'react';
import { MessageCircle, Search, Plus, User, Clock, CheckCircle, AlertCircle, RefreshCw, X, Save, Send, Phone, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { cn } from '../lib/utils';

const TicketCard = ({ ticket, onClick }) => {
    const statusColors = {
        'Open': 'bg-red-50 text-red-700 border-red-100',
        'In Progress': 'bg-blue-50 text-blue-700 border-blue-100',
        'Solved': 'bg-green-50 text-green-700 border-green-100',
        'Closed': 'bg-gray-50 text-gray-700 border-gray-100'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onClick(ticket)}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
        >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {ticket.ticket_number}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", statusColors[ticket.status])}>
                        {ticket.status}
                    </span>
                </div>
            </div>

            <div className="mb-1">
                <h3 className="font-semibold text-gray-900">{ticket.customer_name || 'Unknown Customer'}</h3>
                {ticket.customer_phone && <p className="text-xs text-gray-500">{ticket.customer_phone}</p>}
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2 mt-2">{ticket.description}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span>{ticket.assigned_name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </motion.div>
    );
};

const ActivityItem = ({ activity }) => {
    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className={cn(
                    "w-2 h-2 rounded-full mt-2",
                    activity.activity_type === 'status_change' ? "bg-blue-500" : "bg-gray-400"
                )} />
                <div className="w-0.5 flex-1 bg-gray-100 my-1" />
            </div>
            <div className="pb-6 flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-900">{activity.created_by}</span>
                        <span className="text-xs text-gray-500">
                            {new Date(activity.created_at).toLocaleString()}
                        </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.content}</p>
                </div>
            </div>
        </div>
    );
};

const Omniflow = () => {
    // Data States
    const [tickets, setTickets] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [agents, setAgents] = useState([]);

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [ticketActivities, setTicketActivities] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Form States
    const [formData, setFormData] = useState({
        customerId: '',
        customerName: '',
        category: 'Gangguan Internet',
        description: '',
        source: 'WhatsApp',
        priority: 'Medium',
        assignedTo: '',
        assignedName: ''
    });

    const [commentText, setCommentText] = useState('');

    // Auto-search customers
    const [customerSearch, setCustomerSearch] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [selectedCustomerInfo, setSelectedCustomerInfo] = useState(null);

    useEffect(() => {
        fetchTickets();
        fetchAgents();
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (customerSearch && customers.length > 0) {
            const searchLower = customerSearch.toLowerCase();
            setFilteredCustomers(
                customers.filter(c =>
                    (c.name && c.name.toLowerCase().includes(searchLower)) ||
                    (c.customerId && c.customerId.toLowerCase().includes(searchLower)) ||
                    (c.phone && c.phone.replace(/\D/g, '').includes(searchLower)) // Search by formatted phone
                ).slice(0, 5)
            );
        } else {
            setFilteredCustomers([]);
        }
    }, [customerSearch, customers]);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/tickets?status=${filterStatus}`);
            const data = await res.json();
            if (Array.isArray(data)) setTickets(data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUniqueTicket = async (id) => {
        // Fetch updated ticket data
        const res = await fetch('/api/tickets');
        const data = await res.json();
        const updated = data.find(t => t.id === id);
        if (updated) setSelectedTicket(updated);
        return updated;
    };

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/helpdesk-agents');
            const data = await res.json();
            if (Array.isArray(data)) setAgents(data);
        } catch (error) {
            console.error('Error fetching agents:', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            if (Array.isArray(data)) setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchActivities = async (ticketId) => {
        try {
            const res = await fetch(`/api/tickets/${ticketId}/activities`);
            const data = await res.json();
            setTicketActivities(data);
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    };

    // Reset form helper
    const resetForm = () => {
        setIsCreateModalOpen(false);
        setFormData({
            customerId: '',
            customerName: '',
            category: 'Gangguan Internet',
            description: '',
            source: 'WhatsApp',
            priority: 'Medium',
            assignedTo: '',
            assignedName: ''
        });
        setCustomerSearch('');
        setSelectedCustomerInfo(null);
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                resetForm();
                fetchTickets();
            }
        } catch (error) {
            alert('Failed to create ticket');
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (!confirm(`Mark ticket as ${newStatus}?`)) return;
        try {
            await fetch(`/api/tickets/${selectedTicket.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, updatedBy: 'Admin' }) // Replace Admin with real user later
            });
            await fetchUniqueTicket(selectedTicket.id);
            await fetchActivities(selectedTicket.id);
            fetchTickets();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        try {
            await fetch(`/api/tickets/${selectedTicket.id}/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activityType: 'note',
                    content: commentText,
                    createdBy: 'Admin'
                })
            });
            setCommentText('');
            fetchActivities(selectedTicket.id);
        } catch (error) {
            alert('Failed to add comment');
        }
    };

    const openTicketDetail = (ticket) => {
        setSelectedTicket(ticket);
        fetchActivities(ticket.id);
        setIsDetailModalOpen(true);
    };

    const openWhatsApp = (phone) => {
        if (!phone) return alert('No phone number available');
        let number = phone.replace(/\D/g, '');
        if (number.startsWith('0')) number = '62' + number.slice(1);
        window.open(`https://wa.me/${number}`, '_blank');
    };

    const selectCustomer = (cust) => {
        setFormData({
            ...formData,
            customerId: cust.id,
            customerName: cust.name
        });
        setCustomerSearch(cust.name);
        setSelectedCustomerInfo(cust); // Save for display
        setFilteredCustomers([]);
    };

    const filteredTickets = tickets.filter(t =>
        (filterStatus === 'All' || t.status === filterStatus) &&
        (t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Omniflow Support</h1>
                    <p className="text-gray-500 mt-1">Helpdesk & Ticket Management</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <MessageCircle className="w-4 h-4 mr-2" /> New Ticket (WA)
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['Open', 'In Progress', 'Solved', 'Total'].map((stat, idx) => {
                    const count = stat === 'Total' ? tickets.length : tickets.filter(t => t.status === stat).length;
                    const colors = ['text-red-600', 'text-blue-600', 'text-green-600', 'text-gray-800'];
                    return (
                        <div key={stat} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-gray-500 text-xs font-medium uppercase">{stat === 'Total' ? 'Total Tickets' : stat}</p>
                            <p className={cn("text-2xl font-bold mt-1", colors[idx])}>{count}</p>
                        </div>
                    );
                })}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tickets by ID or Customer..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    {['All', 'Open', 'In Progress', 'Solved'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                                filterStatus === status
                                    ? "bg-primary text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                    <button onClick={fetchTickets} className="p-2 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Ticket Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {filteredTickets.map(ticket => (
                        <TicketCard key={ticket.id} ticket={ticket} onClick={openTicketDetail} />
                    ))}
                </AnimatePresence>
                {filteredTickets.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No tickets found matching your criteria</p>
                    </div>
                )}
            </div>

            {/* DETAIL MODAL */}
            {selectedTicket && (
                <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Ticket Details" className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="flex flex-col md:flex-row h-full overflow-hidden">
                        {/* LEFT: INFO */}
                        <div className="md:w-1/3 p-1 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-100 pr-4">
                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Status</span>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        <select
                                            value={selectedTicket.status}
                                            onChange={(e) => handleUpdateStatus(e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                        >
                                            <option value="Open">Open</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Solved">Solved</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Customer</span>
                                    <div className="mt-1">
                                        <p className="font-semibold text-gray-900">{selectedTicket.customer_name}</p>
                                        <div className="flex items-center mt-1 space-x-2">
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                className="text-green-600 border-green-200 w-full justify-center"
                                                onClick={() => openWhatsApp(selectedTicket.customer_phone)}
                                            >
                                                <MessageCircle className="w-3 h-3 mr-1" /> Chat WA
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Details</span>
                                    <div className="mt-2 text-sm space-y-2 text-gray-600 bg-gray-50 p-3 rounded-lg">
                                        <p><span className="font-medium">ID:</span> {selectedTicket.ticket_number}</p>
                                        <p><span className="font-medium">Category:</span> {selectedTicket.category}</p>
                                        <p><span className="font-medium">Priority:</span> {selectedTicket.priority}</p>
                                        <p><span className="font-medium">Created:</span> {new Date(selectedTicket.created_at).toLocaleString()}</p>
                                        <p><span className="font-medium">Source:</span> {selectedTicket.source}</p>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Assignee</span>
                                    <p className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        {selectedTicket.assigned_name || 'Unassigned'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: TIMELINE */}
                        <div className="md:w-2/3 pl-0 md:pl-6 flex flex-col h-[60vh] md:h-auto pt-4 md:pt-0">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" /> Activity History
                            </h3>

                            {/* Scrollable Timeline */}
                            <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                                <div className="space-y-4">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <p className="text-xs text-blue-800 font-semibold mb-1">Issue Description:</p>
                                        <p className="text-sm text-blue-900">{selectedTicket.description}</p>
                                    </div>

                                    {ticketActivities.map(activity => (
                                        <ActivityItem key={activity.id} activity={activity} />
                                    ))}

                                    {ticketActivities.length === 0 && (
                                        <p className="text-center text-gray-400 text-sm py-4">No activity upgrades yet.</p>
                                    )}
                                </div>
                            </div>

                            {/* Comment Input */}
                            <div className="border-t pt-4">
                                <form onSubmit={handleAddComment} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        placeholder="Type a note or update..."
                                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                    <Button type="submit" size="sm" disabled={!commentText.trim()}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* CREATE MODAL */}
            <Modal isOpen={isCreateModalOpen} onClose={resetForm} title="New Support Ticket (WA)" className="max-w-2xl">
                <form onSubmit={handleCreateTicket} className="space-y-6">
                    <div className="space-y-1.5 relative">
                        <label className="text-sm font-medium text-gray-700">Find Customer (Copy WA Number / Name / ID)</label>
                        <div className="relative">
                            <div className="flex gap-2">
                                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={e => {
                                        setCustomerSearch(e.target.value);
                                        if (e.target.value === '') {
                                            setFormData(prev => ({ ...prev, customerId: '', customerName: '' }));
                                            setSelectedCustomerInfo(null);
                                        }
                                    }}
                                    className="w-full pl-10 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="Paste phone number here (e.g. 0812xxx)..."
                                    autoFocus
                                />
                                {selectedCustomerInfo && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomerSearch('');
                                            setFormData(prev => ({ ...prev, customerId: '', customerName: '' }));
                                            setSelectedCustomerInfo(null);
                                        }}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {filteredCustomers.length > 0 && !selectedCustomerInfo && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredCustomers.map(c => (
                                        <div
                                            key={c.id}
                                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-0"
                                            onClick={() => selectCustomer(c)}
                                        >
                                            <div className="flex justify-between">
                                                <span className="font-medium text-gray-900">{c.name}</span>
                                                <span className="text-gray-500 text-xs">{c.phone}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">{c.customerId} • {c.address}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Customer Snapshot Card */}
                        {selectedCustomerInfo && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="bg-white p-2 rounded-full shadow-sm">
                                    <User className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-blue-900">{selectedCustomerInfo.name}</p>
                                    <p className="text-xs text-blue-700">{selectedCustomerInfo.address}, {selectedCustomerInfo.kabupaten}</p>
                                    <p className="text-xs text-blue-600 mt-1 flex gap-2">
                                        <span className="bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
                                            {selectedCustomerInfo.productName || 'No Plan'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {selectedCustomerInfo.phone}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>


                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Category"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            options={[
                                { value: 'Gangguan Internet', label: 'No Internet / Slow' },
                                { value: 'Billing Issue', label: 'Billing / Payment' },
                                { value: 'New Installation', label: 'New Installation' },
                                { value: 'Information Request', label: 'General Info' },
                                { value: 'Other', label: 'Other' }
                            ]}
                        />
                        <Select
                            label="Priority"
                            value={formData.priority}
                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            options={[
                                { value: 'Low', label: 'Low' },
                                { value: 'Medium', label: 'Medium' },
                                { value: 'High', label: 'High' },
                                { value: 'Critical', label: 'Critical' }
                            ]}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Complaint Description (from WA)</label>
                        <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            rows={4}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            required
                            placeholder="Copy paste chat details here..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Assign to Agent</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            value={formData.assignedTo}
                            onChange={e => {
                                const agent = agents.find(a => a.id.toString() === e.target.value);
                                setFormData({
                                    ...formData,
                                    assignedTo: e.target.value,
                                    assignedName: agent ? agent.name : ''
                                });
                            }}
                        >
                            <option value="">-- Select Agent --</option>
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>{agent.name} ({agent.role})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button type="submit"><Save className="w-4 h-4 mr-2" /> Create Ticket</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Omniflow;
