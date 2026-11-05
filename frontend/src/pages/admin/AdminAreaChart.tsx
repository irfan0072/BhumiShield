import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppUI } from '@/i18n';

interface AdminAreaChartProps {
  monthlySeries?: Array<{
    period: string;
    month: string;
    month_bn: string;
    deeds: number;
    mutations: number;
    blocked_risks: number;
  }>;
}

const fallbackSeries = [
  { period: '2026-05', month: 'May 2026', month_bn: 'মে ২০২৬', deeds: 18, mutations: 12, blocked_risks: 4 },
  { period: '2026-06', month: 'Jun 2026', month_bn: 'জুন ২০২৬', deeds: 24, mutations: 15, blocked_risks: 6 },
  { period: '2026-07', month: 'Jul 2026', month_bn: 'জুলাই ২০২৬', deeds: 32, mutations: 22, blocked_risks: 7 },
  { period: '2026-08', month: 'Aug 2026', month_bn: 'আগস্ট ২০২৬', deeds: 45, mutations: 28, blocked_risks: 9 },
  { period: '2026-09', month: 'Sep 2026', month_bn: 'সেপ্টেম্বর ২০২৬', deeds: 68, mutations: 35, blocked_risks: 12 },
  { period: '2026-10', month: 'Oct 2026', month_bn: 'অক্টোবর ২০২৬', deeds: 91, mutations: 42, blocked_risks: 15 },
];

export const AdminAreaChart: React.FC<AdminAreaChartProps> = ({ monthlySeries }) => {
  const { lang, t } = useAppUI();
  const [metricFilter, setMetricFilter] = React.useState<string>('all');

  const rawData = (monthlySeries && monthlySeries.length > 0) ? monthlySeries : fallbackSeries;
  const data = React.useMemo(() => {
    if (rawData.length > 12) {
      return rawData.slice(-12);
    }
    return rawData;
  }, [rawData]);

  const chartConfig = {
    deeds: {
      label: lang === 'bn' ? 'দলিলপত্র' : 'Deeds',
      color: 'hsl(158 64% 42%)',
    },
    mutations: {
      label: lang === 'bn' ? 'নামজারি' : 'Mutations',
      color: 'hsl(217 91% 60%)',
    },
    blocked_risks: {
      label: lang === 'bn' ? 'প্রতিহত ঝুঁকি' : 'Blocked Risks',
      color: 'hsl(0 84% 60%)',
    },
  } satisfies ChartConfig;

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
        <div>
          <CardTitle className="text-lg font-bold tracking-tight">
            {t('রেজিস্ট্রেশন ও নামজারি বিশ্লেষণ', 'Registration & Mutation Trends')}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {t('মাসিক দলিল, নামজারি ও প্রতিহত ঝুঁকি।', 'Monthly deeds, mutations, and blocked risks.')}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={metricFilter} onValueChange={setMetricFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs font-medium">
              <SelectValue placeholder={t('মেট্রিক নির্বাচন', 'Select Metric')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('সকল তথ্য', 'All Metrics')}</SelectItem>
              <SelectItem value="deeds">{t('দলিলপত্র', 'Deeds Only')}</SelectItem>
              <SelectItem value="mutations">{t('নামজারি', 'Mutations Only')}</SelectItem>
              <SelectItem value="blocked_risks">{t('প্রতিহত ঝুঁকি', 'Blocked Risks Only')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <AreaChart data={data} margin={{ left: 12, right: 12, top: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="fillDeeds" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-deeds)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-deeds)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillMutations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-mutations)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-mutations)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillRisks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-blocked_risks)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-blocked_risks)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey={lang === 'bn' ? 'month_bn' : 'month'}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
              className="text-xs"
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            {(metricFilter === 'all' || metricFilter === 'deeds') && (
              <Area
                dataKey="deeds"
                type="monotone"
                fill="url(#fillDeeds)"
                stroke="var(--color-deeds)"
                strokeWidth={2}
                name={chartConfig.deeds.label}
              />
            )}
            {(metricFilter === 'all' || metricFilter === 'mutations') && (
              <Area
                dataKey="mutations"
                type="monotone"
                fill="url(#fillMutations)"
                stroke="var(--color-mutations)"
                strokeWidth={2}
                name={chartConfig.mutations.label}
              />
            )}
            {(metricFilter === 'all' || metricFilter === 'blocked_risks') && (
              <Area
                dataKey="blocked_risks"
                type="monotone"
                fill="url(#fillRisks)"
                stroke="var(--color-blocked_risks)"
                strokeWidth={2}
                name={chartConfig.blocked_risks.label}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
