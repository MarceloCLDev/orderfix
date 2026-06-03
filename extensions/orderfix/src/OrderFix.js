import {useEffect, useState} from 'preact/hooks';

export function OrderFix() {
  const [openSection, setOpenSection] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [shippingAddress, setShippingAddress] = useState(null);

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

  if (availability && !showEditor) {
    //return null;
  }

  return (
    <s-section>
      <s-stack gap="base">
        <s-stack direction="inline" justifyContent="space-between">
          <s-text type="strong">Make changes to your order</s-text>
          <s-text>Time left to edit: {timeLeft}</s-text>
        </s-stack>

        <ActionRow
          icon="delivery"
          title="Edit shipping address"
          open={openSection === 'shipping'}
          onClick={() =>
            setOpenSection(openSection === 'shipping' ? null : 'shipping')
          }
        />

        {openSection === 'shipping' && shippingAddress && (
          <ShippingForm
            shippingAddress={shippingAddress}
            setShippingAddress={setShippingAddress}
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

        {openSection === 'cancel' && <CancelForm />}
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

function ShippingForm({shippingAddress, setShippingAddress}) {
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

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveAddress() {
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
    setSaving(false);
  }

  return (
    <s-stack gap="base">

      <s-text-field
        label="Country/Region"
        value={shippingAddress?.countryCodeV2 ?? ''}
        disabled
      />

      <s-text-field
        label="First name"
        value={form.firstName}
        onInput={(event) => updateField('firstName', event.target.value)}
      />

      <s-text-field
        label="Last name"
        value={form.lastName}
        onInput={(event) => updateField('lastName', event.target.value)}
      />

      <s-text-field
        label="Phone"
        value={form.phone}
        onInput={(event) => updateField('phone', event.target.value)}
      />

      <s-text-field
        label="Address"
        value={form.address1}
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
        onInput={(event) => updateField('city', event.target.value)}
      />

      <s-text-field
        label="Postal code"
        value={form.zip}
        onInput={(event) => updateField('zip', event.target.value)}
      />

      <s-text-field
        label="State/Province"
        value={shippingAddress?.provinceCode ?? shippingAddress?.province ?? ''}
        disabled
      />

      <s-button
        inlineSize="fill"
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
      <s-grid gridTemplateColumns="auto 1fr auto auto" gap="base" alignItems="center">
        <s-icon type={icon} />
        <s-text type="strong">{title}</s-text>
        <s-text>Edit</s-text>
        <s-icon type={open ? 'chevron-up' : 'chevron-down'} />
      </s-grid>
    </s-clickable>
  );
}