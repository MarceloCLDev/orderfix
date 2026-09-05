import type {
  CartTransformRunInput,
  CartTransformRunResult,
} from "../generated/api";

export function cartTransformRun(
  input: CartTransformRunInput,
): CartTransformRunResult {
  const operations: CartTransformRunResult["operations"] = [];

  for (const line of input.cart.lines) {
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