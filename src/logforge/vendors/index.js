import ablPlugin from './abl';

const vendors = [ablPlugin];

export function listVendors() {
  return vendors;
}

export function getVendorPlugin(vendorId) {
  return vendors.find((vendor) => vendor.id === vendorId);
}
