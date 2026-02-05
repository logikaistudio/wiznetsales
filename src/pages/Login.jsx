
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(username, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#011F5B] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8 text-center border-b border-gray-100">
                    <h1 className="text-2xl font-bold text-gray-900">Netsales</h1>
                    <p className="text-sm text-gray-500 mt-1">ISP Sales & Ops Dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <Input
                            label="Username or Email"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            placeholder="Enter username"
                        />
                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="••••••"
                        />
                    </div>

                    <Button className="w-full justify-center" size="lg" disabled={loading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 mr-2" /> Sign In</>}
                    </Button>
                </form>

                <div className="p-4 bg-gray-50 text-center text-xs text-gray-400">
                    © 2026 Wiznet Sales System
                </div>
            </div>
        </div>
    );
};

export default Login;
