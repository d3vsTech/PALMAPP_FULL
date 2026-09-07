// Config mínima y pragmática: señala los problemas reales sin bloquear
// el trabajo diario. Endurecer reglas de a una cuando el conteo baje.
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', '*.d.ts'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Logs de debug no deben llegar a producción. warn/error se permiten
      // porque hoy son el único canal de reporte de errores.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // 489 usos de any hoy: se marca como warning para verlo, no para
      // bloquear. Subir a error cuando se limpie la capa API.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Variables sin usar: los argumentos con _ se permiten por convención.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
