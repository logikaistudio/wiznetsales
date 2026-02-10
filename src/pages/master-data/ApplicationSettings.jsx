import React, { useState, useEffect, useRef } from 'react';
import { Save, Settings, Upload, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const ApplicationSettings = () => {
    const [appSettings, setAppSettings] = useState({ app_name: '', app_logo: '', app_description: '' });
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setAppSettings(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'image/png') {
            alert('Please upload a PNG file.');
            return;
        }

        if (file.size > 500 * 1024) { // 500KB limit
            alert('File size too large. Max 500KB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setAppSettings(prev => ({ ...prev, app_logo: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const saveSettings = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appSettings)
            });
            alert('Settings saved!');
            // Force reload to update sidebar immediately
            window.location.reload();
        } catch (e) {
            alert('Error saving settings');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-900" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Application Settings</h1>
                    <p className="text-gray-500">Manage application branding and configuration.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Application Logo (PNG)</label>
                        <div className="flex items-start gap-6">
                            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                                {appSettings.app_logo ? (
                                    <>
                                        <img src={appSettings.app_logo} alt="App Logo" className="w-full h-full object-contain p-2" />
                                        <button
                                            type="button"
                                            onClick={() => setAppSettings(prev => ({ ...prev, app_logo: '' }))}
                                            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4 text-red-500" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="text-gray-400 text-xs">No Logo</div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/png"
                                    ref={fileInputRef}
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="w-4 h-4 mr-2" /> Upload Logo (PNG)
                                </Button>
                                <p className="text-xs text-gray-500 mt-2">
                                    Recommended size: 200x200px. Max size: 500KB. PNG format only.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <Button type="submit" disabled={isLoading}>
                            <Save className="w-4 h-4 mr-2" /> Save Settings
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplicationSettings;
