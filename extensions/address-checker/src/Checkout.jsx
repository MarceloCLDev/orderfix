import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {APP_URL} from '../../config';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {

  const variant = shopify.attributes.current.find(
    (attribute) =>
      attribute.key === 'validation_banner_test_variant'
  )?.value;

  if (variant !== 'B') {
    console.log('No Variant B, No address validation');
    return null;
  }

  const address = shopify.shippingAddress.current;
  const hasWarning = hasAddressWarning(address);

  if (!hasWarning) {
    return null;
  }

  trackBannerHit({
    shop: shopify.shop.myshopifyDomain,
    reason: 'address_warning',
  });

  return (
    <s-banner
      heading="Is your shipping address correct?"
      tone="warning"
    >
      <s-paragraph>
        We want to make sure your order arrives quickly. Please take a quick look at your shipping address to ensure no important details are missing.
      </s-paragraph>
    </s-banner>
  );
}

function hasAddressWarning(address) {
  const address1 = address?.address1?.trim() || '';
  const address2 = address?.address2?.trim() || '';
  const city = address?.city?.trim() || '';
  const provinceCode = address?.provinceCode?.trim() || '';
  const zip = address?.zip?.trim() || '';
  const countryCode = address?.countryCode?.trim() || '';

  if (!address1) {
    return false;
  }

  if (address1.length < 6) {
    return true;
  }

  if (
    address2 &&
    address1.toLowerCase() === address2.toLowerCase()
  ) {
    return true;
  }

  if (!/\d/.test(address1) && !isPoBox(address1)) {
    return true;
  }

  if (!/[a-z]/i.test(address1)) {
    return true;
  }

  if (!city || city.length < 3) {
    return true;
  }

  if (countryCode === 'US' && !provinceCode) {
    return true;
  }

  if (
    countryCode === 'US' &&
    zip &&
    !/^\d{5}(-\d{4})?$/.test(zip)
  ) {
    return true;
  }

  return false;
}

function isPoBox(value) {
  return /\bP(?:OST)?\.?\s*O(?:FFICE)?\.?\s*BOX\s+\d+\b/i.test(
    value
  );
}

async function trackBannerHit(payload) {
  try {
    const response = await fetch(
      `${APP_URL}/api/validation-banner-hit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Tracking request failed with status ${response.status}`
      );
    }

    const result = await response.json();

    console.log('Address warning tracked:', result);
  } catch (error) {
    console.error('Address warning tracking error:', error);
  }
}