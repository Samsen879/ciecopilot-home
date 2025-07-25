# Technology Stack & Build System

## Frontend Framework
- **React 18.2.0** with functional components and hooks
- **Vite 5.0.12** as build tool and dev server
- **React Router DOM 6.30.1** for client-side routing

## Styling & UI
- **Tailwind CSS 3.4.1** for utility-first styling
- **Framer Motion 12.18.1** for animations and transitions
- **Lucide React 0.516.0** for consistent iconography
- PostCSS with Autoprefixer for CSS processing

## Backend & API
- **Vercel Serverless Functions** for API endpoints
- **OpenAI GPT-4 Turbo** integration via `/api/chat.js`
- Environment-based configuration for API keys

## Development Tools
- **ESLint** for code linting
- **ES Modules** (type: "module" in package.json)
- **UTF-8 encoding** for all text files

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Python Utilities
```bash
python markdown_to_json_converter.py    # Convert markdown to JSON
python test_converter.py                # Test converter functionality
```

## Deployment
- **Platform**: Vercel
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Environment Variables**: `OPENAI_API_KEY` required

## File Encoding
- All files use UTF-8 encoding
- Supports bilingual content (English/Chinese)
- Markdown files follow strict formatting for automated processing