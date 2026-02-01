import React, { useState, useEffect, useRef } from 'react';
import {
    MessageCircle, Search, User, Clock, Send, MoreVertical,
    Phone, Check, CheckDouble, PlusCircle, AlertCircle, FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import Button from '../components/ui/Button';

// Mock Data for Chat Simulation (Since we don't have Real WA API connected yet)
const MOCK_CHATS = [
    {
        id: 1,
        customerId: 101,
        name: 'Budi Santoso',
        phone: '6281234567890',
        lastMessage: 'Internet saya merah los min, tolong dicek',
        time: '10:30',
        unread: 2,
        messages: [
            { id: 1, text: 'Halo selamat siang', sender: 'customer', time: '10:28' },
            { id: 2, text: 'Internet saya merah los min, tolong dicek', sender: 'customer', time: '10:30' }
        ]
    },
    {
        id: 2,
        customerId: 102,
        name: 'Siti Aminah',
        phone: '6285678901234',
        lastMessage: 'Pembayaran bulan ini sudah masuk belum?',
        time: 'Yesterday',
        unread: 0,
        messages: [
            { id: 1, text: 'Pembayaran bulan ini sudah masuk belum?', sender: 'customer', time: 'Yesterday' }
        ]
    }
];

const Omniflow = () => {
    // Layout State
    const [selectedChat, setSelectedChat] = useState(null);
    const [chats, setChats] = useState(MOCK_CHATS);
    const [inputText, setInputText] = useState('');

    // CRM & Ticket State
    const [customerData, setCustomerData] = useState(null);
    const [customerTickets, setCustomerTickets] = useState([]);
    const [activeTab, setActiveTab] = useState('info'); // info | tickets | create
    const [agents, setAgents] = useState([]);

    // Create Ticket Form State
    const [ticketForm, setTicketForm] = useState({
        category: 'Gangguan Internet',
        priority: 'Medium',
        description: '',
        assignedTo: ''
    });

    const messagesEndRef = useRef(null);

    // Initial Load - Fetch Agents
    useEffect(() => {
        const fetchAgents = async () => {
            const res = await fetch('/api/helpdesk-agents');
            const data = await res.json();
            if (Array.isArray(data)) setAgents(data);
        };
        fetchAgents();
    }, []);

    // When chat selected, fetch customer details & tickets
    useEffect(() => {
        if (selectedChat) {
            fetchCustomerDetails(selectedChat.name); // Using name for demo matching
            scrollToBottom();
        }
    }, [selectedChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchCustomerDetails = async (name) => {
        // 1. Find Customer ID from Name (Simulating WA Number match)
        const resCust = await fetch('/api/customers');
        const custData = await resCust.json();
        const matchedCust = custData.find(c => c.name.toLowerCase().includes(name.toLowerCase().split(' ')[0])); // Simple fuzzy match

        if (matchedCust) {
            setCustomerData(matchedCust);
            // 2. Fetch Tickets for this Customer
            // We need to filter tickets by customer_name or id from the all tickets endpoint (or creating a specific endpoint is better)
            const resTickets = await fetch(`/api/tickets`);
            const allTickets = await resTickets.json();
            const myTickets = allTickets.filter(t => t.customer_id === matchedCust.id);
            setCustomerTickets(myTickets);

            // Auto-fill description with last message
            setTicketForm(prev => ({ ...prev, description: selectedChat.lastMessage }));
        } else {
            setCustomerData(null);
            setCustomerTickets([]);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const newMessage = {
            id: Date.now(),
            text: inputText,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const updatedChats = chats.map(chat => {
            if (chat.id === selectedChat.id) {
                return {
                    ...chat,
                    messages: [...chat.messages, newMessage],
                    lastMessage: inputText,
                    time: 'Now'
                };
            }
            return chat;
        });

        setChats(updatedChats);
        setSelectedChat(prev => ({ ...prev, messages: [...prev.messages, newMessage] }));
        setInputText('');
        setTimeout(scrollToBottom, 100);
    };

    const handleCreateTicket = async () => {
        if (!customerData) return alert("Customer data not linked!");

        // 1. Find Agent Name
        const agent = agents.find(a => a.id.toString() === ticketForm.assignedTo);

        const payload = {
            customerId: customerData.id,
            customerName: customerData.name,
            category: ticketForm.category,
            description: ticketForm.description,
            priority: ticketForm.priority,
            assignedTo: ticketForm.assignedTo,
            assignedName: agent ? agent.name : '',
            source: 'Omniflow WA'
        };

        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Ticket Created Successfully!");
                fetchCustomerDetails(selectedChat.name); // Refresh list
                setActiveTab('tickets'); // Switch view
                // Optional: Auto send message to customer
                // handleAutoReply(`Ticket #${res.json().ticket_number} created.`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] flex bg-gray-100 overflow-hidden">

            {/* LEFT PANEL: CHAT LIST */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-gray-800 text-lg">Chats</h2>
                        <div className="flex gap-2">
                            <Button size="xs" variant="ghost"><MoreVertical className="w-4 h-4" /></Button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {chats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => setSelectedChat(chat)}
                            className={cn(
                                "p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                                selectedChat?.id === chat.id && "bg-blue-50 border-blue-100"
                            )}
                        >
                            <div className="flex justify-between mb-1">
                                <span className="font-semibold text-gray-900 text-sm truncate">{chat.name}</span>
                                <span className="text-xs text-gray-400">{chat.time}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <p className="text-xs text-gray-500 truncate max-w-[180px]">{chat.lastMessage}</p>
                                {chat.unread > 0 && (
                                    <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                        {chat.unread}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MIDDLE PANEL: CHAT ROOM */}
            <div className="flex-1 flex flex-col bg-[#e5ddd5] relative">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-white p-3 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 leading-tight">{selectedChat.name}</h3>
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> {selectedChat.phone}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-gray-600">
                                    <Search className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                            {selectedChat.messages.map(msg => (
                                <div key={msg.id} className={cn("flex", msg.sender === 'me' ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[70%] p-3 rounded-lg shadow-sm text-sm relative",
                                        msg.sender === 'me' ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"
                                    )}>
                                        <p className="text-gray-800 mb-1">{msg.text}</p>
                                        <div className="flex justify-end items-center gap-1">
                                            <span className="text-[10px] text-gray-500">{msg.time}</span>
                                            {msg.sender === 'me' && <CheckDouble className="w-3 h-3 text-blue-500" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-gray-200">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <Button type="button" variant="ghost" className="text-gray-500">
                                    <PlusCircle className="w-6 h-6" />
                                </Button>
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-100 border-0 rounded-lg px-4 focus:ring-1 focus:ring-gray-300"
                                />
                                <Button type="submit" size="icon" className={cn("rounded-full", !inputText.trim() && "opacity-50")}>
                                    <Send className="w-5 h-5" />
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-50">
                        <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-lg font-medium">Select a chat to start messaging</p>
                        <p className="text-sm">Manage ticket support directly from chat</p>
                    </div>
                )}
            </div>

            {/* RIGHT PANEL: CONTEXT & TICKETING */}
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
                {selectedChat && customerData ? (
                    <>
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            {[
                                { id: 'info', label: 'Info', icon: User },
                                { id: 'tickets', label: 'Tickets', icon: FileText },
                                { id: 'create', label: 'New Ticket', icon: PlusCircle }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors",
                                        activeTab === tab.id
                                            ? "border-primary text-primary bg-primary/5"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                    )}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {activeTab === 'info' && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
                                            <span className="text-2xl font-bold">{customerData.name.charAt(0)}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-lg">{customerData.name}</h3>
                                        <p className="text-sm text-gray-500">{customerData.customerId} • {customerData.status || 'Active'}</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Package Plan</p>
                                            <p className="text-sm font-semibold text-gray-800">{customerData.productName || 'N/A'}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Installation Address</p>
                                            <p className="text-sm text-gray-800">{customerData.address}, {customerData.kabupaten}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">ODP / Port</p>
                                            <p className="text-sm text-gray-800">- / -</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'tickets' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-2">Active Tickets ({customerTickets.length})</h3>
                                    {customerTickets.length > 0 ? customerTickets.map(ticket => (
                                        <div key={ticket.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{ticket.ticket_number}</span>
                                                <span className={cn(
                                                    "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                                                    ticket.status === 'Open' ? "bg-red-100 text-red-600" :
                                                        ticket.status === 'Solved' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                                                )}>{ticket.status}</span>
                                            </div>
                                            <p className="text-sm text-gray-800 font-medium mb-1">{ticket.category}</p>
                                            <p className="text-xs text-gray-500 line-clamp-2">{ticket.description}</p>
                                            <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
                                                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                                <span>{ticket.assigned_name}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-8 text-gray-400">
                                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">No ticket history</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'create' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700">Category</label>
                                        <select
                                            className="w-full mt-1 border border-gray-300 rounded-md text-sm p-2"
                                            value={ticketForm.category}
                                            onChange={e => setTicketForm({ ...ticketForm, category: e.target.value })}
                                        >
                                            <option>Gangguan Internet</option>
                                            <option>Billing Issue</option>
                                            <option>New Installation</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700">Priority</label>
                                        <select
                                            className="w-full mt-1 border border-gray-300 rounded-md text-sm p-2"
                                            value={ticketForm.priority}
                                            onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value })}
                                        >
                                            <option>Low</option>
                                            <option>Medium</option>
                                            <option>High</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700">Description</label>
                                        <textarea
                                            className="w-full mt-1 border border-gray-300 rounded-md text-sm p-2 h-24"
                                            value={ticketForm.description}
                                            onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">*Auto-filled from chat</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700">Assign To</label>
                                        <select
                                            className="w-full mt-1 border border-gray-300 rounded-md text-sm p-2"
                                            value={ticketForm.assignedTo}
                                            onChange={e => setTicketForm({ ...ticketForm, assignedTo: e.target.value })}
                                        >
                                            <option value="">-- Select CS --</option>
                                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <Button onClick={handleCreateTicket} className="w-full mt-2">
                                        Create Ticket
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
                        {selectedChat ? (
                            <>
                                <AlertCircle className="w-12 h-12 text-yellow-400 mb-3" />
                                <h3 className="font-bold text-gray-800 mb-1">Unlinked Customer</h3>
                                <p className="text-sm">Cannot find customer data matching "{selectedChat.name}"</p>
                                <Button size="sm" variant="outline" className="mt-4">Search Manual</Button>
                            </>
                        ) : (
                            <>
                                <User className="w-12 h-12 text-gray-200 mb-3" />
                                <p className="text-sm">Select a chat to view customer details & tickets</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Omniflow;
