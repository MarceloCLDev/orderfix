import {Form, useLoaderData, useActionData} from "react-router";
import {data} from "react-router";
import {authenticate} from "../shopify.server";
import {
  getOrderFixSettings,
  updateOrderFixSettings,
} from "../models/orderFixSettings.server";

export async function loader({request}) {
  const {session} = await authenticate.admin(request);
  const settings = await getOrderFixSettings(session.shop);

  return data({settings});
}

export async function action({request}) {
  const {session} = await authenticate.admin(request);
  const formData = await request.formData();

  await updateOrderFixSettings(session.shop, {
    editWindowMinutes: Number(formData.get("editWindowMinutes") || 30),
    allowUntilShipped: formData.get("allowUntilShipped") === "on",
    allowAddressEdit: formData.get("allowAddressEdit") === "on",
    allowCancel: formData.get("allowCancel") === "on",
    allowAddProducts: formData.get("allowAddProducts") === "on",
  });

  return data({ok: true});
}

export default function OrderFixSettingsPage() {
  const {settings} = useLoaderData();
  const actionData = useActionData();

  return (
    <main style={{maxWidth: 720, padding: 24}}>
      <h1>OrderFix settings</h1>

      {actionData?.ok && (
        <div style={{marginBottom: 16, color: "green"}}>
          Settings saved.
        </div>
      )}

      <Form method="post">
        <section style={{display: "grid", gap: 16}}>
          <label>
            Edit window in minutes
            <input
              name="editWindowMinutes"
              type="number"
              min="0"
              defaultValue={settings.editWindowMinutes}
              style={{display: "block", marginTop: 6, padding: 8}}
            />
          </label>

          <label>
            <input
              name="allowUntilShipped"
              type="checkbox"
              defaultChecked={settings.allowUntilShipped}
            />{" "}
            Only allow changes until order ships
          </label>

          <label>
            <input
              name="allowAddressEdit"
              type="checkbox"
              defaultChecked={settings.allowAddressEdit}
            />{" "}
            Allow address edits
          </label>

          <label>
            <input
              name="allowCancel"
              type="checkbox"
              defaultChecked={settings.allowCancel}
            />{" "}
            Allow cancellations
          </label>

          <label>
            <input
              name="allowAddProducts"
              type="checkbox"
              defaultChecked={settings.allowAddProducts}
            />{" "}
            Allow adding products
          </label>

          <button type="submit" style={{padding: "10px 14px", width: 160}}>
            Save settings
          </button>
        </section>
      </Form>
    </main>
  );
}