'use client';

import {Suspense, useEffect, useState} from 'react';
import LoginStep from "@/components/steps/LoginStep";
import {useAuth} from "@/lib/AuthContext";
import {useGroup} from "@/lib/GroupContext";
import GroupPicker from "@/components/steps/GroupPicker";
import LoginFeedbackToast from "@/components/LoginFeedbackToast";
import Impersonation from "@/components/steps/Impersonation";
import InputDataStep from "@/components/steps/InputDataStep";

const steps = [
    'Login via FigShare',
    'Choose Impersonation Target',
    'Select a Group',
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
    const {group} = useGroup();

    useEffect(() => {
        setCompletedSteps(prev => ({
            ...prev,
            [steps[0]]: !!user,
            [steps[1]]: !!user,
            [steps[2]]: !!group,
        }));
    }, [user, group, setCompletedSteps]);

    const markStepComplete = (index: number) => {
        if (!completedSteps[steps[index]]) {
            setCompletedSteps({...completedSteps, [index]: true});
        }
    };

    return (
        <div className="min-h-[60vh] flex flex-col gap-4 p-6 bg-gray-50 w-[90vw]">
            <Suspense fallback={null}>
                <LoginFeedbackToast/>
            </Suspense>
            <LoginStep onSuccessAction={() => {
                markStepComplete(0)
                setActiveStep(1);
            }} openByDefault={activeStep === 0}/>
            <Impersonation openByDefault={activeStep === 1} onSelect={() => setActiveStep(2)} />
            <GroupPicker openByDefault={activeStep === 2} onSelect={() => setActiveStep(3)} />
            <InputDataStep openByDefault={activeStep === 3} onSuccess={() => setActiveStep(4)} />
            {/*<div className="w-full">*/}
            {/*    <label className="block mb-2 text-left font-medium">Issues found:</label>*/}
            {/*    <ul className="text-sm text-gray-700 ps-0">*/}
            {/*        <li>Entry #5: <kbd>title</kbd> field missing</li>*/}
            {/*        <li>Entry #8: <kbd>date</kbd> invalid format</li>*/}
            {/*    </ul>*/}
            {/*    <p className="mt-2 text-sm text-gray-500">Please fix issues in the file and re-upload.</p>*/}
            {/*</div>*/}
            {/*<div className="text-left space-y-2">*/}
            {/*    <p>⚠️ Some entries already exist in FigShare.</p>*/}
            {/*    <ul className="list-disc pl-5 text-sm text-gray-700">*/}
            {/*        <li>Entry #12: Title conflict — &#34;Mid-European Trade Routes&#34;</li>*/}
            {/*        <li>Entry #19: Title conflict — &#34;Nascent &#39;Silk Road&#39; Trade&#34;</li>*/}
            {/*    </ul>*/}
            {/*    <p className="text-sm text-gray-500">You will choose whether to overwrite, skip, or merge later.</p>*/}
            {/*</div>*/}
            {/*<div className="text-left space-y-2">*/}
            {/*    <p className="font-medium">Upload Summary:</p>*/}
            {/*    <ul className="list-disc pl-5 text-sm text-gray-700">*/}
            {/*        <li>✅ 23 records uploaded</li>*/}
            {/*        <li>⚠️ 2 records skipped (conflicts)</li>*/}
            {/*        <li>📝 Summary report saved locally</li>*/}
            {/*    </ul>*/}
            {/*</div>*/}
        </div>
    );
}
