import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { topics } from '../data/topics';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';

export default function Dashboard({ user }: { user: User }) {
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProgress(docSnap.data().progress || {});
      }
    });
    return () => unsubscribe();
  }, [user.uid]);

  const totalCompleted = Object.values(progress).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">¡Hola, {user.displayName || 'Estudiante'}!</h2>
        <p className="text-slate-600 mt-1">Aquí está tu progreso en la preparación para el examen de la UDG.</p>
        
        <div className="mt-6 flex items-center gap-4">
          <div className="bg-indigo-50 p-4 rounded-xl flex-1">
            <div className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Ejercicios Resueltos</div>
            <div className="text-3xl font-bold text-indigo-900 mt-1">{totalCompleted}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          Temario de Estudio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              to={`/study/${topic.id}`}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all group flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {topic.title}
                </h4>
                <div className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded-full">
                  {progress[topic.id] || 0} resueltos
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{topic.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-6">
                {topic.subtopics.map((sub) => (
                  <span key={sub} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                    {sub}
                  </span>
                ))}
              </div>
              <div className="flex items-center text-indigo-600 text-sm font-medium mt-auto">
                Estudiar ahora
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
