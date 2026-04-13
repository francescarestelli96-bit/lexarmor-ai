"use client";
import { useState } from 'react';
import { ShieldCheck, Zap } from 'lucide-react';

export default function Home() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleAnalyze = async () => {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ text: input }),
    });
    const data = await res.json();
    setOutput(data.result);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-20 px-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2 mb-4">
          <ShieldCheck className="text-blue-600" /> ContractSafe AI
        </h1>
        <p className="text-gray-500 mb-8">Incolla il contratto. L'IA troverà le trappole per te.</p>
        
        <textarea 
          className="w-full h-40 p-4 border rounded-2xl mb-6 focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
          placeholder="Incolla il testo qui..."
          onChange={(e) => setInput(e.target.value)}
        />
        
        <button 
          onClick={handleAnalyze}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          <Zap size={18} /> Analizza Ora (29€)
        </button>

        {output && (
          <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 text-gray-800">
            {output}
          </div>
        )}
      </div>
    </main>
  );
}