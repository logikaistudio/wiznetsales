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

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Allow converting other formats to PNG if needed, or keep strict. 
        // User asked to auto-convert size. Usage of PNG usually implies transparency.
        // We will stick to reading it and converting to PNG data URL with resize.

        setIsLoading(true);

        try {
            const compressedDataUrl = await compressImage(file, 400 * 1024); // 400KB target
            setAppSettings(prev => ({ ...prev, app_logo: compressedDataUrl }));
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Error processing image. Please try another file.');
        } finally {
            setIsLoading(false);
        }
    };

    const compressImage = (file, targetSize) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    // Initial check: if file size is already small enough, just return original
                    // Base64 length is approx 1.33 * filesize
                    // But we can just use the input file.size if it was PNG
                    // However, to be safe and consistent, we check the data URL length

                    let canvas = document.createElement('canvas');
                    let ctx = canvas.getContext('2d');
                    let width = img.width;
                    let height = img.height;

                    // Initial draw
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    let dataUrl = canvas.toDataURL('image/png');

                    // dataUrl.length is char count. 1 char = 1 byte usually in string, but represents binary data.
                    // Base64 encoding: 4 chars = 3 bytes.
                    // So bytes = length * 3/4
                    // We want bytes <= targetSize

                    const maxChars = targetSize * 1.37; // Approx safety margin (4/3 is 1.33, using 1.37 for safe buffer)

                    let scale = 0.9;
                    while (dataUrl.length > maxChars && scale > 0.1) {
                        const newWidth = Math.floor(width * scale);
                        const newHeight = Math.floor(height * scale);

                        canvas.width = newWidth;
                        canvas.height = newHeight;
                        ctx.clearRect(0, 0, newWidth, newHeight);
                        ctx.drawImage(img, 0, 0, newWidth, newHeight);

                        dataUrl = canvas.toDataURL('image/png');
                        scale -= 0.1;
                    }

                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
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
            // window.location.reload(); // Removed to prevent 404
            // We should update global context instead if possible, but for now just alert checks out.
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
                                    Recommended size: 200x200px. Auto-resized if {'>'} 400KB. PNG format only.
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
