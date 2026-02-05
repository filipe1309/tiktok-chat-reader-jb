import { useState, useEffect, useRef } from 'react';

// Default options for the poll (fixed 12 options)
const DEFAULT_OPTIONS = [
  'Sim',
  'Não',
  'Correr',
  'Pular',
  'Laboratório',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
];

const TOTAL_OPTIONS = DEFAULT_OPTIONS.length;

// Default selected options (1 and 2 - "Sim" and "Não")
const DEFAULT_SELECTED = [true, true, false, false, false, false, false, false, false, false, false, false];

// Option with preserved original ID
interface OptionWithId {
  id: number;
  text: string;
}

interface PollSetupProps {
  onStart: (question: string, options: OptionWithId[], timer: number) => void;
  onChange?: (question: string, options: OptionWithId[], timer: number, allOptions?: string[], selectedOptions?: boolean[]) => void;
  disabled?: boolean;
  initialQuestion?: string;
  initialOptions?: string[];
  initialSelectedOptions?: boolean[];
  initialTimer?: number;
  showStartButton?: boolean;
  externalConfig?: { question: string; options: OptionWithId[]; timer: number } | null;
}

export function PollSetup({ 
  onStart, 
  onChange,
  disabled = false,
  initialQuestion = 'Votar agora!',
  initialOptions = DEFAULT_OPTIONS,
  initialSelectedOptions = DEFAULT_SELECTED,
  initialTimer = 30,
  showStartButton = true,
  externalConfig = null
}: PollSetupProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [options, setOptions] = useState<string[]>(initialOptions);
  const [selectedOptions, setSelectedOptions] = useState<boolean[]>(initialSelectedOptions);
  const [timer, setTimer] = useState(initialTimer);
  const hasSentInitialChange = useRef(false);

  // Update state when externalConfig changes (from popup edit)
  // Only update if this is the initial load (not from our own changes)
  const lastExternalConfigRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (externalConfig) {
      const configKey = JSON.stringify(externalConfig);
      
      // Skip if this is the same config we just sent (prevents overwriting our own changes)
      if (lastExternalConfigRef.current === configKey) {
        return;
      }
      lastExternalConfigRef.current = configKey;
      
      console.log('[PollSetup] Received external config update:', externalConfig);
      setQuestion(externalConfig.question);
      setTimer(externalConfig.timer);
      
      // Rebuild options and selected arrays from externalConfig.options
      // Preserve existing option text for unselected options
      setOptions(prevOptions => {
        const newOptions = [...prevOptions];
        // Reset selected status first
        const newSelected = new Array(TOTAL_OPTIONS).fill(false);
        
        externalConfig.options.forEach(opt => {
          if (opt.id >= 1 && opt.id <= TOTAL_OPTIONS) {
            newOptions[opt.id - 1] = opt.text;
            newSelected[opt.id - 1] = true;
          }
        });
        
        setSelectedOptions(newSelected);
        return newOptions;
      });
    }
  }, [externalConfig]);

  // Get the selected options for the poll - returns objects with id (1-based) and text
  const getSelectedPollOptions = (currentOptions?: string[], currentSelected?: boolean[]) => {
    const opts = currentOptions ?? options;
    const selected = currentSelected ?? selectedOptions;
    const result = opts
      .map((opt, idx) => ({ 
        text: opt.trim(), // Don't use index as fallback - keep empty if not filled
        id: idx + 1, // 1-based id to preserve original position
        selected: selected[idx] 
      }))
      .filter(opt => opt.selected && opt.text); // Only include selected AND non-empty options
    
    return result;
  };

  // Get options with their original IDs for onChange (to preserve indices)
  const getSelectedPollOptionsWithIds = (currentOptions?: string[], currentSelected?: boolean[]) => {
    return getSelectedPollOptions(currentOptions, currentSelected).map(opt => ({ id: opt.id, text: opt.text }));
  };

  // Send initial onChange immediately on mount
  useEffect(() => {
    console.log('[PollSetup] Mount useEffect - hasSentInitialChange:', hasSentInitialChange.current);
    if (!hasSentInitialChange.current && onChange) {
      const selectedPollOptionsWithIds = getSelectedPollOptionsWithIds();
      const questionText = question.trim() || 'Votar agora!';
      console.log('[PollSetup] Sending initial onChange with options:', selectedPollOptionsWithIds);
      onChange(questionText, selectedPollOptionsWithIds, timer, options, selectedOptions);
      hasSentInitialChange.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle subsequent changes (user interaction) - REMOVED to prevent continuous calls
  // Only manual user actions (updateOption, toggleOption) will trigger updates now

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    
    // Notify parent of change with new state
    if (onChange && hasSentInitialChange.current) {
      const selectedPollOptionsWithIds = getSelectedPollOptionsWithIds(newOptions, selectedOptions);
      const questionText = question.trim() || 'Votar agora!';
      onChange(questionText, selectedPollOptionsWithIds, timer, newOptions, selectedOptions);
    }
  };

  const toggleOption = (index: number) => {
    const newSelected = [...selectedOptions];
    newSelected[index] = !newSelected[index];
    setSelectedOptions(newSelected);
    
    // Notify parent of change with new state
    if (onChange && hasSentInitialChange.current) {
      const selectedPollOptionsWithIds = getSelectedPollOptionsWithIds(options, newSelected);
      const questionText = question.trim() || 'Votar agora!';
      onChange(questionText, selectedPollOptionsWithIds, timer, options, newSelected);
    }
  };

  // Handle question change and notify parent
  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    
    // Notify parent of change
    if (onChange && hasSentInitialChange.current) {
      const selectedPollOptionsWithIds = getSelectedPollOptionsWithIds();
      const questionText = value.trim() || 'Votar agora!';
      onChange(questionText, selectedPollOptionsWithIds, timer, options, selectedOptions);
    }
  };

  // Handle timer change and notify parent
  const handleTimerChange = (value: number) => {
    const clampedValue = Math.min(300, Math.max(10, value));
    setTimer(clampedValue);
    
    // Notify parent of change
    if (onChange && hasSentInitialChange.current) {
      const selectedPollOptionsWithIds = getSelectedPollOptionsWithIds();
      const questionText = question.trim() || 'Votar agora!';
      onChange(questionText, selectedPollOptionsWithIds, clampedValue, options, selectedOptions);
    }
  };

  const handleStart = () => {
    const selectedPollOptionsWithIds = getSelectedPollOptionsWithIds();
    const questionText = question.trim() || 'Votar agora!';
    onStart(questionText, selectedPollOptionsWithIds, timer);
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
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Pergunta da Enquete
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => handleQuestionChange(e.target.value)}
            placeholder="Digite sua pergunta aqui..."
            className="input-field w-full"
            disabled={disabled}
          />
        </div>

        {/* Timer */}
        <div className="min-w-[200px]">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Tempo (segundos)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTimerChange(timer - 30)}
              disabled={disabled || timer <= 10}
              className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -30
            </button>
            <input
              type="number"
              value={timer}
              onChange={(e) => handleTimerChange(Number(e.target.value))}
              min={10}
              max={300}
              className="input-field flex-1 text-center"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => handleTimerChange(timer + 30)}
              disabled={disabled || timer >= 300}
              className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +30
            </button>
          </div>
        </div>
      </div>

      {/* Options Grid with Checkboxes */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Opções (marque as opções que deseja incluir na enquete)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {options.map((option, index) => (
            <div 
              key={index} 
              className={`flex items-center gap-2 p-2 rounded-lg border transition-all overflow-hidden ${
                selectedOptions[index] 
                  ? 'bg-purple-900/30 border-purple-500/50' 
                  : 'bg-slate-900/50 border-slate-700/50'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleOption(index)}
                disabled={disabled}
                className={`w-5 h-5 flex items-center justify-center rounded border-2 transition-all flex-shrink-0 text-sm ${
                  selectedOptions[index]
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-transparent hover:border-slate-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {selectedOptions[index] && '✓'}
              </button>
              <span className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm flex-shrink-0 ${
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
                className="input-field flex-1 min-w-0 py-1 text-sm"
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
