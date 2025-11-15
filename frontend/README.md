# Patient Health Monitoring Dashboard

A modern, accessible Patient Health Monitoring Dashboard built with React and Tailwind CSS, designed to match the reference image specifications.

## Features

### 🎨 Design System
- **Design Tokens**: Comprehensive design system with colors, spacing, typography, and component specifications
- **Responsive Layout**: Desktop (≥1200px), tablet (768-1199px), mobile (<768px)
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support
- **Modern UI**: Clean white background, subtle shadows, rounded corners, and consistent spacing

### 📊 Dashboard Components
- **Vitals Cards**: 8-card grid layout (2 rows × 4 columns) with real-time data
- **Sparkline Charts**: Mini trend visualizations for each vital sign
- **Status Indicators**: Color-coded status tags (Normal/Warning/Critical)
- **Quick Actions**: Emergency alert, call caregiver, view medications
- **Summary Card**: Today's health metrics and averages

### 🌡️ Fever Symptoms Checker (new)
- **Optimized form controls**: checkboxes, radio groups, sliders, quick-select buttons, and “Use my location” for geolocation.
- **Validation**: React Hook Form + Zod schema with accessible error messaging and consent enforcement.
- **AI + PDF workflow**: runs `/api/fever-check`, renders probability/severity, explains SHAP top features, downloads encrypted PDF reports, and surfaces clinician-flagged medication guidance.
- **AI Assistant modal**: contextual chat that can suggest precautions, tablets (with clinician verification flag), diet plans, and nearby hospitals after each prediction.
- **Disclaimers & privacy**: persistent medical disclaimer plus consent gate before PHI collection.

### 🔧 Technical Features
- **Real-time Data**: Live updates with configurable refresh rates
- **Data Mapping**: Exact backend key mapping (heartRate, spo2, bodyTemp, etc.)
- **Status Evaluation**: Configurable thresholds for alert conditions
- **Fall Detection**: Special handling for fall detection events
- **Alert System**: Popup alerts with cooldown periods

## Component Architecture

### Core Components

#### VitalsCard
```jsx
<VitalsCard
  label="Heart Rate"
  value={67}
  unit="BPM"
  status="normal"
  timestamp={Date.now()}
  normalRange="Normal range: 60-100 BPM"
  trendData={[65, 67, 68, 66, 67]}
  isAlerted={false}
  fallDetected={false}
  lastFallTime={null}
/>
```

#### Sidebar
```jsx
<Sidebar
  alertsCount={3}
  expanded={true}
  currentPage="dashboard"
  onNavigate={(pageId) => console.log(pageId)}
/>
```

#### Topbar
```jsx
<Topbar
  patientName="Pramoda CN"
  lastUpdated={Date.now()}
  notifications={3}
  alertsCount={3}
  online={true}
/>
```

#### QuickActions
```jsx
<QuickActions
  onEmergency={() => console.log('Emergency!')}
  onCallCaregiver={() => console.log('Call caregiver')}
  onViewMedications={() => console.log('View medications')}
/>
```

#### SummaryCard
```jsx
<SummaryCard
  total={150}
  avgHeartRate={67}
  avgSpo2={97}
  lastFallTime={null}
  onViewHistory={() => console.log('View history')}
/>
```

### Design Tokens

The design system is built on a comprehensive token system:

```javascript
// Colors
primary: '#0b74ff'
success: '#22c55e'
warning: '#f59e0b'
danger: '#ef4444'

// Spacing
xs: '0.25rem'    // 4px
sm: '0.5rem'     // 8px
md: '0.75rem'    // 12px
lg: '1rem'       // 16px

// Border Radius
card: '0.75rem'  // 12px

// Shadows
card: '0 4px 10px rgba(0, 0, 0, 0.05)'
glow: '0 0 0 1px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)'
```

## Data Mapping

The dashboard maps to these exact backend keys:

| UI Display | Backend Key | Unit | Normal Range |
|------------|-------------|------|--------------|
| Heart Rate | `heartRate` | BPM | 60-100 |
| Blood Oxygen | `spo2` | % | 95-100 |
| Body Temperature | `bodyTemp` | °C | 36.1-37.2 |
| Ambient Temperature | `ambientTemp` | °C | Info only |
| Acceleration Magnitude | `accMagnitude` | g | Configurable |
| Fall Detected | `fallDetected` | Boolean | Yes/No |
| Alerted | `alerted` | Boolean | Yes/No |
| Timestamp | `timestamp` | ms | Last updated |

## Status Evaluation

Status is determined by configurable thresholds:

```javascript
const thresholds = {
  heartRate: { min: 60, max: 100 },
  spo2: { min: 95, max: 100 },
  bodyTemp: { min: 36.1, max: 37.2 },
  ambientTemp: { min: 15, max: 35 },
  accMagnitude: { min: 0.5, max: 2.0 }
};
```

Status levels:
- **Normal**: Within normal range
- **Warning**: Near threshold limits (10% buffer)
- **Critical**: Outside normal range
- **Unknown**: No data available

## Responsive Design

### Desktop (≥1200px)
- Left sidebar (240px width)
- 4-column vitals grid
- Side-by-side Quick Actions and Summary cards

### Tablet (768-1199px)
- Collapsible sidebar
- 2-column vitals grid
- Stacked Quick Actions and Summary cards

### Mobile (<768px)
- Hidden sidebar (hamburger menu)
- Single-column vitals grid
- Sticky Quick Actions at bottom

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Color Contrast**: 4.5:1 contrast ratio for all text
- **Focus Indicators**: Clear focus states for keyboard users
- **Semantic HTML**: Proper heading hierarchy and landmarks

## Usage

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Environment Variables
```env
VITE_BACKEND_URL=http://localhost:4000/api
VITE_API_BASE_URL=http://localhost:4000/api
```

## Customization

### Adding New Vitals
1. Add new card to Dashboard component
2. Update data mapping in `normalizeRecord` function
3. Add thresholds to design tokens
4. Update status evaluation logic

### Adding New Navigation Items
1. Add item to `navigationItems` array in Sidebar
2. Add corresponding page component
3. Update navigation handler in Home component

### Modifying Status Thresholds
Update the `thresholds` object in `designTokens.js`:

```javascript
const thresholds = {
  heartRate: { min: 60, max: 100 },
  // Add your custom thresholds
};
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - see LICENSE file for details.

