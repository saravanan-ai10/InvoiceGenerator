import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Building2, MapPin, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      setClients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.contact_person?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
            <p className="text-muted-foreground mt-2">Manage your cleaning service clients.</p>
          </div>
        </div>

        <Card className="shadow-sm border-slate-200">
          <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 rounded-t-xl">
            <CardTitle className="text-lg">All Clients</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search by name or contact..." 
                className="pl-9 bg-white w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <CardContent className="p-6">
            {loading ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                Loading clients...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500 bg-slate-50/30">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                  <Users className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-lg font-medium text-slate-700 mb-1">No clients found</p>
                <p className="text-sm">
                  {searchTerm ? 'Try a different search term.' : 'Clients will appear here automatically when you create an invoice for them.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                  <Link to={`/clients/${client.id}`} key={client.id}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-slate-200">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Building2 className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-lg mb-1">{client.name}</h3>
                            {client.contact_person && (
                              <p className="text-sm text-slate-600 mb-2">Attn: {client.contact_person}</p>
                            )}
                            {client.address && (
                              <div className="flex items-start gap-1.5 text-slate-500 text-xs mt-2">
                                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span className="line-clamp-2 leading-relaxed">{client.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
