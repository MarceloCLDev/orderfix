import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  const orderId = String(payload.id);

  const result = await db.cashbackPromoPurchase.updateMany({
    where: {
      shop,
      orderId,
      status: "PURCHASED",
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