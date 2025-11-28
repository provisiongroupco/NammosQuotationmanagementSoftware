'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Search, Mail, Phone, Building, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getClients, deleteClient } from '@/lib/supabase/queries';
import AddClientDialog from '@/components/add-client-dialog';
import type { Client } from '@/types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    async function fetchClients() {
      const data = await getClients();
      setClients(data);
      setLoading(false);
    }
    fetchClients();
  }, []);

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(search.toLowerCase())) ||
      (client.company && client.company.toLowerCase().includes(search.toLowerCase())) ||
      (client.phone && client.phone.includes(search))
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    const success = await deleteClient(id);
    if (success) {
      setClients(clients.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-nammos-cream">Clients</h1>
          <p className="text-nammos-muted mt-1">
            Manage your client database
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nammos-muted" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-nammos-charcoal border-border"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-nammos-charcoal border-border animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-5 bg-nammos-dark rounded w-3/4" />
                <div className="h-4 bg-nammos-dark rounded w-1/2" />
                <div className="h-4 bg-nammos-dark rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-nammos-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-nammos-cream">No clients found</h3>
          <p className="text-nammos-muted mt-1">
            {search ? 'Try a different search term' : 'Add your first client to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="bg-nammos-charcoal border-border hover:border-primary transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-nammos-cream truncate">
                      {client.name}
                    </h3>
                    {client.company && (
                      <p className="text-sm text-nammos-muted flex items-center gap-1 mt-1">
                        <Building className="h-3 w-3" />
                        {client.company}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-nammos-muted hover:text-nammos-cream"
                      onClick={() => {
                        setEditingClient(client);
                        setShowAddDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-nammos-muted hover:text-destructive"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  {client.email && (
                    <p className="text-sm text-nammos-muted flex items-center gap-2">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </p>
                  )}
                  {client.phone && (
                    <p className="text-sm text-nammos-muted flex items-center gap-2">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      {client.phone}
                    </p>
                  )}
                </div>

                {client.notes && (
                  <p className="text-xs text-nammos-muted mt-3 line-clamp-2 italic">
                    {client.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddClientDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingClient(null);
        }}
        editingClient={editingClient}
        onClientSaved={(client) => {
          if (editingClient) {
            setClients(clients.map((c) => (c.id === client.id ? client : c)));
          } else {
            setClients([client, ...clients]);
          }
          setEditingClient(null);
        }}
      />
    </div>
  );
}
