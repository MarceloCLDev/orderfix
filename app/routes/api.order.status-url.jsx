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
  return data({ok: true}, {headers: corsHeaders});
}

export async function action({request}) {
  try {
    const {shop, orderIdentityId} = await request.json();

    console.log("status-url payload", {
    shop,
    orderIdentityId,
    });

    if (!shop || !orderIdentityId) {
        return data(
        {success: false, error: "Unable to generate order status URL"},
        {
            status: 500,
            headers: corsHeaders,
        }
        );
    }

    const adminOrderId = orderIdentityId.replace(
      "gid://shopify/OrderIdentity/",
      "gid://shopify/Order/"
    );

    const {admin} = await unauthenticated.admin(shop);

    const response = await admin.graphql(
      `#graphql
        query GetOrderStatusPageUrl($id: ID!) {
          order(id: $id) {
            id
            statusPageUrl(
              notificationUsage: WEB,
              audience: CUSTOMERVIEW
            )
          }
        }
      `,
      {
        variables: {
          id: adminOrderId,
        },
      }
    );

    const result = await response.json();

    const statusPageUrl = result?.data?.order?.statusPageUrl;

    if (!statusPageUrl) {
      return data(
        {success: false, error: "Order status URL not available"},
        {status: 400, headers: corsHeaders},
      );
    }

    return data(
    {success: true, statusPageUrl},
    {headers: corsHeaders}
    );
  } catch (error) {
    console.error("Order status URL error", error);

    return data(
      {success: false, error: "Unable to generate order status URL"},
      {status: 400, headers: corsHeaders},
    );
  }
}