import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@shared/Components/Ui/Button';
import type { QuickLink } from '@modules/FoundationOverview/Domain/Entities/FoundationReadiness';

export function FoundationQuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {links.map((link) => (
        <Button key={link.to} asChild variant="outline" className="justify-between">
          <Link to={link.to}>
            {link.label}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      ))}
    </div>
  );
}
