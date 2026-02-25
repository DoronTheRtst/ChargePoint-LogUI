import ablPlugin from './abl';
import etrelPlugin from './etrel';

const vendors = [ablPlugin, etrelPlugin];

export function listVendors() {
  return vendors;
}

export function getVendorPlugin(vendorId) {
  return vendors.find((vendor) => vendor.id === vendorId);
}
