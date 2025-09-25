# 🎮 Banterblogs

**AI-Powered Development Blog** documenting the epic journey of building **Banterpacks** - a real-time, AI-powered banter overlay system for live gaming streams.

## 🎯 What is Banterblogs?

Banterblogs is an **automated development blog** that transforms git commits into engaging, AI-powered storytelling. Each episode features conversations between four AI personalities (Claude, ChatGPT, Gemini, and Banterpacks) discussing the technical decisions, challenges, and victories in building Banterpacks.

### 🎭 The AI Personalities

- **Claude**: Analytical and precise, provides data-driven insights and technical analysis
- **ChatGPT**: Enthusiastic and optimistic, brings energy and creativity to discussions  
- **Gemini**: Philosophical and deep, finds meaning in development decisions
- **Banterpacks**: The developer's voice with humor and insight, keeps conversations grounded

## 🚀 What is Banterpacks?

Banterpacks is a **real-time, AI-powered banter overlay system** for live streaming and gaming content creation. It transforms big gaming moments (kills, deaths, clutch plays) into shareable, personality-driven highlights by displaying contextual, witty responses that react in real-time to gameplay events.

### Key Features:
- **Sub-200ms latency** from trigger to render
- **Modular architecture** with overlay, registry, studio, and authoring components
- **AI integration** with multiple LLM providers
- **Cache-first design** with offline capabilities
- **Security-first** with comprehensive validation
- **Production-ready** with 84.5% test coverage

## 📚 How Banterblogs Works

### Episode Generation
1. **Git commits** are analyzed for development milestones
2. **Markdown episodes** are automatically generated in `/posts/`
3. **AI personalities** discuss the technical decisions and impact
4. **Metrics** are extracted (files changed, lines added, complexity)
5. **Content** is processed and displayed on the blog

### Episode Structure
Each episode follows this format:
```markdown
# Episode X: "Title"

## Subtitle
*Brief description*

### 📅 Date and Commit Info
### 🔗 Commit: `hash`
### 📊 Episode X of the Banterpacks Development Saga

---

### Why It Matters
*Explanation of the commit's significance*

---

### The Roundtable: AI Conversation
*Multi-personality discussion of the changes*

---

## 🔬 Technical Analysis
*Metrics, code quality, and architecture impact*

---

## 🏗️ Architecture & Strategic Impact
*Broader implications and strategic decisions*

---

## 🎭 Banterpacks' Deep Dive
*Developer perspective and insights*

---

## 🔮 Next Time on Banterpacks Development Story
*Teaser for next episode*
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Radix UI** for components

### Features
- **Dark mode** design
- **Advanced search** with Fuse.js
- **Responsive design**
- **SEO optimized**
- **Performance optimized**

### Content Processing
- **Gray Matter** for frontmatter parsing
- **Unified** for markdown processing
- **Rehype Highlight** for code syntax highlighting
- **Remark GFM** for GitHub Flavored Markdown

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sahil170595/Banterblogs.git
   cd Banterblogs/banterblogs-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Adding New Episodes

### Method 1: Manual Creation
1. Create a new markdown file in `/posts/` following the naming pattern `episode-XXX.md`
2. Follow the episode template structure above
3. Include all required sections and metadata
4. Commit and push to trigger updates

### Method 2: Automated Generation
Episodes can be automatically generated from git commits using the authoring tools in the Banterpacks project.

## 🎯 Project Structure

```
banterblogs-nextjs/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── episodes/        # Episode listing and individual pages
│   │   ├── about/           # About page
│   │   └── api/             # API routes
│   ├── components/          # React components
│   │   ├── EpisodeCard.tsx  # Episode display component
│   │   ├── Hero.tsx         # Landing page hero
│   │   ├── SearchDialog.tsx # Search functionality
│   │   └── ...
│   ├── lib/                 # Utility functions
│   │   ├── episodes.ts      # Episode processing logic
│   │   └── search.ts        # Search implementation
│   └── hooks/               # Custom React hooks
├── posts/                   # Episode markdown files
├── public/                  # Static assets
└── ...
```

## 🔍 Navigation Guide

### Main Pages
- **Home** (`/`): Landing page with featured episodes and stats
- **Episodes** (`/episodes`): Complete episode listing with search and filters
- **About** (`/about`): Project overview, AI personalities, and features

### Episode Pages
- **Individual Episodes** (`/episodes/episode-XXX`): Full episode content with navigation

### Features
- **Search**: Global search across all episodes
- **Filtering**: Filter by tags, complexity, date, etc.
- **Responsive**: Works on all device sizes
- **Dark Mode**: Optimized for dark theme

## 📊 Current Stats

- **34+ Episodes** documenting the development journey
- **39,323 lines of code** across the entire project
- **Real-time updates** when new episodes are added
- **Advanced search** with fuzzy matching
- **Comprehensive metrics** tracking development progress

## 🤝 Contributing

### Adding Episodes
1. Follow the episode template structure
2. Ensure all required metadata is included
3. Test locally before committing
4. Use descriptive commit messages

### Development
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🔗 Related Projects

- **Banterpacks**: The main project being documented (private repository)
- **[Banterblogs Repository](https://github.com/Sahil170595/Banterblogs)**: This blog's source code

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **AI Personalities**: Claude, ChatGPT, Gemini for their unique perspectives
- **Next.js Team**: For the amazing framework
- **Tailwind CSS**: For the utility-first CSS framework
- **Framer Motion**: For smooth animations

---

*Built with ❤️ by [Sahil Kadadekar](https://github.com/Sahil170595)*

*Follow the epic development journey of Banterpacks through AI-powered storytelling*