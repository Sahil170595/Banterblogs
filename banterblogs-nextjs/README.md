# Banterblogs Next.js

A modern, privacy-first blogging platform built with Next.js 15, React 18, and TypeScript. This project showcases autonomous AI development through a comprehensive devlog system.

## 🚀 Features

- **Static Site Generation** - Optimized for performance with Next.js 15
- **Real-time Updates** - Server-Sent Events for live content updates
- **Secure Authentication** - Bearer token authentication for webhooks
- **Error Boundaries** - Comprehensive error handling throughout the app
- **Markdown Processing** - Safe markdown to HTML conversion with syntax highlighting
- **Responsive Design** - Modern UI with Tailwind CSS and dark theme
- **SEO Optimized** - Complete metadata and sitemap support

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.4
- **React**: 18.3.1
- **TypeScript**: Latest
- **Styling**: Tailwind CSS v4
- **Markdown**: Unified.js pipeline with sanitization
- **Authentication**: Bearer tokens for webhooks
- **File Watching**: Optimized fs.watch implementation

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd banterblogs-nextjs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Configure required environment variables:
```bash
# Required for webhook authentication
WEBHOOK_SECRET_TOKEN=your_secure_token_here
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Required - Generate a secure token for webhook authentication
WEBHOOK_SECRET_TOKEN=your_secure_webhook_token_here

# Optional - GitHub Integration
GITHUB_TOKEN=your_github_token_here

# Optional - Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id_here

# Development
NODE_ENV=development
```

### Webhook Authentication

The webhook endpoint (`/api/webhook`) requires Bearer token authentication:

```bash
curl -X POST https://your-domain.com/api/webhook \
  -H "Authorization: Bearer your_webhook_token" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "content_update"}'
```

## 📝 Content Management

### Adding Episodes

Episodes are stored as markdown files in the `posts/` directory:

```
posts/
├── episode-001.md
├── episode-002.md
└── ...
```

### Episode Format

Each episode markdown file should follow this format:

```markdown
# Episode Title

## Subtitle

### 📅 Date: YYYY-MM-DD at HH:mm
### 🔗 Commit: commit_hash

*Bullet points for episode details*

- **Files Changed**: 5
- **Lines Added**: 250
- **Complexity Score**: 45

### Why It Matters

Episode content goes here...

---

More episode content...
```

## 🏗️ Build & Deployment

### Production Build

```bash
npm run build
npm start
```

### Static Export

```bash
npm run build
```

The build output will be in the `.next/` directory.

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

```bash
npm run build
# Upload .next/ folder to your server
```

## 🔒 Security Features

- **Input Sanitization** - All markdown content is sanitized before rendering
- **Rate Limiting** - Built-in rate limiting for file watching
- **Authentication** - Secure webhook authentication with configurable tokens
- **CSP Headers** - Content Security Policy headers for enhanced security
- **Error Handling** - Comprehensive error boundaries prevent crashes

## 🧪 Development

### Code Quality

The project uses ESLint for code quality:

```bash
npm run lint
```

### Testing

Run the development server and test features:

```bash
npm run dev
```

## 📁 Project Structure

```
banterblogs-nextjs/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── episodes/       # Episode pages
│   │   ├── tags/          # Tag pages
│   │   └── page.tsx        # Homepage
│   ├── components/         # React components
│   ├── lib/               # Utilities and data processing
│   └── hooks/             # Custom React hooks
├── posts/                 # Markdown episode files
├── public/               # Static assets
└── next.config.ts        # Next.js configuration
```

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**: Ensure all dependencies are installed and TypeScript errors are resolved
2. **Webhook Authentication**: Verify `WEBHOOK_SECRET_TOKEN` is set and matches your configuration
3. **File Watching**: Check file permissions and ensure the `posts/` directory exists

### Performance Optimization

- Episodes are cached using React's `cache()` function
- File watching is optimized with connection pooling
- Static generation is enabled for all pages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- **Live Demo**: [banterblogs.vercel.app](https://banterblogs.vercel.app)
- **GitHub Repository**: [Link to repository]
- **Documentation**: [Link to docs]

---

Built with ❤️ for the autonomous AI revolution.