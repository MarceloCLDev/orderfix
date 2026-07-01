import {useEffect, useState} from 'preact/hooks';
import {getAddressWarnings} from './utils/addressWarnings';
import {formatTimeLeft} from './utils/timeLeft';
import {APP_URL} from './config';

const US_STATE_ZIP_RANGES = {
  AK: [[99501, 99950]],
  AL: [[35004, 36925]],
  AR: [[71601, 72959], [75502, 75502]],
  AZ: [[85001, 86556]],
  CA: [[90001, 96162]],
  CO: [[80001, 81658]],
  CT: [[6001, 6389], [6401, 6928]],
  DC: [[20001, 20039], [20042, 20599], [20799, 20799]],
  DE: [[19701, 19980]],
  FL: [[32004, 34997]],
  GA: [[30001, 31999], [39901, 39901]],
  HI: [[96701, 96898]],
  IA: [[50001, 52809], [68119, 68120]],
  ID: [[83201, 83876]],
  IL: [[60001, 62999]],
  IN: [[46001, 47997]],
  KS: [[66002, 67954]],
  KY: [[40003, 42788]],
  LA: [[70001, 71232], [71234, 71497]],
  MA: [[1001, 2791], [5501, 5544]],
  MD: [[20331, 20331], [20335, 20797], [20812, 21930]],
  ME: [[3901, 4992]],
  MI: [[48001, 49971]],
  MN: [[55001, 56763]],
  MO: [[63001, 65899]],
  MS: [[38601, 39776], [71233, 71233]],
  MT: [[59001, 59937]],
  NC: [[27006, 28909]],
  ND: [[58001, 58856]],
  NE: [[68001, 68118], [68122, 69367]],
  NH: [[3031, 3897]],
  NJ: [[7001, 8989]],
  NM: [[87001, 88441]],
  NV: [[88901, 89883]],
  NY: [[6390, 6390], [10001, 14975]],
  OH: [[43001, 45999]],
  OK: [[73001, 73199], [73401, 74966]],
  OR: [[97001, 97920]],
  PA: [[15001, 19640]],
  RI: [[2801, 2940]],
  SC: [[29001, 29948]],
  SD: [[57001, 57799]],
  TN: [[37010, 38589]],
  TX: [[73301, 73301], [75001, 75501], [75503, 79999], [88510, 88589]],
  UT: [[84001, 84784]],
  VA: [[20040, 20167], [20042, 20042], [22001, 24658]],
  VT: [[5001, 5495], [5601, 5907]],
  WA: [[98001, 99403]],
  WI: [[53001, 54990]],
  WV: [[24701, 26886]],
  WY: [[82001, 83128]],
};

export function OrderFix() {
  const [openSection, setOpenSection] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [shippingAddress, setShippingAddress] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  const [cancelled, setCancelled] = useState(
    Boolean(shopify.order?.value?.cancelledAt) ||
    shopify.order?.value?.cancelled === true
  );

  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadAvailability() {
      try {
        const response = await fetch(`${APP_URL}/api/order/details`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            shop: shopify.shop.myshopifyDomain,
            orderId: shopify.order.value.id,
          }),
        });

        const data = await response.json();
        setAvailability(data.availability);
        setShippingAddress(data.shippingAddress);
      } catch (error) {
        console.error('OrderFix availability error', error);
      } finally {
        setLoadingAvailability(false);
      }
    }

    loadAvailability();
  }, []);

  const expiresAt = availability?.expiresAt
  ? new Date(availability.expiresAt).getTime()
  : null;
  const timeLeftMs = expiresAt ? expiresAt - now : 0;
  const timeLeft = formatTimeLeft(timeLeftMs);
  const expired = timeLeftMs <= 0;

  const showEditor =
    availability &&
    availability.canModify &&
    !expired &&
    !cancelled;

  const addressWarnings = getAddressWarnings(shippingAddress);

  if (loadingAvailability) {
    return (
        <s-stack direction="block" gap="base">
          <s-progress accessibilityLabel="Checking order edit availability..."></s-progress>
        </s-stack>
    );
  }

  if (availability && !showEditor) {
    //return null;
  }

  return (
    <s-section>
      <s-stack gap="base" padding="small none">
        <s-stack direction="inline" justifyContent="space-between">
          <s-text type="strong">Make changes to your order</s-text>
          <s-text>Time left to edit: {timeLeft}</s-text>
        </s-stack>

        {successMessage && (
          <s-banner tone="success">
            {successMessage}
          </s-banner>
        )}

        {addressWarnings.length > 0 && (
          <s-banner tone="warning">
            <s-stack gap="small">
              <s-text type="strong">
                Please review your shipping address
              </s-text>

              {addressWarnings.map((warning) => (
                <s-text key={warning}>
                  • {warning}
                </s-text>
              ))}
            </s-stack>
          </s-banner>
        )}

        <ActionRow
          icon="location"
          title="Edit shipping address"
          open={openSection === 'shipping'}
          onClick={() => {
            setSuccessMessage('');

            setOpenSection(
              openSection === 'shipping' ? null : 'shipping'
            );
          }}
        />

        {openSection === 'shipping' && shippingAddress && (
          <ShippingForm
            shippingAddress={shippingAddress}
            setShippingAddress={setShippingAddress}
            onSuccess={() => {
              setSuccessMessage('Shipping address updated successfully.');
              setOpenSection(null); // collapse section
            }}
          />
        )}
        <s-divider />

        <ActionRow
          icon="x-circle"
          title="Request order cancellation"
          open={openSection === 'cancel'}
          onClick={() =>
            setOpenSection(openSection === 'cancel' ? null : 'cancel')
          }
        />

        {openSection === 'cancel' && (
          <CancelForm
            cancelled={cancelled}
            cancelling={cancelling}
            setCancelled={setCancelled}
            setCancelling={setCancelling}
          />
        )}
      </s-stack>
    </s-section>
  );
}

export function OrderFixThankYou() {
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [statusPageUrl, setStatusPageUrl] = useState(null);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadAvailability() {
      try {
        const orderConfirmation =
          shopify.orderConfirmation?.value ||
          shopify.orderConfirmation?.current?.value ||
          shopify.orderConfirmation;

        const orderIdentityId = orderConfirmation?.order?.id;
        const orderId = orderIdentityId?.replace(
          'gid://shopify/OrderIdentity/',
          'gid://shopify/Order/'
        );

        const response = await fetch(`${APP_URL}/api/order/details`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            shop: shopify.shop.myshopifyDomain,
            orderId,
          }),
        });

        const data = await response.json();

        setAvailability(data.availability);
        setShippingAddress(data.shippingAddress);
      } catch (error) {
        console.error('OrderFix thank you availability error', error);
      } finally {
        setLoadingAvailability(false);
      }
    }

    loadAvailability();
  }, []);

  async function prepareEditOrder() {
    setLoadingUrl(true);
    setError('');

    try {
      const orderConfirmation =
        shopify.orderConfirmation?.value ||
        shopify.orderConfirmation?.current?.value ||
        shopify.orderConfirmation;

      const response = await fetch(`${APP_URL}/api/order/status-url`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          shop: shopify.shop.myshopifyDomain,
          orderIdentityId: orderConfirmation?.order?.id,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.statusPageUrl) {
        setError(data.error || 'Unable to prepare order edit link.');
        return;
      }

      setStatusPageUrl(data.statusPageUrl);
    } catch (error) {
      console.error('Prepare edit order error', error);
      setError('Unable to prepare order edit link.');
    } finally {
      setLoadingUrl(false);
    }
  }

  const expiresAt = availability?.expiresAt
    ? new Date(availability.expiresAt).getTime()
    : null;

  const timeLeftMs = expiresAt ? expiresAt - now : 0;
  const timeLeft = formatTimeLeft(timeLeftMs);
  const expired = timeLeftMs <= 0;

  const showEditor =
    availability &&
    availability.canModify &&
    !expired;

  const addressWarnings = getAddressWarnings(shippingAddress);

  if (loadingAvailability) {
    return (
        <s-stack direction="block" gap="base">
          <s-progress accessibilityLabel="Checking order edit availability..."></s-progress>
        </s-stack>
    );
  }

  if (availability && !showEditor) {
    //return null;
  }

  return (
    <s-section>
      <s-box
        border="base"
        borderRadius="base"
        padding="base"
      >
        <s-stack gap="base" padding="small none">
          <s-stack direction="inline" justifyContent="space-between">
            <s-text type="strong">Make changes to your order</s-text>
            <s-text>Time left to edit: {timeLeft}</s-text>
          </s-stack>

          {addressWarnings.length > 0 && (
            <s-banner tone="warning">
              <s-stack gap="small">
                <s-text type="strong">Please review your shipping address</s-text>

                {addressWarnings.map((warning) => (
                  <s-text key={warning}>
                    • {warning}
                  </s-text>
                ))}
              </s-stack>
            </s-banner>
          )}

          {error && (
            <s-banner tone="critical">
              {error}
            </s-banner>
          )}

          <ThankYouActionRow
            icon="delivery"
            title="Edit shipping address"
            onClick={prepareEditOrder}
          />

          <s-divider />

          <ThankYouActionRow
            icon="x-circle"
            title="Request order cancellation"
            onClick={prepareEditOrder}
          />

          <s-modal id="edit-order-modal" accessibilityLabel="Proceed to edit your order">
            <s-stack direction="block" gap="large" paddingBlock="none large">
              <s-paragraph textAlign="center">
                <s-heading>You can now proceed to edit your order.</s-heading>
              </s-paragraph>
              <s-paragraph textAlign="center">
                <s-text color="subdued">This can take a few seconds.</s-text>
              </s-paragraph>
            </s-stack>

            <s-paragraph>
              <s-button
                variant="primary"
                inlineSize="fill"
                href={statusPageUrl || undefined}
                disabled={!statusPageUrl}
              >
                {statusPageUrl ? 'Edit your order' : 'Preparing...'}
              </s-button>
            </s-paragraph>
          </s-modal>

        </s-stack>
      </s-box>
    </s-section>
  );
}

export function isZipValidForState(zip, stateCode) {
  const cleanZip = String(zip || '').trim().slice(0, 5);

  if (!/^\d{5}$/.test(cleanZip)) return false;

  const ranges = US_STATE_ZIP_RANGES[stateCode];

  if (!ranges) return true;

  const zipNumber = Number(cleanZip);

  return ranges.some(([min, max]) => zipNumber >= min && zipNumber <= max);
}

function CancelForm({cancelled, cancelling, setCancelled, setCancelling}) {
  const [cancelReason, setCancelReason] = useState('');

  if (cancelled) {
    return (
      <s-banner tone="success">
        This order has been cancelled.
      </s-banner>
    );
  }

  return (
    <s-stack gap="base">
      <s-banner tone="neutral">
        Cancelling an order cannot be undone.
      </s-banner>

      <s-select
        label="Reason for cancellation"
        value={cancelReason}
        onChange={(event) => setCancelReason(event.target.value)}
      >
        <s-option value="">Select a reason</s-option>
        <s-option value="Ordered by mistake">Ordered by mistake</s-option>
        <s-option value="Wrong shipping address">Wrong shipping address</s-option>
        <s-option value="Changed my mind">Changed my mind</s-option>
        <s-option value="Other">Other</s-option>
      </s-select>

      <s-button
        variant="primary"
        inlineSize="fill"
        disabled={cancelling || !cancelReason}
        onClick={async () => {
          setCancelling(true);

          const response = await fetch(`${APP_URL}/api/order/cancel`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              shop: shopify.shop.myshopifyDomain,
              orderId: shopify.order.value.id,
              cancelReason,
            }),
          });

          const data = await response.json();

          const errors = data?.data?.orderCancel?.userErrors ?? [];

          if (errors.length > 0) {
            shopify.toast.show(errors[0].message);
            setCancelling(false);
            return;
          }

          setCancelled(true);
          shopify.toast.show('Order cancelled');
        }}
      >
        {cancelling ? 'Cancelling...' : 'Cancel order'}
      </s-button>
    </s-stack>
  );
}

function ShippingForm({shippingAddress, setShippingAddress, onSuccess}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: shippingAddress?.firstName ?? '',
    lastName: shippingAddress?.lastName ?? '',
    phone: shippingAddress?.phone ?? '',
    address1: shippingAddress?.address1 ?? '',
    address2: shippingAddress?.address2 ?? '',
    city: shippingAddress?.city ?? '',
    zip: shippingAddress?.zip ?? '',
  });
  const [errors, setErrors] = useState({});

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  async function saveAddress() {

    const validationErrors = {};

    if (!form.firstName.trim()) {
      validationErrors.firstName = 'Enter a first name';
    }

    if (!form.lastName.trim()) {
      validationErrors.lastName = 'Enter a last name';
    }

    if (!form.address1.trim()) {
      validationErrors.address1 = 'Enter an address';
    }

    if (!form.city.trim()) {
      validationErrors.city = 'Enter a city';
    }

    if (!form.zip.trim()) {
      validationErrors.zip = 'Enter a postal code';
    }

    if (
      shippingAddress?.countryCodeV2 === 'US' &&
      form.zip.trim() &&
      !isZipValidForState(
        form.zip,
        shippingAddress?.provinceCode || shippingAddress?.province
      )
    ) {
      validationErrors.zip = 'Enter a ZIP code that matches the selected state.';
    }

    if (
      shippingAddress?.countryCodeV2 === 'US' &&
      form.zip.trim() &&
      !/^\d{5}(-\d{4})?$/.test(form.zip.trim())
    ) {
      validationErrors.zip = 'Enter a valid ZIP code';
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    const response = await fetch(`${APP_URL}/api/order/address`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        shop: shopify.shop.myshopifyDomain,
        orderId: shopify.order.value.id,
        address: form,
      }),
    });

    const data = await response.json();
    const errors = data?.data?.orderUpdate?.userErrors ?? [];

    if (errors.length > 0) {
      shopify.toast.show(errors[0].message);
      setSaving(false);
      return;
    }

    setShippingAddress({
      ...shippingAddress,
      ...form,
    });

    shopify.toast.show('Shipping address updated');
    onSuccess?.();
    setSaving(false);
  }

  return (
    <s-stack gap="base">

      <s-text-field
        label="Country/Region"
        value={shippingAddress?.countryCodeV2 ?? ''}
        disabled
      />

      <s-grid gridTemplateColumns="1fr 1fr" gap="base" alignItems="start">
        <s-text-field
          label="First name"
          value={form.firstName}
          error={errors.firstName}
          onInput={(event) => updateField('firstName', event.target.value)}
          required
        />

        <s-text-field
          label="Last name"
          value={form.lastName}
          error={errors.lastName}
          onInput={(event) => updateField('lastName', event.target.value)}
        />
      </s-grid>

      <s-text-field
        label="Phone"
        value={form.phone}
        onInput={(event) => updateField('phone', event.target.value)}
      />

      <s-text-field
        label="Address"
        value={form.address1}
        error={errors.address1}
        onInput={(event) => updateField('address1', event.target.value)}
      />

      <s-text-field
        label="Apartment, suite, etc."
        value={form.address2}
        onInput={(event) => updateField('address2', event.target.value)}
      />

      <s-text-field
        label="City"
        value={form.city}
        error={errors.city}
        onInput={(event) => updateField('city', event.target.value)}
      />

      <s-grid gridTemplateColumns="1fr 1fr" gap="base" alignItems="start">
        <s-text-field
          label="Postal code"
          value={form.zip}
          error={errors.zip}
          onInput={(event) => updateField('zip', event.target.value)}
        />

        <s-text-field
          label="State/Province"
          value={shippingAddress?.provinceCode ?? shippingAddress?.province ?? ''}
          disabled
        />
      </s-grid>

      <s-text color="subdued">To change state or country, please contact support — those changes affect tax and shipping and need our help.</s-text>

      <s-button
        inlineSize="fill"
        variant="primary"
        disabled={saving}
        onClick={saveAddress}
      >
        {saving ? 'Saving...' : 'Save shipping address'}
      </s-button>
    </s-stack>
  );
}

function ActionRow({icon, title, open, onClick}) {
  return (
    <s-clickable onClick={onClick}>
      <s-grid gridTemplateColumns="auto 1fr auto" gap="small" alignItems="center">
        <s-icon type={icon} />
        <s-text type="strong">{title}</s-text>
        {/*
        <s-text>Edit</s-text>
        */}
        <s-icon type={open ? 'chevron-up' : 'chevron-down'} />
      </s-grid>
    </s-clickable>
  );
}

function ThankYouActionRow({icon, title, onClick}) {
  return (
    <s-clickable
      command="show"
      commandFor="edit-order-modal"
      onClick={onClick}
    >
      <s-grid
        gridTemplateColumns="auto 1fr auto"
        gap="base"
        alignItems="center"
      >
        <s-icon type={icon} />
        <s-text type="strong">{title}</s-text>
        <s-text>Edit</s-text>
      </s-grid>
    </s-clickable>
  );
}