'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

type Ticket = {
  id: string | number;
  created_at: string;
  image_url: string;
  match_count: number;
  total_odds: number | string;
  status: 'won' | 'lost' | 'pending' | string;
};

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Σφάλμα φόρτωσης όλων των δελτίων:', error.message);
        setTickets([]);
      } else {
        setTickets(data || []);
      }

      setLoading(false);
    }

    fetchTickets();
  }, []);

  return (
    <div className="flex">
      <Navbar />

      <main className="ml-64 p-8 w-full bg-gray-50 min-h-screen">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Όλα τα δελτία</h1>
            <div className="text-sm text-slate-500 mt-1">Σύνολο: {tickets.length}</div>
          </div>

          <Link
            href="/upload"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-sm"
          >
            <PlusCircle size={18} />
            Νέο Δελτίο
          </Link>
        </header>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {loading ? (
            <p className="p-10 text-center text-gray-500">Φόρτωση...</p>
          ) : tickets.length === 0 ? (
            <p className="p-10 text-center text-gray-500">
              Δεν βρέθηκαν δελτία. Ανεβάστε το πρώτο σας!
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="p-4 font-semibold text-slate-700">Ημερομηνία</th>
                  <th className="p-4 font-semibold text-slate-700">Φωτογραφία</th>
                  <th className="p-4 font-semibold text-slate-700">Αγώνες</th>
                  <th className="p-4 font-semibold text-slate-700">Απόδοση</th>
                  <th className="p-4 font-semibold text-slate-700">Κατάσταση</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b hover:bg-slate-50 transition">
                    <td className="p-4 text-sm">
                      {new Date(ticket.created_at).toLocaleDateString('el-GR')}
                    </td>
                    <td className="p-4">
                      <img
                        src={ticket.image_url}
                        alt="ticket"
                        className="w-12 h-12 object-cover rounded shadow-sm border"
                      />
                    </td>
                    <td className="p-4">{ticket.match_count}</td>
                    <td className="p-4 font-mono">{ticket.total_odds}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          ticket.status === 'won'
                            ? 'bg-green-100 text-green-700'
                            : ticket.status === 'lost'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {ticket.status === 'won'
                          ? 'ΚΕΡΔΟΣ'
                          : ticket.status === 'lost'
                          ? 'ΧΑΣΙΜΟ'
                          : 'ΕΚΚΡΕΜΕΙ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}