# Project Structure & Organization

## Root Directory Layout
```
/
├── api/                    # Vercel serverless functions
│   └── chat.js            # OpenAI API proxy endpoint
├── src/                   # React application source
├── public/                # Static assets
├── .kiro/                 # Kiro AI assistant configuration
├── .env.local            # Local environment variables
└── *.config.js           # Build tool configurations
```

## Source Code Organization (`/src`)

### Core Application
- `main.jsx` - React application entry point
- `App.jsx` - Main app component with routing setup
- `App.css` - Global application styles

### Component Architecture
```
src/components/
├── Layout.jsx           # Page layout wrapper
├── Navbar.jsx          # Navigation header
├── Footer.jsx          # Site footer
├── ChatWidget.jsx      # AI chat interface
├── TopicCard.jsx       # Subject/topic display cards
├── QuestionBox.jsx     # Interactive question components
├── CoreFeatures.jsx    # Feature showcase
└── AnimatedKeywords.jsx # UI animations
```

### Page Components
```
src/pages/
├── Landing.jsx         # Homepage/landing page
├── Topics.jsx          # Subject overview
├── AskAI.jsx          # AI chat interface page
├── PaperPage.jsx      # Individual paper content
├── TopicDetail.jsx    # Detailed topic view
├── FurtherMathTopics.jsx  # Further Math specific
├── PhysicsASLevel.jsx     # Physics AS content
├── PhysicsA2Level.jsx     # Physics A2 content
└── NotFound.jsx       # 404 error page
```

### Data & Content
```
src/data/
├── topics.json        # General topic structure
├── 9709paper*.json    # Mathematics papers (1,3,4,5)
├── 9231*.json         # Further Mathematics papers
├── 9702AS+A2.json     # Physics content
└── *.md               # Markdown source files
```

### Utilities & Styles
```
src/utils/
└── openai.js          # OpenAI API helper functions

src/styles/
└── index.css          # Global CSS imports
```

## Routing Structure
- `/` - Landing page with hero section
- `/topics` - Subject and paper overview
- `/ask-ai` - Direct AI chat interface
- `/paper/:subject/:paper` - Specific paper content
- `/topic/:subject/:paper/:topicId` - Individual topic details
- `/further-math-topics` - Further Mathematics overview
- `/physics/as-level` - Physics AS Level content
- `/physics/a2-level` - Physics A2 Level content

## Content Management
- **JSON Data Files**: Structured educational content
- **Markdown Processing**: Python converter for content creation
- **Hierarchical Organization**: Subject → Paper → Topic structure
- **CIE Paper Codes**: 9709 (Math), 9231 (Further Math), 9702 (Physics)

## Naming Conventions
- **Components**: PascalCase (e.g., `ChatWidget.jsx`)
- **Pages**: PascalCase (e.g., `TopicDetail.jsx`)
- **Utilities**: camelCase (e.g., `openai.js`)
- **Data Files**: Descriptive with paper codes (e.g., `9709paper1.json`)
- **CSS Classes**: Tailwind utility classes preferred