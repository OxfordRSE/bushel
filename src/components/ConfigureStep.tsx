// components/ConfigureStep.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings2, Save } from 'lucide-react';
import {FigshareClient} from "@/lib/store";
import {useAtomValue} from "jotai";

interface ConfigureStepProps {
    isEnabled: boolean;
    projectId: string | null;
    onConfigured: () => void;
}

interface ConfigSettings {
    autoSync: boolean;
    syncInterval: number;
    notifyOnChanges: boolean;
    preserveMetadata: boolean;
}

export function ConfigureStep({ isEnabled, projectId, onConfigured }: ConfigureStepProps) {
    const [settings, setSettings] = useState<ConfigSettings>({
        autoSync: true,
        syncInterval: 24,
        notifyOnChanges: true,
        preserveMetadata: true
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const figshareClient = useAtomValue(FigshareClient);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        if (!figshareClient) {
            setError('Figshare API client not available');
            setIsSaving(false);
            return;
        }

        if (!projectId) {
            setError('Project ID not available');
            setIsSaving(false);
            return;
        }

        try {
            await figshareClient.request(`/projects/configure`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId,
                    settings
                }),
            });
            onConfigured();
        } catch (error) {
            setError('Failed to save configuration. Please try again.');
            console.error('Error saving configuration:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isEnabled) {
        return (
            <p className="text-gray-500">Please complete the previous steps first.</p>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Automatic Synchronization</Label>
                            <p className="text-sm text-gray-500">
                                Keep your project synchronized automatically
                            </p>
                        </div>
                        <Switch
                            checked={settings.autoSync}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, autoSync: checked }))
                            }
                        />
                    </div>

                    {settings.autoSync && (
                        <div className="space-y-2">
                            <Label>Sync Interval (hours)</Label>
                            <Input
                                type="number"
                                min="1"
                                max="168"
                                value={settings.syncInterval}
                                onChange={(e) =>
                                    setSettings(prev => ({
                                        ...prev,
                                        syncInterval: parseInt(e.target.value) || 24
                                    }))
                                }
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Notifications</Label>
                            <p className="text-sm text-gray-500">
                                Receive notifications when changes are detected
                            </p>
                        </div>
                        <Switch
                            checked={settings.notifyOnChanges}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, notifyOnChanges: checked }))
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Preserve Metadata</Label>
                            <p className="text-sm text-gray-500">
                                Maintain original metadata during synchronization
                            </p>
                        </div>
                        <Switch
                            checked={settings.preserveMetadata}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, preserveMetadata: checked }))
                            }
                        />
                    </div>
                </div>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
            >
                {isSaving ? (
                    <Settings2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
        </div>
    );
}