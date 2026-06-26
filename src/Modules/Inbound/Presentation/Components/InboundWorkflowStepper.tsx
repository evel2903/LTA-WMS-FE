import { CheckCircle2, CircleDashed, LockKeyhole, PlayCircle } from 'lucide-react';

import { cn } from '@shared/Utils/Cn';
import type {
  InboundWorkflowStep,
  InboundWorkflowStepState,
} from '@modules/Inbound/Presentation/Components/InboundWorkflowStepperModel';

const stateLabels: Record<InboundWorkflowStepState, string> = {
  done: 'Hoàn tất',
  active: 'Đang xử lý',
  waiting: 'Đang chờ',
  blocked: 'Bị chặn',
};

const stateIcon = {
  done: CheckCircle2,
  active: PlayCircle,
  waiting: CircleDashed,
  blocked: LockKeyhole,
} satisfies Record<InboundWorkflowStepState, typeof CheckCircle2>;

export function InboundWorkflowStepper({ steps }: { steps: InboundWorkflowStep[] }) {
  return (
    <nav aria-label="Luồng xử lý nhập kho" className="min-w-0 rounded-md border bg-card p-3">
      <ol className="grid gap-2 md:grid-cols-6">
        {steps.map((step, index) => {
          const Icon = stateIcon[step.state];
          const isActive = step.state === 'active';
          return (
            <li
              key={step.key}
              data-testid={`inbound-workflow-step-${step.key}`}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'min-w-0 rounded-md border p-3 text-sm',
                step.state === 'done' && 'border-emerald-200 bg-emerald-50 text-emerald-950',
                step.state === 'active' && 'border-primary bg-primary/5 text-foreground',
                step.state === 'waiting' && 'bg-background text-muted-foreground',
                step.state === 'blocked' && 'bg-muted/50 text-muted-foreground',
              )}
            >
              <div className="flex min-w-0 items-start gap-2">
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                    <span className="font-medium">{step.label}</span>
                  </div>
                  <span className="inline-flex rounded-md border px-2 py-0.5 text-xs font-medium">
                    {stateLabels[step.state]}
                  </span>
                  <p className="text-xs leading-5">{step.description}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
