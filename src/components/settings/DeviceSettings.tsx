import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Mic, Volume2, Settings2 } from 'lucide-react';

interface DeviceInfo {
    deviceId: string;
    label: string;
}

export const DeviceSettings: React.FC = () => {
    const { t } = useTranslation();
    const [devices, setDevices] = useState<{
        video: DeviceInfo[];
        audioIn: DeviceInfo[];
        audioOut: DeviceInfo[];
    }>({ video: [], audioIn: [], audioOut: [] });

    const [selectedDevices, setSelectedDevices] = useState({
        video: localStorage.getItem('preferred_video_device') || '',
        audioIn: localStorage.getItem('preferred_audio_in_device') || '',
        audioOut: localStorage.getItem('preferred_audio_out_device') || '',
    });

    const handleDeviceChange = useCallback((type: 'video' | 'audioIn' | 'audioOut', deviceId: string) => {
        setSelectedDevices(prev => ({ ...prev, [type]: deviceId }));
        localStorage.setItem(`preferred_${type}_device`, deviceId);
    }, []);

    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request permission first to get labels
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                // Stop tracks immediately after getting permission
                stream.getTracks().forEach(track => track.stop());

                const allDevices = await navigator.mediaDevices.enumerateDevices();

                const videoDevices = allDevices
                    .filter(d => d.kind === 'videoinput')
                    .map(d => ({ deviceId: d.deviceId, label: d.label || `${t('settings.camera', 'Camera')} ${d.deviceId.slice(0, 5)}` }));

                const audioInDevices = allDevices
                    .filter(d => d.kind === 'audioinput')
                    .map(d => ({ deviceId: d.deviceId, label: d.label || `${t('settings.microphone', 'Microphone')} ${d.deviceId.slice(0, 5)}` }));

                const audioOutDevices = allDevices
                    .filter(d => d.kind === 'audiooutput')
                    .map(d => ({ deviceId: d.deviceId, label: d.label || `${t('settings.speakers', 'Speakers')} ${d.deviceId.slice(0, 5)}` }));

                setDevices({ video: videoDevices, audioIn: audioInDevices, audioOut: audioOutDevices });

                // Set defaults if none selected
                if (!selectedDevices.video && videoDevices.length > 0) handleDeviceChange('video', videoDevices[0].deviceId);
                if (!selectedDevices.audioIn && audioInDevices.length > 0) handleDeviceChange('audioIn', audioInDevices[0].deviceId);
                if (!selectedDevices.audioOut && audioOutDevices.length > 0) handleDeviceChange('audioOut', audioOutDevices[0].deviceId);

            } catch (error) {
                console.error('Error enumerating devices:', error);
            }
        };

        getDevices();
    }, [handleDeviceChange, selectedDevices.audioIn, selectedDevices.audioOut, selectedDevices.video, t]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <Settings2 className="text-primary" size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest text-on-surface/70">
                    {t('settings.devices_title', 'Media Devices')}
                </h3>
            </div>

            <div className="grid gap-4">
                {/* Video Devices */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-tighter opacity-50 flex items-center gap-2">
                        <Camera size={14} />
                        {t('settings.camera', 'Camera')}
                    </label>
                    <select
                        value={selectedDevices.video}
                        title={t('settings.camera', 'Camera')}
                        onChange={(e) => handleDeviceChange('video', e.target.value)}
                        className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    >
                        {devices.video.map(device => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Microphone Devices */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-tighter opacity-50 flex items-center gap-2">
                        <Mic size={14} />
                        {t('settings.microphone', 'Microphone')}
                    </label>
                    <select
                        value={selectedDevices.audioIn}
                        title={t('settings.microphone', 'Microphone')}
                        onChange={(e) => handleDeviceChange('audioIn', e.target.value)}
                        className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    >
                        {devices.audioIn.map(device => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Speaker Devices */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-tighter opacity-50 flex items-center gap-2">
                        <Volume2 size={14} />
                        {t('settings.speakers', 'Speakers')}
                    </label>
                    <select
                        value={selectedDevices.audioOut}
                        title={t('settings.speakers', 'Speakers')}
                        onChange={(e) => handleDeviceChange('audioOut', e.target.value)}
                        className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    >
                        {devices.audioOut.map(device => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-[10px] md:text-xs font-medium text-primary leading-relaxed opacity-80">
                    {t('settings.device_hint', 'Changes will be applied to your next call.')}
                </p>
            </div>
        </div>
    );
};
