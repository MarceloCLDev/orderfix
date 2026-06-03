export function getOrderFixAvailability(order, settings) {
  const createdAt = new Date(order.createdAt).getTime();

  const expiresAt =
    createdAt + settings.editWindowMinutes * 60 * 1000;

  const withinTime = Date.now() <= expiresAt;

  const notShipped =
    order.displayFulfillmentStatus !== "FULFILLED";

  const allowedByShippingRule = settings.allowUntilShipped
    ? notShipped
    : true;

  const canModify = withinTime && allowedByShippingRule;

  return {
    canModify,
    canEditAddress: canModify && settings.allowAddressEdit,
    canCancel: canModify && settings.allowCancel,
    canAddProducts: canModify && settings.allowAddProducts,
    expiresAt,
    withinTime,
    notShipped,
  };
}