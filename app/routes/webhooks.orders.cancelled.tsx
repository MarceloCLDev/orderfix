import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const orderId = String(payload.id);

  const result = await db.cashbackPromoPurchase.updateMany({
    where: {
      shop,
      orderId,
      status: "UNPAID",
    },
    data: {
      status: "CANCELLED",
    },
  });

  if (result.count > 0) {
    console.log("Cashback claim cancelled", {
      shop,
      orderId,
    });
  }

  return new Response();
};