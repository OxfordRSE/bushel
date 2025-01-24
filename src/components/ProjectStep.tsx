// components/ProjectStep.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {FIGSHARE_API_BASE} from "@/lib/config";
import {FigshareClient} from "@/lib/store";
import {useAtomValue} from "jotai/";

interface ProjectStepProps {
    isEnabled: boolean;
    onProjectSelected: (projectId: string) => void;
}

interface Project {
    id: string;
    title: string;
    published_date: string;
    url: string;
}

export function ProjectStep({ isEnabled, onProjectSelected }: ProjectStepProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const figshareApi = useAtomValue(FigshareClient);

    useEffect(() => {
        if (isEnabled) {
            fetchProjects();
        }
    }, [isEnabled]);

    const fetchProjects = async () => {
        setIsLoading(true);
        setError(null);

        if (!figshareApi) {
            setError('Figshare API client not available');
            setIsLoading(false);
            return;
        }

        try {
            const data = await figshareApi.request(`/projects`);
            setProjects(data);
        } catch (error) {
            setError('Failed to load projects. Please try again.');
            console.error('Error fetching projects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isEnabled) {
        return (
            <p className="text-gray-500">Please complete the previous step first.</p>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500">
                <p>{error}</p>
                <Button
                    variant="outline"
                    onClick={fetchProjects}
                    className="mt-2"
                >
                    Try Again
                </Button>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <p>No projects found. Create a project on FigShare first.</p>
        );
    }

    return (
        <div className="space-y-2">
            {projects.map((project) => (
                <Button
                    key={project.id}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => onProjectSelected(project.id)}
                >
                    <div className="flex flex-col items-start">
                        <span>{project.title}</span>
                        <span className="text-sm text-gray-500">
             Published: {new Date(project.published_date).toLocaleDateString()}
           </span>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                </Button>
            ))}
        </div>
    );
}