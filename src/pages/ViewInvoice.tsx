import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Download, Mail, Edit, Share2, Trash2 } from "lucide-react";
import InvoicePreview from "../components/InvoicePreview";
import { Button } from "../components/ui/button";
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';

export default function ViewInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setError(null);
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Invoice not found' }));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }
        const data = await res.json();
        // transform to match InvoiceData format expected by InvoicePreview
        setInvoice({
          ...data,
          customer_name: data.name,
          customer_address: data.address,
          contact_person: data.contact_person,
          total_amount: Number(data.total_amount),
          subtotal: data.subtotal != null ? Number(data.subtotal) : Number(data.total_amount), 
          gst_enabled: data.gst_enabled || false, 
          gst_amount: data.gst_amount != null ? Number(data.gst_amount) : 0,
          notes: data.notes || '',
          due_date: data.due_date || new Date(new Date(data.date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchInvoice();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setLoadingPdf(true);
    try {
      const canvas = await toCanvas(previewRef.current, {
        pixelRatio: 2
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height] 
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Invoice_${invoice.invoice_number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleEmail = () => {
    window.location.href = `mailto:?subject=Invoice ${invoice?.invoice_number}&body=Please find attached invoice ${invoice?.invoice_number}.`;
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      let isPdfShared = false;

      // Check if we can share files
      if (navigator.share && previewRef.current && navigator.canShare) {
        setLoadingPdf(true); // Re-using loading state
        const canvas = await toCanvas(previewRef.current, { pixelRatio: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height] 
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        
        // Generate Blob from PDF
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `Invoice_${invoice?.invoice_number}.pdf`, { type: 'application/pdf' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice ${invoice?.invoice_number}`,
            text: `Please find your invoice ${invoice?.invoice_number} here.`,
            files: [file],
          });
          isPdfShared = true;
        }
        setLoadingPdf(false);
      }

      // Fallback to sharing URL if files couldn't be shared
      if (!isPdfShared) {
        const shareData = {
          title: `Invoice ${invoice?.invoice_number}`,
          text: `Please find your invoice ${invoice?.invoice_number} here.`,
          url: window.location.href,
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          navigator.clipboard.writeText(window.location.href);
          alert('Link copied to clipboard!');
        }
      }
    } catch (err) {
      console.error('Error sharing', err);
      // It might be a user cancellation, we don't necessarily need to alert
    } finally {
      setLoadingPdf(false);
      setIsSharing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        navigate('/');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await fetch(`/api/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      setInvoice({ ...invoice, status: newStatus });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex justify-center items-center">
        <div className="flex flex-col items-center text-slate-500">
           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           Loading invoice...
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex-1 p-8 text-center text-slate-500">
        {error ? (
          <div className="max-w-md mx-auto bg-red-50 border border-red-100 p-6 rounded-lg">
            <p className="text-red-700 font-medium mb-2">Error loading invoice</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <Link to="/" className="text-blue-600 hover:underline text-sm font-medium">Back to Dashboard</Link>
          </div>
        ) : (
          "Invoice not found."
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Invoices /</span>
              <span className="font-semibold text-slate-800 line-clamp-1">{invoice.invoice_number}</span>
              <select 
                value={invoice.status || 'pending'} 
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`ml-1 sm:ml-3 text-xs font-semibold px-2.5 py-0.5 rounded-full border outline-none cursor-pointer appearance-none ${
                   invoice.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                   invoice.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                   'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none gap-2 text-slate-600 hover:bg-slate-50" onClick={handleShare} disabled={isSharing || loadingPdf}>
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isSharing ? 'Sharing...' : 'Share'}</span>
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700" onClick={handleEmail}>
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none gap-2 text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={handleDownloadPDF} disabled={loadingPdf || isSharing}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{loadingPdf ? 'PDF...' : 'PDF'}</span>
          </Button>
          {/* We'll pass the invoice state so CreateInvoice can read it */}
          <Link to="/create" state={{ editInvoice: invoice }} className="flex-1 sm:flex-none">
            <Button className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Edit Invoice</span>
            </Button>
          </Link>
          <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex justify-center lg:justify-center items-start">
        <div className="shadow-2xl rounded-sm overflow-hidden bg-white shrink-0 origin-top transform scale-[0.6] sm:scale-75 lg:scale-100 transition-transform">
          <InvoicePreview data={invoice} previewRef={previewRef} />
        </div>
      </div>
    </div>
  );
}
