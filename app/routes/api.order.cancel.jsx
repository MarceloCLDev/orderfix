import {data} from "react-router";
import {unauthenticated} from "../shopify.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function headers() {
  return corsHeaders;
}

export async function loader() {
  return data({ok: true, route: "api.order.cancel"}, {headers: corsHeaders});
}

export async function action({request}) {
  const body = await request.json();
  const shop = body.shop;

  if (!shop) {
    return data({ok: false, error: "Missing shop"}, {status: 400, headers: corsHeaders});
  }

  const {admin} = await unauthenticated.admin(shop);

  const response = await admin.graphql(
  `
    mutation orderCancel(
      $orderId: ID!,
      $reason: OrderCancelReason!,
      $restock: Boolean!
    ) {
      orderCancel(
        orderId: $orderId,
        reason: $reason,
        restock: $restock
      ) {
        job {
          id
        }

        userErrors {
          field
          message
        }
      }
    }
  `,
  {
    variables: {
      orderId: body.orderId,
      reason: "CUSTOMER",
      restock: true,
    },
  },
);

  const result = await response.json();

  return data(result, {headers: corsHeaders});
}