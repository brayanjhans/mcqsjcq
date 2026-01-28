"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, MessageSquare, X, Volume2, StopCircle, RefreshCw, Terminal, Bot } from 'lucide-react';
import { RobotIcon } from '../icons/RobotIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer from './ChartRenderer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility: Tailwind Merge ---
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sql?: string;
    source?: 'BD' | 'WEB';
    suggestions?: string[];
    chartData?: any;
    isError?: boolean;      // New: Flag for error state
    retryText?: string;     // New: Text to retry if error
}

interface ChatResponse {
    response_markdown: string;
    sql_query?: string;
    data_source?: string;
    suggested_questions?: string[];
    chart_data?: any;
}



// --- Component ---
export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '¡Hola! Soy **AURA**, tu copiloto de desarrollo y asistente de datos. ¿En qué puedo ayudarte hoy sobre `garantias_seace`?',
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Refs for scrolling and speech
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const widgetRef = useRef<HTMLDivElement>(null);

    // Click Outside to Close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (widgetRef.current && !widgetRef.current.contains(event.target as Node) && isOpen) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    // --- Voice Input (Speech-to-Text) ---
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'es-PE'; // Spanish (Peru)

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(prev => prev + (prev ? ' ' : '') + transcript);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    };

    // --- Voice Output (Text-to-Speech) ---
    const speak = (text: string) => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            // Strip markdown tables and complex symbols for speech
            // 1. Remove everything starting from the first table pipe '|' to avoid reading data grids
            let textToSpeak = text.split('|')[0];

            // 2. Clean up common markdown
            textToSpeak = textToSpeak.replace(/[*#`_]/g, '').trim();

            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
                return;
            }

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = 'es-ES'; // Or es-PE if available
            utterance.onend = () => setIsSpeaking(false);
            utterance.onstart = () => setIsSpeaking(true);

            window.speechSynthesis.speak(utterance);
        }
    };

    // --- Send Logic ---
    const handleSend = async (retryContent?: string) => {
        const textToSend = retryContent || input;
        if (!textToSend.trim() || isLoading) return;

        // Only add user message if it's new (not a retry)
        if (!retryContent) {
            const userMsg: Message = {
                id: Date.now().toString(),
                role: 'user',
                content: textToSend,
            };
            setMessages(prev => [...prev, userMsg]);
            setInput('');
        }

        setIsLoading(true);

        try {
            const historyContext = messages.map(m => ({ role: m.role, content: m.content }));

            // URL UPDATED FOR MAIN PROJECT INTEGRATION
            const response = await fetch('/api/chatbot/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    history: historyContext
                }),
            });

            if (!response.ok) throw new Error('API Error');

            const data: ChatResponse = await response.json();

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response_markdown,
                sql: data.sql_query,
                source: data.data_source as any,
                suggestions: data.suggested_questions,
                chartData: data.chart_data
            };

            setMessages(prev => [...prev, botMsg]);

            // Auto-speak if command was short or if listening mode was active (optional, keeping manual for now)
            // speak(data.response_markdown); 

        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                isError: true,
                retryText: textToSend,
                content: '⚠️ Lo siento, ocurrió un error al procesar tu solicitud. Puede que el servidor esté ocupado o desconectado.',
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-0 right-0 z-50 sm:bottom-6 sm:right-6 flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            <div
                ref={widgetRef}
                className={cn(
                    "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all duration-300 pointer-events-auto flex flex-col font-sans z-50",
                    // Mobile: Full Screen, Desktop: Floating Card
                    isOpen
                        ? "fixed inset-0 w-full h-full sm:fixed sm:top-auto sm:left-auto sm:bottom-4 sm:right-4 sm:w-[450px] sm:h-[700px] sm:rounded-2xl opacity-100 translate-y-0"
                        : "fixed bottom-4 right-4 w-0 h-0 opacity-0 translate-y-12 pointer-events-none"
                )}
            >
                {/* Header - Premium Design */}
                <div className="bg-[#334155] p-3 flex items-center justify-between shrink-0 relative shadow-md">
                    <div className="flex items-center gap-3 z-10">
                        <div className="relative w-12 h-12 rounded-full border-2 border-white/30 shadow-sm overflow-hidden bg-white backdrop-blur-sm flex items-center justify-center">
                            <img
                                src="/chatbot_8943377.png"
                                alt="AURA"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg tracking-wide">AURA</h3>
                            <p className="text-indigo-100 text-xs font-medium opacity-90">Tu Asistente Personal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 z-10">
                        <button
                            onClick={() => {
                                const lastMsg = messages.filter(m => m.role === 'assistant').pop();
                                if (lastMsg) speak(lastMsg.content);
                            }}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            title="Leer último mensaje"
                        >
                            <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setMessages([{
                                id: 'welcome',
                                role: 'assistant',
                                content: '¡Hola! Soy **AURA**, tu copiloto de desarrollo y asistente de datos. ¿En qué puedo ayudarte hoy sobre `garantias_seace`?',
                            }])}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            title="Nueva Conversación"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Messages Area - WhatsApp BG - FIXED LAYOUT */}
                <div className="flex-1 relative bg-[#efeae2] dark:bg-zinc-900 overflow-hidden">
                    {/* Doodle Background Layer - Static */}
                    <div
                        className="absolute inset-0 opacity-[0.4] pointer-events-none z-0"
                        style={{
                            backgroundImage: "url('/whatsapp-bg.png')",
                            backgroundSize: "400px auto",
                            backgroundRepeat: "repeat"
                        }}
                    ></div>

                    {/* Scrollable Content Layer */}
                    <div className="absolute inset-0 overflow-y-auto p-4 pb-24 space-y-2 scroll-smooth [&::-webkit-scrollbar]:hidden z-10">

                        {messages.map((m) => (
                            <div key={m.id} className={cn("flex flex-col max-w-[85%]", m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                                <div
                                    className={cn(
                                        "p-2 px-3 rounded-lg text-sm shadow-sm relative max-w-full break-words",
                                        m.role === 'user'
                                            ? "bg-[#e0f2fe] text-gray-900 rounded-tr-none"
                                            : "bg-white text-gray-900 rounded-tl-none"
                                    )

                                    }
                                >
                                    <div className="prose prose-sm max-w-none text-gray-900 leading-relaxed overflow-hidden">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                table: ({ node, ...props }) => <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700 my-2"><table className="w-full text-xs text-left" {...props} /></div>,
                                                th: ({ node, ...props }) => <th className="bg-gray-100 dark:bg-zinc-800 p-2 font-medium text-gray-700 dark:text-gray-300" {...props} />,
                                                td: ({ node, ...props }) => <td className="p-2 border-t border-gray-100 dark:border-zinc-700 break-words" {...props} />
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Footer: Source & Actions */}
                                    {m.role === 'assistant' && (
                                        <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t border-gray-100/50 dark:border-zinc-700/50">
                                            {m.source === 'WEB' && (
                                                <span className="text-[10px] font-medium text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                                                    WEB
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Retry Button for Errors */}
                                    {m.isError && m.retryText && (
                                        <div className="mt-2">
                                            <button
                                                onClick={() => {
                                                    // Remove the error message and retry
                                                    setMessages(prev => prev.filter(msg => msg.id !== m.id));
                                                    handleSend(m.retryText);
                                                }}
                                                className="text-xs flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1 rounded-full hover:bg-red-200 transition-colors font-medium"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                Reintentar
                                            </button>
                                        </div>
                                    )}

                                    {/* Chart Visualization */}
                                    {m.chartData && m.role === 'assistant' && (
                                        <ChartRenderer chartData={m.chartData} />
                                    )}

                                    {/* Suggestions Chips */}
                                    {m.suggestions && m.suggestions.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3 animate-fade-in pl-1">
                                            {m.suggestions.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setInput(s);
                                                        const textarea = document.querySelector('input');
                                                        if (textarea) textarea.focus();
                                                    }}
                                                    className="text-[11px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-all cursor-pointer text-left shadow-sm hover:shadow"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 ml-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                <span>AURA está pensando...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div> {/* End of Scrollable Content Layer */}
                </div> {/* End of Messages Area Fixed Wrapper */}

                {/* Input Area */}
                <div className="p-3 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 shrink-0 z-20 relative">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 rounded-full px-4 py-2 border border-transparent focus-within:border-blue-500 transition-colors">
                        <button
                            onClick={toggleListening}
                            className={cn("p-1.5 rounded-full transition-colors", isListening ? "bg-red-500 text-white animate-pulse" : "text-gray-400 hover:text-blue-500")}
                        >
                            {isListening ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Pregúntale a AURA..."
                            className="flex-1 bg-transparent border-none outline-none text-sm dark:text-gray-100 placeholder:text-gray-400"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            className="p-2 bg-[#334155] text-white rounded-full hover:bg-[#475569] disabled:opacity-50 transition shadow-sm"
                        >
                            <Send className="w-5 h-5 ml-0.5" />
                        </button>
                    </div>
                </div>
            </div >

            {/* Floating Toggle Button */}
            {
                !isOpen && (
                    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto group">
                        {/* Ripple/Glow Animation behind */}
                        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-600 opacity-50 animate-ping group-hover:animate-none duration-1000"></span>

                        <button
                            onClick={() => setIsOpen(true)}
                            className="relative z-10 w-16 h-16 p-0 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 hover:rotate-3 transition-all duration-300 flex items-center justify-center overflow-hidden border-2 border-white dark:border-zinc-700 bg-white"
                        >
                            <img
                                src="/chatbot_8943377.png"
                                alt="AURA Avatar"
                                className="w-full h-full object-cover"
                            />
                        </button>

                        {/* Tooltip with improved animation */}
                        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300 whitespace-nowrap text-gray-700 dark:text-gray-200 z-0">
                            Hablar con AURA
                        </span>
                    </div>
                )
            }
        </div >
    );
}
