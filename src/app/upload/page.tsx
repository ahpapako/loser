'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { UploadCloud, Loader2 } from 'lucide-react';

type OcrResponse = {
  rawText: string;
  confidence: number | null;
  parsed: {
    matchCount: number | null;
    totalOdds: number | null;
    stakeAmount: number | null;
    potentialWinnings: number | null;
  };
  error?: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Προέκυψε άγνωστο σφάλμα';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState('');

  const [matchCount, setMatchCount] = useState<number | ''>('');
  const [totalOdds, setTotalOdds] = useState<number | ''>('');
  // Κρατάμε και το αρχικό κείμενο για δικό σου debugging
  const [rawText, setRawText] = useState(''); 

  const performOCR = async (imageFile: File) => {
    setIsScanning(true);
    setMessage('Γίνεται σάρωση του δελτίου με Google Vision OCR...');
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/ocr/google', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as OcrResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Google Vision OCR failed');
      }

      setRawText(result.rawText);

      if (result.parsed.matchCount !== null) {
        setMatchCount(result.parsed.matchCount);
      }

      if (result.parsed.totalOdds !== null) {
        setTotalOdds(result.parsed.totalOdds);
      }

      setMessage('Η σάρωση ολοκληρώθηκε! Ελέγξτε τα πεδία πριν την αποθήκευση.');
    } catch (error) {
      console.error('Σφάλμα OCR:', error);
      setMessage(`Αποτυχία σάρωσης: ${getErrorMessage(error)}. Συμπληρώστε τα πεδία χειροκίνητα.`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Ξεκινάμε το OCR αμέσως μόλις επιλεγεί η εικόνα!
      performOCR(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setLoading(true);
      setMessage('Ανέβασμα εικόνας...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Δεν βρέθηκε συνδεδεμένος χρήστης');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`; 

      const { error: uploadError } = await supabase.storage
        .from('tickets_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tickets_images')
        .getPublicUrl(filePath);

      setMessage('Αποθήκευση στη βάση δεδομένων...');

      const { error: dbError } = await supabase.from('tickets').insert({
        user_id: user.id,
        image_url: publicUrl,
        match_count: Number(matchCount) || 0,
        total_odds: Number(totalOdds) || 0.0,
        status: 'pending'
      });

      if (dbError) throw dbError;

      setMessage('Επιτυχία! Επιστροφή στο Dashboard...');
      setTimeout(() => router.push('/dashboard'), 1500);

    } catch (error: unknown) {
      setMessage(`Σφάλμα: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex">
      <Navbar />
      <main className="ml-64 p-8 w-full bg-slate-50 min-h-screen flex items-start justify-center pt-10">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-lg">
          <div className="text-center mb-8">
            <UploadCloud className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-slate-800">Νέο Δελτίο</h1>
          </div>

          <form onSubmit={handleUpload} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Φωτογραφία</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg"
              />
            </div>

            {/* Ένδειξη φόρτωσης OCR */}
            {isScanning && (
              <div className="flex items-center justify-center text-blue-600 gap-2 p-4 bg-blue-50 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Σάρωση εικόνας, παρακαλώ περιμένετε...</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Αγώνες</label>
                <input 
                  type="number" 
                  value={matchCount}
                  onChange={(e) => setMatchCount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isScanning}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Συν. Απόδοση</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={totalOdds}
                  onChange={(e) => setTotalOdds(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isScanning}
                />
              </div>
            </div>

            {message && !isScanning && (
              <div className={`p-3 rounded-lg text-sm text-center ${message.includes('Σφάλμα') || message.includes('Αποτυχία') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || isScanning || !file}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Αποθήκευση...' : 'Ανέβασμα Δελτίου'}
            </button>
          </form>

          {/* Για debugging: Βλέπεις τι διάβασε το OCR */}
          {rawText && (
             <details className="mt-4 text-xs text-gray-500">
               <summary className="cursor-pointer font-semibold">Τι διάβασε το OCR (Debug)</summary>
               <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">{rawText}</pre>
             </details>
          )}
        </div>
      </main>
    </div>
  );
}
