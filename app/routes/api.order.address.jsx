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
    const body = await request.json();
    const shop = body.shop;
    const address = body.address ?? body;

    if (!shop) {
      return data({ok: false, error: "Missing shop"}, {status: 400, headers: corsHeaders});
    }

    const {admin} = await unauthenticated.admin(shop);

    const response = await admin.graphql(
      `
        mutation orderUpdate($input: OrderInput!) {
          orderUpdate(input: $input) {
            order {
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
          input: {
            id: body.orderId,
            shippingAddress: {
              firstName: address.firstName,
              lastName: address.lastName,
              phone: address.phone,
              address1: address.address1,
              address2: address.address2,
              city: address.city,
              zip: address.zip,
            },
          },
        },
      },
    );

    const result = await response.json();

    return data(result, {headers: corsHeaders});
  } catch (error) {
    console.error("order address error", error);

    return data(
      {ok: false, error: String(error)},
      {status: 500, headers: corsHeaders},
    );
  }
}