import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Measurement } from "@/lib/api";
import type { Period } from "@/hooks/use-measurements";

const chartConfig: ChartConfig = {
  temperature: { label: "温度", color: "#f97316" },
  humidity: { label: "湿度", color: "#3b82f6" },
};

const TIME_FORMAT: Record<Period, Intl.DateTimeFormatOptions> = {
  "24h": { hour: "2-digit", minute: "2-digit" },
  "7d": { month: "numeric", day: "numeric" },
  "30d": { month: "numeric", day: "numeric" },
};

interface DeviceChartProps {
  measurements: Measurement[];
  period: Period;
}

export function DeviceChart({ measurements, period }: DeviceChartProps) {
  const formatter = new Intl.DateTimeFormat("ja-JP", TIME_FORMAT[period]);
  const data = measurements.map((m) => ({
    time: formatter.format(new Date(m.recordedAt)),
    temperature: m.temperature,
    humidity: m.humidity,
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {Object.entries(chartConfig).map(([key, { label, color }]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
      <ChartContainer config={chartConfig}>
        <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={12} minTickGap={24} />
          <YAxis yAxisId="temperature" tickLine={false} axisLine={false} fontSize={12} width={36} domain={["auto", "auto"]} />
          <YAxis yAxisId="humidity" orientation="right" tickLine={false} axisLine={false} fontSize={12} width={36} domain={[0, 100]} />
          <ChartTooltip content={<ChartTooltipContent unitByKey={{ temperature: "℃", humidity: "%" }} />} />
          <Line yAxisId="temperature" type="monotone" dataKey="temperature" stroke="var(--color-temperature)" strokeWidth={2} dot={false} />
          <Line yAxisId="humidity" type="monotone" dataKey="humidity" stroke="var(--color-humidity)" strokeWidth={2} dot={false} />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
