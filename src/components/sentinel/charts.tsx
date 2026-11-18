import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Children, type ReactElement } from "react";
export const chartColors = {
  amber: "var(--primary)",
  green: "var(--success)",
  blue: "var(--info)",
  muted: "var(--muted-foreground)",
  red: "var(--destructive)",
};
export function Chart({
  data,
  series,
  x = "label",
  bar = false,
  height = 260,
  marker,
  recommended,
  onClick,
  yMax,
}: {
  data: Record<string, unknown>[];
  series: { key: string; name: string; color: string }[];
  x?: string;
  bar?: boolean;
  height?: number;
  marker?: number | undefined;
  recommended?: number | undefined;
  onClick?: (value: number) => void;
  yMax?: number;
}) {
  const shared = { data, margin: { top: 12, right: 14, bottom: 0, left: -16 } };
  const content: ReactElement<{ children: React.ReactNode }> = (
    <>
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
      <XAxis
        dataKey={x}
        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        minTickGap={35}
      />
      <YAxis
        domain={yMax ? [0, yMax] : ["auto", "auto"]}
        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <Tooltip
        contentStyle={{
          background: "var(--popover)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: "var(--foreground)",
          fontSize: 12,
        }}
        cursor={{ stroke: "var(--border)", fill: "var(--chart-hover)" }}
      />
      <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, paddingTop: 18 }} />
      {series.map((s) =>
        bar ? (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            radius={[3, 3, 0, 0]}
            maxBarSize={26}
          />
        ) : (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ),
      )}
      {marker !== undefined && (
        <ReferenceLine
          x={marker}
          stroke="var(--primary)"
          strokeDasharray="4 4"
          label={{ value: "Selected", fill: "var(--primary)", fontSize: 10 }}
        />
      )}
      {recommended !== undefined && (
        <ReferenceLine
          x={recommended}
          stroke="var(--success)"
          strokeDasharray="2 4"
          label={{
            value: "Recommended",
            fill: "var(--success)",
            fontSize: 10,
            position: "insideBottomRight",
          }}
        />
      )}
    </>
  );
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {bar ? (
          <BarChart {...shared}>{Children.toArray(content.props.children)}</BarChart>
        ) : (
          <LineChart
            {...shared}
            onClick={(s) => {
              if (onClick && s?.activeLabel !== undefined) onClick(Number(s.activeLabel));
            }}
          >
            {Children.toArray(content.props.children)}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
