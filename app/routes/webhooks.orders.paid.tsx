import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, topic, shop } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    console.log("ORDERS_PAID payload diagnostics:", {
        orderId: payload.id,
        payloadKeys: Object.keys(payload),
        noteAttributesType: Array.isArray(payload.note_attributes)
            ? "array"
            : typeof payload.note_attributes,
        noteAttributeNames: Array.isArray(payload.note_attributes)
            ? payload.note_attributes.map(attr => attr.name)
            : [],
    });

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

        console.warn("Cashback purchase skipped", {
            orderId: payload.id,
            missingPromo: !cashbackPromo,
            missingKx: !kx,
        });

        return new Response();
    }

    console.log("Attempting cashback database upsert:", {
        orderId: payload.id,
        hasCashbackPromo: Boolean(cashbackPromo),
        hasKx: Boolean(kx),
    });

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
        },
        update: {},
    });

    console.log("Cashback database upsert completed");

    console.log("Cashback promo purchase recorded", {
        shop,
        orderId: payload.id,
        cashbackPromo,
    });

    return new Response();
};