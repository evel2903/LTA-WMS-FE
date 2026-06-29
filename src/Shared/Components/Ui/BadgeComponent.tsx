import type * as React from 'react';

import {
  Badge as ReuiBadge,
} from '@shared/Components/Reui/badge';

type LegacyBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning';

interface BadgeProps extends React.ComponentProps<'span'> {
  variant?: LegacyBadgeVariant | null;
}

function Badge(props: BadgeProps) {
  return <ReuiBadge {...props} />;
}

export { Badge, type BadgeProps };
