/**
 * El Markdown que escribe el asistente, convertido a nodos React.
 *
 * El bot responde en texto plano con Markdown ligero. La burbuja solo sabía
 * de negritas, así que el usuario veía los corchetes, los `###` y las URL
 * crudas: "[Afiche PDF](https://…)" en vez de un enlace en el que pueda
 * tocar. Ver `docs/FRONTEND_CHAT_MARKDOWN.md`.
 *
 * Se arma con nodos React y nunca con HTML: el texto lo genera un modelo, y
 * sin `dangerouslySetInnerHTML` no hay etiqueta que pueda colarse. Las URL se
 * filtran igual, porque un `href` sí acepta `javascript:`.
 *
 * Las imágenes van en fase 1: `![alt](url)` sale como enlace, no como
 * miniatura. La fase 2 espera el permiso de Cenipalma para mostrar sus fotos
 * dentro de la app.
 */
import type { ReactNode } from 'react';

/** Convierte un trozo de texto llano, p. ej. para resaltar la búsqueda. */
export type RenderTexto = (texto: string) => ReactNode;

/**
 * Un `href` solo puede ser http o https.
 *
 * `javascript:` ejecuta código al tocar el enlace y `data:` sirve una página
 * entera desde la propia URL. Ninguno de los dos tiene por qué salir de un
 * modelo de lenguaje, así que lo que no sea http(s) se queda como texto.
 */
function esEnlaceSeguro(url: string): boolean {
  try {
    const protocolo = new URL(url, window.location.origin).protocol;
    return protocolo === 'http:' || protocolo === 'https:';
  } catch {
    return false;
  }
}

function Enlace({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 break-all hover:opacity-80"
    >
      {children}
    </a>
  );
}

/*
 * Un solo barrido por la línea, con las alternativas en orden de prioridad:
 * la imagen antes que el enlace (comparten sintaxis salvo el `!`), y el
 * enlace antes que la URL suelta, para no partir un `[texto](url)` por la
 * mitad.
 *
 * `*texto*` va en negrita y no en cursiva: es la convención que ya seguía la
 * burbuja porque el bot manda así los nombres de producto. La cursiva queda
 * para `_texto_`, que es como llegan los nombres científicos.
 */
const TOKENS = new RegExp(
  [
    /!\[([^\]]*)\]\(([^)\s]+)\)/.source,      // 1 alt, 2 url — imagen
    /\[([^\]]*)\]\(([^)\s]+)\)/.source,       // 3 texto, 4 url — enlace
    /(https?:\/\/[^\s<>"')\]]+)/.source,      // 5 — URL suelta
    /\*\*([^*]+?)\*\*/.source,                // 6 — negrita
    /__([^_]+?)__/.source,                    // 7 — negrita
    /\*([^*\n]+?)\*/.source,                  // 8 — negrita (nombres de producto)
    /_([^_\n]+?)_/.source,                    // 9 — cursiva
  ].join('|'),
  'g',
);

/** La puntuación con la que termina la frase no es parte de la dirección. */
function recortarPuntuacionFinal(url: string): { url: string; sobra: string } {
  const limpia = url.replace(/[.,;:!?]+$/, '');
  return { url: limpia, sobra: url.slice(limpia.length) };
}

/** Negritas, cursivas, enlaces y URL sueltas dentro de una línea. */
export function renderInlineChat(texto: string, resaltar?: RenderTexto): ReactNode[] {
  const nodos: ReactNode[] = [];
  const llano = (t: string, k: string) =>
    t ? nodos.push(<span key={k}>{resaltar ? resaltar(t) : t}</span>) : undefined;

  let desde = 0;
  let n = 0;
  // Copia propia del regex: `lastIndex` vive en el objeto, y la recursión de
  // los enlaces lo dejaba en 0 sobre el compartido, con lo que el barrido
  // volvía al inicio y encontraba el mismo enlace una y otra vez.
  const tokens = new RegExp(TOKENS.source, TOKENS.flags);
  let m: RegExpExecArray | null;

  while ((m = tokens.exec(texto)) !== null) {
    if (m.index > desde) llano(texto.slice(desde, m.index), `t${n++}`);
    desde = m.index + m[0].length;

    const [, altImg, urlImg, textoEnlace, urlEnlace, urlSuelta, b1, b2, b3, cursiva] = m;

    if (urlImg !== undefined) {
      // Fase 1: la foto se enlaza, no se incrusta.
      const etiqueta = altImg?.trim() || urlImg;
      nodos.push(
        esEnlaceSeguro(urlImg)
          ? <Enlace key={`i${n++}`} href={urlImg}>{etiqueta}</Enlace>
          : <span key={`i${n++}`}>{etiqueta}</span>,
      );
    } else if (urlEnlace !== undefined) {
      const bruto = textoEnlace?.trim() || urlEnlace;
      // El texto de un enlace puede traer negrita. La recursión termina
      // siempre: `[^\]]*` impide que ahí dentro haya otro enlace.
      const etiqueta = renderInlineChat(bruto, resaltar);
      nodos.push(
        esEnlaceSeguro(urlEnlace)
          ? <Enlace key={`e${n++}`} href={urlEnlace}>{etiqueta}</Enlace>
          : <span key={`e${n++}`}>{etiqueta}</span>,
      );
    } else if (urlSuelta !== undefined) {
      const { url, sobra } = recortarPuntuacionFinal(urlSuelta);
      nodos.push(<Enlace key={`u${n++}`} href={url}>{url}</Enlace>);
      if (sobra) llano(sobra, `s${n++}`);
    } else {
      const negrita = b1 ?? b2 ?? b3;
      if (negrita !== undefined) {
        nodos.push(<strong key={`b${n++}`} className="font-semibold">{negrita}</strong>);
      } else if (cursiva !== undefined) {
        nodos.push(<em key={`c${n++}`}>{cursiva}</em>);
      }
    }
  }

  if (desde < texto.length) llano(texto.slice(desde), `t${n++}`);
  return nodos.length > 0 ? nodos : [resaltar ? resaltar(texto) : texto];
}

// ── Bloques ───────────────────────────────────────────────────────────────

const ENCABEZADO = /^(#{1,6})\s+(.*)$/;
const VINETA = /^\s*[-*•]\s+(.*)$/;
const NUMERADA = /^\s*(\d+)[.)]\s+(.*)$/;
const FILA_TABLA = /^\s*\|(.+)\|\s*$/;
/** La línea de guiones que separa el encabezado del cuerpo de una tabla. */
const SEPARADOR_TABLA = /^[\s|:-]+$/;

function celdas(linea: string): string[] {
  return linea.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

function Tabla({ filas, resaltar }: { filas: string[][]; resaltar?: RenderTexto }) {
  const [encabezado, ...cuerpo] = filas;
  return (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            {encabezado.map((c, i) => (
              <th key={i} className="px-2 py-1 text-left font-semibold">
                {renderInlineChat(c, resaltar)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cuerpo.map((fila, f) => (
            <tr key={f} className="border-b border-border/40 last:border-0">
              {fila.map((c, i) => (
                <td key={i} className="px-2 py-1 align-top">
                  {renderInlineChat(c, resaltar)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * El texto del asistente, listo para pintar.
 *
 * Los encabezados salen en negrita del mismo tamaño que el resto: en una
 * burbuja de chat un `<h1>` se ve desproporcionado.
 */
export function renderMarkdownChat(texto: string, resaltar?: RenderTexto): ReactNode {
  const lineas = texto.split('\n');
  const bloques: ReactNode[] = [];

  // Las líneas sueltas se acumulan y salen juntas como un párrafo, para que
  // un texto cortado en varias líneas no se separe con espacios de más.
  let parrafo: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length === 0) return;
    const contenido = parrafo.join('\n');
    bloques.push(
      <p key={`p${bloques.length}`} className="whitespace-pre-wrap break-words">
        {renderInlineChat(contenido, resaltar)}
      </p>,
    );
    parrafo = [];
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    if (!linea.trim()) {
      cerrarParrafo();
      continue;
    }

    const enc = ENCABEZADO.exec(linea);
    if (enc) {
      cerrarParrafo();
      bloques.push(
        <p key={`h${bloques.length}`} className="font-semibold break-words">
          {renderInlineChat(enc[2], resaltar)}
        </p>,
      );
      continue;
    }

    if (FILA_TABLA.test(linea)) {
      cerrarParrafo();
      const filas: string[][] = [];
      while (i < lineas.length && FILA_TABLA.test(lineas[i])) {
        const cruda = celdas(lineas[i]);
        if (!SEPARADOR_TABLA.test(lineas[i])) filas.push(cruda);
        i++;
      }
      i--;
      if (filas.length > 0) {
        bloques.push(<Tabla key={`tb${bloques.length}`} filas={filas} resaltar={resaltar} />);
      }
      continue;
    }

    if (VINETA.test(linea) || NUMERADA.test(linea)) {
      cerrarParrafo();
      const ordenada = !VINETA.test(linea);
      const items: string[] = [];
      while (i < lineas.length && (VINETA.test(lineas[i]) || NUMERADA.test(lineas[i]))) {
        const v = VINETA.exec(lineas[i]);
        const num = NUMERADA.exec(lineas[i]);
        items.push(v ? v[1] : num![2]);
        i++;
      }
      i--;
      const Lista = ordenada ? 'ol' : 'ul';
      bloques.push(
        <Lista
          key={`l${bloques.length}`}
          className={`my-1 ml-5 space-y-0.5 ${ordenada ? 'list-decimal' : 'list-disc'}`}
        >
          {items.map((item, k) => (
            <li key={k} className="break-words">{renderInlineChat(item, resaltar)}</li>
          ))}
        </Lista>,
      );
      continue;
    }

    parrafo.push(linea);
  }

  cerrarParrafo();
  return <div className="space-y-1.5">{bloques}</div>;
}
