"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, MessageSquare, X, Volume2, StopCircle, RefreshCw, Terminal, Bot } from 'lucide-react';
// import { RobotIcon } from '../icons/RobotIcon'; // REMOVED: File not found and unused
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
    isError?: boolean;
    retryText?: string;
}

interface ChatResponse {
    response_markdown: string;
    sql_query?: string;
    data_source?: string;
    suggested_questions?: string[];
    chart_data?: any;
    audio_base64?: string;  // Pre-generated audio
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
    const [isConnected, setIsConnected] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true); // Auto-play enabled by default

    // Refs for scrolling, speech, and deduplication
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const widgetRef = useRef<HTMLDivElement>(null);
    const lastAlertContentRef = useRef<string | null>(null); // Ref for strict deduplication of alerts
    const currentAudioRef = useRef<HTMLAudioElement | null>(null); // Ref for current playing audio

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
            recognition.lang = 'es-PE';

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(prev => prev + (prev ? ' ' : '') + transcript);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    // --- WebSocket Logic (Real-Time Alerts) ---
    useEffect(() => {
        // --- ROBUST HOST DETECTION FOR VPS/PROD/DEV ---
        // Helps avoid reconfiguration when deploying to VPS.
        const getWebSocketUrl = () => {
            if (typeof window === 'undefined') return '';

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = window.location.port;

            // Scenario 1: Development (Localhost)
            // If running on localhost:3000, Backend is usually on :8000
            if (host === 'localhost' || host === '127.0.0.1') {
                return `${protocol}//${host}:8000/api/chatbot/ws`;
            }

            // Scenario 2: Production / VPS (Same Origin)
            // If running on https://misistema.com or IP, assumes Nginx proxies /api
            // This allows the app to work on ANY domain without changing code.
            // If port is present (e.g. :3000 on VPS without Nginx), we might need :8000
            // BUT standard VPS setup uses Nginx on port 80/443.
            // We'll use the "Same Origin" strategy which is safest for proper deployments.
            return `${protocol}//${window.location.host}/api/chatbot/ws`;
        };

        const encodedWsUrl = getWebSocketUrl();
        console.log("🔌 AURA WS Endpoint:", encodedWsUrl);

        let socket: WebSocket | null = null;
        let reconnectTimer: any = null;

        const connect = () => {
            if (!encodedWsUrl) return;
            // Prevent double connections in Strict Mode
            if (socket && socket.readyState === WebSocket.OPEN) return;

            try {
                socket = new WebSocket(encodedWsUrl);

                socket.onopen = () => {
                    console.log("🟢 AURA Real-Time Connected");
                    setIsConnected(true);
                };

                socket.onmessage = (event) => {
                    const pd = JSON.parse(event.data);

                    if (pd.type === 'alert') {
                        // STRICT DEDUPLICATION: Check against Ref (Sync)
                        if (lastAlertContentRef.current === pd.content) {
                            console.log("🔒 Duplicate alert blocked by Ref:", pd.content.substring(0, 20));
                            return;
                        }
                        lastAlertContentRef.current = pd.content; // Update Ref immediately

                        // 1. Play Notification Sound
                        const audio = new Audio('/notification.mp3');
                        audio.play().catch(e => console.log("Audio play failed"));

                        // 2. Auto-Read Alert using ElevenLabs
                        const speakAlert = async () => {
                            const cleanText = (pd.speech || pd.content)
                                .replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑüÜ.,!?;:()-]/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim();

                            try {
                                // Try ElevenLabs first
                                const response = await fetch('/api/chatbot/speak', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ text: cleanText, voice: 'hpp4J3VqNfWAUOO0d1Us' }),
                                });

                                if (response.ok) {
                                    const audioBlob = await response.blob();
                                    const audioUrl = URL.createObjectURL(audioBlob);
                                    const alertAudio = new Audio(audioUrl);
                                    alertAudio.onended = () => URL.revokeObjectURL(audioUrl);
                                    await alertAudio.play();
                                } else {
                                    // Fallback to native
                                    speakNativeAlert(cleanText);
                                }
                            } catch (error) {
                                console.error('Alert TTS failed, using native:', error);
                                speakNativeAlert(cleanText);
                            }
                        };

                        const speakNativeAlert = (cleanText: string) => {
                            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                                const utterance = new SpeechSynthesisUtterance(cleanText);
                                const voices = window.speechSynthesis.getVoices();
                                const esVoice = voices.find(v => v.lang.includes('es-PE')) || voices.find(v => v.lang.includes('es'));
                                if (esVoice) utterance.voice = esVoice;
                                else utterance.lang = 'es-ES';
                                utterance.rate = 1.0;
                                window.speechSynthesis.cancel();
                                window.speechSynthesis.speak(utterance);
                            }
                        };

                        speakAlert();

                        // 3. Inject Alert into Chat
                        setMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            role: 'assistant',
                            content: pd.content,
                            suggestions: pd.suggestions,
                            source: 'WEB'
                        }]);

                        // setIsOpen(true); // DISABLED per user request: "solo que lo lea"
                    }
                };

                socket.onerror = (err) => {
                    console.error("WS Error", err);
                };

                socket.onclose = () => {
                    console.log("🔴 AURA Disconnected");
                    setIsConnected(false);
                    reconnectTimer = setTimeout(connect, 3000);
                };
            } catch (e) {
                console.error("WS Connection Error", e);
                setIsConnected(false);
            }
        }

        connect();

        return () => {
            // Cleanup: Close socket and clear timer
            if (socket) socket.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    };

    // --- Voice Output (Text-to-Speech) ---
    const speak = async (text: string) => {
        // Clean text first
        let textToSpeak = text.split('|')[0];
        textToSpeak = textToSpeak
            .replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑüÜ.,!?;:()-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Stop current audio if playing
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }

        // Cancel native speech if active
        if (window.speechSynthesis?.speaking) {
            window.speechSynthesis.cancel();
        }

        try {
            setIsSpeaking(true);

            // Try ElevenLabs API first
            const response = await fetch('/api/chatbot/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textToSpeak,
                    voice: 'hpp4J3VqNfWAUOO0d1Us' // Bella voice ID
                }),
            });

            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                // Store reference to current audio
                currentAudioRef.current = audio;

                audio.onended = () => {
                    setIsSpeaking(false);
                    currentAudioRef.current = null;
                    URL.revokeObjectURL(audioUrl);
                };

                audio.onerror = () => {
                    setIsSpeaking(false);
                    currentAudioRef.current = null;
                    URL.revokeObjectURL(audioUrl);
                    // Fallback to native on audio playback error
                    speakNative(textToSpeak);
                };

                await audio.play();
            } else {
                // Fallback to native if API fails
                speakNative(textToSpeak);
            }
        } catch (error) {
            console.error('ElevenLabs TTS failed, using native:', error);
            // Fallback to native browser TTS
            speakNative(textToSpeak);
        }
    };

    // Stop current speech
    const stopSpeaking = () => {
        // Stop ElevenLabs audio
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            currentAudioRef.current = null;
        }

        // Stop native speech
        if (window.speechSynthesis?.speaking) {
            window.speechSynthesis.cancel();
        }

        setIsSpeaking(false);
        setIsVoiceEnabled(false); // Disable auto-play when user manually stops
    };

    // Fallback native browser TTS
    const speakNative = (textToSpeak: string) => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            const voices = window.speechSynthesis.getVoices();
            const esVoice = voices.find(v => v.lang.includes('es-PE')) || voices.find(v => v.lang.includes('es'));
            if (esVoice) utterance.voice = esVoice;
            else utterance.lang = 'es-ES';

            utterance.onend = () => setIsSpeaking(false);
            utterance.onstart = () => setIsSpeaking(true);

            window.speechSynthesis.speak(utterance);
        } else {
            setIsSpeaking(false);
        }
    };

    // --- Send Logic ---
    const handleSend = async (retryContent?: string) => {
        const textToSend = retryContent || input;
        if (!textToSend.trim() || isLoading) return;

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

            // Play pre-generated audio immediately (ZERO delay)
            if (data.audio_base64 && isVoiceEnabled) {  // Only auto-play if voice is enabled
                try {
                    // Decode base64 audio
                    const binaryString = atob(data.audio_base64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);

                    currentAudioRef.current = audio;
                    setIsSpeaking(true);

                    audio.onended = () => {
                        setIsSpeaking(false);
                        currentAudioRef.current = null;
                        URL.revokeObjectURL(audioUrl);
                    };

                    audio.onerror = () => {
                        setIsSpeaking(false);
                        currentAudioRef.current = null;
                        URL.revokeObjectURL(audioUrl);
                    };

                    audio.play();
                } catch (error) {
                    console.error('Failed to play embedded audio:', error);
                }
            }

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
                    isOpen
                        ? "fixed inset-0 w-full h-full sm:fixed sm:top-auto sm:left-auto sm:bottom-4 sm:right-4 sm:w-[450px] sm:h-[700px] sm:rounded-2xl opacity-100 translate-y-0"
                        : "fixed bottom-4 right-4 w-0 h-0 opacity-0 translate-y-12 pointer-events-none"
                )}
            >
                {/* Header - Premium Design (RESTORED SLATE COLOR) */}
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
                            <h3 className="font-bold text-white text-lg tracking-wide">AURA v3.1</h3>
                            {/* Connection Status Indicator */}
                            <div className="flex items-center gap-1.5 opacity-90">
                                <div className={cn(
                                    "w-2 h-2 rounded-full animate-pulse transition-all duration-500",
                                    isConnected ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                                )}></div>
                                <p className="text-indigo-100 text-xs font-medium">
                                    {isConnected ? 'En línea' : 'Reconectando...'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 z-10">
                        <button
                            onClick={() => {
                                if (isSpeaking) {
                                    // If speaking, stop it
                                    stopSpeaking();
                                } else {
                                    // If not speaking, play last message and re-enable auto-play
                                    const lastMsg = messages.filter(m => m.role === 'assistant').pop();
                                    if (lastMsg) {
                                        setIsVoiceEnabled(true); // Re-enable auto-play
                                        speak(lastMsg.content);
                                    }
                                }
                            }}
                            className={cn(
                                "p-2.5 rounded-full transition-all duration-200 flex items-center justify-center",
                                isSpeaking
                                    ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50 animate-pulse"
                                    : "bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/50"
                            )}
                            title={isSpeaking ? "🔴 Detener voz" : "🔊 Reproducir último mensaje"}
                        >
                            {isSpeaking ? (
                                <StopCircle className="w-5 h-5" fill="currentColor" />
                            ) : (
                                <Volume2 className="w-5 h-5" />
                            )}
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

                {/* Messages Area */}
                <div className="flex-1 relative bg-[#efeae2] dark:bg-zinc-900 overflow-hidden">
                    {/* Doodle Background Layer */}
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

                                    {m.isError && m.retryText && (
                                        <div className="mt-2">
                                            <button
                                                onClick={() => {
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

                                    {m.chartData && m.role === 'assistant' && (
                                        <ChartRenderer chartData={m.chartData} />
                                    )}

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
                    </div>
                </div>

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

                        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300 whitespace-nowrap text-gray-700 dark:text-gray-200 z-0">
                            Hablar con AURA
                        </span>
                    </div>
                )
            }
        </div >
    );
}
