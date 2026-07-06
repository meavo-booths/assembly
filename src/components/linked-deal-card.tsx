/**
 * Read-only summary of the sales deal an assembly belongs to, rendered as
 * stacked white boxes matching the sales app's deal page design.
 */
import Link from "next/link";
import { VipBadge } from "@/components/ui";

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
  /** VIP flag of the linked client — surfaces the sales app's VIP label here. */
  isVip: boolean;
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

const boxClass = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-900">{value || "—"}</dd>
    </div>
  );
}

/**
 * Sales-style stacked boxes: Details, Contacts, Booths, Deal Notes.
 * Pass `dealHref` to make the deal heading a link (omit on the deal page itself).
 */
export function LinkedDealBoxes({
  deal,
  dealHref,
}: {
  deal: LinkedDealSummary;
  dealHref?: string;
}) {
  return (
    <div className="space-y-4">
      <div className={boxClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            {dealHref ? (
              <Link href={dealHref} className="text-brand-700 hover:underline">
                Deal {deal.dealId}
              </Link>
            ) : (
              <>Deal {deal.dealId}</>
            )}
            <span className="ml-2 text-sm font-normal text-slate-500">{deal.quoteNumber}</span>
          </h3>
          <div className="flex items-center gap-2">
            {deal.isVip && <VipBadge />}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {deal.paymentStatus}
            </span>
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Client" value={deal.clientName} />
          <Field label="Deal date" value={deal.dealDate} />
          <Field label="Sales rep" value={deal.salesRep} />
          <Field label="Market" value={deal.market} />
          <Field label="Client type" value={deal.clientType} />
          <Field label="VAT number" value={deal.vatNumber} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Registered address (invoicing)" value={deal.registeredAddress} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Assembly address" value={deal.assemblyAddress} />
          </div>
        </dl>
      </div>

      {deal.contacts.length > 0 && (
        <div className={boxClass}>
          <h3 className="mb-3 text-base font-semibold text-slate-900">Contacts</h3>
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

      {deal.boothSummary && (
        <div className={boxClass}>
          <h3 className="mb-2 text-base font-semibold text-slate-900">Booths</h3>
          <p className="text-sm text-slate-900">{deal.boothSummary}</p>
        </div>
      )}

      {deal.notes && (
        <div className={boxClass}>
          <h3 className="mb-2 text-base font-semibold text-slate-900">Deal Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-900">{deal.notes}</p>
        </div>
      )}
    </div>
  );
}
