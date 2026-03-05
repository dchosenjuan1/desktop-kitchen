import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, ChefHat, TrendingUp, Users, Truck, Clock, Package, Heart, DollarSign, BarChart3, ShoppingCart, Loader2, ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { askAIAssistant } from '../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  screenContext?: string;
}

interface SmartQuestion {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'menu' | 'operations' | 'sales' | 'financial';
}

const ALL_QUESTIONS: SmartQuestion[] = [
  { id: 'ingredient_ideas', label: 'Ingredient ideas', description: 'What can I create with existing ingredients?', icon: <ChefHat size={18} />, category: 'menu' },
  { id: 'combo_ideas', label: 'Combo ideas', description: 'What sells well together?', icon: <ShoppingCart size={18} />, category: 'menu' },
  { id: 'menu_optimization', label: 'Menu optimization', description: 'What to remove or rework?', icon: <BarChart3 size={18} />, category: 'menu' },
  { id: 'prep_timing', label: 'Prep schedule', description: 'When should I start prepping?', icon: <Clock size={18} />, category: 'operations' },
  { id: 'closing_time', label: 'Closing time', description: 'When does the last order come?', icon: <Clock size={18} />, category: 'operations' },
  { id: 'waste_reduction', label: 'Reduce waste', description: 'How can I cut food waste?', icon: <Package size={18} />, category: 'operations' },
  { id: 'employee_scheduling', label: 'Staff scheduling', description: 'Optimal staff coverage', icon: <Users size={18} />, category: 'operations' },
  { id: 'customer_persona', label: 'Customer persona', description: 'Who is my typical customer?', icon: <Users size={18} />, category: 'sales' },
  { id: 'delivery_promo', label: 'Delivery promos', description: 'What to promote on delivery apps?', icon: <Truck size={18} />, category: 'sales' },
  { id: 'upsell_suggestions', label: 'Upsell suggestions', description: 'What should cashiers suggest?', icon: <TrendingUp size={18} />, category: 'sales' },
  { id: 'loyalty_insights', label: 'Loyalty insights', description: 'Improve customer retention', icon: <Heart size={18} />, category: 'sales' },
  { id: 'pricing_review', label: 'Price review', description: 'Are my prices competitive?', icon: <DollarSign size={18} />, category: 'financial' },
  { id: 'top_ingredient', label: 'Top ingredient', description: 'Most used & costly ingredient', icon: <Package size={18} />, category: 'financial' },
  { id: 'profit_margins', label: 'Profit margins', description: 'Best and worst margins', icon: <TrendingUp size={18} />, category: 'financial' },
  { id: 'inventory_reorder', label: 'Reorder alerts', description: 'What needs restocking?', icon: <Package size={18} />, category: 'financial' },
];

const CONTEXT_PRIORITY: Record<string, string[]> = {
  menu: ['ingredient_ideas', 'combo_ideas', 'menu_optimization'],
  inventory: ['top_ingredient', 'waste_reduction', 'inventory_reorder'],
  reports: ['pricing_review', 'profit_margins', 'customer_persona'],
  delivery: ['delivery_promo', 'pricing_review'],
  loyalty: ['customer_persona', 'loyalty_insights'],
  'prep-forecast': ['prep_timing', 'closing_time'],
  ai: ['menu_optimization', 'profit_margins', 'upsell_suggestions'],
  employees: ['employee_scheduling'],
  recipes: ['ingredient_ideas', 'top_ingredient'],
  pricing: ['pricing_review', 'profit_margins'],
};

function getOrderedQuestions(screenContext?: string): SmartQuestion[] {
  if (!screenContext || !CONTEXT_PRIORITY[screenContext]) return ALL_QUESTIONS;
  const priority = CONTEXT_PRIORITY[screenContext];
  const prioritized = priority.map(id => ALL_QUESTIONS.find(q => q.id === id)).filter(Boolean) as SmartQuestion[];
  const rest = ALL_QUESTIONS.filter(q => !priority.includes(q.id));
  return [...prioritized, ...rest];
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-sm text-neutral-200 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold text-white mt-3">{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-white mt-4">{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mt-4">{line.slice(2)}</h1>;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.slice(2);
          return <div key={i} className="flex gap-2 ml-2"><span className="text-violet-400 mt-0.5">*</span><span>{formatInline(content)}</span></div>;
        }
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)$/);
          if (match) return <div key={i} className="flex gap-2 ml-2"><span className="text-violet-400 font-medium">{match[1]}.</span><span>{formatInline(match[2])}</span></div>;
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function AIAssistantModal({ isOpen, onClose, screenContext }: Props) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAnswer(null);
      setError(null);
      setCustomText('');
      setActiveQuestion(null);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (answer && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [answer]);

  if (!isOpen) return null;

  const orderedQuestions = getOrderedQuestions(screenContext);

  const handleAsk = async (questionType: string, customQuestion?: string) => {
    setLoading(true);
    setError(null);
    setAnswer(null);
    setActiveQuestion(questionType === 'custom' ? 'custom' : questionType);
    try {
      const res = await askAIAssistant(questionType, customQuestion);
      if (res.success) {
        setAnswer(res.answer);
      } else {
        setError(res.error || 'Failed to get response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to AI');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = () => {
    if (!customText.trim()) return;
    handleAsk('custom', customText.trim());
  };

  const handleReset = () => {
    setAnswer(null);
    setError(null);
    setActiveQuestion(null);
    setCustomText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {(answer || error) && !loading && (
              <button onClick={handleReset} className="p-1 hover:bg-neutral-800 rounded-lg transition-colors">
                <ArrowLeft size={18} className="text-neutral-400" />
              </button>
            )}
            <Sparkles size={18} className="text-violet-400" />
            <h2 className="text-lg font-bold text-white">AI Assistant</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <X size={18} className="text-neutral-400" />
          </button>
        </div>

        <div className="p-6">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={36} className="text-violet-500 animate-spin mb-4" />
              <p className="text-neutral-300 text-sm animate-pulse">Analyzing your data...</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
              <button
                onClick={handleReset}
                className="w-full py-3 border border-neutral-700 text-neutral-300 font-semibold rounded-xl hover:bg-neutral-800 transition-colors text-sm"
              >
                Try another question
              </button>
            </div>
          )}

          {/* Answer state */}
          {answer && !loading && (
            <div className="space-y-4" ref={answerRef}>
              <div className="bg-neutral-800/50 border border-violet-700/20 rounded-xl p-5">
                <SimpleMarkdown text={answer} />
              </div>
              <button
                onClick={handleReset}
                className="w-full py-3 border border-violet-700/50 text-violet-300 font-semibold rounded-xl hover:bg-violet-900/20 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <MessageSquare size={16} /> Ask another question
              </button>
            </div>
          )}

          {/* Question selection (default state) */}
          {!loading && !answer && !error && (
            <>
              <p className="text-neutral-400 text-sm mb-5">
                Ask anything about your restaurant — powered by your real data
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
                {orderedQuestions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleAsk(q.id)}
                    className="text-left flex items-start gap-3 p-3 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/40 hover:border-violet-600/40 rounded-xl transition-colors group"
                  >
                    <div className="mt-0.5 text-violet-400 group-hover:text-violet-300 flex-shrink-0">
                      {q.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{q.label}</p>
                      <p className="text-neutral-500 text-xs truncate">{q.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom question */}
              <div className="border-t border-neutral-800 pt-5">
                <p className="text-neutral-500 text-xs font-medium uppercase tracking-wider mb-3">Or ask your own question</p>
                <div className="flex gap-2">
                  <textarea
                    ref={textareaRef}
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    placeholder="e.g., How can I increase my weekend sales?"
                    className="flex-1 bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3 text-white text-sm placeholder-neutral-500 resize-none focus:outline-none focus:border-violet-600/60 transition-colors h-20"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCustomSubmit();
                      }
                    }}
                  />
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customText.trim()}
                    className="self-end px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
