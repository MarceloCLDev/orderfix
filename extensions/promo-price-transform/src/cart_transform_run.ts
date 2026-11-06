/*
import type {
  CartTransformRunInput,
  CartTransformRunResult,
} from "../generated/api";

export function cartTransformRun(
  input: CartTransformRunInput,
): CartTransformRunResult {
  const operations: CartTransformRunResult["operations"] = [];

  for (const line of input.cart.lines) {
    const isMysteryGift = line.mysteryGift?.value === "true";

    // Mystery gift takes priority over custom price
    if (isMysteryGift) {
      operations.push({
        lineUpdate: {
          cartLineId: line.id,
          title: "Mystery Gift",
          image: {
            url: "https://cdn.shopify.com/s/files/1/0755/3607/2955/files/mystery-gift.jpg",
          },
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: "0.00",
              },
            },
          },
        },
      });

      continue;
    }

    // Existing custom-price logic
    const customPrice = line.customPrice?.value;
    const price = Number(customPrice);

    if (customPrice && Number.isFinite(price) && price >= 0) {
      operations.push({
        lineUpdate: {
          cartLineId: line.id,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: price.toFixed(2),
              },
            },
          },
        },
      });
    }
  }

  return { operations };
}
*/


import type {
  CartTransformRunInput,
  CartTransformRunResult,
} from "../generated/api";

const MYSTERY_GIFT_IMAGE =
  "https://cdn.shopify.com/s/files/1/0755/3607/2955/files/mystery-gift.jpg";

type Promo = {
  gift_product?: string[];
};

export function cartTransformRun(
  input: CartTransformRunInput,
): CartTransformRunResult {
  const operations: CartTransformRunResult["operations"] = [];

  // Read promo configuration
  let promos: Record<string, Promo> = {};

  try {
    promos = JSON.parse(input.shop.metafield?.value ?? "{}");
  } catch {
    promos = {};
  }

  for (const line of input.cart.lines) {
    const isMysteryGift = line.mysteryGift?.value === "true";

    if (isMysteryGift) {
      const promoCode = line.giftPromo?.value?.trim().toUpperCase();

      if (!promoCode) continue;

      // Only transform quantity 1
      if (line.quantity !== 1) {
        continue;
      }

      // Find promo in metafield
      const promo = promos[promoCode];

      if (!promo || !Array.isArray(promo.gift_product)) {
        continue;
      }

      // Get actual variant ID
      if (line.merchandise.__typename !== "ProductVariant") {
        continue;
      }

      const variantId = line.merchandise.id.split("/").pop();

      // Check variant against allowed gift products
      if (!variantId || !promo.gift_product.includes(variantId)) {
        continue;
      }

      // Authorized mystery gift
      operations.push({
        lineUpdate: {
          cartLineId: line.id,

          title: "Mystery Gift",

          image: {
            url: MYSTERY_GIFT_IMAGE,
          },

          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: "0.00",
              },
            },
          },
        },
      });

      continue;
    }

    // Existing custom-price logic
    const customPrice = line.customPrice?.value;
    const price = Number(customPrice);

    if (customPrice && Number.isFinite(price) && price >= 0) {
      operations.push({
        lineUpdate: {
          cartLineId: line.id,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: price.toFixed(2),
              },
            },
          },
        },
      });
    }
  }

  return { operations };
}