export function getAddressWarnings(address) {
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