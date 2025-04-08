'use client';

import {Suspense, useEffect, useState} from 'react';
import { Input } from '@/components/ui/input';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import LoginStep from "@/components/steps/LoginStep";
import {useAuth} from "@/lib/AuthContext";
import {useProject} from "@/lib/ProjectContext";
import {ProjectPicker} from "@/components/steps/ProjectPicker";
import LoginFeedbackToast from "@/components/LoginFeedbackToast";

const steps = [
    'Login via FigShare',
    'Select a Project',
    'Upload Excel File',
    'Fix Issues',
    'Resolve Data Clashes',
    'Upload to FigShare'
] as const;
type StepKey = (typeof steps)[number];
type StepStatus = Record<StepKey, boolean>;

export default function AppFlow() {
    const [activeStep, setActiveStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Partial<StepStatus>>({});
    const {user} = useAuth();
    const {project} = useProject();

    useEffect(() => {
        setCompletedSteps(prev => ({
            ...prev,
            [steps[0]]: !!user,
            [steps[1]]: !! project,
        }));
    }, [user, project, setCompletedSteps]);

    const markStepComplete = (index: number) => {
        if (!completedSteps[steps[index]]) {
            setCompletedSteps({...completedSteps, [index]: true});
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
                            <li>Entry #12: Title conflict — &#34;Mid-European Trade Routes&#34;</li>
                            <li>Entry #19: Title conflict — &#34;Nascent &#39;Silk Road&#39; Trade&#34;</li>
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
            <Suspense fallback={null}>
                <LoginFeedbackToast />
            </Suspense>
            {steps.map((title, index) => {
                const isOpen = activeStep === index;
                const isComplete = completedSteps[steps[index]];

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
