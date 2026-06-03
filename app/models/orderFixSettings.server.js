import db from "../db.server";

export async function getOrderFixSettings(shop) {
  return db.orderFixSettings.upsert({
    where: {shop},
    update: {},
    create: {
      shop,
      editWindowMinutes: 30,
      allowUntilShipped: true,
      allowAddressEdit: true,
      allowCancel: true,
      allowAddProducts: true,
    },
  });
}

export async function updateOrderFixSettings(shop, input) {
  return db.orderFixSettings.upsert({
    where: {shop},
    update: {
      editWindowMinutes: input.editWindowMinutes,
      allowUntilShipped: input.allowUntilShipped,
      allowAddressEdit: input.allowAddressEdit,
      allowCancel: input.allowCancel,
      allowAddProducts: input.allowAddProducts,
    },
    create: {
      shop,
      editWindowMinutes: input.editWindowMinutes,
      allowUntilShipped: input.allowUntilShipped,
      allowAddressEdit: input.allowAddressEdit,
      allowCancel: input.allowCancel,
      allowAddProducts: input.allowAddProducts,
    },
  });
}