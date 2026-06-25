// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DashboardPage } from '@app/Router/DashboardPage';

afterEach(() => cleanup());

describe('DashboardPage V1 delivery snapshot', () => {
  it('renders V1 delivery snapshot instead of fake operational KPI counts', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Pilot readiness snapshot')).toBeTruthy();
    expect(screen.getByText('Core Flow Coverage')).toBeTruthy();
    expect(screen.getByText('Ready')).toBeTruthy();
    expect(screen.getByText('Pilot Evidence')).toBeTruthy();
    expect(screen.getByText('Conditional')).toBeTruthy();
    expect(screen.getByText('Navigation')).toBeTruthy();
    expect(screen.getByText('Clean')).toBeTruthy();
    expect(screen.getByText('Follow-up Review')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();

    for (const staleKpiText of [
      'Open Inbound',
      'Pending Picks',
      'Low Stock SKUs',
      "Today's Shipments",
      'Next BMAD Step',
      'Retro',
    ]) {
      expect(screen.queryByText(staleKpiText)).toBeNull();
    }
  });
});
