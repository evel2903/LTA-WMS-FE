import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export function DashboardPage() {
  const cards = [
    {
      title: 'Core Flow Coverage',
      value: 'Ready',
      desc: 'Inbound, inventory control, outbound, shipping and integration screens are available for pilot review.',
    },
    {
      title: 'Pilot Evidence',
      value: 'Conditional',
      desc: 'WT-01, WT-05 and WT-06 are covered by targeted validation evidence.',
    },
    {
      title: 'Navigation',
      value: 'Clean',
      desc: 'Sidebar exposes only implemented module entry points.',
    },
    {
      title: 'Follow-up Review',
      value: 'Open',
      desc: 'Run a pilot runtime review before treating dashboard data as live operational KPIs.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Pilot readiness snapshot</p>
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
