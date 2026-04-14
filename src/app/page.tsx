import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image με Overlay για να διαβάζεται το κείμενο */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072')`, // Μπορείς να αλλάξεις το URL
        }}
      >
        <div className="absolute inset-0 bg-black/60" /> {/* Dark overlay */}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight">
          OCR <span className="text-blue-500">Numbers</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Ανέβασε τα δελτια σου, και κερδισε .
           Γρήγορα, απλά και με ασφάλεια.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/login" 
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg"
          >
            Σύνδεση
          </Link>
          <Link 
            href="/register" 
            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/30 backdrop-blur-sm transition-all"
          >
            Εγγραφή
          </Link>
        </div>
      </div>
    </main>
  );
}