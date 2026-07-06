/**
 * Read-only summary of the sales deal an assembly is being scheduled for.
 * Mirrors the deal details card design from the sales app.
 */

export type LinkedDealContact = {
  kind: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

export type LinkedDealSummary = {
  dealId: string;
  quoteNumber: string;
  clientName: string;
  dealDate: string;
  salesRep: string;
  market: string;
  clientType: string;
  paymentStatus: string;
  vatNumber: string;
  registeredAddress: string;
  assemblyAddress: string;
  notes: string;
  boothSummary: string;
  contacts: LinkedDealContact[];
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-900">{value || "—"}</dd>
    </div>
  );
}

export function LinkedDealCard({ deal }: { deal: LinkedDealSummary }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">
          Deal {deal.dealId}
          <span className="ml-2 text-sm font-normal text-slate-500">{deal.quoteNumber}</span>
        </h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {deal.paymentStatus}
        </span>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Client" value={deal.clientName} />
        <Field label="Deal date" value={deal.dealDate} />
        <Field label="Sales rep" value={deal.salesRep} />
        <Field label="Market" value={deal.market} />
        <Field label="Client type" value={deal.clientType} />
        <Field label="VAT number" value={deal.vatNumber} />
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Booths" value={deal.boothSummary} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Registered address (invoicing)" value={deal.registeredAddress} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Assembly address" value={deal.assemblyAddress} />
        </div>
        {deal.notes && (
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Deal Notes" value={deal.notes} />
          </div>
        )}
      </dl>

      {deal.contacts.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Contacts
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {deal.contacts.map((contact, index) => (
              <li key={index} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">
                  {contact.name}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {contact.kind}
                    {contact.role && ` · ${contact.role}`}
                  </span>
                </p>
                <p className="mt-0.5 text-slate-600">
                  {[contact.email, contact.phone].filter(Boolean).join(" · ") || "—"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
