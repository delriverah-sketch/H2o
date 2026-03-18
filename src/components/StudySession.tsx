import { useState, Component, ErrorInfo, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { topics } from '../data/topics';
import { GoogleGenAI, Type } from '@google/genai';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, BrainCircuit, GraduationCap, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Step {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

interface QuizData {
  steps: Step[];
  detailedProcess: string;
  finalResult: Step;
}

class MathErrorBoundary extends Component<{ children: ReactNode, fallbackText: string }, { hasError: boolean }> {
  constructor(props: { children: ReactNode, fallbackText: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: { fallbackText: string }) {
    if (prevProps.fallbackText !== this.props.fallbackText) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Math rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <span className="text-slate-700 font-mono text-sm break-words whitespace-pre-wrap">{this.props.fallbackText}</span>;
    }
    return this.props.children;
  }
}

class StepErrorBoundary extends Component<{ children: ReactNode, onSkip: () => void, stepIndex: number }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: any) {
    if (prevProps.stepIndex !== this.props.stepIndex) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Step rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-200 text-center animate-in fade-in duration-500">
          <div className="text-red-500 mb-4 flex justify-center">
            <XCircle className="h-12 w-12" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Error al mostrar este paso</h3>
          <p className="text-slate-600 mb-6">La Inteligencia Artificial generó un formato inválido que no se pudo mostrar correctamente.</p>
          <button onClick={this.props.onSkip} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-colors">
            Continuar al siguiente paso
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MathMarkdown = ({ children }: { children?: any }) => {
  const content = typeof children === 'string' ? children : String(children || '');
  
  return (
    <MathErrorBoundary fallbackText={content}>
      <ReactMarkdown 
        remarkPlugins={[remarkMath]} 
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
      >
        {content}
      </ReactMarkdown>
    </MathErrorBoundary>
  );
};

export default function StudySession({ user }: { user: User }) {
  const { topic } = useParams<{ topic: string }>();
  const navigate = useNavigate();
  const topicData = topics.find(t => t.id === topic);

  const [problem, setProblem] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  
  const [status, setStatus] = useState<'input' | 'steps' | 'process' | 'final' | 'completed'>('input');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [error, setError] = useState('');

  if (!topicData) {
    return <div>Tema no encontrado</div>;
  }

  const generateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) return;

    setIsGenerating(true);
    setError('');

    try {
      const prompt = `Eres un tutor experto en matemáticas para el examen de admisión de la UDG.
El usuario quiere resolver el siguiente problema/ecuación: "${problem}".
El tema es: "${topicData.title}".

Sigue estas instrucciones estrictamente:
1. Desglosa la solución en pasos lógicos.
2. Para cada paso, genera una pregunta de opción múltiple preguntando al usuario cuál debe ser el siguiente paso o cuál es el resultado de la operación parcial actual. Proporciona 4 opciones para cada paso.
3. NO des el resultado final en estos pasos.
4. Genera una explicación detallada de todo el proceso (detailedProcess) que el usuario acaba de hacer, pero SIN revelar el resultado final.
5. Finalmente, genera una pregunta de opción múltiple (finalResult) preguntando por el resultado final de la ecuación/problema.
6. REGLAS DE LENGUAJE Y FORMATO MATEMÁTICO (¡MUY IMPORTANTE Y ESTRICTO!):
   - RIGOR MATEMÁTICO: Proporciona el mejor y más riguroso procedimiento matemático posible. NO te saltes pasos. Sé extremadamente estricto con los signos (positivo/negativo), los valores exactos y las leyes de los exponentes. Aplica la jerarquía de operaciones y las propiedades algebraicas paso a paso sin omitir detalles.
   - PROHIBIDO CONTEXTUALIZAR LAS VARIABLES. Si el problema tiene una "x", llámala EXCLUSIVAMENTE "$x$". NUNCA la llames "incógnita", "variable", "restaurante", "año", "edad", ni ningún otro sustantivo. "$x$" vale "$x$" y nada más.
   - PROHIBIDO ASUMIR UNIDADES DE MEDIDA. Si ves letras como "m", "s", "g", "v", trátalas como simples letras algebraicas ($m$, $s$, $g$, $v$). NUNCA asumas que "m" significa "metros" o "s" significa "segundos" a menos que el problema original hable explícitamente de distancias o tiempos con esas palabras.
   - SIGNOS DE INTERROGACIÓN: En español, TODAS las preguntas deben abrir obligatoriamente con el signo '¿' y cerrar con '?'. (Ej. INCORRECTO: "Cuál es el valor de $x$?". CORRECTO: "¿Cuál es el valor de $x$?").
   - ORTOGRAFÍA Y ESPACIADO: Cuida impecablemente la ortografía y las tildes (ej. "ecuación", "cuál", "qué", "fracción"). Asegúrate de dejar SIEMPRE un espacio en blanco antes y después de cada bloque de LaTeX para que no se pegue a las palabras. (INCORRECTO: "El valor de$x$es". CORRECTO: "El valor de $x$ es").
   - EJEMPLOS DE LO QUE NO DEBES HACER:
     * INCORRECTO: "Despejamos la incógnita $x$" -> CORRECTO: "Despejamos $x$"
     * INCORRECTO: "El valor del restaurante $x$" -> CORRECTO: "El valor de $x$"
     * INCORRECTO: "La variable $y$" -> CORRECTO: "$y$"
     * INCORRECTO: "5 metros" (cuando el problema solo decía 5m) -> CORRECTO: "$5m$"
     * INCORRECTO: "Qué hacemos ahora?" -> CORRECTO: "¿Qué hacemos ahora?"
   - Lo mismo aplica para cualquier otra letra ($y$, $z$, $a$, $b$, etc.). Usa siempre la letra exacta que el usuario haya proporcionado.
   - Usa formato LaTeX encerrado en signos de dólar ($...$) para TODAS las expresiones matemáticas, números sueltos, variables, fracciones y raíces.
   - Usa los símbolos matemáticos correctos en LaTeX en lugar de palabras (ej. usa $\\sqrt{x}$ en lugar de "raíz de x", usa $\\frac{a}{b}$ en lugar de "a sobre b" o fracciones con diagonal).
   - Trata las ecuaciones de forma puramente algebraica en tus explicaciones. Mantén las explicaciones directas, claras y fáciles de leer visualmente.

Devuelve la respuesta en formato JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "Eres un tutor de matemáticas estrictamente algebraico y riguroso. REGLAS ABSOLUTAS: 1. NUNCA uses las palabras 'incógnita', 'variable' ni contextualices letras con sustantivos ('restaurante', 'edad'). 2. NUNCA asumas unidades de medida ('m' NO es 'metros', es solo 'm'). 3. TODAS las preguntas en español deben iniciar con '¿' y terminar con '?'. 4. Cuida impecablemente la ortografía, tildes y los ESPACIOS entre palabras y fórmulas matemáticas (ej. 'El valor de $x$ es', NUNCA 'El valor de$x$es'). 5. RIGOR MATEMÁTICO: Sé extremadamente estricto con signos, valores y exponentes. No omitas ningún paso algebraico.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              steps: {
                type: Type.ARRAY,
                description: "Pasos intermedios para resolver el problema",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING, description: "La pregunta sobre el paso actual" },
                    options: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING },
                      description: "4 opciones posibles"
                    },
                    correctOptionIndex: { type: Type.INTEGER, description: "Índice de la opción correcta (0-3)" },
                    explanation: { type: Type.STRING, description: "Explicación de por qué esta es la opción correcta" }
                  },
                  required: ["question", "options", "correctOptionIndex", "explanation"]
                }
              },
              detailedProcess: {
                type: Type.STRING,
                description: "Explicación detallada de los pasos en Markdown, sin revelar el resultado final."
              },
              finalResult: {
                type: Type.OBJECT,
                description: "Pregunta sobre el resultado final",
                properties: {
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING }
                  },
                  correctOptionIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctOptionIndex", "explanation"]
              }
            },
            required: ["steps", "detailedProcess", "finalResult"]
          }
        }
      });

      const rawText = response.text || '{}';
      let cleanText = rawText;
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanText = jsonMatch[1];
      } else {
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          cleanText = rawText.substring(start, end + 1);
        }
      }
      let data = JSON.parse(cleanText) as QuizData;
      
      if (!data.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
        throw new Error("El formato de la respuesta no es válido. Faltan los pasos.");
      }
      if (!data.finalResult) {
        throw new Error("El formato de la respuesta no es válido. Falta el resultado final.");
      }

      // Normalizar datos para evitar crashes si la IA devuelve tipos incorrectos
      data.steps = data.steps.map(step => ({
        question: String(step?.question || ''),
        options: Array.isArray(step?.options) ? step.options.map(o => String(o)) : ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        correctOptionIndex: Number(step?.correctOptionIndex) || 0,
        explanation: String(step?.explanation || '')
      }));

      data.finalResult = {
        question: String(data.finalResult?.question || ''),
        options: Array.isArray(data.finalResult?.options) ? data.finalResult.options.map(o => String(o)) : ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        correctOptionIndex: Number(data.finalResult?.correctOptionIndex) || 0,
        explanation: String(data.finalResult?.explanation || '')
      };

      data.detailedProcess = String(data.detailedProcess || '');

      setQuizData(data);
      setStatus('steps');
      setCurrentStepIndex(0);
      setSelectedOption(null);
      setIsAnswerChecked(false);

    } catch (err: any) {
      console.error(err);
      setError('Hubo un error al generar el ejercicio. Por favor, intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const checkAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswerChecked(true);
  };

  const nextStep = () => {
    if (!quizData) return;

    if (status === 'steps') {
      if (currentStepIndex < quizData.steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsAnswerChecked(false);
      } else {
        setStatus('process');
        setSelectedOption(null);
        setIsAnswerChecked(false);
      }
    } else if (status === 'final') {
      setStatus('completed');
      saveProgress();
    }
  };

  const saveProgress = async () => {
    if (!topic) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        await updateDoc(userRef, {
          [`progress.${topic}`]: increment(1)
        });
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          progress: { [topic]: 1 },
          createdAt: new Date()
        });
      }
    } catch (err) {
      console.error("Error saving progress:", err);
    }
  };

  const resetSession = () => {
    setProblem('');
    setQuizData(null);
    setStatus('input');
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setCurrentStepIndex(0);
  };

  const renderQuizStep = (step: Step, isFinal: boolean = false) => {
    if (!step) return null;
    const isCorrect = selectedOption === step.correctOptionIndex;

    return (
      <StepErrorBoundary stepIndex={currentStepIndex} onSkip={nextStep}>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 font-bold">
              {isFinal ? 'Resultado Final' : `Paso ${currentStepIndex + 1}`}
            </div>
            <div className="text-xl font-bold text-slate-900">
              <MathMarkdown>{step.question}</MathMarkdown>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {step.options.map((option, index) => {
              let buttonClass = "w-full text-left p-4 rounded-xl border-2 transition-all ";
              
              if (!isAnswerChecked) {
                buttonClass += selectedOption === index 
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900" 
                  : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700";
              } else {
                if (index === step.correctOptionIndex) {
                  buttonClass += "border-emerald-500 bg-emerald-50 text-emerald-900";
                } else if (selectedOption === index) {
                  buttonClass += "border-red-500 bg-red-50 text-red-900";
                } else {
                  buttonClass += "border-slate-200 opacity-50 text-slate-500";
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => !isAnswerChecked && setSelectedOption(index)}
                  disabled={isAnswerChecked}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium flex items-center gap-2">
                      <span>{String.fromCharCode(65 + index)}.</span>
                      <MathMarkdown>{option}</MathMarkdown>
                    </div>
                    {isAnswerChecked && index === step.correctOptionIndex && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    )}
                    {isAnswerChecked && selectedOption === index && index !== step.correctOptionIndex && (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {isAnswerChecked && (
            <div className={`p-4 rounded-xl mb-8 ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <h4 className={`font-bold mb-2 ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                {isCorrect ? '¡Correcto!' : 'Incorrecto'}
              </h4>
              <div className={isCorrect ? 'text-emerald-700' : 'text-red-700'}>
                <MathMarkdown>{step.explanation}</MathMarkdown>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            {!isAnswerChecked ? (
              <button
                onClick={checkAnswer}
                disabled={selectedOption === null}
                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Comprobar
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                {isFinal ? 'Ver Evaluación Final' : 'Siguiente Paso'}
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            )}
          </div>
        </div>
      </StepErrorBoundary>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al Temario
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">{topicData.title}</h2>
        <p className="text-slate-600 mt-2">{topicData.description}</p>
      </div>

      {status === 'input' && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <BrainCircuit className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Ingresa tu problema</h3>
          </div>
          <p className="text-slate-600 mb-6">
            Escribe la ecuación o el problema que quieres resolver. Te guiaremos paso a paso para encontrar la solución.
          </p>

          <form onSubmit={generateQuiz}>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Ej. 2x + 5 = 15"
              className="w-full h-32 p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none mb-6 text-lg"
              required
            />
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating || !problem.trim()}
              className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Generando pasos...
                </>
              ) : (
                'Comenzar a resolver'
              )}
            </button>
          </form>
        </div>
      )}

      {status === 'steps' && quizData && renderQuizStep(quizData.steps[currentStepIndex])}
      
      {status === 'process' && quizData && (
        <StepErrorBoundary stepIndex={-1} onSkip={() => setStatus('final')}>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
              <div className="bg-indigo-100 p-3 rounded-xl">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Proceso Detallado</h3>
                <p className="text-slate-500">Revisa los pasos que hemos seguido hasta ahora.</p>
              </div>
            </div>

            <div className="prose prose-slate max-w-none mb-10 prose-headings:text-indigo-900 prose-a:text-indigo-600">
              <MathMarkdown>{quizData.detailedProcess}</MathMarkdown>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100">
              <button
                onClick={() => setStatus('final')}
                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                Resolver la ecuación final
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            </div>
          </div>
        </StepErrorBoundary>
      )}

      {status === 'final' && quizData && renderQuizStep(quizData.finalResult, true)}

      {status === 'completed' && quizData && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <GraduationCap className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">¡Problema Resuelto!</h3>
              <p className="text-slate-500">Has completado este ejercicio exitosamente y tu progreso ha sido guardado.</p>
            </div>
          </div>

          <div className="flex justify-center pt-6">
            <button
              onClick={resetSession}
              className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Resolver otro problema
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
