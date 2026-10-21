/**
 * URL de previsualización de un archivo que el usuario acaba de escoger.
 *
 * `URL.createObjectURL` reserva memoria que el navegador solo suelta cuando se
 * la revoca o cuando se recarga la página. Llamarlo dentro del render, que es
 * lo que hacían las pantallas de producto y el chat del agente, crea una URL
 * nueva en cada repintado y ninguna se libera: una imagen de 3 MB y treinta
 * repintados son 90 MB retenidos.
 *
 * Estos hooks crean la URL una sola vez por archivo y la revocan cuando el
 * archivo cambia o el componente se desmonta.
 */
import { useEffect, useMemo } from 'react';

/** La URL de un archivo, o null si no hay. */
export function usePreviewUrl(file: File | null | undefined): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
}

/**
 * Lo mismo para una lista. Devuelve una URL por archivo, en el mismo orden, y
 * null en los que no son imagen.
 */
export function usePreviewUrls(files: File[]): Array<string | null> {
  const urls = useMemo(
    () => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)),
    [files],
  );

  useEffect(() => {
    return () => urls.forEach((u) => { if (u) URL.revokeObjectURL(u); });
  }, [urls]);

  return urls;
}
