/**
 * Tema claro u oscuro de la app.
 *
 * Los dos juegos de tokens viven en `theme.css`: la clase `dark` en el `html`
 * es la que cambia de uno al otro. La preferencia se recuerda por navegador,
 * y la primera visita toma la del sistema operativo.
 */
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const CLAVE = 'theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** Lo que eligió el usuario; si nunca eligió, lo que pida el sistema. */
function temaInicial(): Theme {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'dark' || guardado === 'light') return guardado;
  } catch {
    /* sin almacenamiento: se decide por el sistema */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(temaInicial);

  useEffect(() => {
    const raiz = window.document.documentElement;
    raiz.classList.remove('light', 'dark');
    raiz.classList.add(theme);
    // La barra de estado del celular se pinta del color del marco.
    raiz.style.colorScheme = theme;
    try {
      localStorage.setItem(CLAVE, theme);
    } catch {
      /* sin almacenamiento: el tema dura lo que dure la pestaña */
    }
  }, [theme]);

  const valor = useMemo<ThemeContextType>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((previo) => (previo === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
