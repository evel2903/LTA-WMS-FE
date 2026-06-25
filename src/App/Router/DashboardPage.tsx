import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export function DashboardPage() {
  const cards = [
    {
      title: 'Độ phủ quy trình lõi',
      value: 'Sẵn sàng',
      desc: 'Các màn hình nhập kho, kiểm soát tồn kho, xuất kho, giao hàng và tích hợp đã sẵn sàng để rà soát pilot.',
    },
    {
      title: 'Bằng chứng pilot',
      value: 'Có điều kiện',
      desc: 'WT-01, WT-05 và WT-06 đã có bằng chứng xác thực có mục tiêu.',
    },
    {
      title: 'Điều hướng',
      value: 'Gọn sạch',
      desc: 'Sidebar chỉ hiển thị các điểm vào module đã triển khai.',
    },
    {
      title: 'Rà soát tiếp theo',
      value: 'Còn mở',
      desc: 'Cần rà soát runtime pilot trước khi xem dữ liệu dashboard là KPI vận hành trực tiếp.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bảng điều khiển</h1>
        <p className="text-muted-foreground">Tổng quan sẵn sàng pilot</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader>
              <CardDescription>{c.title}</CardDescription>
              <CardTitle className="text-3xl">{c.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">{c.desc}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
