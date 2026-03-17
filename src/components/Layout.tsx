import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { BookOpen, Calculator, LogOut, GraduationCap } from 'lucide-react';

export default function Layout({ user }: { user: User }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <img 
                src="https://www.uteg.edu.mx/wp-content/uploads/2020/06/logo-uteg.png" 
                alt="Logo UTEG" 
                className="h-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden flex items-center gap-2">
                <GraduationCap className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-black text-indigo-900 tracking-tighter">UTEG</span>
              </div>
              <div className="border-l-2 border-slate-200 pl-3">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Prep UDG</h1>
                <p className="text-xs text-slate-500">por Victor Gabriel Zanabria Rivera</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link to="/" className="text-slate-600 hover:text-indigo-600 flex items-center gap-2 font-medium">
                <BookOpen className="h-4 w-4" />
                Temario
              </Link>
              <Link to="/calculator" className="text-slate-600 hover:text-indigo-600 flex items-center gap-2 font-medium">
                <Calculator className="h-4 w-4" />
                Calculadora de Puntaje
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 hidden sm:block">{user.displayName || user.email}</span>
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Navigation Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around items-center h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link to="/" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location.pathname === '/' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-indigo-600 active:bg-slate-50'}`}>
          <BookOpen className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Temario</span>
        </Link>
        <Link to="/calculator" className={`flex flex-col items-center justify-center w-full h-full border-l border-slate-100 transition-colors ${location.pathname === '/calculator' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-indigo-600 active:bg-slate-50'}`}>
          <Calculator className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Calculadora</span>
        </Link>
      </nav>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>Desarrollado por Victor Gabriel Zanabria Rivera</p>
          <p className="mt-1">Preparación para el examen de admisión UDG</p>
        </div>
      </footer>
    </div>
  );
}
