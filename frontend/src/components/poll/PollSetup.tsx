import { useState, useEffect } from 'react';

interface PollSetupProps {
  onStart: (question: string, options: string[], timer: number) => void;
  onChange?: (question: string, options: string[], timer: number) => void;
  disabled?: boolean;
  initialQuestion?: string;
  initialOptions?: string[];
  initialTimer?: number;
  showStartButton?: boolean;
}

export function PollSetup({ 
  onStart, 
  onChange,
  disabled = false,
  initialQuestion = '',
  initialOptions,
  initialTimer = 30,
  showStartButton = true
}: PollSetupProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [numOptions, setNumOptions] = useState(initialOptions?.length || 4);
  const [options, setOptions] = useState<string[]>(initialOptions || ['', '', '', '']);
  const [timer, setTimer] = useState(initialTimer);

  // Update internal state when initial values change
  useEffect(() => {
    if (initialQuestion) setQuestion(initialQuestion);
  }, [initialQuestion]);

  useEffect(() => {
    if (initialOptions) {
      setOptions(initialOptions);
      setNumOptions(initialOptions.length);
    }
  }, [initialOptions]);

  useEffect(() => {
    if (initialTimer) setTimer(initialTimer);
  }, [initialTimer]);

  // Auto-update options when numOptions changes
  useEffect(() => {
    setOptions(prev => {
      const newOptions = [...prev];
      while (newOptions.length < numOptions) {
        newOptions.push('');
      }
      return newOptions.slice(0, numOptions);
    });
  }, [numOptions]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      const finalOptions = options.map((opt, idx) => opt.trim() || (idx + 1).toString());
      const questionText = question.trim() || 'Vote agora!';
      onChange(questionText, finalOptions, timer);
    }
  }, [question, options, timer, onChange]);

  const updateOption = (index: number, value: string) => {
    setOptions(prev => {
      const newOptions = [...prev];
      newOptions[index] = value;
      return newOptions;
    });
  };

  const handleStart = () => {
    // Use option text or default to number if empty
    const finalOptions = options.map((opt, idx) => opt.trim() || (idx + 1).toString());
    const questionText = question.trim() || 'Vote agora!';
    onStart(questionText, finalOptions, timer);
  };

  // At least 2 options available (either filled or will use default numbers)
  const isValid = numOptions >= 2;

  return (
    <div className="space-y-6">
      {/* Question Input */}
      <div>
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

      {/* Configuration Row */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Número de Opções
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNumOptions(prev => Math.max(2, prev - 1))}
              disabled={disabled || numOptions <= 2}
              className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -1
            </button>
            <input
              type="number"
              value={numOptions}
              onChange={(e) => setNumOptions(Math.min(10, Math.max(2, Number(e.target.value))))}
              min={2}
              max={10}
              className="input-field flex-1 text-center"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => setNumOptions(prev => Math.min(10, prev + 1))}
              disabled={disabled || numOptions >= 10}
              className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +1
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
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
      </div>

      {/* Options Grid */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Opções (espectadores digitam o número para votar)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((option, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50"
            >
              <span className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-400 rounded-full font-bold text-white text-lg flex-shrink-0">
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
      </div>

      {showStartButton && (
        <button
          onClick={handleStart}
          disabled={!isValid || disabled}
          className="btn-primary w-full text-lg py-4"
        >
          ▶️ Iniciar Enquete
        </button>
      )}
    </div>
  );
}
