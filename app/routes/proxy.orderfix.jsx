import {useActionData, useLoaderData} from "react-router";
import {data} from "react-router";
import {useEffect, useState} from "react";
import {unauthenticated} from "../shopify.server";
import {createSkey, verifySkey} from "../utils/skey.server";
import {getOrderFixSettings} from "../models/orderFixSettings.server";
import {getOrderFixAvailability} from "../utils/orderFixAvailability.server";
import "../styles/shipping.css";

function decodeOrderId(encodedOrderId) {
  const base64 = encodedOrderId
    .replaceAll('-', '+')
    .replaceAll('_', '/');

  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );

  return Buffer.from(padded, 'base64').toString('utf8');
}

export async function action({request}) {
  try {

    const formData = await request.formData();
    const token = verifySkey(formData.get("skey"));
    const {shop, orderId} = token;
    const {admin} = await unauthenticated.admin(shop);

    const orderResponse = await admin.graphql(
      `
        query OrderModifyCheck($id: ID!) {
          order(id: $id) {
            id
            createdAt
            displayFulfillmentStatus
          }
        }
      `,
      {variables: {id: orderId}},
    );

    const orderResult = await orderResponse.json();
    const order = orderResult.data.order;

    const settings = await getOrderFixSettings(shop);
    const availability = getOrderFixAvailability(order, settings);

    if (!availability.canEditAddress) {
      return data({
        ok: false,
        error: "This order can no longer be edited.",
      });
    }

    const response = await admin.graphql(
        `
        mutation orderUpdate($input: OrderInput!) {
            orderUpdate(input: $input) {
            order {
                id
            }
            userErrors {
                field
                message
            }
            }
        }
        `,
        {
        variables: {
            input: {
            id: orderId,
            shippingAddress: {
                firstName: formData.get("firstName"),
                lastName: formData.get("lastName"),
                phone: formData.get("phone"),
                address1: formData.get("address1"),
                address2: formData.get("address2"),
                city: formData.get("city"),
                zip: formData.get("zip"),
            },
            },
        },
        },
    );

    const result = await response.json();
    const errors = result?.data?.orderUpdate?.userErrors ?? [];

    if (errors.length > 0) {
        return data({
        ok: false,
        error: errors[0].message,
        });
    }

    return data({
        ok: true,
    });

  } catch (error) {
    console.error("proxy save error", error);
    return data({ok: false, error: String(error)}, {status: 500});
  }  
}

export async function loader({request}) {
  const url = new URL(request.url);
  const orderToken = url.searchParams.get("order");
  const orderId = decodeOrderId(orderToken);
  const shop = url.searchParams.get("shop");
  const {admin} = await unauthenticated.admin(shop);

  const response = await admin.graphql(
    `
      query OrderDetails($id: ID!) {
        order(id: $id) {
          id
          name
          createdAt
          displayFulfillmentStatus
          shippingAddress {
            firstName
            lastName
            phone
            address1
            address2
            city
            province
            provinceCode
            zip
            countryCodeV2
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalShippingPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          lineItems(first: 10) {
            nodes {
              id
              name
              quantity
              variantTitle
              originalTotalSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              image {
                url
                altText
              }
            }
          }
        }
      }
    `,
    {variables: {id: orderId}},
  );

  const result = await response.json();
  const order = result.data.order;
  const settings = await getOrderFixSettings(shop);
  const availability = getOrderFixAvailability(order, settings);

  const skey = createSkey({
    shop,
    orderId,
    orderName: order.name,
    exp: Date.now() + 15 * 60 * 1000,
  });

  return data({
    skey,
    orderToken,
    order,
    availability,
  });
}

export default function OrderFixProxy() {
  const {skey, orderToken, order, availability} = useLoaderData();
  const actionData = useActionData();
  const address = order?.shippingAddress ?? {};
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log("HYDRATED");
  }, []);

  return (
    <div className="sa-page">

    {isSubmitting && (
      <div className="sa-overlay">
        <span className="sa-loader"></span>
        <h1>Updating your shipping address...</h1>
      </div>
    )}

      <main className="sa-layout">
        <section className="sa-canvas">
          <nav>
            <a
              href="#"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#111827",
                fontWeight: 500,
                fontSize: "1rem",
                textDecoration: "none",
                marginBottom: "1rem",
              }}
              onClick={(event) => {
                event.preventDefault();
                history.back();
                alert('click')
              }}
            >
              ← Back to order: {order?.name}
            </a>
          </nav>

          <h1 className="sa-h1">Edit Shipping address</h1>

          {!availability.canEditAddress && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This order can no longer be edited.
            </div>
          )}

          {actionData?.ok && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              Shipping address updated successfully.
            </div>
          )}

          {actionData?.error && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {actionData.error}
            </div>
          )}

          <form
            className="sa-grid"
            method="post"
            action={`/apps/orderfix?order=${encodeURIComponent(orderToken)}`}
            onSubmit={() => setIsSubmitting(true)}
          >
            <input type="hidden" name="skey" value={skey} />

            <div className="sa-ig">
              <input
                type="text"
                id="country"
                placeholder=" "
                value={address.countryCodeV2 ?? ""}
                disabled
                readOnly
              />
              <label htmlFor="country">Country/Region</label>
            </div>

            <div className="sa-row-half">
              <div className="sa-ig">
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder=" "
                  defaultValue={address.firstName ?? ""}
                />
                <label htmlFor="firstName">First name</label>
              </div>

              <div className="sa-ig">
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  placeholder=" "
                  defaultValue={address.lastName ?? ""}
                />
                <label htmlFor="lastName">Last name</label>
              </div>
            </div>

            <div className="sa-ig">
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder=" "
                defaultValue={address.phone ?? ""}
              />
              <label htmlFor="phone">Phone (optional)</label>
            </div>

            <div className="sa-ig">
              <input
                type="text"
                id="address1"
                name="address1"
                placeholder=" "
                defaultValue={address.address1 ?? ""}
              />
              <label htmlFor="address1">Address</label>
            </div>

            <div className="sa-ig">
              <input
                type="text"
                id="address2"
                name="address2"
                placeholder=" "
                defaultValue={address.address2 ?? ""}
              />
              <label htmlFor="address2">Apartment, suite, etc. (optional)</label>
            </div>

            <div className="sa-ig">
              <input
                type="text"
                id="state"
                placeholder=" "
                value={address.provinceCode ?? address.province ?? ""}
                disabled
                readOnly
              />
              <label htmlFor="state">State</label>
            </div>

            <div className="sa-row-half">
              <div className="sa-ig">
                <input
                  type="text"
                  id="city"
                  name="city"
                  placeholder=" "
                  defaultValue={address.city ?? ""}
                />
                <label htmlFor="city">City</label>
              </div>

              <div className="sa-ig">
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  placeholder=" "
                  defaultValue={address.zip ?? ""}
                />
                <label htmlFor="zip">Zip code</label>
              </div>
            </div>

            <p className="text-sm leading-6 text-gray-500 sa-disclaimer">
              To change state or country, please contact support — those changes affect tax and shipping and need our help.
            </p>

            <button
              type="submit"
              className="sa-btn-submit"
              disabled={!availability.canEditAddress || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>

        {/* Right: Order Vault */}
        <aside className="sa-vault">
          <div
            className="sa-vault-header flex items-center justify-between cursor-pointer select-none"
          >
            <h2 className="sa-h2 hidden md:block">Order Summary</h2>
          </div>

          <div className="sa-vault-body">
            <div className="sa-summary-rows">
              <div className="sa-srow">
                <span className="lbl">
                  Subtotal - {getItemCount(order)} items
                </span>
                <span className="val">
                  {formatMoney(order?.subtotalPriceSet?.shopMoney)}
                </span>
              </div>

              <div className="sa-srow">
                <span className="lbl">Shipping</span>
                <span className="val">
                  {formatMoney(order?.totalShippingPriceSet?.shopMoney)}
                </span>
              </div>
            </div>

            <div className="sa-total-row">
              <span className="lbl">Total paid</span>
              <span className="val">
                {formatMoney(order?.totalPriceSet?.shopMoney)}
              </span>
            </div>
          </div>
          
        </aside>     
      </main>  
    </div>
  );
}

function formatMoney(money) {
  if (!money) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currencyCode,
  }).format(Number(money.amount));
}

function getItemCount(order) {
  return (
    order?.lineItems?.nodes?.reduce(
      (total, item) => total + item.quantity,
      0,
    ) ?? 0
  );
}