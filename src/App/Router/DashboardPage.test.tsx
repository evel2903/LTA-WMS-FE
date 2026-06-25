// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DashboardPage } from '@app/Router/DashboardPage';

afterEach(() => cleanup());

describe('DashboardPage V1 delivery snapshot', () => {
  it('renders V1 delivery snapshot instead of fake operational KPI counts', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Tổng quan sẵn sàng pilot')).toBeTruthy();
    expect(screen.getByText('Độ phủ quy trình lõi')).toBeTruthy();
    expect(screen.getByText('Sẵn sàng')).toBeTruthy();
    expect(screen.getByText('Bằng chứng pilot')).toBeTruthy();
    expect(screen.getByText('Có điều kiện')).toBeTruthy();
    expect(screen.getByText('Điều hướng')).toBeTruthy();
    expect(screen.getByText('Gọn sạch')).toBeTruthy();
    expect(screen.getByText('Rà soát tiếp theo')).toBeTruthy();
    expect(screen.getByText('Còn mở')).toBeTruthy();

    for (const staleKpiText of [
      'Nhập kho đang mở',
      'Lượt lấy hàng chờ xử lý',
      'SKU sắp hết hàng',
      'Chuyến giao hôm nay',
      'Bước BMAD tiếp theo',
      'Retro',
    ]) {
      expect(screen.queryByText(staleKpiText)).toBeNull();
    }
  });
});
