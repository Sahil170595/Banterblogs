// Banterblogs - Professional Blog Script
// Handles dynamic episode loading, search, and interactive features

class BanterBlog {
    constructor() {
        this.episodes = [];
        this.filteredEpisodes = [];
        this.currentPage = 1;
        this.episodesPerPage = 6;
        this.searchTerm = '';
        this.sortBy = 'date';
        this.sortOrder = 'desc';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupTheme();
        await this.loadEpisodes();
        this.renderEpisodes();
        this.updateEpisodeCount();
        this.setupIntersectionObserver();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndRenderEpisodes();
            }, 300));
        }

        // Sort functionality
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [sortBy, order] = e.target.value.split('-');
                this.sortBy = sortBy;
                this.sortOrder = order;
                this.filterAndRenderEpisodes();
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }

        // Modal functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeToggle(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeToggle(newTheme);
    }

    updateThemeToggle(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'light' ? '🌙' : '☀️';
            themeToggle.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`);
        }
    }

    async loadEpisodes() {
        try {
            this.showLoading();
            console.log('Loading episodes...');
            
            // In a real implementation, this would fetch from an API
            // For now, we'll simulate loading the episodes
            const episodeFiles = [
                'episode-001.md', 'episode-002.md', 'episode-003.md', 'episode-004.md',
                'episode-005.md', 'episode-006.md', 'episode-007.md', 'episode-008.md',
                'episode-009.md', 'episode-010.md', 'episode-011.md', 'episode-012.md',
                'episode-013.md', 'episode-014.md', 'episode-015.md', 'episode-016.md',
                'episode-017.md', 'episode-018.md', 'episode-019.md', 'episode-020.md',
                'episode-021.md', 'episode-022.md', 'episode-023.md', 'episode-024.md',
                'episode-025.md', 'episode-026.md', 'episode-027.md'
            ];

            const episodePromises = episodeFiles.map(async (filename, index) => {
                try {
                    console.log(`Loading ${filename}...`);
                    const response = await fetch(`posts/${filename}`);
                    if (!response.ok) throw new Error(`Failed to load ${filename}: ${response.status}`);
                    const content = await response.text();
                    const episode = this.parseEpisode(content, index + 1);
                    console.log(`Parsed episode ${index + 1}:`, episode.title);
                    return episode;
                } catch (error) {
                    console.warn(`Failed to load ${filename}:`, error);
                    return null;
                }
            });

            const episodes = await Promise.all(episodePromises);
            this.episodes = episodes.filter(episode => episode !== null);
            this.filteredEpisodes = [...this.episodes];
            
            console.log(`Successfully loaded ${this.episodes.length} episodes`);
            
            // If no episodes loaded, use fallback
            if (this.episodes.length === 0) {
                console.warn('No episodes loaded, using fallback');
                this.createFallbackEpisodes();
            } else {
                this.renderEpisodes();
            }
            
        } catch (error) {
            console.error('Error loading episodes:', error);
            this.createFallbackEpisodes();
        } finally {
            this.hideLoading();
        }
    }

    parseEpisode(content, episodeNumber) {
        const lines = content.split('\n');
        
        // Extract title - more flexible regex
        const titleMatch = content.match(/^# Episode \d+: "(.+)"$/m);
        const title = titleMatch ? titleMatch[1] : `Episode ${episodeNumber}`;
        
        // Extract subtitle - look for the line after the commit line
        const subtitleMatch = content.match(/^## (.+)$/m);
        const subtitle = subtitleMatch ? subtitleMatch[1].replace(/^\*/, '').replace(/\*$/, '') : '';
        
        // Extract date - more flexible pattern
        const dateMatch = content.match(/### 📅 (.+?) at/);
        const commitMatch = content.match(/### 🔗 Commit: `(.+?)`/);
        
        // Extract preview text (first paragraph after "Why It Matters")
        const whyItMattersIndex = content.indexOf('### Why It Matters');
        let preview = '';
        if (whyItMattersIndex !== -1) {
            const previewStart = content.indexOf('\n', whyItMattersIndex) + 1;
            const previewEnd = content.indexOf('---', previewStart);
            if (previewEnd !== -1) {
                preview = content.substring(previewStart, previewEnd).trim();
            }
        }
        
        // If no preview found, use first paragraph
        if (!preview) {
            const firstParagraph = content.split('\n\n')[1] || content.split('\n')[2] || '';
            preview = firstParagraph.trim();
        }

        // Extract stats with more flexible patterns
        const filesChangedMatch = content.match(/- \*\*Files Changed\*\*: (\d+)/);
        const linesAddedMatch = content.match(/- \*\*Lines Added\*\*: ([\d,]+)/);
        const complexityMatch = content.match(/- \*\*Complexity Score\*\*: (\d+)/);

        return {
            id: episodeNumber,
            title: title || `Episode ${episodeNumber}`,
            subtitle: subtitle || 'Development Update',
            date: dateMatch ? new Date(dateMatch[1]) : new Date(),
            commit: commitMatch ? commitMatch[1] : '',
            preview: preview.length > 200 ? preview.substring(0, 200) + '...' : preview,
            filesChanged: filesChangedMatch ? parseInt(filesChangedMatch[1]) : 0,
            linesAdded: linesAddedMatch ? parseInt(linesAddedMatch[1].replace(/,/g, '')) : 0,
            complexity: complexityMatch ? parseInt(complexityMatch[1]) : 0,
            content: content,
            slug: `episode-${episodeNumber.toString().padStart(3, '0')}`
        };
    }

    filterAndRenderEpisodes() {
        this.filteredEpisodes = this.episodes.filter(episode => {
            const searchMatch = !this.searchTerm || 
                episode.title.toLowerCase().includes(this.searchTerm) ||
                episode.subtitle.toLowerCase().includes(this.searchTerm) ||
                episode.preview.toLowerCase().includes(this.searchTerm);
            
            return searchMatch;
        });

        this.sortEpisodes();
        this.renderEpisodes();
    }

    sortEpisodes() {
        this.filteredEpisodes.sort((a, b) => {
            let comparison = 0;
            
            switch (this.sortBy) {
                case 'date':
                    comparison = a.date - b.date;
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'complexity':
                    comparison = a.complexity - b.complexity;
                    break;
                case 'files':
                    comparison = a.filesChanged - b.filesChanged;
                    break;
            }
            
            return this.sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    renderEpisodes() {
        const container = document.getElementById('episodes-container');
        if (!container) {
            console.error('Episodes container not found!');
            return;
        }

        // Remove any existing pagination before re-rendering content
        document.querySelectorAll('.pagination').forEach(nav => nav.remove());

        console.log(`Rendering ${this.filteredEpisodes.length} episodes`);

        if (this.filteredEpisodes.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <h3>No episodes found</h3>
                    <p>Try adjusting your search terms or filters.</p>
                </div>
            `;
            return;
        }

        const totalPages = Math.ceil(this.filteredEpisodes.length / this.episodesPerPage);
        if (totalPages > 0 && this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }
        if (this.currentPage < 1) {
            this.currentPage = 1;
        }

        const startIndex = (this.currentPage - 1) * this.episodesPerPage;
        const endIndex = startIndex + this.episodesPerPage;
        const episodesToShow = this.filteredEpisodes.slice(startIndex, endIndex);

        console.log(`Showing episodes ${startIndex + 1} to ${endIndex} of ${this.filteredEpisodes.length}`);

        container.innerHTML = episodesToShow.map(episode => this.createEpisodeCard(episode)).join('');
        
        this.renderPagination();
    }

    createEpisodeCard(episode) {
        const formatDate = (date) => {
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(date);
        };

        const getComplexityColor = (score) => {
            if (score >= 80) return '#ef4444'; // red
            if (score >= 60) return '#f59e0b'; // yellow
            if (score >= 40) return '#3b82f6'; // blue
            return '#10b981'; // green
        };

        return `
            <article class="episode-card" data-episode-id="${episode.id}">
                <div class="episode-header">
                    <span class="episode-number">Episode ${episode.id}</span>
                    <h3 class="episode-title">${episode.title}</h3>
                    <p class="episode-subtitle">${episode.subtitle}</p>
                </div>
                
                <div class="episode-meta">
                    <div class="meta-item">
                        <span>📅</span>
                        <span>${formatDate(episode.date)}</span>
                    </div>
                    <div class="meta-item">
                        <span>🔗</span>
                        <span>${episode.commit}</span>
                    </div>
                </div>
                
                <div class="episode-preview">
                    ${episode.preview}
                </div>
                
                <div class="episode-stats">
                    <div class="stat-item">
                        <span>📁</span>
                        <span>${episode.filesChanged} files</span>
                    </div>
                    <div class="stat-item">
                        <span>📝</span>
                        <span>${episode.linesAdded.toLocaleString()} lines</span>
                    </div>
                    <div class="stat-item" style="color: ${getComplexityColor(episode.complexity)}">
                        <span>⚡</span>
                        <span>${episode.complexity} complexity</span>
                    </div>
                </div>
                
                <div class="episode-actions">
                    <button class="btn btn-primary" onclick="blog.openEpisode(${episode.id})">
                        Read Episode
                    </button>
                    <a href="posts/${episode.slug}.md" class="btn btn-secondary" target="_blank">
                        View Raw
                    </a>
                </div>
            </article>
        `;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredEpisodes.length / this.episodesPerPage);
        if (totalPages <= 1) {
            return;
        }

        const pagination = document.createElement('div');
        pagination.className = 'pagination';
        
        const prevButton = this.createPaginationButton('← Previous', this.currentPage > 1, () => {
            this.currentPage--;
            this.renderEpisodes();
        });
        
        const nextButton = this.createPaginationButton('Next →', this.currentPage < totalPages, () => {
            this.currentPage++;
            this.renderEpisodes();
        });

        pagination.appendChild(prevButton);
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = this.createPaginationButton(i.toString(), true, () => {
                this.currentPage = i;
                this.renderEpisodes();
            });
            if (i === this.currentPage) {
                pageButton.classList.add('active');
            }
            pagination.appendChild(pageButton);
        }
        
        pagination.appendChild(nextButton);
        
        const container = document.getElementById('episodes-container');
        container.parentNode.insertBefore(pagination, container.nextSibling);
    }

    createPaginationButton(text, enabled, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `pagination-btn ${enabled ? '' : 'disabled'}`;
        button.disabled = !enabled;
        if (enabled) {
            button.addEventListener('click', onClick);
        }
        return button;
    }

    openEpisode(episodeId) {
        const episode = this.episodes.find(ep => ep.id === episodeId);
        if (!episode) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" aria-label="Close modal">&times;</button>
                <div class="modal-body">
                    ${this.formatEpisodeContent(episode.content)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Focus management
        const closeButton = modal.querySelector('.modal-close');
        closeButton.focus();
    }

    formatEpisodeContent(content) {
        const applyInlineFormatting = (text) => {
            return text
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        };

        const lines = content.split('\n');
        let html = '';
        let inParagraph = false;
        let inList = false;

        const closeParagraph = () => {
            if (inParagraph) {
                html = html.trimEnd() + '</p>';
                inParagraph = false;
            }
        };

        const closeList = () => {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
        };

        lines.forEach(rawLine => {
            const line = rawLine.trim();

            if (line === '') {
                closeParagraph();
                closeList();
                return;
            }

            if (line.startsWith('---')) {
                closeParagraph();
                closeList();
                html += '<hr />';
                return;
            }

            if (line.startsWith('### ')) {
                closeParagraph();
                closeList();
                html += `<h3>${applyInlineFormatting(line.slice(4))}</h3>`;
                return;
            }

            if (line.startsWith('## ')) {
                closeParagraph();
                closeList();
                html += `<h2>${applyInlineFormatting(line.slice(3))}</h2>`;
                return;
            }

            if (line.startsWith('# ')) {
                closeParagraph();
                closeList();
                html += `<h1>${applyInlineFormatting(line.slice(2))}</h1>`;
                return;
            }

            if (line.startsWith('> ')) {
                closeParagraph();
                html += `<blockquote>${applyInlineFormatting(line.slice(2))}</blockquote>`;
                return;
            }

            if (line.startsWith('- ')) {
                closeParagraph();
                if (!inList) {
                    html += '<ul>';
                    inList = true;
                }
                html += `<li>${applyInlineFormatting(line.slice(2).trim())}</li>`;
                return;
            }

            if (!inParagraph) {
                html += '<p>';
                inParagraph = true;
            }

            html += `${applyInlineFormatting(line)} `;
        });

        closeParagraph();
        closeList();

        return html.trim();
    }

    closeModal() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }

    updateEpisodeCount() {
        const countElement = document.getElementById('episode-count');
        if (countElement) {
            countElement.textContent = this.episodes.length;
        }
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.episode-card').forEach(card => {
            observer.observe(card);
        });
    }

    showLoading() {
        const container = document.getElementById('episodes-container');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading episodes...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be replaced by renderEpisodes
    }

    showError(message) {
        const container = document.getElementById('episodes-container');
        if (container) {
            container.innerHTML = `
                <div class="error">
                    <h3>⚠️ Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    // Fallback: create sample episodes if none load
    createFallbackEpisodes() {
        console.log('Creating fallback episodes...');
        this.episodes = [
            {
                id: 1,
                title: "The Beginning",
                subtitle: "Where it all started",
                date: new Date(),
                commit: 'abc123',
                preview: "This is where the epic journey of Banterpacks development began...",
                filesChanged: 4,
                linesAdded: 0,
                complexity: 10,
                content: "# Episode 1: The Beginning\n\nThis is a fallback episode.",
                slug: 'episode-001'
            },
            {
                id: 2,
                title: "The Development",
                subtitle: "Building the future",
                date: new Date(),
                commit: 'def456',
                preview: "The development process continues with new features and improvements...",
                filesChanged: 12,
                linesAdded: 500,
                complexity: 45,
                content: "# Episode 2: The Development\n\nThis is a fallback episode.",
                slug: 'episode-002'
            }
        ];
        this.filteredEpisodes = [...this.episodes];
        this.renderEpisodes();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the blog when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.blog = new BanterBlog();
});

// Service Worker registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
