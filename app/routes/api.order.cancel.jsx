import {data} from "react-router";
import {unauthenticated} from "../shopify.server";
import prisma from "../db.server";

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
        $restock: Boolean!,
        $staffNote: String
      ) {
        orderCancel(
          orderId: $orderId,
          reason: $reason,
          restock: $restock,
          staffNote: $staffNote
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
        staffNote: `Reason: ${body.cancelReason}.`,
      },
    },
  );

  const result = await response.json();

  const errors = result?.data?.orderCancel?.userErrors ?? [];

  if (errors.length > 0) {
    return data(
      result,
      {status: 400, headers: corsHeaders}
    );
  }

  await prisma.orderFixEvent.create({
    data: {
      shop,
      orderId: body.orderId,
      type: "ORDER_CANCELLED",
    },
  });

  return data(result, {headers: corsHeaders});
}