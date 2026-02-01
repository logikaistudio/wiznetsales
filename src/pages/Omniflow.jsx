import React, { useState, useEffect } from 'react';
import { MessageCircle, Search, Plus, User, Clock, CheckCircle, AlertCircle, RefreshCw, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { cn } from '../lib/utils';

const TicketCard = ({ ticket, onUpdateStatus }) => {
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
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {ticket.ticket_number}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", statusColors[ticket.status])}>
                        {ticket.status}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.created_at).toLocaleDateString()} {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                {ticket.status !== 'Solved' && ticket.status !== 'Closed' && (
                    <Button
                        size="xs"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => onUpdateStatus(ticket.id, 'Solved')}
                    >
                        <CheckCircle className="w-3 h-3 mr-1" /> Mark Solved
                    </Button>
                )}
            </div>

            <h3 className="font-semibold text-gray-900 mb-1">{ticket.customer_name || 'Unknown Customer'}</h3>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{ticket.description}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span>Assignee: {ticket.assigned_name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-gray-50 rounded text-gray-600 border border-gray-100">
                        {ticket.category}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

const Omniflow = () => {
    // Data States
    const [tickets, setTickets] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [agents, setAgents] = useState([]);

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        customerId: '',
        customerName: '',
        category: 'Gangguan Interent',
        description: '',
        source: 'WhatsApp',
        priority: 'Medium',
        assignedTo: '',
        assignedName: ''
    });

    // Auto-search customers
    const [customerSearch, setCustomerSearch] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState([]);

    useEffect(() => {
        fetchTickets();
        fetchAgents();
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (customerSearch) {
            setFilteredCustomers(
                customers.filter(c =>
                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    c.customerId.toLowerCase().includes(customerSearch.toLowerCase())
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

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
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
                fetchTickets();
                alert('Ticket created successfully!');
            }
        } catch (error) {
            alert('Failed to create ticket');
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        if (!confirm(`Mark ticket as ${newStatus}?`)) return;
        try {
            await fetch(`/api/tickets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchTickets();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const selectCustomer = (cust) => {
        setFormData({
            ...formData,
            customerId: cust.id,
            customerName: cust.name
        });
        setCustomerSearch(cust.name);
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
                <Button onClick={() => setIsModalOpen(true)}>
                    <MessageCircle className="w-4 h-4 mr-2" /> New Ticket (WA)
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase">Open Tickets</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{tickets.filter(t => t.status === 'Open').length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{tickets.filter(t => t.status === 'In Progress').length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase">Solved Today</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                        {tickets.filter(t => t.status === 'Solved' && new Date(t.created_at).toDateString() === new Date().toDateString()).length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase">Total Tickets</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{tickets.length}</p>
                </div>
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
                        <TicketCard key={ticket.id} ticket={ticket} onUpdateStatus={handleUpdateStatus} />
                    ))}
                </AnimatePresence>
                {filteredTickets.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No tickets found matching your criteria</p>
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Support Ticket (WA)" className="max-w-2xl">
                <form onSubmit={handleCreateTicket} className="space-y-6">
                    <div className="space-y-1.5 relative">
                        <label className="text-sm font-medium text-gray-700">Find Customer (Auto-search)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={e => {
                                    setCustomerSearch(e.target.value);
                                    if (e.target.value === '') {
                                        setFormData(prev => ({ ...prev, customerId: '', customerName: '' }));
                                    }
                                }}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="Type name or ID..."
                            />
                            {filteredCustomers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredCustomers.map(c => (
                                        <div
                                            key={c.id}
                                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                            onClick={() => selectCustomer(c)}
                                        >
                                            <div className="font-medium text-gray-900">{c.name}</div>
                                            <div className="text-xs text-gray-500">{c.customerId} - {c.address}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit"><Save className="w-4 h-4 mr-2" /> Create Ticket</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Omniflow;
