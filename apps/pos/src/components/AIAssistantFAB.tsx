import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import AIAssistantModal from './AIAssistantModal';

interface Props {
  screenContext?: string;
}

export default function AIAssistantFAB({ screenContext }: Props) {
  const [open, setOpen] = useState(false);
  const [overrideContext, setOverrideContext] = useState<string | undefined>();

  // Listen for programmatic open (e.g., from AIMenuBuilderModal link)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.context) setOverrideContext(detail.context);
      setOpen(true);
    };
    window.addEventListener('open-ai-assistant', handler);
    return () => window.removeEventListener('open-ai-assistant', handler);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setOverrideContext(undefined);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="AI Assistant"
      >
        <Sparkles size={24} />
      </button>
      <AIAssistantModal
        isOpen={open}
        onClose={handleClose}
        screenContext={overrideContext || screenContext}
      />
    </>
  );
}
