import {useEffect, useState} from 'preact/hooks';

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
        const APP_URL = process.env.APP_URL;

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
        <s-option value="mistake">Ordered by mistake</s-option>
        <s-option value="address">Wrong shipping address</s-option>
        <s-option value="changed_mind">Changed my mind</s-option>
        <s-option value="other">Other</s-option>
      </s-select>

      <s-button
        variant="primary"
        inlineSize="fill"
        disabled={cancelling || !cancelReason}
        onClick={async () => {
          setCancelling(true);

          const APP_URL = process.env.APP_URL;

          const response = await fetch(`${APP_URL}/api/order/cancel`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              shop: shopify.shop.myshopifyDomain,
              orderId: shopify.order.value.id,
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
      !/^\d{5}(-\d{4})?$/.test(form.zip.trim())
    ) {
      validationErrors.zip = 'Enter a valid ZIP code';
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    const APP_URL = process.env.APP_URL;

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

      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
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

function encodeOrderId(orderId) {
  return btoa(orderId)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function getAddressWarnings(address) {
  const warnings = [];

  const street = address?.address1?.trim() || '';
  const zip = address?.zip?.trim() || '';
  const country = address?.countryCodeV2;

  if (country === 'US') {
    const streetRegex =
      /^(?:\d+\s+[a-zA-Z0-9\s.,#-]+|(?:p\.?\s*o\.?\s*|post\s+office\s+)box\s+\d+[a-zA-Z0-9\s.,#-]*)$/i;

    const zipRegex = /^\d{5}(-\d{4})?$/;

    if (!streetRegex.test(street)) {
      warnings.push('Your street address looks like it may be missing a number.');
    }

    if (!zipRegex.test(zip)) {
      warnings.push('Your ZIP code appears to be invalid.');
    }
  }

  return warnings;
}

function formatTimeLeft(ms) {
  if (ms <= 0) return "00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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