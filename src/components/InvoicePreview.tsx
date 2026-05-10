import React, { useEffect, useState } from 'react';
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

  return (
    <div className="bg-white w-[210mm] min-h-[297mm] flex flex-col px-12 py-14 text-sm text-slate-700 leading-normal" ref={previewRef}>
      {/* Invoice Header */}
      <div className="flex justify-between items-start mb-8 border-b-0 pb-0">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <img src="/Untitled_design__1_-removebg-preview.png" alt="Logo" className="h-10 w-auto object-contain" />
            <div className="font-black text-sm tracking-tight text-slate-900">{profile?.company_name || 'Sparksfly O&G Pte Ltd'}</div>
          </div>
          <div className="text-slate-400 space-y-0.5 whitespace-pre-wrap">
            <p>{profile?.address || '123 Industrial Park Rd, #04-56\nSingapore 678901'}</p>
            <p>Tel: {profile?.phone || '+65 6123 4567'} | {profile?.email || 'contact@sparksfly.sg'}</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-black text-blue-900 mb-2 uppercase tracking-tighter">{getDocTitle()}</h1>
          <div className="grid grid-cols-2 gap-x-4 text-right">
            <span className="font-bold text-slate-400 uppercase">{getDocNumberLabel()}</span>
            <span className="font-mono font-bold text-slate-800">{data.invoice_number || '---'}</span>
            <span className="font-bold text-slate-400 uppercase">Date</span>
            <span className="text-slate-800">{data.date ? new Date(data.date).toLocaleDateString() : '---'}</span>
            <span className="font-bold text-slate-400 uppercase">Due Date</span>
            <span className="text-red-500">{data.due_date ? new Date(data.due_date).toLocaleDateString() : '---'}</span>
          </div>
        </div>
      </div>

      {/* Billing Details */}
      <div className="mb-8 p-4 bg-slate-50 border-l-4 border-blue-900">
        <h2 className="font-bold text-blue-900 mb-1 uppercase tracking-wider">Bill To:</h2>
        <p className="font-bold text-sm text-slate-900">{data.customer_name || 'Client Name'}</p>
        {data.customer_address && <p className="whitespace-pre-wrap">{data.customer_address}</p>}
        {data.contact_person && <p className="mt-2"><span className="font-bold">ATTN:</span> {data.contact_person}</p>}
      </div>

      {/* Service Table */}
      <div className="flex-1 min-h-[300px]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
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
                  <td className="p-2 py-3 text-slate-600">{String(index + 1).padStart(2, '0')}</td>
                  <td className="p-2 py-3 font-semibold text-slate-800 break-words">{item.description || '-'}</td>
                  <td className="p-2 py-3 text-right">{item.quantity}</td>
                  <td className="p-2 py-3 text-right">{Number(item.unit_price).toFixed(2)}</td>
                  <td className="p-2 py-3 text-right text-slate-800">{Number(item.total).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No services added.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
        <div className="w-48 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold uppercase">Subtotal</span>
            <span className="font-mono text-slate-800">{data.subtotal.toFixed(2)}</span>
          </div>
          {data.gst_enabled && (
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase">GST ({profile?.gst_percentage || 9}%)</span>
              <span className="font-mono text-slate-800">{data.gst_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-900 mt-2">
            <span className="text-blue-900 font-black text-sm uppercase">Grand Total</span>
            <span className="text-blue-900 font-black text-sm font-mono underline">SGD {data.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Info & Footer */}
      <div className="mt-8 pt-6 pb-6">
        {data.notes && (
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 mb-2 uppercase">Notes:</h3>
            <p className="whitespace-pre-wrap text-sm text-slate-600 border border-slate-200 p-2 rounded">{data.notes}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-8">
          {data.type !== 'purchase_order' ? (
            <div>
              <h3 className="font-bold text-slate-900 mb-2 uppercase">Payment Details:</h3>
              <div className="text-slate-500 space-y-0.5 border border-slate-200 p-2 rounded">
                <p><span className="font-bold text-slate-700">Bank:</span> {profile?.bank_name || 'OCBC Bank Singapore'}</p>
                <p><span className="font-bold text-slate-700">Acc Name:</span> {profile?.bank_account_name || 'Sparksfly O&G Pte Ltd'}</p>
                <p><span className="font-bold text-slate-700">Acc No:</span> {profile?.bank_account_no || '123-456789-001'}</p>
              </div>
            </div>
          ) : <div></div>}
          <div className="flex flex-col items-center justify-end">
            <div className="w-32 border-b border-slate-400 mb-1"></div>
            <p className="text-slate-400 uppercase tracking-widest text-[8px] font-bold">Authorized Signature</p>
          </div>
        </div>
        <div className="mt-6 text-center text-slate-400 border-t border-slate-200 pt-2 italic text-[9px]">
          Please include the invoice number in your transfer. Thank you for your business.
        </div>
      </div>
    </div>
  );
}
