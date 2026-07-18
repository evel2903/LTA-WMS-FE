import { Ban, Check, CircleDashed, Lock, Play, UserCheck } from 'lucide-react';

import { cn } from '@shared/Utils/Cn';
import type {
  InboundWorkflowStep,
  InboundWorkflowStepState,
} from '@modules/InboundReceiving/Presentation/Components/InboundWorkflowStepperModel';

const stateLabels: Record<InboundWorkflowStepState, string> = {
  done: 'Hoàn tất',
  active: 'Đang xử lý',
  waiting: 'Đang chờ',
  blocked: 'Bị chặn',
  approval: 'Cần phê duyệt',
  skipped: 'Không yêu cầu',
  cancelled: 'Đã hủy',
};

// Icon shown inside the status circle. `waiting` has no glyph (the step number is
// rendered instead) so it maps to null.
const stateCircleIcon: Record<InboundWorkflowStepState, typeof Check | null> = {
  done: Check,
  active: Play,
  waiting: null,
  blocked: Lock,
  approval: UserCheck,
  skipped: CircleDashed,
  cancelled: Ban,
};

// Status circle tint, kept consistent with the per-state palette used elsewhere
// in the console (emerald = done, primary = active, sky = skipped, muted = rest).
// `approval` gets its own violet tint, distinct from `blocked`'s amber — a rule
// resolving ApprovalRequired is recoverable via the override control already on
// screen, not a hard stop, so it must not read as the same "locked" state.
// `cancelled` gets its own rose tint, distinct from both — a Cancelled (terminal)
// doc is permanently dead, not a recoverable block (IFB-07).
const stateCircleClass: Record<InboundWorkflowStepState, string> = {
  done: 'border-emerald-500 bg-emerald-500 text-white',
  active: 'border-primary bg-primary text-primary-foreground',
  waiting: 'border-border bg-background text-muted-foreground',
  blocked: 'border-amber-300 bg-amber-50 text-amber-700',
  approval: 'border-violet-300 bg-violet-50 text-violet-700',
  skipped: 'border-sky-300 bg-sky-50 text-sky-700',
  cancelled: 'border-rose-300 bg-rose-50 text-rose-700',
};

// State-text tint shown under each label.
const stateTextClass: Record<InboundWorkflowStepState, string> = {
  done: 'text-emerald-700',
  active: 'text-primary',
  waiting: 'text-muted-foreground',
  blocked: 'text-amber-700',
  approval: 'text-violet-700',
  skipped: 'text-sky-700',
  cancelled: 'text-rose-700',
};

interface InboundWorkflowStepperProps {
  onStepSelect?: (step: InboundWorkflowStep) => void;
  selectedStepKey?: string | null;
  steps: InboundWorkflowStep[];
}

// A connector segment leaving step i is "completed" (emerald) once that step has
// honestly cleared — it is `done` or `skipped`; every other state (active, waiting,
// blocked) keeps the muted border colour so the line never claims progress that has
// not happened. A skipped step therefore still advances its outgoing connector.
function isSegmentCompleted(state: InboundWorkflowStepState | undefined) {
  return state === 'done' || state === 'skipped';
}

function StepCircle({
  index,
  state,
}: {
  index: number;
  state: InboundWorkflowStepState;
}) {
  const Icon = stateCircleIcon[state];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
        stateCircleClass[state],
      )}
    >
      {Icon ? <Icon className="size-4" /> : index + 1}
    </span>
  );
}

function StepNode({
  index,
  step,
}: {
  index: number;
  step: InboundWorkflowStep;
}) {
  return (
    <span className="flex w-full flex-col items-center gap-1 text-center">
      <StepCircle index={index} state={step.state} />
      <span className="flex flex-col items-center gap-0.5">
        <span className="flex items-center gap-1 text-sm font-medium leading-tight text-foreground">
          <span className="text-xs text-muted-foreground">{index + 1}</span>
          <span>{step.label}</span>
        </span>
        <span className={cn('text-xs font-medium leading-tight', stateTextClass[step.state])}>
          {stateLabels[step.state]}
        </span>
      </span>
    </span>
  );
}

export function InboundWorkflowStepper({
  onStepSelect,
  selectedStepKey,
  steps,
}: InboundWorkflowStepperProps) {
  const activeStep = steps.find((step) => step.state === 'active');
  return (
    <nav
      aria-label="Luồng xử lý nhập kho"
      // Cap the connected step row at ~1024px (max-w-5xl) and left-align it (no
      // mx-auto) so on wide screens the steps stay grouped with tight connectors
      // instead of spreading edge-to-edge. The cap is on the nav; the inner
      // overflow-x-auto + the ol's min-w-max are PRESERVED so a wide row at 390px
      // still scrolls horizontally inside this container rather than overflowing.
      className="min-w-0 max-w-5xl rounded-md border bg-card p-3"
    >
      {/* Horizontally scrollable so a wide connected row never forces the whole page
          to scroll sideways at 390px; touch targets stay >= 40px (min-h-16 button +
          size-9 circle). */}
      <div className="overflow-x-auto">
        <ol className="flex min-w-max items-start">
          {steps.map((step, index) => {
            const isActive = step.state === 'active';
            const isSelected = selectedStepKey === step.key;
            // The non-active helper text becomes a hover tooltip so it stays available
            // without crowding the connected row; the active step shows its description
            // as a single line below the stepper instead. To keep that text reachable
            // by keyboard/screen-reader users too (a `title` alone is not), the same
            // description is mirrored into a visually-hidden node referenced via
            // `aria-describedby` — this augments the description WITHOUT altering the
            // node's accessible name (which stays `${label}: ${stateLabel}`).
            const nodeTitle = isActive ? undefined : `${step.label}: ${step.description}`;
            const descriptionId = isActive ? undefined : `inbound-workflow-step-desc-${step.key}`;
            const node = onStepSelect ? (
              <button
                type="button"
                className={cn(
                  // cursor-pointer + hover tint signal the node is clickable; rings are
                  // `ring-inset` (not offset) because the horizontally-scrollable parent
                  // computes overflow-y:auto and would clip an offset ring's top/bottom,
                  // leaving only the side bars (the ugly "[ ]" look).
                  'flex min-h-16 w-full cursor-pointer flex-col items-center rounded-md px-1 py-1 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  isSelected && 'bg-primary/10 ring-2 ring-primary ring-inset',
                )}
                onClick={() => onStepSelect(step)}
                aria-pressed={isSelected}
                aria-label={`${step.label}: ${stateLabels[step.state]}`}
                aria-describedby={descriptionId}
                title={nodeTitle}
                data-testid={`inbound-workflow-step-button-${step.key}`}
              >
                <StepNode index={index} step={step} />
                {descriptionId ? (
                  <span id={descriptionId} className="sr-only">
                    {step.description}
                  </span>
                ) : null}
              </button>
            ) : (
              <span
                title={nodeTitle}
                aria-describedby={descriptionId}
                className="flex w-full flex-col items-center px-1 py-1"
              >
                <StepNode index={index} step={step} />
                {descriptionId ? (
                  <span id={descriptionId} className="sr-only">
                    {step.description}
                  </span>
                ) : null}
              </span>
            );

            return (
              <li
                key={step.key}
                data-testid={`inbound-workflow-step-${step.key}`}
                aria-current={isActive ? 'step' : undefined}
                className="flex min-w-0 items-start"
              >
                <div className="flex w-24 shrink-0 flex-col items-center sm:w-28">{node}</div>
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-[18px] h-0.5 w-6 shrink-0 rounded-full sm:w-10',
                      // The segment leaving this node is emerald once this step has
                      // honestly cleared (done or skipped); otherwise it stays muted.
                      isSegmentCompleted(step.state) ? 'bg-emerald-400' : 'bg-border',
                    )}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
      {/* Active-step description: a single helper line shown only for the current
          step (non-active descriptions live in each node's `title` tooltip plus an
          sr-only `aria-describedby` target). Rendered only when the active step
          actually carries description text, so an empty step adds no stray <p>/margin. */}
      {activeStep?.description?.trim() ? (
        <p
          className="mt-2 break-words text-xs leading-5 text-muted-foreground"
          data-testid="inbound-workflow-active-step-description"
        >
          {activeStep.description}
        </p>
      ) : null}
    </nav>
  );
}
