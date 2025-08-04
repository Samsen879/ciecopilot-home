import React from 'react';
import { Palette, Type, Layout, Zap } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const DesignSystemDemo = () => {
  return (
    <div className="container py-12">
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-neutral-900">CIE Copilot Design System</h1>
          <ThemeToggle />
        </div>
        <p className="text-lg text-neutral-600 leading-relaxed">
          A comprehensive design system built for modern, accessible, and consistent user interfaces.
        </p>
      </div>

      {/* Color System */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <Palette className="text-primary-600" size={24} />
          <h2 className="text-2xl font-semibold">Color System</h2>
        </div>
        
        <div className="grid gap-8">
          {/* Primary Colors */}
          <div>
            <h3 className="text-lg font-medium mb-4">Primary Colors</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(shade => (
                <div key={shade} className="text-center">
                  <div 
                    className={`w-full h-16 rounded-lg mb-2 bg-primary-${shade}`}
                    style={{ backgroundColor: `var(--color-primary-${shade})` }}
                  />
                  <div className="text-xs font-mono text-neutral-600">{shade}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Neutral Colors */}
          <div>
            <h3 className="text-lg font-medium mb-4">Neutral Colors</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(shade => (
                <div key={shade} className="text-center">
                  <div 
                    className={`w-full h-16 rounded-lg mb-2`}
                    style={{ backgroundColor: `var(--color-neutral-${shade})` }}
                  />
                  <div className="text-xs font-mono text-neutral-600">{shade}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <Type className="text-primary-600" size={24} />
          <h2 className="text-2xl font-semibold">Typography</h2>
        </div>
        
        <div className="space-y-6">
          <div>
            <h1 className="text-6xl font-bold mb-2">Display Large</h1>
            <p className="text-sm text-neutral-500 font-mono">text-6xl / font-bold</p>
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2">Heading 1</h1>
            <p className="text-sm text-neutral-500 font-mono">text-4xl / font-bold</p>
          </div>
          <div>
            <h2 className="text-3xl font-semibold mb-2">Heading 2</h2>
            <p className="text-sm text-neutral-500 font-mono">text-3xl / font-semibold</p>
          </div>
          <div>
            <h3 className="text-2xl font-semibold mb-2">Heading 3</h3>
            <p className="text-sm text-neutral-500 font-mono">text-2xl / font-semibold</p>
          </div>
          <div>
            <p className="text-lg mb-2">Body Large - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p className="text-sm text-neutral-500 font-mono">text-lg / font-normal</p>
          </div>
          <div>
            <p className="text-base mb-2">Body Regular - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p className="text-sm text-neutral-500 font-mono">text-base / font-normal</p>
          </div>
          <div>
            <p className="text-sm mb-2">Body Small - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p className="text-sm text-neutral-500 font-mono">text-sm / font-normal</p>
          </div>
        </div>
      </section>

      {/* Components */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <Layout className="text-primary-600" size={24} />
          <h2 className="text-2xl font-semibold">Components</h2>
        </div>
        
        <div className="space-y-8">
          {/* Buttons */}
          <div>
            <h3 className="text-lg font-medium mb-4">Buttons</h3>
            <div className="flex flex-wrap gap-4">
              <button className="btn btn-primary btn-lg">Primary Large</button>
              <button className="btn btn-primary btn-md">Primary Medium</button>
              <button className="btn btn-primary btn-sm">Primary Small</button>
              <button className="btn btn-secondary btn-md">Secondary</button>
              <button className="btn btn-outline btn-md">Outline</button>
              <button className="btn btn-ghost btn-md">Ghost</button>
              <button className="btn btn-primary btn-md" disabled>Disabled</button>
            </div>
          </div>

          {/* Cards */}
          <div>
            <h3 className="text-lg font-medium mb-4">Cards</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card card-subtle">
                <div className="card-header">
                  <h4 className="font-semibold">Subtle Card</h4>
                </div>
                <div className="card-body">
                  <p className="text-neutral-600">This is a subtle card with minimal shadow.</p>
                </div>
              </div>
              <div className="card card-elevated">
                <div className="card-header">
                  <h4 className="font-semibold">Elevated Card</h4>
                </div>
                <div className="card-body">
                  <p className="text-neutral-600">This is an elevated card with medium shadow.</p>
                </div>
              </div>
              <div className="card card-hover card-floating">
                <div className="card-header">
                  <h4 className="font-semibold">Interactive Card</h4>
                </div>
                <div className="card-body">
                  <p className="text-neutral-600">This card has hover effects and high shadow.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Elements */}
          <div>
            <h3 className="text-lg font-medium mb-4">Form Elements</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <input type="text" placeholder="Large input" className="input input-lg" />
                <input type="text" placeholder="Medium input" className="input input-md" />
                <input type="text" placeholder="Small input" className="input input-sm" />
                <input type="text" placeholder="Disabled input" className="input input-md" disabled />
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <span className="badge badge-primary">Primary</span>
                  <span className="badge badge-success">Success</span>
                  <span className="badge badge-warning">Warning</span>
                  <span className="badge badge-error">Error</span>
                </div>
                <div className="flex gap-3">
                  <div className="avatar avatar-sm">JD</div>
                  <div className="avatar avatar-md">JD</div>
                  <div className="avatar avatar-lg">JD</div>
                  <div className="avatar avatar-xl">JD</div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading States */}
          <div>
            <h3 className="text-lg font-medium mb-4">Loading States</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="spinner spinner-sm"></div>
                <div className="spinner"></div>
                <div className="spinner spinner-lg"></div>
              </div>
              <div className="space-y-2">
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text"></div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div>
            <h3 className="text-lg font-medium mb-4">Alerts</h3>
            <div className="space-y-4">
              <div className="alert alert-success">
                <Zap size={20} />
                <div>
                  <strong>Success!</strong> Your changes have been saved successfully.
                </div>
              </div>
              <div className="alert alert-warning">
                <Zap size={20} />
                <div>
                  <strong>Warning!</strong> Please review your input before proceeding.
                </div>
              </div>
              <div className="alert alert-error">
                <Zap size={20} />
                <div>
                  <strong>Error!</strong> Something went wrong. Please try again.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid System */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-8">Grid System</h2>
        <div className="space-y-6">
          <div className="grid grid-cols-12 gap-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="bg-primary-100 p-3 rounded text-center text-sm font-medium">
                {i + 1}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-primary-50 p-6 rounded-lg">
              <h4 className="font-semibold mb-2">Responsive Column 1</h4>
              <p className="text-sm text-neutral-600">This layout adapts to different screen sizes.</p>
            </div>
            <div className="bg-primary-50 p-6 rounded-lg">
              <h4 className="font-semibold mb-2">Responsive Column 2</h4>
              <p className="text-sm text-neutral-600">Columns stack on mobile devices.</p>
            </div>
            <div className="bg-primary-50 p-6 rounded-lg">
              <h4 className="font-semibold mb-2">Responsive Column 3</h4>
              <p className="text-sm text-neutral-600">Three columns on large screens.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DesignSystemDemo;