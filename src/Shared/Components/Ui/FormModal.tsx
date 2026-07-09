import type { ReactNode } from 'react';

import { Button } from '@shared/Components/Ui/Button';

export interface FormModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}

/** Centered overlay dialog wrapping a create/edit form. Extracted from
 * PhysicalStructureCatalogPage so other master-data pages (SiteMasterPage) can reuse it. */
export function FormModal({ title, open, onClose, children }: FormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8">
      <button aria-label="Đóng lớp phủ" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <section
        aria-label={title}
        aria-modal="true"
        className="relative z-10 w-full max-w-xl rounded-md border bg-background p-5 shadow-lg"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button type="button" variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
