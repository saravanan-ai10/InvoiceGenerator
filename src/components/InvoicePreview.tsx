import React, { useEffect, useState, useRef } from 'react';
import { Card } from "../components/ui/card";

interface Service {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  invoice_number: string;
  date: string;
  due_date: string;
  total_amount: number;
  subtotal: number;
  gst_enabled: boolean;
  gst_amount: number;
  services: Service[];
  customer_name: string;
  customer_address: string;
  contact_person: string;
  notes?: string;
  type?: 'invoice' | 'purchase_order' | 'quotation';
}

export default function InvoicePreview({ data, previewRef }: { data: InvoiceData; previewRef: React.RefObject<HTMLDivElement> }) {
  const [profile, setProfile] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  const getDocTitle = () => {
    switch (data.type) {
      case 'purchase_order': return 'Purchase Order';
      case 'quotation': return 'Quotation';
      default: return 'Tax Invoice';
    }
  };

  const getDocNumberLabel = () => {
    switch (data.type) {
      case 'purchase_order': return 'PO No.';
      case 'quotation': return 'Quote No.';
      default: return 'Invoice No.';
    }
  };

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(setProfile)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
         // A4 height in mm is 297. Standard web DPI is 96. 1mm = 3.779527559px
         const a4HeightPx = 297 * 3.779527559;
         const contentHeight = entry.contentRect.height;
         const pages = Math.ceil(contentHeight / a4HeightPx);
         setTotalPages(Math.max(1, pages));
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [data]);

  const renderContent = (ref?: React.Ref<HTMLDivElement>) => (
    <div className="bg-white w-[210mm] min-h-[297mm] h-max flex flex-col px-12 py-14 text-sm text-black leading-normal" ref={ref}>
      {/* Invoice Header */}
      <div className="flex justify-between items-start mb-8 border-b-0 pb-0 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img src="/Untitled_design__1_-removebg-preview.png" alt="Logo" className="h-16 w-auto object-contain" />
            <div className="font-black text-2xl tracking-tight text-black">{profile?.company_name || 'Sparksfly O&G Pte Ltd'}</div>
          </div>
          <div className="text-black space-y-0.5 whitespace-pre-wrap">
            <p>{profile?.address || '123 Industrial Park Rd, #04-56\nSingapore 678901'}</p>
            <p>Tel: {profile?.phone || '+65 6123 4567'} | {profile?.email || 'contact@sparksfly.sg'}</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-black text-blue-900 mb-2 uppercase tracking-tighter">{getDocTitle()}</h1>
          <div className="grid grid-cols-2 gap-x-4 text-right">
            <span className="font-bold text-black uppercase">{getDocNumberLabel()}</span>
            <span className="font-mono font-bold text-black">{data.invoice_number || '---'}</span>
            <span className="font-bold text-black uppercase">Date</span>
            <span className="text-black">{data.date ? new Date(data.date).toLocaleDateString() : '---'}</span>
            <span className="font-bold text-black uppercase">Due Date</span>
            <span className="text-red-500">{data.due_date ? new Date(data.due_date).toLocaleDateString() : '---'}</span>
          </div>
        </div>
      </div>

      {/* Billing Details */}
      <div className="mb-8 p-4 bg-slate-50 border-l-4 border-blue-900 shrink-0">
        <h2 className="font-bold text-blue-900 mb-1 uppercase tracking-wider">Bill To:</h2>
        <p className="font-bold text-sm text-black">{data.customer_name || 'Client Name'}</p>
        {data.customer_address && <p className="whitespace-pre-wrap text-black">{data.customer_address}</p>}
        {data.contact_person && <p className="mt-2"><span className="font-bold">ATTN:</span> {data.contact_person}</p>}
      </div>

      {/* Service Table */}
      <div className="w-full">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#462C7D] text-white">
              <th className="p-2 text-left w-12">S/No</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-right w-16">Qty</th>
              <th className="p-2 text-right w-24">Price (SGD)</th>
              <th className="p-2 text-right w-24">Total (SGD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.services && data.services.length > 0 ? (
              data.services.map((item, index) => (
                <tr key={index}>
                  <td className="p-2 py-3 text-black font-semibold">{String(index + 1).padStart(2, '0')}</td>
                  <td className="p-2 py-3 font-semibold text-black break-words">{item.description || '-'}</td>
                  <td className="p-2 py-3 text-right text-black font-semibold">{item.quantity}</td>
                  <td className="p-2 py-3 text-right text-black font-semibold">{Number(item.unit_price).toFixed(2)}</td>
                  <td className="p-2 py-3 text-right text-black font-bold">{Number(item.total).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-black">
                  No services added.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end pt-4 border-t border-slate-200 mt-4 shrink-0">
        <div className="w-48 space-y-2">
          <div className="flex justify-between">
            <span className="text-black font-bold uppercase">Subtotal</span>
            <span className="font-mono text-black">{data.subtotal.toFixed(2)}</span>
          </div>
          {data.gst_enabled && (
            <div className="flex justify-between">
              <span className="text-black font-bold uppercase">GST ({profile?.gst_percentage || 9}%)</span>
              <span className="font-mono text-black">{data.gst_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-black mt-2">
            <span className="text-blue-900 font-black text-sm uppercase">Grand Total</span>
            <span className="text-blue-900 font-black text-sm font-mono underline">SGD {data.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Spacer to push footer to bottom */}
      <div className="flex-1 min-h-[32px]"></div>

      {/* Payment Info & Footer */}
      <div className="pt-6 pb-6 shrink-0">
        {data.notes && (
          <div className="mb-6">
            <h3 className="font-bold text-black mb-2 uppercase">
              {data.type === 'quotation' ? 'Terms & Conditions:' : 'Notes:'}
            </h3>
            <p className="whitespace-pre-wrap text-sm text-black border border-slate-200 p-2 rounded">{data.notes}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-8">
          {data.type === 'invoice' ? (
            <div>
              <h3 className="font-bold text-[#462C7D] mb-2 uppercase">Payment Details:</h3>
              <div className="bg-[#462C7D] text-white space-y-0.5 p-3 rounded shadow-sm">
                <p><span className="font-bold opacity-80">Bank:</span> {profile?.bank_name || 'OCBC Bank Singapore'}</p>
                <p><span className="font-bold opacity-80">Acc Name:</span> {profile?.bank_account_name || 'Sparksfly O&G Pte Ltd'}</p>
                <p><span className="font-bold opacity-80">Acc No:</span> {profile?.bank_account_no || '123-456789-001'}</p>
              </div>
            </div>
          ) : <div></div>}
          
          {data.type !== 'quotation' ? (
            <div className="flex flex-col items-center justify-end">
              {profile?.signature ? (
                <div className="h-16 flex items-end justify-center mb-1">
                  <img src={profile.signature} alt="Signature" className="max-h-full max-w-32 object-contain" />
                </div>
              ) : null}
              <div className="w-32 border-b border-black mb-1"></div>
              <p className="text-black uppercase tracking-widest text-[8px] font-bold">Authorized Signature</p>
            </div>
          ) : <div></div>}
        </div>

        {data.type === 'quotation' && (
          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="flex flex-col items-start justify-end">
              <p className="text-black text-xs font-bold mb-8">Sincerely,</p>
              {profile?.signature ? (
                <div className="h-16 flex items-end justify-start mb-1">
                  <img src={profile.signature} alt="Signature" className="max-h-full max-w-32 object-contain" />
                </div>
              ) : <div className="h-16"></div>}
              <div className="w-[80%] border-b border-black mb-1"></div>
              <p className="text-black uppercase tracking-widest text-[8px] font-bold">{profile?.company_name || 'Sparksfly O&G Pte Ltd'}</p>
            </div>

            <div className="flex flex-col items-start justify-end">
              <p className="text-black text-xs font-bold mb-8">Confirmed and Accepted By</p>
              <div className="h-16 flex items-end justify-start mb-1"></div>
              <div className="w-[80%] border-b border-black mb-1"></div>
              <p className="text-black uppercase tracking-widest text-[8px] font-bold">Authorized Signature</p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-black border-t border-slate-200 pt-2 italic text-[9px]">
          {data.type === 'quotation' 
            ? 'Thank you for your business.' 
            : 'Please include the invoice number in your transfer. Thank you for your business.'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col items-center gap-8 py-8 w-full">
      {/* Hidden container for PDF capture & measuring. Forced offscreen to avoid horizontal scroll */}
      <div className="absolute top-0 right-full pointer-events-none" style={{ opacity: 0.01 }}>
        {renderContent((el: HTMLDivElement | null) => {
          if (previewRef && typeof previewRef !== 'function' && el) {
            (previewRef as any).current = el;
          }
          if (contentRef) {
             (contentRef as any).current = el;
          }
        })}
      </div>

      {/* Visible paginated preview */}
      {Array.from({ length: totalPages }).map((_, i) => (
        <div key={i} className="w-[210mm] h-[297mm] overflow-hidden bg-white shadow-xl relative border border-slate-200 shrink-0">
           <div style={{ position: 'absolute', top: `-${i * 297}mm`, left: 0, width: '210mm' }}>
              {renderContent()}
           </div>
        </div>
      ))}
    </div>
  );
}
