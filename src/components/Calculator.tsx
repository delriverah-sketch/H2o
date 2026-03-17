import { useState } from 'react';
import { Calculator as CalcIcon, GraduationCap, Target } from 'lucide-react';

export default function Calculator() {
  const [promedio, setPromedio] = useState<string>('');
  const [carrera, setCarrera] = useState<string>('');
  const [puntajeMinimo, setPuntajeMinimo] = useState<string>('');
  const [resultado, setResultado] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  const calcularPuntaje = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Reemplazar comas por puntos para soportar teclados móviles en español
    const promStr = promedio.replace(',', '.');
    const minStr = puntajeMinimo.replace(',', '.');
    
    const prom = parseFloat(promStr);
    const min = parseFloat(minStr);

    if (isNaN(prom) || isNaN(min)) {
      setError('Por favor, ingresa números válidos.');
      return;
    }

    // El puntaje de admisión UDG se calcula sumando el promedio de bachillerato
    // más el puntaje obtenido en el examen de admisión (PIENSE II o PAA).
    // Puntaje Total = Promedio + Examen
    // Por lo tanto, Examen Necesario = Puntaje Mínimo - Promedio
    // Se le suman 10 puntos de margen de seguridad.
    const necesario = min - prom + 10;
    setResultado(necesario);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 p-3 rounded-xl">
            <CalcIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Calculadora de Puntaje UDG</h2>
        </div>
        
        <p className="text-slate-600 mb-8">
          Ingresa tu promedio y el puntaje mínimo de la carrera a la que aspiras. 
          Te diremos cuántos puntos necesitas sacar en el examen (incluyendo un margen de seguridad de 10 puntos).
        </p>

        <form onSubmit={calcularPuntaje} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Promedio de Bachillerato (0-100)
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={promedio}
                onChange={(e) => setPromedio(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Ej. 85.5 o 85,5"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Carrera a la que aspiras
              </label>
              <input
                type="text"
                required
                value={carrera}
                onChange={(e) => setCarrera(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Ej. Medicina, Arquitectura..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Puntaje Mínimo de la Carrera
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={puntajeMinimo}
                onChange={(e) => setPuntajeMinimo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Ej. 175.5 o 175,5"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Calcular Puntaje Necesario
          </button>
        </form>

        {resultado !== null && (
          <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
            <Target className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              Para ingresar a <span className="font-bold text-slate-900">{carrera}</span> necesitas sacar en el examen:
            </h3>
            <div className="text-5xl font-black text-indigo-600 mb-2">
              {resultado > 100 ? '+100' : resultado.toFixed(2)}
            </div>
            <p className="text-sm text-slate-500">
              (Este cálculo incluye un margen de seguridad de 10 puntos por encima del mínimo histórico)
            </p>
            {resultado > 100 && (
              <p className="mt-4 text-amber-600 font-medium bg-amber-50 p-3 rounded-lg border border-amber-200">
                Nota: El puntaje máximo del examen es 100. Matemáticamente, con tu promedio actual, sería muy difícil alcanzar el puntaje mínimo más el margen de seguridad. ¡Esfuérzate al máximo!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
