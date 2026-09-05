import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    mutation {
      cartTransformCreate(
        functionHandle: "promo-price-transform"
      ) {
        cartTransform {
          id
          functionId
        }
        userErrors {
          field
          message
        }
      }
    }
  `);

  const data = await response.json();

  return Response.json(data);
};