import palmappLogoComplete from '../../../assets/adf2cc8f5c11d4595840726d8165f5dc63d3cec0.png';
import palmappIsotipo from '../../../assets/90f63474a4a0ddb51ea409c23fa86e2b485ee0b8.png';

interface PalmappLogoProps {
  variant?: 'complete' | 'isotipo';
  className?: string;
  alt?: string;
}

export function PalmappLogo({ variant = 'complete', className = '', alt = 'Palmapp' }: PalmappLogoProps) {
  const src = variant === 'complete' ? palmappLogoComplete : palmappIsotipo;
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      onError={(e) => {
        console.error('Error loading Palmapp logo:', {
          src,
          variant,
          error: e
        });
      }}
    />
  );
}