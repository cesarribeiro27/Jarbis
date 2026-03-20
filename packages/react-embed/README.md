# @jarbis/react-embed

Embed Jarbis dashboards in any React application.

## Installation

```bash
npm install @jarbis/react-embed
```

## Usage

```tsx
import { JarbisDashboard } from '@jarbis/react-embed';

export default function App() {
  return (
    <JarbisDashboard
      token="your-embed-token"
      height={600}
      onEvent={(event) => console.log('Dashboard event:', event)}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `token` | `string` | ✅ | Embed token from Jarbis dashboard settings |
| `host` | `string` | — | Custom Jarbis host (default: `https://jarbis.cc`) |
| `height` | `number \| string` | — | Iframe height (default: `600`) |
| `width` | `number \| string` | — | Iframe width (default: `100%`) |
| `theme` | `'light' \| 'dark'` | — | Color theme override |
| `filters` | `Record<string, string>` | — | Key-value filters to pre-apply |
| `onEvent` | `(event: JarbisEvent) => void` | — | Callback for dashboard events (clicks, etc) |
| `className` | `string` | — | CSS class for the container div |
| `style` | `CSSProperties` | — | Inline styles for the container div |
| `loading` | `ReactNode` | — | Custom loading state |

## Events

The `onEvent` callback receives events from the dashboard:

```ts
type JarbisEvent = {
  type: string;      // e.g. 'dashboard:click', custom event name
  label: string;     // clicked element label
  value: number;     // clicked element value
  reportId: string;  // block ID that was clicked
};
```

## Filters

Pre-apply filters to the dashboard:

```tsx
<JarbisDashboard
  token="your-token"
  filters={{ region: 'São Paulo', year: '2024' }}
/>
```
