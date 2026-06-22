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
  return data({ok: true}, {headers: corsHeaders});
}

export async function action({request}) {
  try {
    const body = await request.json();
    const shop = body.shop;
    const address = body.address ?? body;

    const requiredFields = [
      ['firstName', 'First name is required'],
      ['lastName', 'Last name is required'],
      ['address1', 'Address is required'],
      ['city', 'City is required'],
      ['zip', 'Postal code is required'],
    ];

    for (const [field, message] of requiredFields) {
      if (!String(address[field] ?? '').trim()) {
        return data(
          {ok: false, error: message},
          {status: 400, headers: corsHeaders},
        );
      }
    }

    const cleanAddress = {
      firstName: String(address.firstName).trim(),
      lastName: String(address.lastName).trim(),
      phone: String(address.phone ?? '').trim(),
      address1: String(address.address1).trim(),
      address2: String(address.address2 ?? '').trim(),
      city: String(address.city).trim(),
      zip: String(address.zip).trim(),
    };

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
            shippingAddress: cleanAddress,
          },
        },
      },
    );

    const result = await response.json();

    const errors = result?.data?.orderUpdate?.userErrors ?? [];

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
        type: "ADDRESS_EDITED",
      },
    });

    return data(
      result, 
      {headers: corsHeaders}
    );
  } catch (error) {
    console.error("order address error", error);

    return data(
      {ok: false, error: String(error)},
      {status: 500, headers: corsHeaders},
    );
  }
}