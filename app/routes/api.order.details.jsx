import {data} from "react-router";
import {unauthenticated} from "../shopify.server";
import {getOrderFixSettings} from "../models/orderFixSettings.server";
import {getOrderFixAvailability} from "../utils/orderFixAvailability.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function headers() {
  return corsHeaders;
}

export async function loader() {
  return data({ok: true, route: "api.order.details"}, {headers: corsHeaders});
}

export async function action({request}) {
  try {
    const body = await request.json();
    const shop = body.shop;

    if (!shop) {
    return data({ok: false, error: "Missing shop"}, {status: 400, headers: corsHeaders});
    }

    const {admin} = await unauthenticated.admin(shop);
    const response = await admin.graphql(
      `
        query OrderDetails($id: ID!) {
          order(id: $id) {
            id
            createdAt
            displayFulfillmentStatus
            shippingAddress {
              firstName
              lastName
              phone
              address1
              address2
              city
              province
              provinceCode
              zip
              countryCodeV2
            }
          }
        }
      `,
      {
        variables: {
          id: body.orderId,
        },
      },
    );

    const result = await response.json();
    const order = result.data.order;

    const settings = await getOrderFixSettings(shop);
    const availability = getOrderFixAvailability(order, settings);

    return data(
      {
        ok: true,
        order,
        availability,
        shippingAddress: order.shippingAddress,
      },
      {headers: corsHeaders},
    );

  } catch (error) {
    console.error("order details error", error);

    return data(
      {ok: false, error: String(error)},
      {status: 500, headers: corsHeaders},
    );
  }
}