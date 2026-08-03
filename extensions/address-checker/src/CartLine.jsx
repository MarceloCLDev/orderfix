import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default async () => {
  render(<CartLineSaleText />, document.body);
};

function CartLineSaleText() {
  const line = shopify.target.value;
  const attributes = shopify.attributes.value || [];
  const discountCodes = shopify.discountCodes.value || [];
  const title = line?.merchandise?.title || '';

  const excludedCodeRules = {
    BOGO: ['Travel Spray'],
    BLOWOUT: ['Travel Spray'],
    '10XMP': [],
    SAVEBIG: [],
  };

  const shouldHideBlurb = discountCodes.some(({code}) => {
    const normalizedCode = code.trim().toUpperCase();
    const excludedNames = excludedCodeRules[normalizedCode];

    // Any code starting with MP-
    if (normalizedCode.startsWith('MP-')) {
      return true;
    }

    // This code has no exclusion rule.
    if (!excludedNames) {
      return false;
    }

    // Empty list means exclude every cart item.
    if (excludedNames.length === 0) {
      return true;
    }

    // Otherwise, exclude only matching product titles.
    return excludedNames.some((name) =>
      title.toLowerCase().includes(name.toLowerCase())
    );
  });

  if (shouldHideBlurb) {
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