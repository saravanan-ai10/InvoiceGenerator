import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Download, Mail, Plus, Trash2, Save, Share2 } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import InvoicePreview from "../components/InvoicePreview";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';

import ResponsivePreview from "../components/ResponsivePreview";

export default function CreateInvoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledClient = location.state?.client;
  const editInvoice = location.state?.editInvoice;
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const [docType, setDocType] = useState<'invoice'|'purchase_order'|'quotation'>(editInvoice?.type || 'invoice');

  const getPrefix = (type: string, invoiceNumber?: string) => {
    if (invoiceNumber) {
      const match = invoiceNumber.match(/^([A-Z]+-\d{6}(?:1|001)?)(.*)$/);
      if (match) return match[1];
    }
    const prefixMap: Record<string, string> = {
      'invoice': 'INV',
      'purchase_order': 'PO',
      'quotation': 'QUO'
    };
    return `${prefixMap[type] || 'INV'}-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}1`;
  };

  const getSuffix = (invoiceNumber?: string) => {
    if (invoiceNumber) {
      const match = invoiceNumber.match(/^([A-Z]+-\d{6}(?:1|001)?)(.*)$/);
      if (match) return match[2];
      return invoiceNumber;
    }
    return '';
  };

  const [invoicePrefix, setInvoicePrefix] = useState(getPrefix(editInvoice?.type || 'invoice', editInvoice?.invoice_number));
  const [invoiceSuffix, setInvoiceSuffix] = useState(getSuffix(editInvoice?.invoice_number));

  useEffect(() => {
    if (!editInvoice) {
      setInvoicePrefix(getPrefix(docType));
    }
  }, [docType]);

  const [formData, setFormData] = useState({
    id: editInvoice?.id || null,
    invoice_number: editInvoice?.invoice_number || `${getPrefix(editInvoice?.type || 'invoice')}${getSuffix()}`,
    date: editInvoice?.date ? new Date(editInvoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    due_date: editInvoice?.due_date ? new Date(editInvoice.due_date).toISOString().split('T')[0] : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customer_id: editInvoice?.customer_id || prefilledClient?.id || null,
    customer_name: editInvoice?.customer_name || editInvoice?.name || prefilledClient?.name || "",
    customer_address: editInvoice?.customer_address || editInvoice?.address || prefilledClient?.address || "",
    contact_person: editInvoice?.contact_person || prefilledClient?.contact_person || "",
    notes: editInvoice?.notes || "",
    gst_enabled: editInvoice?.gst_enabled || false,
    services: editInvoice?.services && editInvoice.services.length > 0 ? editInvoice.services.map((s: any) => ({
      ...s,
      quantity: Number(s.quantity),
      unit_price: Number(s.unit_price),
      total: Number(s.total)
    })) : [
      { description: "", quantity: 1, unit_price: 0, total: 0 }
    ],
    status: editInvoice?.status || 'pending'
  });

  const [gstPercentage, setGstPercentage] = useState(9.0);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<string | null>(null);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (data && data.gst_percentage != null) {
          setGstPercentage(Number(data.gst_percentage));
        }
      })
      .catch(console.error);

    fetch('/api/invoices')
      .then(res => {
        if (!res.ok) return [];
        return res.json().catch(() => []);
      })
      .then(data => {
        if (data && Array.isArray(data)) {
          setAllInvoices(data);
          if (data.length > 0) {
            const sorted = [...data].sort((a: any, b: any) => b.id - a.id);
            setLastInvoiceNumber(sorted[0].invoice_number);
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const newNumber = `${invoicePrefix}${invoiceSuffix}`;
    setFormData(prev => ({ ...prev, invoice_number: newNumber }));
    
    // Check for duplicate
    const duplicate = allInvoices.find(inv => 
      inv.invoice_number === newNumber && inv.id !== formData.id
    );
    setIsDuplicate(!!duplicate);
  }, [invoicePrefix, invoiceSuffix, allInvoices, formData.id]);

  // Derived state
  const subtotal = formData.services.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const gst_amount = formData.gst_enabled ? subtotal * (gstPercentage / 100) : 0; 
  const total_amount = subtotal + gst_amount;

  const invoiceData = {
    ...formData,
    type: docType,
    subtotal,
    gst_amount,
    total_amount,
  };

  const updateService = (index: number, field: string, value: any) => {
    const newServices = [...formData.services];
    let processedValue = value;
    if (field === 'quantity' || field === 'unit_price') {
      const numValue = Number(value);
      if (numValue < 0) {
        processedValue = Math.max(0, numValue); // Will be 0
      } else if (value === '-' || value.toString().includes('-')) {
        processedValue = 0;
      }
    }
    newServices[index] = { ...newServices[index], [field]: processedValue };
    
    // Auto calculate total
    if (field === 'quantity' || field === 'unit_price') {
      const q = Number(newServices[index].quantity) || 0;
      const p = Number(newServices[index].unit_price) || 0;
      newServices[index].total = Math.max(0, q * p);
    }
    
    setFormData({ ...formData, services: newServices });
  };

  const addService = () => {
    setFormData({
      ...formData,
      services: [...formData.services, { description: "", quantity: 1, unit_price: 0, total: 0 }]
    });
  };

  const removeService = (index: number) => {
    const newServices = formData.services.filter((_, i) => i !== index);
    setFormData({ ...formData, services: newServices });
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setLoadingPdf(true);
    try {
      const canvas = await toCanvas(previewRef.current, {
        pixelRatio: 2
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4' 
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${formData.invoice_number}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      let isPdfShared = false;
      if (navigator.share && previewRef.current && navigator.canShare) {
        setLoadingPdf(true); // Indicate loading using the same state
        const canvas = await toCanvas(previewRef.current, { pixelRatio: 2 });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4' 
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `${formData.invoice_number}.pdf`, { type: 'application/pdf' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice ${formData.invoice_number}`,
            text: `Please find your invoice ${formData.invoice_number} here.`,
            files: [file],
          });
          isPdfShared = true;
        }
        setLoadingPdf(false);
      }

      if (!isPdfShared) {
         alert('File sharing is not supported on this browser/device.');
      }
    } catch (err) {
      console.error('Error sharing', err);
    } finally {
      setLoadingPdf(false);
      setIsSharing(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (isDuplicate) {
      alert(`Error: Invoice number "${formData.invoice_number}" already exists. Please use a unique number before saving.`);
      return;
    }
    setSaving(true);
    try {
      let custId = formData.customer_id;
      
      // 1. Create or Update customer
      if (!custId) {
        const custRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.customer_name || 'Draft Customer',
            address: formData.customer_address,
            contact_person: formData.contact_person
          })
        });
        const custData = await custRes.json();
        custId = custData.id;
      } else {
        // Update existing customer details
        await fetch(`/api/customers/${custId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.customer_name,
            address: formData.customer_address,
            contact_person: formData.contact_person
          })
        });
      }
      
      // 2. Create or Update invoice
      const url = formData.id ? `/api/invoices/${formData.id}` : '/api/invoices';
      const method = formData.id ? 'PUT' : 'POST';

      const invRes = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: custId,
          invoice_number: formData.invoice_number,
          date: formData.date,
          due_date: formData.due_date,
          notes: formData.notes,
          gst_enabled: formData.gst_enabled,
          gst_amount: gst_amount,
          subtotal: subtotal,
          total_amount: total_amount,
          services: formData.services,
          type: docType
        })
      });
      
      if (invRes.ok) {
        navigate(formData.id ? `/invoices/${formData.id}` : '/');
      } else {
        const errorData = await invRes.json().catch(() => ({}));
        if (invRes.status === 409) {
          alert(`Warning: Invoice number "${formData.invoice_number}" already exists. Please use a unique number.`);
        } else {
          alert('Error saving invoice: ' + (errorData.error || 'Unknown error'));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 min-w-0">
      {/* Top Bar */}
      <div className="border-b bg-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 w-full min-w-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{formData.id ? 'Edit Invoice' : 'New Invoice'}</h2>
            <Badge variant="secondary" className={formData.status === 'paid' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
              {formData.status ? formData.status.toUpperCase() : 'DRAFT'}
            </Badge>
          </div>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Button variant="outline" className="flex-1 sm:flex-none gap-1 sm:gap-2 text-slate-600 hover:bg-slate-50 px-2 sm:px-4 min-w-[80px]" onClick={handleShare} disabled={isSharing || loadingPdf}>
            <Share2 className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium truncate">{isSharing ? 'Sharing...' : 'Share'}</span>
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none gap-1 sm:gap-2 text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700 px-2 sm:px-4 min-w-[80px]" onClick={handleDownloadPDF} disabled={loadingPdf || isSharing}>
            <Download className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium truncate">{loadingPdf ? 'PDF...' : 'PDF'}</span>
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none gap-1 sm:gap-2 text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700 px-2 sm:px-4 min-w-[80px]">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium truncate">Email</span>
          </Button>
          <Button 
            className="flex-1 sm:flex-none gap-1 sm:gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm px-2 sm:px-4 min-w-[80px]" 
            onClick={handleSaveInvoice} 
            disabled={saving || isDuplicate}
          >
            <Save className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium truncate">{saving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 flex flex-col lg:flex-row gap-6 w-full max-w-full min-w-0">
        {/* Left Form */}
        <div className="w-full lg:w-[420px] flex flex-col gap-4 lg:overflow-y-auto lg:pr-2 hide-scrollbar shrink-0 max-w-full min-w-0">  
          <div className="space-y-4 sm:space-y-6 w-full">
            {/* Invoice Details Card */}
            <Card className="rounded-xl shadow-sm border-slate-200 overflow-hidden w-full">
              <div className="bg-slate-100/50 px-4 py-3 border-b text-sm font-semibold text-slate-800 flex justify-between items-center">
                <span>Document Details</span>
                <select 
                  className="bg-white border rounded text-xs px-2 py-1"
                  value={docType}
                  onChange={(e: any) => setDocType(e.target.value)}
                  disabled={formData.id != null}
                >
                  <option value="invoice">Invoice</option>
                  <option value="purchase_order">Purchase Order</option>
                  <option value="quotation">Quotation</option>
                </select>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Document Number</Label>
                    <div className="flex w-full">
                      <div className="bg-slate-100 border border-r-0 border-input rounded-l-md px-3 py-2 text-sm text-slate-500 flex items-center shrink-0">
                        {invoicePrefix}
                      </div>
                      <Input 
                        className={`rounded-l-none pl-2 flex-1 min-w-0 ${isDuplicate ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        type="number"
                        min="0"
                        value={invoiceSuffix}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val.includes('-') && Number(val) >= 0) {
                            setInvoiceSuffix(val);
                          }
                        }}
                        placeholder="01"
                      />
                    </div>
                    {isDuplicate && (
                      <p className="text-xs text-red-600 font-medium mt-1">
                        This invoice number is already in use.
                      </p>
                    )}
                    {!isDuplicate && lastInvoiceNumber && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last Invoice: <span className="font-medium text-slate-700">{lastInvoiceNumber}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5 w-full">
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5 w-full">
                    <Label>Due Date</Label>
                    <Input 
                      type="date" 
                      value={formData.due_date}
                      onChange={e => setFormData({...formData, due_date: e.target.value})}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-2 sm:pt-6 sm:col-span-2">
                    <input 
                      type="checkbox" 
                      id="gst"
                      className="rounded border-slate-300 w-4 h-4 text-blue-600"
                      checked={formData.gst_enabled}
                      onChange={e => setFormData({...formData, gst_enabled: e.target.checked})}
                    />
                    <Label htmlFor="gst" className="font-medium text-sm">Include 9% GST</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Details Card */}
            <Card className="rounded-xl shadow-sm border-slate-200 overflow-hidden w-full">
              <div className="bg-slate-100/50 px-4 py-3 border-b text-sm font-semibold text-slate-800">
                Bill To
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label>Client Name</Label>
                  <Input 
                    placeholder="Enter client or company name"
                    value={formData.customer_name}
                    onChange={e => setFormData({...formData, customer_name: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Textarea 
                    placeholder="Client address" 
                    className="min-h-[80px] w-full"
                    value={formData.customer_address}
                    onChange={e => setFormData({...formData, customer_address: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Attention To</Label>
                  <Input 
                    placeholder="Contact person name"
                    value={formData.contact_person}
                    onChange={e => setFormData({...formData, contact_person: e.target.value})}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Services Table Card */}
            <Card className="rounded-xl shadow-sm border-slate-200 overflow-hidden w-full">
              <div className="bg-slate-100/50 px-4 py-3 border-b flex justify-between items-center text-sm font-semibold text-slate-800">
                Services
                <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2" onClick={addService}>
                  <Plus className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Add Row</span>
                </Button>
              </div>
              <CardContent className="p-0">
                {formData.services.map((service, index) => (
                  <div key={index} className="p-4 border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <Label className="font-semibold text-slate-700">Line Item {index + 1}</Label>
                      <button 
                        onClick={() => removeService(index)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        disabled={formData.services.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3 w-full">
                      <div className="w-full">
                        <div className="flex justify-between items-center mb-1.5">
                           <Label>Description</Label>
                        </div>
                        <Textarea 
                          placeholder="e.g. Deep cleaning service..."
                          value={service.description}
                          onChange={e => updateService(index, 'description', e.target.value)}
                          className="min-h-[60px] w-full"
                        />
                      </div>
                      <div className="flex flex-wrap sm:grid sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5 flex-1 min-w-[30%]">
                          <Label className="text-xs sm:text-sm">Qty / Pax</Label>
                          <Input 
                            type="number" 
                            min="1"
                            value={service.quantity || ''}
                            onChange={e => updateService(index, 'quantity', e.target.value)}
                            className="w-full px-2"
                          />
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[40%]">
                          <Label className="text-xs sm:text-sm truncate">Unit Price ($)</Label>
                          <Input 
                            type="number"
                            min="0"
                            value={service.unit_price || ''}
                            onChange={e => updateService(index, 'unit_price', e.target.value)}
                            className="w-full px-2"
                          />
                        </div>
                        <div className="space-y-1.5 w-full sm:col-span-1">
                          <Label className="text-xs sm:text-sm">Total ($)</Label>
                          <div className="h-10 px-3 flex items-center bg-slate-100 rounded-md border text-slate-600 font-medium">
                            {service.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card className="rounded-xl shadow-sm border-slate-200 overflow-hidden w-full">
              <div className="bg-slate-100/50 px-4 py-3 border-b text-sm font-semibold text-slate-800">
                Additional Notes
              </div>
              <CardContent className="p-4">
                <Textarea 
                  placeholder="Terms and conditions, payment terms, or thank you message..."
                  className="min-h-[100px] w-full"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Right Live Preview */}
        <ResponsivePreview>
          <InvoicePreview data={invoiceData} previewRef={previewRef} />
        </ResponsivePreview>
      </div>
    </div>
  );
}
