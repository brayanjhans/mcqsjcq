'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, HelpCircle, MessageCircle, Mail, Phone, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function SupportModal({
    open,
    onOpenChange
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in" />
                <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-slate-900 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                                <HelpCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogPrimitive.Title className="text-xl font-bold text-slate-900 dark:text-white">Centro de Ayuda</DialogPrimitive.Title>
                                <DialogPrimitive.Description className="text-sm text-slate-500">¿Cómo podemos ayudarte hoy?</DialogPrimitive.Description>
                            </div>
                        </div>
                        <DialogPrimitive.Close className="rounded-full p-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                            <X className="w-5 h-5 text-slate-500" />
                        </DialogPrimitive.Close>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                        {/* Quick Contact Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ContactCard
                                icon={MessageCircle}
                                color="bg-green-100 text-green-600"
                                title="Chat WhatsApp"
                                desc="Respuesta inmediata"
                                action="Chatear ahora"
                            />
                            <ContactCard
                                icon={Mail}
                                color="bg-blue-100 text-blue-600"
                                title="Correo Electrónico"
                                desc="soporte@mqs.com"
                                action="Enviar correo"
                            />
                        </div>

                        {/* FAQs */}
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-slate-400" />
                                Preguntas Frecuentes
                            </h3>
                            <div className="space-y-3">
                                <FAQItem q="¿Cómo extraigo nuevos datos del SEACE?" a="Ve a tu Perfil, abre este mismo menú y haz clic en 'Extraer Datos MEF'. Esto iniciará el motor automatizado en segundo plano." />
                                <FAQItem q="¿Por qué algunas garantías no tienen PDF?" a="Si la garantía no tiene un ticket de Alfresco enlazado en SEACE, el sistema no puede descargar su documento original." />
                                <FAQItem q="¿Qué significan los colores en el mapa?" a="Representan la densidad y monto de las garantías adjudicadas por departamento. Puedes filtrar la vista usando el panel lateral." />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                        <Button className="w-full rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800" onClick={() => onOpenChange(false)}>
                            Entendido
                        </Button>
                    </div>

                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

function ContactCard({ icon: Icon, color, title, desc, action }: any) {
    return (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-all cursor-pointer group bg-white dark:bg-slate-800">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", color)}>
                <Icon className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white">{title}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{desc}</p>
            <div className="text-xs font-bold text-blue-600 group-hover:underline">{action} →</div>
        </div>
    );
}

function FAQItem({ q, a }: any) {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <span className="font-medium text-sm text-slate-800 dark:text-white">{q}</span>
                <span className="text-slate-400">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">{a}</div>}
        </div>
    );
}
