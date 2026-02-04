import { useState, useEffect, useRef } from 'react';

// Default options for the poll (fixed 8 options)
const DEFAULT_OPTIONS = [
  'Sim',
  'Não',
  'Correr',
  'Pular',
  'Laboratório',
  '',
  '',
  '',
];

// Default selected options (1 and 2 - "Sim" and "Não")
const DEFAULT_SELECTED = [true, true, false, false, false, false, false, false];

interface PollSetupProps {
  onStart: (question: string, options: string[], timer: number) => void;
  onChange?: (question: string, options: string[], timer: number) => void;
  disabled?: boolean;
  initialQuestion?: string;
  initialOptions?: string[];
  initialSelectedOptions?: boolean[];
  initialTimer?: number;
  showStartButton?: boolean;
}

export function PollSetup({ 
  onStart, 
  onChange,
  disabled = false,
  initialQuestion = 'Votar agora!',
  initialOptions = DEFAULT_OPTIONS,
  initialSelectedOptions = DEFAULT_SELECTED,
  initialTimer = 30,
  showStartButton = true
}: PollSetupProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [options, setOptions] = useState<string[]>(initialOptions);
  const [selectedOptions, setSelectedOptions] = useState<boolean[]>(initialSelectedOptions);
  const [timer, setTimer] = useState(initialTimer);
  const hasSentInitialChange = useRef(false);

  // Get the selected options for the poll
  const getSelectedPollOptions = () => {
    const result = options
      .map((opt, idx) => ({ 
        text: opt.trim(), // Don't use index as fallback - keep empty if not filled
        index: idx, 
        selected: selectedOptions[idx] 
      }))
      .filter(opt => opt.selected && opt.text) // Only include selected AND non-empty options
      .map(opt => opt.text);
    
    return result;
  };

  // Send initial onChange immediately on mount
  useEffect(() => {
    console.log('[PollSetup] Mount useEffect - hasSentInitialChange:', hasSentInitialChange.current);
    if (!hasSentInitialChange.current && onChange) {
      const selectedPollOptions = getSelectedPollOptions();
      const questionText = question.trim() || 'Votar agora!';
      console.log('[PollSetup] Sending initial onChange with options:', selectedPollOptions);
      onChange(questionText, selectedPollOptions, timer);
      hasSentInitialChange.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle subsequent changes (user interaction) - REMOVED to prevent continuous calls
  // Only manual user actions (updateOption, toggleOption) will trigger updates now

  const updateOption = (index: number, value: string) => {
    setOptions(prev => {
      const newOptions = [...prev];
      newOptions[index] = value;
      return newOptions;
    });
    
    // Notify parent of change after state update
    if (onChange && hasSentInitialChange.current) {
      setTimeout(() => {
        const selectedPollOptions = getSelectedPollOptions();
        const questionText = question.trim() || 'Votar agora!';
        onChange(questionText, selectedPollOptions, timer);
      }, 0);
    }
  };

  const toggleOption = (index: number) => {
    setSelectedOptions(prev => {
      const newSelected = [...prev];
      newSelected[index] = !newSelected[index];
      return newSelected;
    });
    
    // Notify parent of change after state update
    if (onChange && hasSentInitialChange.current) {
      setTimeout(() => {
        const selectedPollOptions = getSelectedPollOptions();
        const questionText = question.trim() || 'Votar agora!';
        onChange(questionText, selectedPollOptions, timer);
      }, 0);
    }
  };

  const handleStart = () => {
    const selectedPollOptions = getSelectedPollOptions();
    const questionText = question.trim() || 'Votar agora!';
    onStart(questionText, selectedPollOptions, timer);
  };

  // At least 2 options must be selected
  const selectedCount = selectedOptions.filter(Boolean).length;
  const isValid = selectedCount >= 2;

  return (
    <div className="space-y-6">
      {/* Question and Timer Row */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Question Input */}
        <div className="flex-1 min-w-[300px]">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Pergunta da Enquete
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Digite sua pergunta aqui..."
            className="input-field w-full"
            disabled={disabled}
          />
        </div>

        {/* Timer */}
        <div className="min-w-[200px]">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tempo (segundos)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTimer(prev => Math.max(10, prev - 30))}
              disabled={disabled || timer <= 10}
              className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -30
            </button>
            <input
              type="number"
              value={timer}
              onChange={(e) => setTimer(Math.min(300, Math.max(10, Number(e.target.value))))}
              min={10}
              max={300}
              className="input-field flex-1 text-center"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => setTimer(prev => Math.min(300, prev + 30))}
              disabled={disabled || timer >= 300}
              className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +30
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="px-3 py-2 bg-slate-800 rounded-lg">
            {selectedCount} opções selecionadas
          </span>
        </div>
      </div>

      {/* Options Grid with Checkboxes */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Opções (marque as opções que deseja incluir na enquete)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((option, index) => (
            <div 
              key={index} 
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                selectedOptions[index] 
                  ? 'bg-purple-900/30 border-purple-500/50' 
                  : 'bg-slate-900/50 border-slate-700/50'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleOption(index)}
                disabled={disabled}
                className={`w-6 h-6 flex items-center justify-center rounded border-2 transition-all flex-shrink-0 ${
                  selectedOptions[index]
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-transparent hover:border-slate-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {selectedOptions[index] && '✓'}
              </button>
              <span className={`w-9 h-9 flex items-center justify-center rounded-full font-bold text-lg flex-shrink-0 ${
                selectedOptions[index]
                  ? 'bg-gradient-to-br from-purple-600 to-purple-400 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {index + 1}
              </span>
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Opção ${index + 1}`}
                className="input-field flex-1 py-2"
                disabled={disabled}
              />
            </div>
          ))}
        </div>
        {selectedCount < 2 && (
          <p className="text-red-400 text-sm mt-2">
            ⚠️ Selecione pelo menos 2 opções para a enquete
          </p>
        )}
      </div>

      {showStartButton && (
        <button
          onClick={handleStart}
          disabled={!isValid || disabled}
          className="w-full text-lg py-4 px-6 bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold rounded-xl hover:from-green-500 hover:to-blue-600 hover:scale-105 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          ▶️ Iniciar Enquete
        </button>
      )}
    </div>
  );
}
