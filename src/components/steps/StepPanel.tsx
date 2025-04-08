'use client';

import { ReactNode, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Circle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

type Status = 'default' | 'complete' | 'error';

type Props = {
  title: ReactNode;
  status?: Status;
  children: ReactNode;
  openByDefault?: boolean;
  iconOverride?: ReactNode;
};

export default function StepPanel({
  title,
  status = 'default',
  children,
  openByDefault = false,
  iconOverride
}: Props) {
  const [isOpen, setIsOpen] = useState(openByDefault);

  const icon = iconOverride ?? {
    complete: <CheckCircle className="text-green-600 w-5 h-5" />,
    error: <XCircle className="text-red-500 w-5 h-5" />,
    default: <Circle className="text-gray-400 w-5 h-5" />
  }[status];

  return (
    <section className="border-l-4 pl-4 pr-2 py-4 bg-white rounded-md shadow-sm space-y-4">
      <button
        type="button"
        className="w-full flex items-center justify-between text-left"
        onClick={() => setIsOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-semibold text-lg">{title}</h2>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && <div>{children}</div>}
    </section>
  );
}
