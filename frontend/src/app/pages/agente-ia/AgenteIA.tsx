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
import { usePreviewUrls } from '../../hooks/usePreviewUrl';
import { cn } from '../../components/lib/utils';
import { renderMarkdownChat } from './markdownChat';
import type { RenderTexto } from './markdownChat';

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
// Componente principal
// ────────────────────────────────────────────────────────────
export default function AgenteIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  /**
   * Las miniaturas de lo que está por enviarse. Antes la URL se creaba en el
   * render y se revocaba en `onLoad`, así que al repintar la imagen apuntaba a
   * una URL ya muerta y desaparecía.
   */
  const previewUrls = usePreviewUrls(attachedFiles);

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

  /**
   * Cómo pintar un trozo de texto llano del mensaje `indice`. Solo marca las
   * coincidencias de la búsqueda; el formato lo pone quien lo llama, y por
   * eso el resaltado funciona también dentro de una lista o una tabla.
   * `undefined` cuando ese mensaje no es resultado de la búsqueda.
   */
  const resaltadorDe = (indice: number): RenderTexto | undefined => {
    if (!terminoBusqueda.trim() || !resultadosBusqueda.includes(indice)) return undefined;
    const esResultadoActual = resultadosBusqueda[indiceResultadoActual] === indice;
    return (texto: string) => {
      const partes = texto.split(new RegExp(`(${terminoBusqueda})`, 'gi'));
      return (
        <>
          {partes.map((parte, i) =>
            parte.toLowerCase() === terminoBusqueda.toLowerCase() ? (
              <mark key={i} className={`${esResultadoActual ? 'bg-accent text-white' : 'bg-warning-soft'} rounded px-0.5`}>
                {parte}
              </mark>
            ) : (
              <span key={i}>{parte}</span>
            )
          )}
        </>
      );
    };
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
    <div className="flex h-[calc(100dvh-6.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs md:h-[calc(100dvh-7.5rem)]">
      {/* Cabecera */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate">Agente IA</h3>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              En línea
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Buscar en la conversación"
          aria-pressed={mostrarBusqueda}
          onClick={() => setMostrarBusqueda(!mostrarBusqueda)}
          className="text-muted-foreground"
        >
          <Search strokeWidth={2} />
        </Button>
      </div>

      {/* Barra de búsqueda */}
      {mostrarBusqueda && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
            <Input
              ref={searchInputRef}
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              placeholder="Buscar en la conversación"
              className="h-9 pl-9"
            />
          </div>
          {resultadosBusqueda.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="whitespace-nowrap px-1 text-xs text-muted-foreground tabular-nums">
                {indiceResultadoActual + 1} de {resultadosBusqueda.length}
              </span>
              <Button variant="ghost" size="icon" aria-label="Resultado anterior" onClick={irAlResultadoAnterior} className="h-8 w-8 text-muted-foreground">
                <ChevronUp strokeWidth={2} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Resultado siguiente" onClick={irAlSiguienteResultado} className="h-8 w-8 text-muted-foreground">
                <ChevronDown strokeWidth={2} />
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cerrar búsqueda"
            onClick={() => { setMostrarBusqueda(false); setTerminoBusqueda(''); }}
            className="h-8 w-8 text-muted-foreground"
          >
            <X strokeWidth={2} />
          </Button>
        </div>
      )}

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Sparkles className="h-6 w-6" strokeWidth={2} />
              </span>
              <div className="space-y-1">
                <h2>¿En qué te ayudo hoy?</h2>
                <p className="text-sm text-muted-foreground">
                  Pregunta por producción, lotes, colaboradores, nómina o viajes.
                </p>
              </div>
              <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => { setInput('¿Cuántas palmas tengo registradas?'); inputRef.current?.focus(); }}
                  className="rounded-lg border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  <span className="block text-sm font-semibold text-foreground">Estado de la plantación</span>
                  <span className="block text-xs text-muted-foreground">Total de palmas y lotes</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setInput('Muéstrame el resumen de producción'); inputRef.current?.focus(); }}
                  className="rounded-lg border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  <span className="block text-sm font-semibold text-foreground">Resumen de producción</span>
                  <span className="block text-xs text-muted-foreground">Cosecha de la quincena</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setInput('Información sobre colaboradores'); inputRef.current?.focus(); }}
                  className="rounded-lg border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  <span className="block text-sm font-semibold text-foreground">Colaboradores activos</span>
                  <span className="block text-xs text-muted-foreground">Personal de la finca</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setInput('Resumen de nómina actual'); inputRef.current?.focus(); }}
                  className="rounded-lg border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  <span className="block text-sm font-semibold text-foreground">Nómina y pagos</span>
                  <span className="block text-xs text-muted-foreground">Salarios de la quincena</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  resaltar={resaltadorDe(index)}
                />
              ))}

              {isTyping && (
                <div className="flex items-start gap-2.5">
                  <AgenteAvatar />
                  <div className="rounded-xl rounded-tl-sm border border-border bg-card px-4 py-3" aria-label="El agente está escribiendo">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '300ms' }} />
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
                const previewUrl = previewUrls[index];
                return (
                  <div key={index} className="group relative flex items-center gap-2 rounded-lg border border-border bg-card p-1">
                    {previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt={file.name}
                          className="h-14 w-14 object-cover rounded-md"
                        />
                        <span className="text-xs truncate max-w-[100px] pr-5">{file.name}</span>
                      </>
                    ) : (
                      <>
                        <FileText className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                        <span className="text-sm truncate max-w-[180px] pr-5">{file.name}</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttached(index)}
                      className="absolute right-1 top-1 rounded-md bg-background/90 p-0.5 shadow-xs hover:bg-background"
                      aria-label={`Quitar ${file.name}`}
                      title="Quitar"
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Input bar fijo inferior */}
      <div className="shrink-0 border-t border-border bg-card px-3 py-3 sm:px-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-1 rounded-lg border border-input bg-background p-1.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/20">
              <div className="relative shrink-0" ref={menuArchivosRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Adjuntar archivo"
                  aria-expanded={mostrarMenuArchivos}
                  onClick={() => setMostrarMenuArchivos(!mostrarMenuArchivos)}
                  className="h-8 w-8 text-muted-foreground"
                >
                  <Plus strokeWidth={2} />
                </Button>

                {mostrarMenuArchivos && (
                  <div className="absolute bottom-full left-0 z-10 mb-2 min-w-[210px] rounded-lg border border-border bg-popover p-1 shadow-md">
                    <button
                      type="button"
                      onClick={() => handleFileSelect('imagen')}
                      className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">Imagen</span>
                        <span className="block text-xs text-muted-foreground">PNG, JPG, GIF</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFileSelect('video')}
                      className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <Video className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">Video</span>
                        <span className="block text-xs text-muted-foreground">MP4, AVI, MOV</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFileSelect('documento')}
                      className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">Documento</span>
                        <span className="block text-xs text-muted-foreground">PDF, DOC, XLS</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFileSelect('archivo')}
                      className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <File className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">Archivo</span>
                        <span className="block text-xs text-muted-foreground">Cualquier tipo</span>
                      </span>
                    </button>
                  </div>
                )}

                <input ref={fileInputImageRef} type="file" multiple onChange={(e) => handleFileChange(e, 'Imagen')}    className="hidden" accept="image/*" aria-label="Seleccionar imagen" />
                <input ref={fileInputVideoRef} type="file"          onChange={(e) => handleFileChange(e, 'Video')}     className="hidden" accept="video/*" aria-label="Seleccionar video" />
                <input ref={fileInputDocRef}   type="file"          onChange={(e) => handleFileChange(e, 'Documento')} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" aria-label="Seleccionar documento" />
                <input ref={fileInputFileRef}  type="file"          onChange={(e) => handleFileChange(e, 'Archivo')}   className="hidden" aria-label="Seleccionar archivo" />
              </div>

              {/* Cámara */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Tomar foto"
                onClick={handleCameraClick}
                className="h-8 w-8 shrink-0 text-muted-foreground"
              >
                <Camera strokeWidth={2} />
              </Button>
              <input
                aria-label="Seleccionar archivo"
                ref={fileInputCameraRef}
                type="file"
                onChange={handleCameraChange}
                className="hidden"
                accept="image/*"
                capture="environment"
              />

              {/* Input de texto */}
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
                placeholder="Escribe tu pregunta"
                aria-label="Mensaje para el agente"
                className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1.5 shadow-none focus-visible:ring-0"
              />

              {/* Enviar o voz */}
              {(input.trim() || attachedFiles.length > 0) ? (
                <Button
                  onClick={enviarMensaje}
                  disabled={isTyping}
                  size="icon"
                  aria-label="Enviar"
                  className="h-8 w-8 shrink-0"
                >
                  <ArrowUp strokeWidth={2} />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={grabandoAudio ? 'Soltar para terminar la nota de voz' : 'Mantener para grabar nota de voz'}
                  onMouseDown={iniciarGrabacionAudio}
                  onMouseUp={detenerGrabacionAudio}
                  onMouseLeave={() => { if (grabandoAudio) detenerGrabacionAudio(); }}
                  className={cn(
                    'h-8 w-8 shrink-0',
                    grabandoAudio
                      ? 'bg-destructive-soft text-destructive hover:bg-destructive-soft'
                      : 'text-muted-foreground'
                  )}
                >
                  <Mic strokeWidth={2} />
                </Button>
              )}
          </div>
          <p className="mt-1.5 hidden text-center text-xs text-muted-foreground sm:block">
            Las respuestas se basan en los datos registrados en PalmApp. Verifica las cifras antes de decidir.
          </p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Burbuja de mensaje
// ────────────────────────────────────────────────────────────
/** Marca del agente al lado de sus mensajes. */
function AgenteAvatar() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden>
      <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
    </span>
  );
}

function MessageBubble({
  message,
  resaltar,
}: {
  message: Message;
  /** Marca las coincidencias de la búsqueda, o `undefined` si no hay. */
  resaltar?: RenderTexto;
}) {
  const isUser = message.role === 'user';
  const att = message.attachment;
  const tieneTexto = message.content && message.content.trim().length > 0;

  return (
    <div className={cn('flex items-start gap-2.5', isUser && 'justify-end')}>
      {!isUser && <AgenteAvatar />}

      <div className="max-w-[85%] sm:max-w-[75%]">
        <div
          className={cn(
            'overflow-hidden rounded-xl px-4 py-2.5',
            isUser
              ? 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm border border-border bg-card text-foreground'
          )}
        >
          {/* Adjunto: image / video / link según mime */}
          {att && (
            <div className="mb-2">
              {att.isImage ? (
                <a href={att.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={att.url}
                    alt={att.name}
                    className="max-h-80 max-w-full cursor-pointer rounded-lg border border-border transition-opacity hover:opacity-90"
                  />
                </a>
              ) : att.isVideo ? (
                <video
                  src={att.url}
                  controls
                  className="max-h-80 max-w-full rounded-lg border border-border bg-black"
                />
              ) : (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-opacity hover:opacity-90',
                    isUser
                      ? 'border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground'
                      : 'border-border bg-background text-foreground'
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="truncate max-w-[220px]">{att.name}</span>
                </a>
              )}
            </div>
          )}

          {/* Texto del mensaje. El del asistente llega en Markdown; el del
              usuario se muestra tal cual lo escribió. */}
          {tieneTexto && (
            <div className="break-words text-sm leading-relaxed">
              {isUser ? (
                <span className="whitespace-pre-wrap">
                  {resaltar ? resaltar(message.content) : message.content}
                </span>
              ) : (
                renderMarkdownChat(message.content, resaltar)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}