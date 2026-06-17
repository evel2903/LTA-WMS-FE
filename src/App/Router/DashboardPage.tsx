import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

/** Placeholder landing page after sign-in. Replace with real KPI widgets. */
export function DashboardPage() {
  const cards = [
    { title: 'Open Inbound', value: '12', desc: 'Receipts awaiting putaway' },
    { title: 'Pending Picks', value: '38', desc: 'Across 6 zones' },
    { title: 'Low Stock SKUs', value: '7', desc: 'Below reorder point' },
    { title: "Today's Shipments", value: '21', desc: 'Scheduled to dispatch' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Operational overview</p>
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
