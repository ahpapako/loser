'use client';
import Link from 'next/link';
import { LayoutDashboard, Upload, LogOut, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="flex flex-col w-64 h-screen bg-slate-900 text-white p-4 fixed">
      <h1 className="text-xl font-bold mb-10 px-2 tracking-tight text-blue-400">
        OCR BET TRACKER
      </h1>

      <div className="space-y-2 flex-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg transition"
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link
          href="/my-tickets"
          className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg transition"
        >
          <FolderOpen size={20} />
          Τα δελτία μου
        </Link>

        <Link
          href="/upload"
          className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg transition"
        >
          <Upload size={20} />
          Νέο Δελτίο
        </Link>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 p-3 hover:bg-red-900/30 text-red-400 rounded-lg transition mt-auto"
      >
        <LogOut size={20} />
        Αποσύνδεση
      </button>
    </nav>
  );
}