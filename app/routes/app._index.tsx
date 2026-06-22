import {useLoaderData, useNavigate} from "react-router";
import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const range = Number(url.searchParams.get("range") || 7);

  const allowedRanges = [7, 30, 60, 90, 365];
  const days = allowedRanges.includes(range) ? range : 7;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const events = await prisma.orderFixEvent.findMany({
    where: {
      shop,
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      type: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const chartMap = new Map();

  for (let index = 0; index < days; index++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    const key = date.toISOString().slice(0, 10);

    chartMap.set(key, {
      date: key,
      addressEdits: 0,
      cancellations: 0,
    });
  }

  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10);
    const current = chartMap.get(key);

    if (!current) continue;

    if (event.type === "ADDRESS_EDITED") {
      current.addressEdits += 1;
    }

    if (event.type === "ORDER_CANCELLED") {
      current.cancellations += 1;
    }
  }

  const chartData = Array.from(chartMap.values());

  const addressEdits = chartData.reduce(
    (total, day) => total + day.addressEdits,
    0
  );

  const cancellations = chartData.reduce(
    (total, day) => total + day.cancellations,
    0
  );

  return {
    stats: {
      addressEdits,
      cancellations,
    },
    chartData,
    days,
  };
};

export default function Index() {
  const {stats, chartData, days} = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const xAxisInterval =
    days <= 7
      ? 1
      : days <= 30
      ? 5
      : days <= 60
      ? 7
      : days <= 90
      ? 10
      : 30;

  return (
    <s-page heading="OrderFix">
      <s-section>

        <s-stack direction="inline" justifyContent="space-between" alignItems="center" paddingBlock="none large">
          <s-heading>Analytics</s-heading>

          <div style={{ width: "180px" }}>
            <s-select
              label=""
              value={String(days)}
              onChange={(event) => {
                navigate(`?range=${event.target.value}`);
              }}
            >
              <s-option value="7">Last 7 days</s-option>
              <s-option value="30">Last 30 days</s-option>
              <s-option value="60">Last 60 days</s-option>
              <s-option value="90">Last 90 days</s-option>
              <s-option value="365">Last 365 days</s-option>
            </s-select>
          </div>
        </s-stack>

        <s-stack padding="large-100" background="subdued" borderRadius="large">
        <s-grid
          gridTemplateColumns="1fr 1fr"
          gap="large"
        >
          <s-box
            padding="large"
            border="base"
            borderRadius="large"
            background="base"
          >
            <s-stack gap="tight">
              <s-stack direction="inline" gap="small">
                <s-text appearance="subdued">
                  Orders Cancelled
                </s-text>
                <s-badge tone="success">Active</s-badge>
              </s-stack>

              <s-heading>
                {stats.cancellations}
              </s-heading>
            </s-stack>
          </s-box>

          <s-box
            padding="large"
            border="base"
            background="base"
            borderRadius="large"
          >
            <s-stack gap="tight">
              <s-stack direction="inline" gap="small">
                <s-text appearance="subdued">
                  Address Edited
                </s-text>
                <s-badge tone="success">Active</s-badge>
              </s-stack>

              <s-heading>
                {stats.addressEdits}
              </s-heading>
            </s-stack>
          </s-box>
        </s-grid>
        </s-stack>

        <s-box
          padding="large"
        >
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 16,
                  right: 8,
                  left: 8,
                  bottom: 24,
                }}
              >
                <CartesianGrid
                  vertical={false}
                  horizontal={true}
                  stroke="#f0f0f0"
                  strokeDasharray=""
                />

                <XAxis
                  dataKey="date"
                  interval={xAxisInterval}
                  interval="preserveStart"
                  stroke="#eeeeef"
                  tick={{ fill: "#616161", fontSize: 12 }}
                  tickFormatter={formatChartDate}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={22}
                  minTickGap={24}
                />

                <YAxis 
                  allowDecimals={false} 
                  domain={[0, 'dataMax + 1']} 
                  tickCount={4}
                  width="auto"
                  stroke="#eeeeef"
                  tick={{ fill: "#616161", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={16}
                />

                <Tooltip
                  labelFormatter={formatTooltipDate}
                />

                <Line
                  type="monotone"
                  dataKey="addressEdits"
                  name="Address edits"
                  stroke="#13acf0"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />

                <Line
                  type="monotone"
                  dataKey="cancellations"
                  name="Order cancellations"
                  stroke="#89cdeb"
                  strokeDasharray="3 4 5 2"
                  strokeWidth={1}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </s-box>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

function formatChartDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTooltipDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}