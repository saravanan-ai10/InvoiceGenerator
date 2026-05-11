import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, FileText, MapPin, Trash2, Pencil } from "lucide-react";
import { Card, CardTitle, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editClientData, setEditClientData] = useState({ name: "", contact_person: "", address: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const clientRes = await fetch(`/api/customers/${id}`);
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        setClient(clientData);
        setEditClientData({
          name: clientData.name || "",
          contact_person: clientData.contact_person || "",
          address: clientData.address || ""
        });
      }

      const invRes = await fetch(`/api/customers/${id}/invoices`);
      if (invRes.ok) {
        setInvoices(await invRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = async () => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editClientData)
      });
      if (res.ok) {
        const updatedClient = await res.json();
        setClient(updatedClient);
        setIsEditDialogOpen(false);
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to update client");
      }
    } catch (e: any) {
      console.error(e);
      alert('Error updating client: ' + e.message);
    }
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    try {
      await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      setInvoices(invoices.filter((inv) => inv.id !== invoiceId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (invoiceId: number, status: string) => {
    try {
      await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setInvoices(invoices.map(inv => inv.id === invoiceId ? { ...inv, status } : inv));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClient = async () => {
    try {
      const resp = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Failed to delete client');
      }
      navigate('/clients');
    } catch (e: any) {
      console.error(e);
      alert('Error deleting client: ' + e.message);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex justify-center items-center">
        <div className="flex flex-col items-center text-slate-500">
           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           Loading client details...
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex-1 p-8 text-center text-slate-500">
        Client not found.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <Link to="/clients" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Clients
            </Link>
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8 text-blue-700" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">{client.name}</h2>
                {client.contact_person && (
                  <p className="text-slate-600 font-medium">Attn: {client.contact_person}</p>
                )}
                {client.address && (
                  <div className="flex items-start gap-1.5 text-slate-500 text-sm mt-3 max-w-lg">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                    <span className="leading-relaxed whitespace-pre-wrap">{client.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-8">
            <Link to="/create" state={{ client }} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors">
              <FileText className="w-4 h-4" />
              New Invoice
            </Link>
            
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger render={<Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700" />}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Client
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Client</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Company Name *</Label>
                    <Input 
                      id="edit-name" 
                      value={editClientData.name} 
                      onChange={e => setEditClientData({ ...editClientData, name: e.target.value })} 
                      placeholder="e.g. Acme Corp" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-contact">Contact Person</Label>
                    <Input 
                      id="edit-contact" 
                      value={editClientData.contact_person} 
                      onChange={e => setEditClientData({ ...editClientData, contact_person: e.target.value })} 
                      placeholder="e.g. Jane Doe" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Textarea 
                      id="edit-address" 
                      value={editClientData.address} 
                      onChange={e => setEditClientData({ ...editClientData, address: e.target.value })} 
                      placeholder="Client's address" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleEditClient} disabled={!editClientData.name}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Client
            </Button>
          </div>
        </div>

        <Card className="shadow-sm border-slate-200">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50/50 rounded-t-xl">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              Invoices for this Client
            </CardTitle>
          </div>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 bg-slate-50/30">
                <p className="text-lg font-medium text-slate-700 mb-1">No invoices found</p>
                <p className="text-sm">There are no invoices for this client yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-100">
                    <TableHead className="font-semibold text-slate-900 ml-4 pl-6">Invoice No.</TableHead>
                    <TableHead className="font-semibold text-slate-900">Date</TableHead>
                    <TableHead className="text-right font-semibold text-slate-900">Amount</TableHead>
                    <TableHead className="font-semibold text-slate-900">Status</TableHead>
                    <TableHead className="pr-6 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-blue-600 pl-6">
                        <Link to={`/invoices/${inv.id}`} className="hover:underline">{inv.invoice_number}</Link>
                      </TableCell>
                      <TableCell className="text-slate-600">{new Date(inv.date).toLocaleDateString()}</TableCell>
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
                         <button onClick={() => handleDeleteInvoice(inv.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-md hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Delete Client</h3>
              <p className="text-slate-500 mt-2">
                Are you sure you want to delete this client? All associated invoices will also be deleted. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleDeleteClient} className="bg-red-600 hover:bg-red-700 text-white">
                Delete Client
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
