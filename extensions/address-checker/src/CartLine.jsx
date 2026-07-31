import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default async () => {
  render(<CartLineSaleText />, document.body);
};

function CartLineSaleText() {
  const line = shopify.target.value;
  const attributes = shopify.attributes.value || [];
  const discountCodes = shopify.discountCodes.value || [];

  console.log(discountCodes)

  const excludedCodes = new Set([
    'BOGO',
    'BLOWOUT',
    '10XMP',
    'SAVEBIG',
  ]);

  const hasExcludedCode = discountCodes.some(({code}) =>
    excludedCodes.has(code.trim().toUpperCase())
  );

  if (hasExcludedCode) {
    return null;
  }

  const variantId = line?.merchandise?.id?.split('/').pop();

  if (!variantId) {
    return null;
  }

  const percentage = attributes.find(
    ({key}) => key === `sale_${variantId}`,
  )?.value;

  if (!percentage) {
    return null;
  }

  return (
    <s-text type="small" color="subdued">
      {percentage}% Off (Promo Codes Excluded)
    </s-text>
  );
}