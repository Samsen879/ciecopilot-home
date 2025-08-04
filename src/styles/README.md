# CIE Copilot Design System

A comprehensive, modern design system built for the CIE Copilot learning platform. This design system provides a unified foundation for creating consistent, accessible, and beautiful user interfaces.

## 🎨 Design Philosophy

- **Simplicity First**: Clean, minimal design that focuses on content and usability
- **Accessibility**: WCAG 2.1 AA compliant with proper contrast ratios and keyboard navigation
- **Consistency**: Unified visual language across all components and pages
- **Responsiveness**: Mobile-first approach with seamless adaptation across devices
- **Performance**: Optimized for fast loading and smooth interactions

## 📁 File Structure

```
src/styles/
├── design-system.css      # Main design system entry point
├── tokens.css            # Design tokens (colors, spacing, typography)
├── layout.css            # Layout utilities and responsive grid
├── components.css        # Component base styles
├── utilities.css         # Utility classes
├── design-tokens.js      # JavaScript design tokens
└── README.md            # This documentation
```

## 🎯 Core Features

### 1. Design Tokens System

Centralized design tokens using CSS custom properties:

```css
:root {
  /* Colors */
  --color-primary-600: #2563eb;
  --color-neutral-900: #0f172a;
  
  /* Typography */
  --text-base: 1rem;
  --font-semibold: 600;
  
  /* Spacing */
  --space-4: 1rem;
  --space-6: 1.5rem;
  
  /* Shadows */
  --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

### 2. Responsive Breakpoint System

Mobile-first responsive design with consistent breakpoints:

```javascript
const breakpoints = {
  xs: 475,   // Extra small devices
  sm: 640,   // Small devices (landscape phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (desktops)
  xl: 1280,  // Extra large devices
  '2xl': 1536 // 2X large devices
}
```

### 3. Component Library Foundation

Pre-built component styles with consistent patterns:

- **Buttons**: Primary, secondary, outline, ghost variants
- **Cards**: Subtle, elevated, floating, interactive variants
- **Forms**: Input fields, textareas, selects with focus states
- **Badges**: Status indicators with semantic colors
- **Alerts**: Success, warning, error, info messages
- **Loading States**: Spinners, skeletons, progress bars

### 4. Theme System with Dark Mode

Automatic theme switching with system preference detection:

```javascript
import { useTheme } from '../contexts/ThemeContext';

const { theme, toggleTheme, isDark } = useTheme();
```

## 🚀 Usage

### Basic Setup

The design system is automatically imported in `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import CIE Copilot Design System */
@import './styles/design-system.css';
```

### Using Design Tokens in JavaScript

```javascript
import { useDesignSystem } from '../hooks/useDesignSystem';

const MyComponent = () => {
  const ds = useDesignSystem();
  
  return (
    <div style={{
      color: ds.theme.color('colors.primary.600'),
      padding: ds.responsive.spacing({ xs: '1rem', lg: '2rem' }),
      fontSize: ds.responsive.fontSize({ xs: 'base', lg: 'lg' })
    }}>
      Content
    </div>
  );
};
```

### Using CSS Classes

```jsx
// Buttons
<button className="btn btn-primary btn-lg">Primary Button</button>
<button className="btn btn-secondary btn-md">Secondary Button</button>

// Cards
<div className="card card-hover card-elevated">
  <div className="card-header">
    <h3>Card Title</h3>
  </div>
  <div className="card-body">
    <p>Card content</p>
  </div>
</div>

// Form Elements
<input className="input input-lg" placeholder="Enter text..." />
<span className="badge badge-success">Success</span>
```

### Responsive Design

```jsx
// Using Tailwind responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>

// Using design system hook
const ds = useDesignSystem();
const columns = ds.responsive.columns({ xs: 1, md: 2, lg: 3 });
```

## 🎨 Color System

### Primary Colors (Blue)
- **50-100**: Light backgrounds and subtle accents
- **500-600**: Primary actions and links (default)
- **700-900**: Text and high contrast elements

### Neutral Colors (Gray)
- **50-200**: Backgrounds and subtle borders
- **400-600**: Secondary text and icons
- **700-900**: Primary text and high contrast elements

### Semantic Colors
- **Success**: Green tones for positive actions
- **Warning**: Amber tones for caution
- **Error**: Red tones for errors and destructive actions

## 📱 Responsive Design

### Breakpoint Strategy
- **Mobile First**: Base styles apply to mobile (0px+)
- **Progressive Enhancement**: Larger screens get enhanced layouts
- **Container System**: Responsive containers with max-widths

### Grid System
- **12-column grid**: Flexible layout system
- **CSS Grid**: Modern grid implementation
- **Flexbox utilities**: For component-level layouts

## ♿ Accessibility

### Focus Management
- Visible focus indicators on all interactive elements
- Proper tab order and keyboard navigation
- Skip links for screen readers

### Color Contrast
- WCAG 2.1 AA compliant contrast ratios
- High contrast mode support
- Color-blind friendly palette

### Motion & Animation
- Respects `prefers-reduced-motion`
- Smooth, purposeful animations
- Performance-optimized transitions

## 🔧 Customization

### Extending Colors
Add new colors to the design tokens:

```css
:root {
  --color-brand-500: #your-color;
}
```

### Custom Components
Follow the established patterns:

```css
.my-component {
  background-color: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: all var(--duration-200) var(--ease-in-out);
}
```

## 📊 Performance

### Optimization Features
- **CSS Custom Properties**: Efficient theming and customization
- **Minimal CSS**: Only necessary styles are included
- **Tree Shaking**: Unused utilities are removed in production
- **GPU Acceleration**: Transform-based animations

### Best Practices
- Use design tokens instead of hardcoded values
- Leverage utility classes for common patterns
- Minimize custom CSS by using the component library
- Test responsive behavior across devices

## 🧪 Testing

### Visual Regression
- Chromatic integration for component testing
- Cross-browser compatibility testing
- Responsive design validation

### Accessibility Testing
- Automated a11y testing with axe-core
- Manual keyboard navigation testing
- Screen reader compatibility testing

## 📚 Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Responsive Design Principles](https://web.dev/responsive-web-design-basics/)

## 🤝 Contributing

When contributing to the design system:

1. Follow the established naming conventions
2. Maintain consistency with existing patterns
3. Test across different devices and browsers
4. Update documentation for new features
5. Consider accessibility implications

## 📝 Changelog

### v1.0.0 (Current)
- Initial design system implementation
- Complete color palette and typography scale
- Responsive breakpoint system
- Component library foundation
- Dark mode support
- Accessibility features
- Performance optimizations