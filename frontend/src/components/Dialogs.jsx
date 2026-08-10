import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [state, setState] = useState(null); // { kind:'confirm'|'prompt'|'alert', title, message, promptValue }
  const resolver = useRef(null);
  const [value, setValue] = useState('');

  const ask = useCallback((kind, { title = 'Confirm', message = '', confirmLabel = 'OK', promptValue = '' } = {}) => {
    setState({ kind, title, message, confirmLabel, promptValue });
    setValue(promptValue);
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const confirm = useCallback((message, title = 'Please confirm') => ask('confirm', { title, message, confirmLabel: 'Continue' }), [ask]);
  const prompt  = useCallback((message, defaultValue = '') => ask('prompt', { title: 'Your input', message, confirmLabel: 'Save', promptValue: defaultValue }), [ask]);
  const alert   = useCallback((message, { title = 'Notice' } = {}) => ask('alert', { title, message, confirmLabel: 'OK' }), [ask]);

  const settle = (value) => {
    setState(null);
    if (resolver.current) resolver.current(value);
    resolver.current = null;
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}
      {state && (
        <Modal open title={state.title} onClose={() => settle(state.kind === 'prompt' ? null : false)}
          footer={
            state.kind === 'alert' ? (
              <button onClick={() => settle(true)}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium">OK</button>
            ) : (
              <>
                <button onClick={() => settle(state.kind === 'prompt' ? null : false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400">Cancel</button>
                <button onClick={() => settle(state.kind === 'prompt' ? value : true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    state.kind === 'prompt' ? 'bg-blue-700 hover:bg-blue-800'
                    : state.kind === 'confirm' ? 'bg-blue-700 hover:bg-blue-800'
                    : ''}`}>
                  {state.confirmLabel}
                </button>
              </>
            )
          }>
          <div className="flex gap-3">
            {state.kind !== 'prompt' && <AlertTriangle className="text-amber-500 shrink-0" size={20} />}
            <div className="flex-1">
              <p className={state.kind === 'alert' ? 'text-gray-700' : 'text-gray-700'}>{state.message}</p>
              {state.kind === 'prompt' && (
                <input
                  autoFocus
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') settle(value); }}
                  className="mt-3 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              )}
            </div>
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  );
}

export function useDialogs() {
  return useContext(DialogContext);
}