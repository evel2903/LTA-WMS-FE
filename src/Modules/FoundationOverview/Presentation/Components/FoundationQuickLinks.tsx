import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@shared/Components/Ui/Button';
import type { QuickLink } from '@modules/FoundationOverview/Domain/Entities/FoundationReadiness';

export interface QuickLinkGroup {
  title: string;
  description: string;
  links: QuickLink[];
}

export function FoundationQuickLinks({ groups }: { groups: QuickLinkGroup[] }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <p className="text-muted-foreground text-xs">{group.description}</p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {group.links.map((link) => (
              <Button
                key={`${group.title}-${link.to}-${link.label}`}
                asChild
                variant="outline"
                className="h-auto min-h-10 min-w-0 justify-between whitespace-normal text-left"
              >
                <Link to={link.to}>
                  <span className="min-w-0">{link.label}</span>
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
              </Button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
