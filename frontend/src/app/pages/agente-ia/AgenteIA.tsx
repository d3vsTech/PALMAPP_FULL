import { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Send,
  Paperclip,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RotateCcw,
  Sparkles,
  Loader2,
  X,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { predios, lotes, colaboradores, palmas } from '../../lib/mockData';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'table' | 'list';
  data?: any;
}

const sugerenciasRapidas = [
  '¿Cómo va mi producción esta quincena?',
  '¿Qué colaboradores trabajaron hoy?',
  '¿Cuántos viajes hice este mes?',
  '¿Cuántas palmas hay en total?',
  '¿Cuál lote es más productivo?',
  '¿Cuánto tengo que pagar en nómina?',
];

export default function AgenteIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Función para procesar preguntas y generar respuestas inteligentes
  const generarRespuesta = (pregunta: string): Message => {
    const preguntaLower = pregunta.toLowerCase();

    // Respuestas sobre palmas
    if (preguntaLower.includes('palma')) {
      const totalPalmas = palmas.length;
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `🌴 Estado de Plantación

Actualmente tienes ${totalPalmas.toLocaleString()} palmas registradas en el sistema, distribuidas en ${lotes.length} lotes y ${predios.length} predios.

Las palmas están en buen estado de salud y producción activa.`,
        timestamp: new Date(),
        type: 'text',
      };
    }

    // Respuestas sobre producción
    if (preguntaLower.includes('producción') || preguntaLower.includes('produccion')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `📊 Resumen de Producción - Quincena Actual

Total producido: 2,845 kg
Promedio diario: 190 kg
Mejor día: Miércoles 12/03 (312 kg)
Lote más productivo: Lote 1 - Norte (850 kg)

💡 Tu producción está un 8% por encima del promedio histórico. ¡Excelente trabajo!`,
        timestamp: new Date(),
        type: 'text',
      };
    }

    // Respuestas sobre colaboradores
    if (preguntaLower.includes('colaborador') || preguntaLower.includes('trabajador') || preguntaLower.includes('trabajaron')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `👷 Colaboradores Activos

Tienes ${colaboradores.length} colaboradores registrados en el sistema:

• Recolectores: 4 personas
• Operarios: 2 personas
• Supervisores: 1 persona

Hoy trabajaron: 6 colaboradores
Ausentes: Carlos Rodríguez (Vacaciones)

Rendimiento promedio: 95 kg/persona/día`,
        timestamp: new Date(),
        type: 'text',
      };
    }

    // Respuestas sobre viajes
    if (preguntaLower.includes('viaje') || preguntaLower.includes('remision')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `🚛 Viajes del Mes

Total de viajes: 12 viajes
Kilogramos enviados: 8,450 kg
Promedio por viaje: 704 kg

Último viaje:
• Fecha: 05/04/2026
• Destino: Extractora San Pablo
• Cantidad: 720 kg
• Estado: Entregado

Próximo viaje programado: 08/04/2026`,
        timestamp: new Date(),
        type: 'text',
      };
    }

    // Respuestas sobre nómina
    if (preguntaLower.includes('nómina') || preguntaLower.includes('nomina') || preguntaLower.includes('pagar') || preguntaLower.includes('salario')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `💰 Resumen de Nómina - Quincena Actual

Total a pagar: $4,850,000 COP

Desglose:
• Salarios base: $3,200,000
• Horas extras: $450,000
• Bonificaciones: $300,000
• Auxilio transporte: $350,000
• Prestaciones: $550,000

Deducciones totales: $780,000

Colaboradores: 7 personas
Promedio por persona: $692,857 COP

📅 Fecha de pago: 15/04/2026`,
        timestamp: new Date(),
        type: 'text',
      };
    }

    // Respuestas sobre lotes
    if (preguntaLower.includes('lote') || preguntaLower.includes('productivo')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `🌴 Análisis de Lotes

Tienes ${lotes.length} lotes distribuidos en ${predios.length} predios:

Top 3 Lotes Más Productivos:

1. Lote A - Central (El Paraíso)
   • 1,240 palmas • 62 hectáreas
   • Promedio: 20 kg/palma
   
2. Lote Alpha (Villa Nueva)
   • 1,330 palmas • 70 hectáreas
   • Promedio: 18.5 kg/palma
   
3. Lote B - Occidental (El Paraíso)
   • 1,045 palmas • 55 hectáreas
   • Promedio: 17.8 kg/palma

💡 Recomendación: El Lote 2 - Sur está 15% por debajo del promedio. Considera revisar fertilización y riego.`,
        timestamp: new Date(),
        type: 'text',
      };
    }

    // Respuestas sobre operaciones
    if (preguntaLower.includes('operacion') || preguntaLower.includes('labor') || preguntaLower.includes('jornales')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `🚜 Operaciones de la Semana

Total de jornales: 42 jornales
Horas trabajadas: 336 horas

Actividades realizadas:
• Recolección: 28 jornales (67%)
• Fertilización: 8 jornales (19%)
• Control de maleza: 4 jornales (9%)
• Mantenimiento: 2 jornales (5%)

Rendimiento promedio: 95 kg/jornal
Mejor día: Miércoles (8 jornales)

📊 Eficiencia operativa: 92%`,
        timestamp: new Date(),
        type: 'text',
      };
    }

    // Respuestas sobre predios
    if (preguntaLower.includes('predio') || preguntaLower.includes('finca')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `🗺️ Resumen de Predios

Tienes ${predios.length} predios registrados:

${predios.map((p, i) => `${i + 1}. ${p.nombre}
   • ${p.hectareas} hectáreas
   • ${lotes.filter(l => l.predioId === p.id).length} lotes
   • ${p.ubicacion || 'Sin ubicación'}`).join('\n\n')}

Total: ${predios.reduce((acc, p) => acc + p.hectareas, 0)} hectáreas`,
        timestamp: new Date(),
        type: 'text',
      };
    }

    // Respuesta por defecto
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Entiendo tu pregunta sobre "${pregunta}". 

Puedo ayudarte con información sobre:

• 📊 Producción y cosecha
• 🌴 Plantación y lotes
• 👷 Colaboradores y asistencia
• 💰 Nómina y pagos
• 🚛 Viajes y remisiones
• 🚜 Operaciones diarias

¿Sobre qué te gustaría saber más específicamente?`,
      timestamp: new Date(),
      type: 'text',
    };
  };

  const enviarMensaje = async (texto: string) => {
    if (!texto.trim()) return;

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: texto,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simular delay de respuesta
    setTimeout(() => {
      const aiResponse = generarRespuesta(texto);
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleSugerencia = (sugerencia: string) => {
    enviarMensaje(sugerencia);
  };

  const copiarRespuesta = (content: string) => {
    // Método alternativo compatible con todos los navegadores
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      // Opcional: Mostrar feedback visual
      console.log('Texto copiado al portapapeles');
    } catch (err) {
      console.error('Error al copiar:', err);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Detener grabación
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Iniciar grabación
      startVoiceRecognition();
    }
  };

  const startVoiceRecognition = async () => {
    // Verificar si el navegador soporta Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.');
      return;
    }

    // Solicitar permisos de micrófono primero
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Detener el stream inmediatamente, solo necesitamos verificar permisos
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('⚠️ Permiso denegado\n\nPara usar el reconocimiento de voz, necesitas permitir el acceso al micrófono.\n\n1. Haz clic en el ícono de candado/información en la barra de direcciones\n2. Permite el acceso al micrófono\n3. Recarga la página e intenta de nuevo');
      } else if (error.name === 'NotFoundError') {
        alert('⚠️ No se encontró ningún micrófono conectado.\n\nPor favor, conecta un micrófono e intenta de nuevo.');
      } else {
        alert('⚠️ Error al acceder al micrófono.\n\nAsegúrate de tener un micrófono conectado y los permisos necesarios.');
      }
      console.error('Error al solicitar permisos de micrófono:', error);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO'; // Español de Colombia
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? ' ' : '') + transcript);
      inputRef.current?.focus();
    };

    recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento de voz:', event.error);
      setIsRecording(false);
      
      if (event.error === 'no-speech') {
        // No mostrar alerta, solo detener
        console.log('No se detectó voz');
      } else if (event.error === 'not-allowed') {
        alert('⚠️ Permiso denegado\n\nPara usar el reconocimiento de voz:\n\n1. Haz clic en el ícono de candado en la barra de direcciones\n2. Permite el acceso al micrófono\n3. Recarga la página e intenta de nuevo');
      } else if (event.error === 'network') {
        alert('⚠️ Error de conexión\n\nEl reconocimiento de voz requiere conexión a internet.');
      } else if (event.error === 'aborted') {
        // Usuario canceló, no mostrar error
        console.log('Reconocimiento cancelado');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Error al iniciar reconocimiento:', error);
      setIsRecording(false);
      alert('⚠️ No se pudo iniciar el reconocimiento de voz.\n\nIntenta de nuevo en unos segundos.');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full flex flex-col -m-8">
      {/* Header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2>Agente IA</h2>
            <p className="text-xs text-muted-foreground">
              Tu asistente inteligente para gestión agrícola
            </p>
          </div>
        </div>
      </div>

      {/* Área de mensajes con scroll interno */}
      <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
        <div className="space-y-4 max-w-5xl mx-auto">
          {messages.length === 0 ? (
            // Estado vacío
            <div className="text-center py-12 space-y-6">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3>¡Hola! Soy tu asistente inteligente de PALMAPP</h3>
                <p className="text-muted-foreground mt-2">
                  Puedo ayudarte con información sobre producción, nómina, colaboradores y mucho más.
                </p>
              </div>

              {/* Sugerencias rápidas */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Prueba preguntarme:
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                  {sugerenciasRapidas.map((sugerencia, index) => (
                    <button
                      key={index}
                      onClick={() => handleSugerencia(sugerencia)}
                      className="px-4 py-2 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-sm"
                    >
                      {sugerencia}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Mensajes
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCopy={() => copiarRespuesta(message.content)}
                />
              ))}

              {/* Indicador de "escribiendo..." */}
              {isTyping && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Analizando datos...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input fijo inferior */}
      <div className="flex-shrink-0 px-8 pb-8 pt-4 border-t border-border">
        <div className="space-y-3 max-w-5xl mx-auto">
          {/* Preview de archivos adjuntos */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => {
                const isImage = file.type.startsWith('image/');
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border"
                  >
                    {isImage ? (
                      <ImageIcon className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    <span className="text-sm truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-1 hover:bg-background rounded p-0.5 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Input file oculto */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Adjuntar archivos */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg h-10 w-10 flex-shrink-0"
              title="Adjuntar archivos"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {/* Input de texto */}
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    enviarMensaje(input);
                  }
                }}
                placeholder={isRecording ? 'Escuchando...' : 'Pregúntale algo sobre tu finca...'}
                className="h-10 rounded-lg"
              />
            </div>

            {/* Nota de voz */}
            <Button
              variant={isRecording ? 'default' : 'outline'}
              size="icon"
              className="rounded-lg h-10 w-10 flex-shrink-0"
              onClick={toggleRecording}
              title={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
            >
              <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
            </Button>

            {/* Enviar */}
            <Button
              size="icon"
              className="rounded-lg h-10 w-10 flex-shrink-0"
              onClick={() => enviarMensaje(input)}
              disabled={!input.trim() || isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Sugerencias rápidas (cuando hay mensajes) */}
          {messages.length > 0 && messages.length < 3 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {sugerenciasRapidas.slice(0, 4).map((sugerencia, index) => (
                <button
                  key={index}
                  onClick={() => handleSugerencia(sugerencia)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-sm whitespace-nowrap flex-shrink-0"
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente para cada burbuja de mensaje
function MessageBubble({
  message,
  onCopy,
}: {
  message: Message;
  onCopy: () => void;
}) {
  const isUser = message.role === 'user';

  // Procesar el contenido y dividir por líneas
  const renderContent = () => {
    const lines = message.content.split('\n');
    
    return lines.map((line, i) => {
      // Línea vacía - espacio
      if (!line.trim()) {
        return <div key={i} className="h-3" />;
      }
      
      // Detectar líneas con emoji al inicio (títulos de sección)
      if (line.match(/^[📊👷🚛💰🌴🚜🗺️📅💡]/)) {
        return (
          <p key={i} className={`font-semibold text-base ${isUser ? 'text-primary-foreground' : 'text-foreground'}`}>
            {line}
          </p>
        );
      }
      
      // Detectar viñetas (• o números)
      if (line.match(/^[•\d]\./)) {
        return (
          <p key={i} className={`ml-3 ${isUser ? 'text-primary-foreground/95' : 'text-muted-foreground'}`}>
            {line}
          </p>
        );
      }
      
      // Detectar indentación (espacios al inicio)
      if (line.match(/^\s{2,}/)) {
        return (
          <p key={i} className={`ml-4 text-sm ${isUser ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
            {line.trim()}
          </p>
        );
      }
      
      // Texto normal
      return (
        <p key={i} className={isUser ? 'text-primary-foreground' : 'text-foreground'}>
          {line}
        </p>
      );
    });
  };

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      )}

      {/* Contenido */}
      <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {/* Burbuja */}
        <div
          className={`px-5 py-4 rounded-2xl ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          <div className="space-y-1.5 leading-relaxed">
            {renderContent()}
          </div>
        </div>

        {/* Acciones (solo para IA) */}
        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs hover:bg-muted"
              onClick={onCopy}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copiar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted"
              title="Útil"
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted"
              title="No útil"
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
            <span className="text-[10px] text-muted-foreground ml-1">
              {message.timestamp.toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Timestamp para usuario */}
        {isUser && (
          <span className="text-[10px] text-muted-foreground px-1">
            {message.timestamp.toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      {/* Avatar usuario */}
      {isUser && (
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 text-primary-foreground text-xs font-semibold">
          TÚ
        </div>
      )}
    </div>
  );
}