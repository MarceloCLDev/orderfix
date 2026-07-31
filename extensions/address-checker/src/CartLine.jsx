import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default async () => {
  render(<CartLineSaleText />, document.body);
};

function CartLineSaleText() {
  const line = shopify.target.value;
  const attributes = shopify.attributes.value || [];

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