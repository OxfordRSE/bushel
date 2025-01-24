// components/Steps.tsx
'use client';

import {useEffect, useState} from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { AuthStep } from './AuthStep';
import { ProjectStep } from './ProjectStep';
import { ConfigureStep } from './ConfigureStep';
import {useAtomValue, useSetAtom} from "jotai";
import {FigshareClient, figshareToken} from "@/lib/store";
import {useSearchParams} from "next/navigation";

interface StepProps {
    number: number;
    title: string;
    isComplete: boolean;
    isActive: boolean;
    children: React.ReactNode;
}

const Step = ({ number, title, isComplete, isActive, children }: StepProps) => (
    <Card className={`${isActive ? 'border-blue-500 border-2' : ''}`}>
        <CardHeader>
            <div className="flex items-center gap-2">
                <div className={`rounded-full w-8 h-8 flex items-center justify-center 
         ${isComplete ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-200'}`}>
                    {isComplete ?
                        <CheckCircle2 className="text-white w-6 h-6" /> :
                        <span className="text-white">{number}</span>
                    }
                </div>
                <CardTitle>{title}</CardTitle>
            </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);

export function Steps() {
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);
    const setFigshareToken = useSetAtom(figshareToken);
    const access_token = useSearchParams().get('access_token');
    const figshareClient = useAtomValue(FigshareClient);

    // Update the token from path query params
    useEffect(() => {
        console.log(access_token)
        if (access_token) {
            setFigshareToken(access_token);
        }
    }, [access_token, setFigshareToken]);

    return (
        <div className="space-y-4">
            <ul>
                <li>selectedProject - {selectedProject}</li>
                <li>isConfigured - {isConfigured}</li>
                <li>access_token - {access_token}</li>
                <li>figshareClient - {String(figshareClient)}</li>
            </ul>
            <Step
                number={1}
                title="Sign in with FigShare"
                isComplete={!!figshareClient}
                isActive={!figshareClient}
            >
                <AuthStep />
            </Step>

            <Step
                number={2}
                title="Select Project"
                isComplete={selectedProject !== null}
                isActive={!!figshareClient && !selectedProject}
            >
                <ProjectStep
                    isEnabled={!!figshareClient}
                    onProjectSelected={setSelectedProject}
                />
            </Step>

            <Step
                number={3}
                title="Configure Integration"
                isComplete={isConfigured}
                isActive={selectedProject !== null && !isConfigured}
            >
                <ConfigureStep
                    isEnabled={selectedProject !== null}
                    projectId={selectedProject}
                    onConfigured={() => setIsConfigured(true)}
                />
            </Step>
        </div>
    );
}