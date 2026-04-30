import { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  ArrowUp,
  Sparkles,
  X,
  Plus,
  Search,
  Image as ImageIcon,
  FileText,
  Video,
  Mic,
  File,
  ChevronUp,
  ChevronDown,
  Camera,
} from 'lucide-react';
import { agroAgenteApi, buildAttachmentUrl } from '../../../api/agroAgente';
import type { ChatMessage } from '../../../api/agroAgente';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────
/** Adjunto de un mensaje, construido desde attachment_url + mime del backend. */
interface Attachment {
  name: string;
  url: string;
  mime: string;
  isImage: boolean;
  isVideo: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachment?: Attachment | null;
}

/**
 * Convierte un ChatMessage del backend en Message del UI usando attachment_url + mime.
 * Defensivo: tolera campos faltantes/null/string-vacío y nunca lanza, para que un
 * mensaje malformado del Android (u otro cliente) no rompa toda la lista.
 */
function messageFromBackend(m: any): Message {
  // Adjunto: aceptar variantes de nombres por si el backend móvil usa otros campos
  const rawUrl = m?.attachment_url ?? m?.attachmentUrl ?? m?.attachment?.url ?? null;
  const rawMime = m?.mime ?? m?.attachment_mime ?? m?.attachment?.mime ?? null;
  const rawName = m?.attachment_name ?? m?.attachmentName ?? m?.attachment?.name ?? null;

  let attachment: Attachment | null = null;
  if (rawUrl && rawMime) {
    const url = buildAttachmentUrl(rawUrl);
    if (url) {
      const mime = String(rawMime);
      attachment = {
        name: rawName ?? (String(rawUrl).split('/').pop() ?? 'archivo'),
        url,
        mime,
        isImage: mime.startsWith('image/'),
        isVideo: mime.startsWith('video/'),
      };
    }
  }

  // Role: normalizar (algunos clientes mandan 'USER'/'ASSISTANT' o 'human'/'bot')
  const rawRole = String(m?.role ?? m?.tipo ?? '').toLowerCase();
  const role: 'user' | 'assistant' = (rawRole === 'user' || rawRole === 'human' || rawRole === 'usuario')
    ? 'user'
    : 'assistant';

  // Fecha: tolerar valor inválido
  const rawDate = m?.created_at ?? m?.createdAt ?? m?.fecha;
  const dateTry = rawDate ? new Date(rawDate) : new Date();
  const timestamp = isNaN(dateTry.getTime()) ? new Date() : dateTry;

  return {
    id: m?.id !== undefined ? `msg-${m.id}` : `msg-tmp-${Date.now()}-${Math.random()}`,
    role,
    content: typeof m?.content === 'string' ? m.content : (m?.text ?? m?.mensaje ?? ''),
    timestamp,
    attachment,
  };
}

// (Bloques de extracción de URLs, deep-scan, persistencia local y fileToAttachment
//  fueron eliminados: el backend ahora retorna attachment_url + mime en cada
//  ChatMessage. El render usa esos campos directamente — ver messageFromBackend.)

// ────────────────────────────────────────────────────────────
// Markdown inline parser (negrita, itálica)
// ────────────────────────────────────────────────────────────
const renderInline = (text: string): (string | JSX.Element)[] => {
  const parts: (string | JSX.Element)[] = [];
  const regex = /(\*\*([^*]+?)\*\*|__([^_]+?)__|\*([^*\n]+?)\*|_([^_\n]+?)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const bold = match[2] ?? match[3];
    const italic = match[4] ?? match[5];
    if (bold !== undefined) {
      parts.push(<strong key={`b${keyIdx++}`} className="font-semibold">{bold}</strong>);
    } else if (italic !== undefined) {
      parts.push(<em key={`i${keyIdx++}`}>{italic}</em>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
};

// ────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────
export default function AgenteIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // UI V5 state
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<number[]>([]);
  const [indiceResultadoActual, setIndiceResultadoActual] = useState(0);
  const [mostrarMenuArchivos, setMostrarMenuArchivos] = useState(false);
  const [grabandoAudio, setGrabandoAudio] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputImageRef = useRef<HTMLInputElement>(null);
  const fileInputDocRef = useRef<HTMLInputElement>(null);
  const fileInputVideoRef = useRef<HTMLInputElement>(null);
  const fileInputFileRef = useRef<HTMLInputElement>(null);
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const menuArchivosRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Cargar sesión inicial + historial ─────────────────────
  useEffect(() => {
    (async () => {
      try {
        const sesiones = await agroAgenteApi.listarSesiones();
        if (sesiones && sesiones.length > 0) {
          for (const s of sesiones) {
            try {
              const histo = await agroAgenteApi.cargarMensajes(s.id);
              setSessionId(s.id);
              const lista = (Array.isArray(histo) ? histo : []).reduce<Message[]>((acc, raw) => {
                try {
                  acc.push(messageFromBackend(raw));
                } catch (e) {
                  console.warn('[AgenteIA] Mensaje malformado descartado:', raw, e);
                }
                return acc;
              }, []);
              console.log(`[AgenteIA] Historial cargado (${lista.length} mensajes) sesión ${s.id}`);
              setMessages(lista);
              return;
            } catch (e) {
              console.warn('[AgenteIA] Error al cargar sesión', s.id, e);
              continue;
            }
          }
        }
        const nueva = await agroAgenteApi.crearSesion();
        setSessionId(nueva.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo conectar al Agente IA');
      }
    })();
  }, []);

  // ── Click fuera del menú de archivos para cerrarlo ──
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuArchivosRef.current && !menuArchivosRef.current.contains(event.target as Node)) {
        setMostrarMenuArchivos(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Foco en input de búsqueda al abrir ──
  useEffect(() => {
    if (mostrarBusqueda && searchInputRef.current) searchInputRef.current.focus();
  }, [mostrarBusqueda]);

  // ── Buscar en mensajes ──
  useEffect(() => {
    if (!terminoBusqueda.trim()) {
      setResultadosBusqueda([]);
      setIndiceResultadoActual(0);
      return;
    }
    const resultados: number[] = [];
    messages.forEach((msg, index) => {
      if (msg.content.toLowerCase().includes(terminoBusqueda.toLowerCase())) {
        resultados.push(index);
      }
    });
    setResultadosBusqueda(resultados);
    setIndiceResultadoActual(resultados.length > 0 ? 0 : -1);
  }, [terminoBusqueda, messages]);

  const irAlSiguienteResultado = () => {
    if (resultadosBusqueda.length === 0) return;
    setIndiceResultadoActual((prev) => (prev + 1) % resultadosBusqueda.length);
  };

  const irAlResultadoAnterior = () => {
    if (resultadosBusqueda.length === 0) return;
    setIndiceResultadoActual((prev) => prev === 0 ? resultadosBusqueda.length - 1 : prev - 1);
  };

  const resaltarTexto = (texto: string, indice: number): JSX.Element => {
    if (!terminoBusqueda.trim() || !resultadosBusqueda.includes(indice)) {
      return <>{renderInline(texto)}</>;
    }
    const partes = texto.split(new RegExp(`(${terminoBusqueda})`, 'gi'));
    const esResultadoActual = resultadosBusqueda[indiceResultadoActual] === indice;
    return (
      <>
        {partes.map((parte, i) =>
          parte.toLowerCase() === terminoBusqueda.toLowerCase() ? (
            <mark key={i} className={`${esResultadoActual ? 'bg-accent text-white' : 'bg-yellow-200 dark:bg-yellow-800'} rounded px-0.5`}>
              {parte}
            </mark>
          ) : (
            <span key={i}>{renderInline(parte)}</span>
          )
        )}
      </>
    );
  };

  // ── Enviar mensaje ──
  const enviarMensaje = async () => {
    const texto = input.trim();
    const archivos = attachedFiles;
    if (!texto && archivos.length === 0) return;

    const hayTexto = texto.length > 0;
    const userMessageId = `msg-tmp-${Date.now()}`;

    // Burbuja optimista del usuario con preview local del primer adjunto
    const previewAttachment: Attachment | null = archivos.length > 0
      ? {
          name: archivos[0].name,
          url: URL.createObjectURL(archivos[0]),
          mime: archivos[0].type || 'application/octet-stream',
          isImage: (archivos[0].type || '').startsWith('image/'),
          isVideo: (archivos[0].type || '').startsWith('video/'),
        }
      : null;

    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: hayTexto ? texto : '',
      timestamp: new Date(),
      attachment: previewAttachment,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]);
    setMostrarMenuArchivos(false);
    setIsTyping(true);

    // Si no hay sesión, crear una
    let sidActual = sessionId;
    if (!sidActual) {
      try {
        const nueva = await agroAgenteApi.crearSesion();
        sidActual = nueva.id;
        setSessionId(nueva.id);
      } catch (err) {
        const errorMsg: Message = {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: err instanceof Error ? `No pude iniciar la conversación: ${err.message}` : 'No pude iniciar la conversación.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setIsTyping(false);
        return;
      }
    }

    /**
     * - Con archivos → /chat/sessions/{id}/messages/attachment (multipart)
     *   + el primer archivo lleva el caption (si hay texto)
     *   + archivos extra se envían en serie, sin caption
     * - Sin archivos → /chat/sessions/{id}/messages (JSON)
     */
    /** Envuelve messageFromBackend en try/catch para no romper si el backend
     *  retorna un campo inesperado en algún mensaje específico. */
    const safeMap = (raw: any, fallback?: Partial<Message>): Message => {
      try { return messageFromBackend(raw); }
      catch (e) {
        console.warn('[AgenteIA] No se pudo mapear mensaje del backend:', raw, e);
        return {
          id: `msg-err-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content: '(mensaje no disponible)',
          timestamp: new Date(),
          attachment: null,
          ...fallback,
        };
      }
    };

    const enviar = async (sid: number) => {
      if (archivos.length > 0) {
        const r = await agroAgenteApi.enviarAdjunto(sid, archivos[0], hayTexto ? texto : undefined);
        const realUser = safeMap(r.user_message);
        setMessages((prev) => prev.map(m => m.id === userMessageId ? realUser : m));
        for (let i = 1; i < archivos.length; i++) {
          const extra = await agroAgenteApi.enviarAdjunto(sid, archivos[i]);
          setMessages((prev) => [...prev, safeMap(extra.user_message)]);
        }
        setMessages((prev) => [...prev, safeMap(r.assistant_message)]);
      } else {
        const res = await agroAgenteApi.enviarMensaje(sid, texto);
        const realUser = safeMap(res.user_message);
        setMessages((prev) => prev.map(m => m.id === userMessageId ? realUser : m));
        setMessages((prev) => [...prev, safeMap(res.assistant_message)]);
      }
    };

    try {
      try {
        await enviar(sidActual);
      } catch (err: any) {
        const notFound = err?.status === 404 || /no encontrad/i.test(err?.message ?? '');
        if (notFound) {
          const nueva = await agroAgenteApi.crearSesion();
          setSessionId(nueva.id);
          sidActual = nueva.id;
          await enviar(nueva.id);
        } else {
          throw err;
        }
      }
    } catch (err) {
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: err instanceof Error ? err.message : 'No pude responder. Intenta de nuevo.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Archivos ──
  const handleFileSelect = (tipo: 'imagen' | 'documento' | 'video' | 'archivo') => {
    if (tipo === 'imagen')          fileInputImageRef.current?.click();
    else if (tipo === 'documento')  fileInputDocRef.current?.click();
    else if (tipo === 'video')      fileInputVideoRef.current?.click();
    else                            fileInputFileRef.current?.click();
    setMostrarMenuArchivos(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${tipo} agregado: ${newFiles.map(f => f.name).join(', ')}`);
    }
    e.target.value = ''; // reset para poder subir el mismo archivo otra vez
  };

  const handleCameraClick = () => fileInputCameraRef.current?.click();

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`Foto capturada: ${newFiles[0].name}`);
    }
    e.target.value = '';
  };

  const removeAttached = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Voz (placeholder visual, no implementado) ──
  const iniciarGrabacionAudio = () => {
    setGrabandoAudio(true);
    toast.info('Grabando nota de voz...');
  };
  const detenerGrabacionAudio = () => {
    setGrabandoAudio(false);
    toast.success('Nota de voz grabada');
  };

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full -m-8">
      {/* Header compacto */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Agente IA</h1>
            <p className="text-xs text-muted-foreground">Tu asistente inteligente</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMostrarBusqueda(!mostrarBusqueda)}
          className="h-8 w-8"
          title="Buscar en conversación"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Barra de búsqueda */}
      {mostrarBusqueda && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            ref={searchInputRef}
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar en mensajes..."
            className="h-8 border-0 focus-visible:ring-0 shadow-none bg-transparent"
          />
          {resultadosBusqueda.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {indiceResultadoActual + 1} de {resultadosBusqueda.length}
              </span>
              <Button variant="ghost" size="icon" onClick={irAlResultadoAnterior} className="h-7 w-7">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={irAlSiguienteResultado} className="h-7 w-7">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setMostrarBusqueda(false); setTerminoBusqueda(''); }}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Agente IA de PalmApp</h2>
              <p className="text-muted-foreground max-w-md mb-6">¿En qué puedo ayudarte hoy?</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                <button
                  onClick={() => setInput('¿Cuántas palmas tengo registradas?')}
                  className="p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium mb-1">Estado de plantación</div>
                  <div className="text-xs text-muted-foreground">Consulta el total de palmas y lotes</div>
                </button>
                <button
                  onClick={() => setInput('Muéstrame el resumen de producción')}
                  className="p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium mb-1">Resumen de producción</div>
                  <div className="text-xs text-muted-foreground">Estadísticas de cosecha actual</div>
                </button>
                <button
                  onClick={() => setInput('Información sobre colaboradores')}
                  className="p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium mb-1">Colaboradores activos</div>
                  <div className="text-xs text-muted-foreground">Estado del personal de la finca</div>
                </button>
                <button
                  onClick={() => setInput('Resumen de nómina actual')}
                  className="p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium mb-1">Nómina y pagos</div>
                  <div className="text-xs text-muted-foreground">Consulta información de salarios</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  index={index}
                  resaltarTexto={resaltarTexto}
                />
              ))}

              {isTyping && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Preview de archivos adjuntos (antes de enviar) */}
      {attachedFiles.length > 0 && (
        <div className="border-t border-border bg-muted/30 flex-shrink-0">
          <div className="max-w-3xl mx-auto px-4 py-2">
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => {
                const isImage = file.type.startsWith('image/');
                const previewUrl = isImage ? URL.createObjectURL(file) : null;
                return (
                  <div key={index} className="relative group flex items-center gap-2 p-1 bg-card rounded-lg border border-border">
                    {isImage && previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt={file.name}
                          className="h-14 w-14 object-cover rounded-md"
                          onLoad={() => URL.revokeObjectURL(previewUrl)}
                        />
                        <span className="text-xs truncate max-w-[100px] pr-5">{file.name}</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                        <span className="text-sm truncate max-w-[180px] pr-5">{file.name}</span>
                      </>
                    )}
                    <button
                      onClick={() => removeAttached(index)}
                      className="absolute top-1 right-1 bg-background/90 hover:bg-background rounded-full p-0.5 shadow-sm"
                      title="Quitar"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Input bar fijo inferior */}
      <div className="border-t border-border bg-background flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="relative bg-card border border-border rounded-3xl shadow-sm">
            <div className="flex items-end gap-2 p-2">
              {/* Botón + con menú */}
              <div className="relative flex-shrink-0" ref={menuArchivosRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMostrarMenuArchivos(!mostrarMenuArchivos)}
                  className="h-9 w-9 rounded-full hover:bg-muted"
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </Button>

                {mostrarMenuArchivos && (
                  <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[220px] z-10">
                    <button
                      onClick={() => handleFileSelect('imagen')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Imagen</div>
                        <div className="text-xs text-muted-foreground">PNG, JPG, GIF</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleFileSelect('video')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Video</div>
                        <div className="text-xs text-muted-foreground">MP4, AVI, MOV</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleFileSelect('documento')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Documento</div>
                        <div className="text-xs text-muted-foreground">PDF, DOC, XLS</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleFileSelect('archivo')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <File className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Archivo</div>
                        <div className="text-xs text-muted-foreground">Cualquier tipo</div>
                      </div>
                    </button>
                  </div>
                )}

                <input ref={fileInputImageRef} type="file" multiple onChange={(e) => handleFileChange(e, 'Imagen')}    className="hidden" accept="image/*" />
                <input ref={fileInputVideoRef} type="file"          onChange={(e) => handleFileChange(e, 'Video')}     className="hidden" accept="video/*" />
                <input ref={fileInputDocRef}   type="file"          onChange={(e) => handleFileChange(e, 'Documento')} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                <input ref={fileInputFileRef}  type="file"          onChange={(e) => handleFileChange(e, 'Archivo')}   className="hidden" />
              </div>

              {/* Cámara */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCameraClick}
                className="h-9 w-9 flex-shrink-0 rounded-full hover:bg-muted"
              >
                <Camera className="h-5 w-5 text-muted-foreground" />
              </Button>
              <input
                ref={fileInputCameraRef}
                type="file"
                onChange={handleCameraChange}
                className="hidden"
                accept="image/*"
                capture="environment"
              />

              {/* Input de texto */}
              <div className="flex-1 max-h-32 overflow-y-auto">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      enviarMensaje();
                    }
                  }}
                  placeholder="Envía un mensaje..."
                  className="border-0 focus-visible:ring-0 shadow-none bg-transparent resize-none min-h-[36px]"
                />
              </div>

              {/* Enviar o voz */}
              {(input.trim() || attachedFiles.length > 0) ? (
                <Button
                  onClick={enviarMensaje}
                  disabled={isTyping}
                  size="icon"
                  className="flex-shrink-0 h-9 w-9 rounded-full"
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onMouseDown={iniciarGrabacionAudio}
                  onMouseUp={detenerGrabacionAudio}
                  onMouseLeave={() => { if (grabandoAudio) detenerGrabacionAudio(); }}
                  className={`h-9 w-9 flex-shrink-0 rounded-full hover:bg-muted ${
                    grabandoAudio ? 'bg-destructive text-white hover:bg-destructive' : ''
                  }`}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Burbuja de mensaje
// ────────────────────────────────────────────────────────────
function MessageBubble({
  message,
  index,
  resaltarTexto,
}: {
  message: Message;
  index: number;
  resaltarTexto: (texto: string, indice: number) => JSX.Element;
}) {
  const isUser = message.role === 'user';
  const att = message.attachment;
  const tieneTexto = message.content && message.content.trim().length > 0;

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 max-w-[85%] ${
            isUser ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted text-foreground'
          }`}
        >
          {/* Adjunto: image / video / link según mime */}
          {att && (
            <div className="mb-2">
              {att.isImage ? (
                <a href={att.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={att.url}
                    alt={att.name}
                    className="max-h-56 max-w-full rounded-lg border border-border hover:opacity-90 transition-opacity cursor-pointer"
                  />
                </a>
              ) : att.isVideo ? (
                <video
                  src={att.url}
                  controls
                  className="max-h-72 max-w-full rounded-lg border border-border bg-black"
                />
              ) : (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:opacity-90 transition-opacity ${
                    isUser
                      ? 'bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground'
                      : 'bg-background border-border text-foreground'
                  }`}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate max-w-[220px]">{att.name}</span>
                </a>
              )}
            </div>
          )}

          {/* Texto del mensaje */}
          {tieneTexto && (
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {resaltarTexto(message.content, index)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}