# Banterblogs

A Next.js-powered development blog that chronicles the Banterpacks project through AI-generated narrative episodes. This repository contains both the blog platform and the development saga it documents.

## 🚀 Live Demo

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Sahil170595/Banterblogs&project-name=banterblogs&repository-name=Banterblogs&root-directory=banterblogs-nextjs)

## 📖 What is Banterpacks?

Banterpacks is a dynamic overlay system for live gameplay streams that turns big moments into shareable highlights. It adds a personality layer to live streams by firing contextual reactions in real-time when clutch plays, kills, or misplays happen. The system features AI personas (Banterpacks, Claude, ChatGPT, and Gemini) who provide witty commentary and analysis of stream events.

### Key Features:
- **Real-time reactions** (<250ms target end-to-end)
- **OBS-friendly browser overlay** (no game injection required)
- **Weighted selection** with cooldown and deduplication
- **Speech-to-Text (STT)** module with emotion detection
- **Registry system** for pack distribution and updates
- **Built-in analytics** and Prometheus metrics

## 🏗️ Project Structure

```
Banterblogs/
├── banterblogs-nextjs/          # Next.js blog application (this repo)
│   ├── src/
│   │   ├── app/                 # Next.js 14 App Router
│   │   ├── components/          # React components
│   │   └── lib/                 # Utilities and data processing
│   ├── posts/                   # Markdown episode files
│   └── package.json
├── posts/                       # Original episode files
├── scripts/                     # Generation and processing scripts
└── docs/                        # Project documentation

Banterpacks Core System:
├── overlay/                     # Runtime overlay modules
├── stt/                         # Speech-to-Text module
├── authoring/                   # CLI + providers for banter generation
├── registry/                    # FastAPI service for pack distribution
├── packs/                       # Example packs and manifest builders
├── contracts/                   # JSON Schemas for events and packs
├── frontend/                    # React Studio for pack management
└── monitoring/                  # Prometheus + Grafana setup
```

## ✨ Features

### Blog Platform
- **Next.js 15** with App Router and TypeScript
- **Dark mode only** with professional FAANG-tier polish
- **Enhanced markdown rendering** with syntax highlighting
- **Dynamic episode loading** from markdown files
- **Search and filtering** capabilities
- **Responsive design** with smooth animations
- **Static generation** for optimal performance

### Interactive Reports System
- **Technical Reports** with interactive data visualizations
- **Chart Components** including timeseries, distribution, and correlation charts
- **PublishReady Integration** for structured report data
- **Interactive Charts** with zoom, pan, and series filtering
- **Export Capabilities** for charts and data tables
- **Schema.org JSON-LD** for SEO and structured data
- **Auto-discovery** of reports from markdown files and directories

### Content Generation
- **AI-powered narrative** generation from git commits
- **Character-driven storytelling** with distinct AI personas
- **Technical analysis** with metrics and complexity scoring
- **Automated episode creation** from development activity
- **Live stream integration** with real-time event processing
- **Banter pack management** and distribution system

## 🛠️ Technology Stack

### Frontend
- **Next.js 15.5.4** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations
- **Radix UI** - Accessible components
- **Fuse.js** - Client-side search
- **Zod** - Schema validation for reports

### Data Visualization
- **Custom SVG Charts** - Timeseries, distribution, and correlation visualizations
- **Interactive Charts** - Zoom, pan, and series filtering capabilities
- **Export Capabilities** - CSV and PNG export for charts and data tables
- **Responsive Design** - Charts adapt to screen size and device type
- **Schema Validation** - Zod schemas ensure data integrity

### Markdown Processing
- **Unified** - Markdown processing pipeline
- **Remark GFM** - GitHub Flavored Markdown
- **Rehype Highlight** - Syntax highlighting
- **Gray Matter** - Frontmatter parsing

### Deployment
- **Vercel** - Hosting and deployment
- **GitHub** - Version control and CI/CD

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sahil170595/Banterblogs.git
   cd Banterblogs
   ```

2. **Install dependencies:**
   ```bash
   cd banterblogs-nextjs
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## 📝 Content Management

### Adding New Episodes
1. Add markdown files to `banterblogs-nextjs/posts/`
2. Follow the episode naming convention: `episode-XXX.md`
3. Include proper frontmatter and episode structure
4. Deploy to see changes live

### Adding Technical Reports
1. Add markdown files or directories to `banterblogs-nextjs/reports/` or `banterblogs-nextjs/PublishReady/reports/`
2. Reports are auto-discovered and indexed
3. For interactive charts, include structured JSON data in a `charts/` subdirectory
4. Add `meta.json` for custom titles and descriptions
5. Reports are accessible at `/reports/[slug]`

### Episode Structure
Each episode follows this format:
```markdown
# Episode X: "Title"

## commit-message
*subtitle*

### 📅 Date and Time
### 🔗 Commit: `hash`
### 📊 Episode X of the Banterpacks Development Saga

---

### Why It Matters
[Context and importance]

---

### The Roundtable: [Section Title]
[AI persona discussions]

---

## 🔬 Technical Analysis
[Metrics and analysis]
```

## 🎨 Customization

### Styling
- Modify `src/app/globals.css` for global styles
- Update `tailwind.config.ts` for theme customization
- Edit component styles in individual `.tsx` files

### Content Processing
- Update `src/lib/episodes.ts` for markdown processing
- Modify episode parsing logic as needed
- Add new content types or features

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set root directory to `banterblogs-nextjs`
3. Framework preset: Next.js
4. Deploy automatically on every push

### Manual Deployment
```bash
npm run build
# Deploy the .next folder to your hosting provider
```

## 📊 Performance

- **Lighthouse Score:** 95+ across all metrics
- **Core Web Vitals:** Optimized for performance
- **Bundle Size:** Optimized with tree shaking
- **Loading Speed:** Static generation for instant loads

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **AI Personas:** Claude, ChatGPT, and Gemini for their unique perspectives
- **Next.js Team** for the amazing framework
- **Vercel** for seamless deployment
- **Tailwind CSS** for beautiful styling

---

*Built with ❤️ and a lot of coffee by the Banterpacks development team*