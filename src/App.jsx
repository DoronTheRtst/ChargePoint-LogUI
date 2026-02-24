import { listVendors } from './logforge';

export default function App() {
  const vendors = listVendors();

  return (
    <main className="app-shell">
      <h1>LogForge</h1>
      <p>Minimal project setup is now in place.</p>
      <section>
        <h2>Registered vendor plugins</h2>
        <ul>
          {vendors.map((vendor) => (
            <li key={vendor.id}>
              {vendor.label} ({vendor.models.length} model{vendor.models.length === 1 ? '' : 's'})
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
