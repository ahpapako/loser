'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Προέκυψε άγνωστο σφάλμα';

type Ticket = {
  id: string | number;
  user_id: string;
  created_at: string;
  image_url: string;
  match_count: number;
  total_odds: number;
  bookmaker_stake_amount: number | string;
  stake_amount: number | string;
  status: 'won' | 'lost' | 'pending' | string;
};

type PendingFiles = {
  [ticketId: string]: File | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [savingId, setSavingId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFiles>({});

  useEffect(() => {
    async function init() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: adminRow, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminError || !adminRow) {
        setIsAdmin(false);
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Σφάλμα φόρτωσης tickets:', error.message);
        setTickets([]);
      } else {
        setTickets(data || []);
      }

      setLoading(false);
    }

    init();
  }, [router]);

  const handleFieldChange = (
    ticketId: string | number,
    field: keyof Ticket,
    value: string | number
  ) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, [field]: value } : ticket
      )
    );
  };

  const extractStoragePathFromPublicUrl = (publicUrl: string) => {
    const marker = '/storage/v1/object/public/tickets_images/';
    const index = publicUrl.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return publicUrl.substring(index + marker.length);
  };

  const handleFileChange = (ticketId: string | number, file: File | null) => {
    setPendingFiles((prev) => ({
      ...prev,
      [String(ticketId)]: file,
    }));
  };

  const handleSave = async (ticket: Ticket) => {
    try {
      setSavingId(ticket.id);

      const selectedFile = pendingFiles[String(ticket.id)];

      if (selectedFile) {
        const oldPath = extractStoragePathFromPublicUrl(ticket.image_url);
        const imagePath =
          oldPath ||
          `${ticket.user_id}/${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}-${selectedFile.name}`;

        const { error: updateImageError } = await supabase.storage
          .from('tickets_images')
          .upload(imagePath, selectedFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (updateImageError) {
          throw updateImageError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('tickets_images').getPublicUrl(imagePath);

        ticket.image_url = publicUrl;
      }

      const { error: updateDbError } = await supabase
        .from('tickets')
        .update({
          match_count: Number(ticket.match_count),
          total_odds: Number(ticket.total_odds),
          bookmaker_stake_amount: Number(ticket.bookmaker_stake_amount) || 0,
          status: ticket.status,
          image_url: ticket.image_url,
        })
        .eq('id', ticket.id);

      if (updateDbError) {
        throw updateDbError;
      }

      alert('Το δελτίο ενημερώθηκε επιτυχώς.');

      setPendingFiles((prev) => ({
        ...prev,
        [String(ticket.id)]: null,
      }));
    } catch (error: unknown) {
      alert(`Σφάλμα αποθήκευσης: ${getErrorMessage(error)}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (ticket: Ticket) => {
    const confirmed = window.confirm(
      'Θέλεις σίγουρα να διαγράψεις αυτό το δελτίο και τη φωτογραφία του;'
    );

    if (!confirmed) return;

    try {
      setDeletingId(ticket.id);

      const imagePath = extractStoragePathFromPublicUrl(ticket.image_url);

      if (imagePath) {
        const { error: storageDeleteError } = await supabase.storage
          .from('tickets_images')
          .remove([imagePath]);

        if (storageDeleteError) {
          throw storageDeleteError;
        }
      }

      const { error: dbDeleteError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticket.id);

      if (dbDeleteError) {
        throw dbDeleteError;
      }

      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
      alert('Το δελτίο διαγράφηκε.');
    } catch (error: unknown) {
      alert(`Σφάλμα διαγραφής: ${getErrorMessage(error)}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || isAdmin === null) {
    return (
      <div className="flex">
        <Navbar />
        <main className="ml-64 p-8 w-full min-h-screen bg-gray-50">
          <p>Φόρτωση...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex">
      <Navbar />

      <main className="ml-64 p-8 w-full min-h-screen bg-gray-50">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Admin Διαχείριση Δελτίων</h1>
          <p className="text-sm text-slate-500 mt-1">
            Εδώ μπορείς να επεξεργαστείς ή να διαγράψεις οποιοδήποτε δελτίο.
          </p>
        </header>

        <div className="space-y-6">
          {tickets.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Δεν υπάρχουν δελτία.</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-xl shadow border p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Image
                      src={ticket.image_url}
                      alt="ticket"
                      width={384}
                      height={256}
                      className="w-full max-w-sm rounded-lg border object-cover"
                    />
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">
                        Αντικατάσταση φωτογραφίας
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleFileChange(ticket.id, e.target.files?.[0] || null)
                        }
                        className="block w-full text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500">Ticket ID</p>
                      <p className="font-medium">{ticket.id}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">User ID</p>
                      <p className="font-medium break-all">{ticket.user_id}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Ημερομηνία</p>
                      <p className="font-medium">
                        {new Date(ticket.created_at).toLocaleString('el-GR')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Αγώνες</label>
                      <input
                        type="number"
                        value={ticket.match_count}
                        onChange={(e) =>
                          handleFieldChange(ticket.id, 'match_count', Number(e.target.value))
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Συν. Απόδοση</label>
                      <input
                        type="number"
                        step="0.01"
                        value={ticket.total_odds}
                        onChange={(e) =>
                          handleFieldChange(ticket.id, 'total_odds', Number(e.target.value))
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Ποντάρισμα στοιχηματικής</label>
                      <input
                        type="number"
                        step="0.01"
                        value={ticket.bookmaker_stake_amount}
                        onChange={(e) =>
                          handleFieldChange(ticket.id, 'bookmaker_stake_amount', Number(e.target.value))
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Ποντάρισμα ταμείου site</p>
                      <p className="font-mono font-medium">{ticket.stake_amount}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Status</label>
                      <select
                        value={ticket.status}
                        onChange={(e) =>
                          handleFieldChange(ticket.id, 'status', e.target.value)
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="pending">ΕΚΚΡΕΜΕΙ</option>
                        <option value="won">ΚΕΡΔΟΣ</option>
                        <option value="lost">ΧΑΣΙΜΟ</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleSave(ticket)}
                        disabled={savingId === ticket.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {savingId === ticket.id ? 'Αποθήκευση...' : 'Αποθήκευση αλλαγών'}
                      </button>

                      <button
                        onClick={() => handleDelete(ticket)}
                        disabled={deletingId === ticket.id}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {deletingId === ticket.id ? 'Διαγραφή...' : 'Διαγραφή'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
