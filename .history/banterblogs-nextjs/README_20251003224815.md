# Banterblogs Next.js

A modern, privacy-first blogging platform showcasing autonomous AI development through comprehensive devlogs. Built with cutting-edge web technologies and designed for real-time content publishing.

## 🚀 Key Features

### 🎯 **Core Functionality**
- **Static Site Generation** - Optimized performance with Next.js 15
- **Real-time Episodes** - Live content updates via Server-Sent Events
- **Episode Management** - Dynamic episode generation and metadata parsing
- **Advanced Search** - Intelligent search with fuzzy matching (Fuse.js)
- **Tag System** - Dynamic tag-based content organization

### 🎨 **User Experience**
- **Responsive Design** - Modern UI with Tailwind CSS and dark theme
- **Enhanced Error Handling** - Auto-resetting error boundaries with development debugging
- **Loading States** - Smooth transitions and skeleton loading
- **Accessibility** - WCAG compliant with keyboard navigation
- **SEO Optimized** - Complete metadata, sitemap, and RSS support

### 🔒 **Security & Performance**
- **Bearer Token Authentication** - Secure webhook endpoints
- **Input Sanitization** - Safe markdown processing with Rehype
- **CSP Headers** - Content Security Policy implementation
- **Caching Strategy** - React cache() and optimized revalidation

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Next.js | 15.5.3 |
| **Runtime** | React | 19.1.0 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.x |
| **Markdown** | Unified.js pipeline | Latest |
| **Search** | Fuse.js | 7.1.0 |
| **Animations** | Framer Motion | 12.23.16 |
| **Icons** | Lucide React | Latest |
| **Database** | File System | Node.js FS |

## 📦 Quick Start

### Prerequisites
- Node.js 18.x or 20.x (avoid Node.js 22.x due to Next.js compatibility)
- npm or yarn package manager

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd banterblogs-nextjs
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment setup:**
```bash
cp env.example .env.local
```

#### Required Environment Variables

Create `.env.local` with these variables:

```bash
# 🚨 Required: Webhook authentication
WEBHOOK_SECRET_TOKEN=your_secure_token_here

# 🔧 Optional: GitHub integration
GITHUB_TOKEN=your_github_token_here

# 📊 Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id_here

# 🌍 Environment
NODE_ENV=development
```

4. **Start development server:**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Project Structure

```
banterblogs-nextjs/
├── 📁 src/
│   ├── 🗂️ app/                    # Next.js App Router
│   │   ├── 📄 page.tsx            # Homepage with stats
│   │   ├── 📁 episodes/          # Episode pages & navigation
│   │   ├── 📁 tags/              # Dynamic tag pages
│   │   ├── 📁 api/               # API routes
│   │   │   ├── webhook/          # Content revalidation
│   │   │   └── episodes/         # Episode data & SSE
│   │   ├── 📁 roadmap/           # Development roadmap
│   │   └── 📁 technology/        # Tech stack showcase
│   ├── 🧩 components/            # Reusable React components
│   │   ├── 🎯 ErrorBoundary.tsx  # Enhanced error handling
│   │   ├── 🔍 SearchDialog.tsx   # Search functionality
│   │   ├── 📱 EpisodeCard.tsx    # Episode display cards
│   │   ├── 📊 Hero.tsx           # Landing page hero
│   │   └── 🧭 Navigation components
│   ├── 🛠️ lib/                  # Utilities & data processing
│   │   ├── episodes.ts          # Episode parsing & utilities
│   │   ├── search.ts            # Fuse.js search configuration
│   │   ├── formatUtils.ts       # Number & time formatting
│   │   └── constants.ts         # Application constants
│   └── 🎣 hooks/                # Custom React hooks
│       └── useEpisodes.ts       # Episode data management
├── 📝 posts/                   # Markdown episode files
├── 🎨 public/                  # Static assets
├── 📋 eslint.config.mjs        # ESLint flat config
├── ⚙️ next.config.ts          # Next.js configuration
└── 📚 README.md              # This file
```

## 🎨 Key Components

### ErrorBoundary Component
Enhanced error boundary with auto-reset functionality:

```tsx
<ErrorBoundary
  resetKeys={[router.pathname]}  // Auto-reset on route change
  resetOnPropsChange={true}      // Reset on prop changes
  fallback={CustomErrorComponent} // Custom error UI
>
  <YourComponent />
</ErrorBoundary>
```

### Episode Processing
Multi-format metadata parser supporting various episode formats:

```tsx
const episodes = await getAllEpisodes();
// Automatically parses metadata, calculates complexity, generates previews
```

### Search System
Intelligent search with fuzzy matching:

```tsx
import { EpisodeSearch } from '@/lib/search';

const searchInstance = new EpisodeSearch(episodes);
const results = searchInstance.search('query', options);
```

## 🔧 Development

### Code Quality
ESLint configuration with TypeScript support:

```bash
npm run lint
```

**Features:**
- Custom rules for unused variables with `_` prefix
- Next.js core web vitals rules
- TypeScript-specific linting

### Building

```bash
# Development build
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository** to Vercel
2. **Set Node.js version** to `18.x` (important!)
3. **Configure Environment Variables**
4. **Deploy** automatically on push

⚠️ **Important**: Set Node.js version to 18.x in Vercel project settings to avoid `TypeError: generate is not a function` errors.

### Manual Deployment

```bash
npm run build
# Upload .next/ folder to your server
npm start
```

## 📝 Content Management

### Episode Format

Episodes are markdown files in `posts/` directory:

```markdown
# Episode Title
## Brief Subtitle

### 📅 2025-10-03
### 🔗 commit_hash_here

**Files Changed**: 12
**Lines Added**: 340
**Complexity Score**: 67

### Why It Matters

Episode content explaining the development changes...

---

## Episode Details

Detailed description of what was changed...
```

### Automated Features

- **Metadata Parsing** - Extracts dates, commits, stats automatically
- **Preview Generation** - Creates content previews from "Why It Matters" section
- **Tag Detection** - Automatically assigns tags based on content
- **Reading Time** - Calculates estimated reading time
- **Complexity Scoring** - Analyzes code changes for complexity metrics

## 🔒 Security Features

- **Authentication**: Bearer token system for webhooks
- **Sanitization**: All markdown undergoes XSS sanitization
- **CSP**: Content Security Policy headers
- **Rate Limiting**: Built-in request throttling
- **Error Boundaries**: Graceful error handling throughout

## 🧪 Roadmap & Development

### Current Focus (Q4 2025)
- ✅ Enhanced error handling and recovery
- ✅ Advanced search and filtering
- ✅ Responsive design improvements
- ✅ Performance optimizations

### Upcoming (Q1 2026)
- 🔄 CI/CD orchestration improvements
- 🔄 Multi-repository dashboard
- 🔄 AI-driven code insights
- 🔄 Smart refactoring suggestions

Track development progress at `/roadmap`.

## 🐛 Troubleshooting

### Common Issues

**Build Error: `TypeError: generate is not a function`**
- **Solution**: Use Node.js 18.x (not 22.x)
- **Vercel Fix**: Set Node.js version to 18.x in project settings

**ESLint Errors for unused variables**
- **Solution**: Prefix unused variables with `_` (e.g., `_error`)
- **Configuration**: Already configured in `eslint.config.mjs`

**Webhook Authentication Failures**
- Verify `WEBHOOK_SECRET_TOKEN` is correct
- Check Authorization header format: `Bearer your_token`

### Performance Tips

- Episodes are cached using React's `cache()` function
- File watching uses optimized connection pooling
- Static generation enabled for all pages
- Image optimization configured in Next.js

## 📄 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint configuration (configured for `_` prefixed unused variables)
- Test error boundaries in development
- Add episode metadata in consistent format

## 📊 Monitoring

### Analytics Integration
Configure `NEXT_PUBLIC_ANALYTICS_ID` for:
- Page views and user behavior
- Performance metrics
- Error tracking
- Search analytics

### Error Monitoring
Development mode includes enhanced error details:
- Stack traces
- Component tree information
- Error boundaries with auto-reset functionality

## 🔗 Resources

- **Live Application**: [banterblogs.vercel.app](https://banterblogs.vercel.app)
- **Technology Stack**: `/technology`
- **Development Roadmap**: `/roadmap`
- **Episode Archive**: `/episodes`

---

## 📋 Version History

- **v2.1.0** - Enhanced error boundaries with auto-reset
- **v2.0.0** - Next.js 15 upgrade with TypeScript improvements
- **v1.0.0** - Initial release with core episode functionality

Built with ❤️ for the autonomous AI revolution - showcasing every commit, every optimization, every breakthrough.