import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Forzar tema claro por ahora
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add('light'); // Siempre claro
    localStorage.setItem('theme', 'light');
  }, [theme]);

  const toggleTheme = () => {
    // Deshabilitado por ahora - siempre modo claro
    // setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Se arma una vez por cambio de tema, no en cada render del proveedor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const valor = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return (
    <ThemeContext.Provider value={valor}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}