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