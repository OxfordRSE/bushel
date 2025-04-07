'use client';

import {useEffect, useState} from 'react';
import { Input } from '@/components/ui/input';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import LoginStep from "@/components/steps/LoginStep";
import {useAuth} from "@/lib/AuthContext";
import {useProject} from "@/lib/ProjectContext";
import {ProjectPicker} from "@/components/steps/ProjectPicker";

const steps = [
    'Login via FigShare',
    'Select a Project',
    'Upload Excel File',
    'Fix Issues',
    'Resolve Data Clashes',
    'Upload to FigShare'
];

export default function AppFlow() {
    const [activeStep, setActiveStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const {user} = useAuth();
    const {project} = useProject();

    useEffect(() => {
        if (!!user) completedSteps.push(0);
        if (!!project) completedSteps.push(1);
    }, [user]);

    const markStepComplete = (index: number) => {
        if (!completedSteps.includes(index)) {
            setCompletedSteps(prev => [...prev, index]);
        }
    };

    const renderStepContent = (index: number) => {
        switch (index) {
            case 0:
                return <LoginStep onSuccessAction={() => {
                    markStepComplete(index)
                }} />;
            case 1:
                return <ProjectPicker />
            case 2:
                return (
                    <div className="w-full">
                        <label className="block mb-2 text-left font-medium">Upload Excel file:</label>
                        <Input type="file" accept=".xlsx,.xls" />
                    </div>
                );
            case 3:
                return (
                    <div className="w-full">
                        <label className="block mb-2 text-left font-medium">Issues found:</label>
                        <ul className="text-sm text-gray-700 ps-0">
                            <li>Entry #5: <kbd>title</kbd> field missing</li>
                            <li>Entry #8: <kbd>date</kbd> invalid format</li>
                        </ul>
                        <p className="mt-2 text-sm text-gray-500">Please fix issues in the file and re-upload.</p>
                    </div>
                );
            case 4:
                return (
                    <div className="text-left space-y-2">
                        <p>⚠️ Some entries already exist in FigShare.</p>
                        <ul className="list-disc pl-5 text-sm text-gray-700">
                            <li>Entry #12: Title conflict — "Mid-European Trade Routes"</li>
                            <li>Entry #19: Title conflict — "Nascent 'Silk Road' Trade"</li>
                        </ul>
                        <p className="text-sm text-gray-500">You will choose whether to overwrite, skip, or merge later.</p>
                    </div>
                );
            case 5:
                return (
                    <div className="text-left space-y-2">
                        <p className="font-medium">Upload Summary:</p>
                        <ul className="list-disc pl-5 text-sm text-gray-700">
                            <li>✅ 23 records uploaded</li>
                            <li>⚠️ 2 records skipped (conflicts)</li>
                            <li>📝 Summary report saved locally</li>
                        </ul>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-[60vh] flex flex-col gap-4 p-6 bg-gray-50 w-[90vw]">
            {steps.map((title, index) => {
                const isOpen = activeStep === index;
                const isComplete = completedSteps.includes(index);

                return (
                    <section
                        key={index}
                        className="border-l-4 pl-4 pr-2 py-4 bg-white rounded-md shadow-sm"
                    >
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setActiveStep(index)}
                        >
                            <div className="flex items-center gap-2">
                                {isComplete ? (
                                    <CheckCircle className="text-green-600 w-5 h-5" />
                                ) : (
                                    <span className="w-5 h-5 inline-block rounded-full border border-gray-300" />
                                )}
                                <h2 className="font-semibold text-lg">{title}</h2>
                            </div>
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>

                        {isOpen && (
                            <div className="mt-4 space-y-4">
                                {renderStepContent(index)}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
