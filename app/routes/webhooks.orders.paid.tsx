import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, topic, shop } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    const attributes = Object.fromEntries(
        (Array.isArray(payload.note_attributes)
        ? payload.note_attributes
        : []
        ).map((attr) => [attr.name, attr.value])
    );

    const cashbackPromo = String(attributes.cashback_promo ?? "").trim();
    const kx = String(attributes.kx ?? "").trim();

    // Ignore orders without cashback promo attributes
    if (!cashbackPromo || !kx) {
        return new Response();
    }

    await db.cashbackPromoPurchase.upsert({
    where: {
        shop_orderId: {
        shop,
        orderId: String(payload.id),
        },
    },
    create: {
        shop,
        orderId: String(payload.id),
        cashbackPromo,
        kx,
        status: "PAID",
    },
    update: {
        status: "PAID",
    },
    });

    console.log("Cashback promo purchase recorded", {
        shop,
        orderId: payload.id,
        cashbackPromo,
    });

    return new Response();
};