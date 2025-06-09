'use client';

import {Suspense, useEffect, useState} from 'react';
import LoginStep from "@/components/steps/LoginStep";
import {useAuth} from "@/lib/AuthContext";
import {useGroup} from "@/lib/GroupContext";
import GroupPicker from "@/components/steps/GroupPicker";
import LoginFeedbackToast from "@/components/LoginFeedbackToast";
import Impersonation from "@/components/steps/Impersonation";
import InputDataStep from "@/components/steps/InputDataStep";
import ResolveDuplicatesStep from "@/components/steps/ResolveDuplicatesStep";
import SelectRootDirectoryStep from "@/components/steps/SelectRootDirectoryStep";
import {useInputData} from "@/lib/InputDataContext";
import UploadStep from "@/components/steps/UploadStep";
import SummaryStep from "@/components/steps/SummaryStep";
import {useUploadData} from "@/lib/UploadDataContext";

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
  const {user, impersonationTarget} = useAuth();
  const {group} = useGroup();
  const {file, parserContext, rowChecksCompleted} = useInputData();
  const { rows, uploadReport } = useUploadData();

  useEffect(() => {
    setCompletedSteps(prev => ({
      ...prev,
      [steps[0]]: !!user,
      [steps[1]]: !!user,
      [steps[2]]: !!group,
      [steps[3]]: !!parserContext.rootDir,
      [steps[4]]: !!file,
      [steps[5]]: rowChecksCompleted,
      [steps[6]]: rows.length > 0 && rows.every(row => row.status === 'completed' || row.status === 'skipped')
    }));
  }, [user, group, setCompletedSteps, parserContext.rootDir, file, rowChecksCompleted, rows]);

  const markStepComplete = (index: number) => {
    if (!completedSteps[steps[index]]) {
      setCompletedSteps({...completedSteps, [steps[index]]: true});
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
      <Impersonation key={`Impersonation-${user?.id}`} openByDefault={activeStep === 1} onSelect={() => setActiveStep(2)} />
      <GroupPicker key={`GroupPicker-${impersonationTarget?.id ?? user?.id}`} openByDefault={activeStep === 2} onSelect={() => setActiveStep(3)} />
      <SelectRootDirectoryStep key={`SelectRootDir-${impersonationTarget?.id ?? user?.id}`} openByDefault={activeStep === 3} onSuccess={() => setActiveStep(4)} />
      <InputDataStep key={`InputDataStep-${impersonationTarget?.id ?? user?.id}-${group?.id}`} openByDefault={activeStep === 4} onSuccess={() => setActiveStep(5)} />
      <ResolveDuplicatesStep key={`ResolveDuplicatesStep-${impersonationTarget?.id ?? user?.id}-${group?.id}`} openByDefault={activeStep === 5} onSuccess={() => {
        markStepComplete(5)
        setActiveStep(6)
      }} />
      <UploadStep key={`UploadStep-${impersonationTarget?.id ?? user?.id}-${group?.id}`} openByDefault={rows.length > 0} />
      <SummaryStep openByDefault={!!uploadReport} />
    </div>
  );
}
