import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, Download, Search, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";

export default function Dashboard() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Failed to fetch invoices:", e);
      // Optional: set an error state to show to the user
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    // Basic confirmation logic, can be improved later
    try {
      await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      setInvoices(invoices.filter((inv) => inv.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await fetch(`/api/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status } : inv));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(term) ||
      inv.customer_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground mt-2">Manage your cleaning service invoices.</p>
        </div>
        <Link to="/create" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </Link>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 rounded-t-xl">
          <CardTitle className="text-lg">Recent Invoices</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search by invoice # or client..." 
              className="pl-9 bg-white w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              Loading invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500 bg-slate-50/30">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-lg font-medium text-slate-700 mb-1">No invoices found</p>
              <p className="text-sm">
                {searchTerm ? 'Try a different search term.' : 'Create your first invoice to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-100">
                    <TableHead className="font-semibold text-slate-900 ml-4 pl-6">Invoice No.</TableHead>
                    <TableHead className="font-semibold text-slate-900">Date</TableHead>
                    <TableHead className="font-semibold text-slate-900">Customer</TableHead>
                    <TableHead className="text-right font-semibold text-slate-900">Amount</TableHead>
                    <TableHead className="font-semibold text-slate-900">Status</TableHead>
                    <TableHead className="pr-6 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-blue-600 pl-6">
                        <Link to={`/invoices/${inv.id}`} className="hover:underline">{inv.invoice_number}</Link>
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-nowrap">{new Date(inv.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-slate-800 font-medium max-w-[200px] truncate">{inv.customer_name}</TableCell>
                      <TableCell className="text-right text-slate-800 font-semibold">${Number(inv.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <select 
                          value={inv.status || 'pending'} 
                          onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border outline-none cursor-pointer appearance-none ${
                            inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                            inv.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                         <button onClick={() => handleDelete(inv.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-md hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
