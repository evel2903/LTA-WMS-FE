import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const reasonCodeOptions = vi.hoisted(() => ({
  useReasonCodeOptions: vi.fn(() => ({
    options: [{ value: 'OVERRIDE', label: 'OVERRIDE - Preview override' }],
    isLoading: false,
    isError: false,
  })),
}));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: reasonCodeOptions.useReasonCodeOptions,
}));

import { PreviewContextForm } from '@modules/WarehouseProfile/Presentation/Forms/PreviewContextForm';

/**
 * Note: RHF `register` produces UNCONTROLLED inputs (ref + defaultValue), so
 * pre-filled default values are not emitted as `value=` attributes by
 * `renderToStaticMarkup` (no DOM infra in this repo). The pre-fill projection is
 * therefore asserted deterministically in `BuildPreviewFormDefaults.test.ts`
 * (the pure helper the form consumes via `initialValue`). Here we assert the
 * structural contract the form must expose.
 */
describe('PreviewContextForm structure', () => {
  it('exposes the required warehouse type code axis', () => {
    const html = renderToStaticMarkup(<PreviewContextForm onSubmit={() => undefined} />);
    expect(html).toContain('Mã loại kho');
    expect(html).toContain('name="warehouseTypeCode"');
  });

  it('exposes the optional EvaluatedAt axis (AC4 optional field now surfaced)', () => {
    const html = renderToStaticMarkup(<PreviewContextForm onSubmit={() => undefined} />);
    expect(html).toContain('Thời điểm đánh giá');
    expect(html).toContain('name="evaluatedAt"');
  });

  it('disables the inputs and the run button when the form is disabled (read-only)', () => {
    const html = renderToStaticMarkup(<PreviewContextForm disabled onSubmit={() => undefined} />);
    expect(html).toContain('disabled');
  });

  it('accepts a pre-fill initialValue without throwing (Preview-this-profile wiring)', () => {
    const html = renderToStaticMarkup(
      <PreviewContextForm
        initialValue={{ warehouseTypeCode: 'DC', ownerId: 'owner-7' }}
        onSubmit={() => undefined}
      />,
    );
    // The form mounts with seeded defaults; never surfaces a literal "null".
    expect(html).not.toContain('value="null"');
    expect(html).toContain('Chạy preview');
  });
});
