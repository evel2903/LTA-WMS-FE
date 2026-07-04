// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Input } from '@shared/Components/Ui/Input';

describe('Input', () => {
  afterEach(() => cleanup());

  it('renders at the 40px RF touch-target floor, not the 36px default (IFB-09)', () => {
    render(<Input aria-label="test-input" />);
    const input = screen.getByLabelText('test-input');
    expect(input.className).toContain('h-10');
    expect(input.className).not.toContain('h-9');
  });
});
