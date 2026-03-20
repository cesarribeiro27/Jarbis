import React, {
  useEffect,
  useRef,
  useState,
  CSSProperties,
  ReactNode,
} from 'react';

export type JarbisEvent = {
  type: string;
  label: string;
  value: number | string;
  reportId: string;
};

export type JarbisDashboardProps = {
  /** Embed token from Jarbis dashboard settings */
  token: string;
  /** Custom Jarbis host. Defaults to https://jarbis.cc */
  host?: string;
  /** Iframe height. Defaults to 600 */
  height?: number | string;
  /** Iframe width. Defaults to '100%' */
  width?: number | string;
  /** Color theme override */
  theme?: 'light' | 'dark';
  /** Pre-apply filters to the dashboard */
  filters?: Record<string, string>;
  /** Callback for dashboard events (clicks, custom events) */
  onEvent?: (event: JarbisEvent) => void;
  /** CSS class for the container div */
  className?: string;
  /** Inline styles for the container div */
  style?: CSSProperties;
  /** Custom loading state */
  loading?: ReactNode;
};

function buildEmbedUrl(
  host: string,
  token: string,
  theme?: string,
  filters?: Record<string, string>
): string {
  const base = host.replace(/\/$/, '');
  const params = new URLSearchParams();
  if (theme) params.set('theme', theme);
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => params.set(`filter_${k}`, v));
  }
  const qs = params.toString();
  return `${base}/embed/${token}${qs ? `?${qs}` : ''}`;
}

const DEFAULT_LOADING = (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 120,
      color: '#7c3aed',
      fontSize: 14,
      fontFamily: 'sans-serif',
    }}
  >
    <span>Carregando dashboard...</span>
  </div>
);

export function JarbisDashboard({
  token,
  host = 'https://jarbis.cc',
  height = 600,
  width = '100%',
  theme,
  filters,
  onEvent,
  className,
  style,
  loading = DEFAULT_LOADING,
}: JarbisDashboardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const embedUrl = buildEmbedUrl(host, token, theme, filters);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Security: only accept messages from the embed origin
      try {
        const origin = new URL(host).origin;
        if (event.origin !== origin) return;
      } catch {
        return;
      }

      const data = event.data;
      if (data && typeof data === 'object' && data.type && data.reportId) {
        onEventRef.current?.(data as JarbisEvent);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [host]);

  const containerStyle: CSSProperties = {
    position: 'relative',
    width,
    height,
    overflow: 'hidden',
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading}
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        allowFullScreen
        style={{
          border: 'none',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        onLoad={() => setIsLoaded(true)}
        title="Jarbis Dashboard"
      />
    </div>
  );
}

export default JarbisDashboard;
