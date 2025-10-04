import Link from 'next/link'
import { Calendar, Code, Database, Zap, Shield, Globe } from 'lucide-react'

const roadmapMilestones = [
  {
    quarter: 'Q4 2025',
    status: 'current',
    phases: [
      {
        title: 'Enhanced Developer Experience',
        status: 'active',
        features: [
          {
            name: 'Advanced Code Intelligence',
            description: 'AI-powered code completion and suggestions with context-aware recommendations',
            icon: Code,
            priority: 'high'
          },
          {
            name: 'Performance Metrics',
            description: 'Real-time metrics tracking for compilation time, memory usage, and optimization opportunities',
            icon: Zap,
            priority: 'medium'
          },
          {
            name: 'Episodes Analytics',
            description: 'Improved analytics for code commits, complexity trends, and developer productivity insights',
            icon: Database,
            priority: 'medium'
          }
        ]
      },
      {
        title: 'Security & Reliability',
        status: 'planning',
        features: [
          {
            name: 'Zero-Trust Architecture',
            description: 'End-to-end encryption and secure workflows for private development environments',
            icon: Shield,
            priority: 'high'
          },
          {
            name: 'Automated Testing Expansion',
            description: 'Enhanced test coverage reporting and automated quality gates',
            icon: Shield,
            priority: 'medium'
          }
        ]
      }
    ]
  },
  {
    quarter: 'Q1 2026',
    status: 'upcoming',
    phases: [
      {
        title: 'Platform Integration',
        status: 'planned',
        features: [
          {
            name: 'CI/CD Orchestration',
            description: 'Unified deployment pipeline with automated staging and rollback capabilities',
            icon: Globe,
            priority: 'high'
          },
          {
            name: 'Multi-Repository Dashboard',
            description: 'Centralized view across Banterpacks, Chimera, and related projects',
            icon: Globe,
            priority: 'medium'
          }
        ]
      },
      {
        title: 'AI-Driven Development',
        status: 'planned',
        features: [
          {
            name: 'Smart Refactoring',
            description: 'Automated code structure optimization with AI-powered recommendations/m>',
            icon: Code,
            priority: 'high'
          },
          {
            name: 'Predictive Bug Detection',
            description: 'Machine learning models to identify potential issues before deployment',
            icon: Zap,
            priority: 'medium'
          }
        ]
      }
    ]
  }
]

export default function Roadmap() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-background via-background/90 to-background/40">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(167,139,250,0.2),transparent_55%)]" />
        
        <div className="container relative py-20 md:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Jarvis Development Roadmap</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Strategic development goals and milestones for the upcoming quarters. 
              Focused on automation, intelligence, and platform development integration.
            </p>
          </div>
        </div>
      </section>

      {/* Current Status */}
      <div className="container py-12">
        <div className="mb-12">
          <div className="rounded-xl border border-border/50 bg-card/50 p-6 lg:p-8 backdrop-blur-sm border-l-4 border-l-primary/60">
            <h2 className="text-xl font-semibold text-foreground mb-2">Current Development Focus</h2>
            <p className="text-muted-foreground">
              We're actively working on enhanced developer tooling and automation systems to streamline 
              the Banterblogs development experience while maintaining security and reliability standards.
            </p>
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-12">
          {roadmapMilestones.map((milestone, index) => (
            <div key={milestone.quarter} className="relative">
              {/* Timeline line */}
              {index < roadmapMilestones.length - 1 && (
                <div className="absolute left-8 top-16 bottom-[-48px] w-0.5 bg-border/30" />
              )}
              
              {/* Quarter Header */}
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                milestone.status === 'current' 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'bg-card/50 text-muted-foreground border border-border/50'
              }`}>
                <Calendar className="w-4 h-4 mr-2" />
                {milestone.quarter}
              </div>

              {/* Phases */}
              <div className="mt-8 ml-4 grid gap-8 md:grid-cols-2">
                {milestone.phases.map((phase) => (
                  <div key={phase.title} className="relative">
                    <div className="rounded-xl shadow-lg p-6 border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300">
                      <div className="flex items-center mb-4">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          phase.status === 'active' ? 'bg-primary' :
                          phase.status === 'planning' ? 'bg-accent' :
                          'bg-muted-foreground'
                        }`} />
                        <h3 className="text-lg font-semibold text-foreground">{phase.title}</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {phase.features.map((feature, featureIndex) => {
                          const IconComponent = feature.icon
                          return (
                            <div key={featureIndex} className="flex items-start group">
                              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3 group-hover:bg-primary/20 transition-colors">
                                <IconComponent className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center mb-1">
                                  <h4 className="font-medium text-foreground">{feature.name}</h4>
                                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                    feature.priority === 'high' ? 'bg-primary/20 text-primary' :
                                    feature.priority === 'medium' ? 'bg-accent/20 text-accent' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {feature.priority}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Development Philosophy */}
        <div className="mt-16 rounded-xl shadow-lg p-8 border border-border/50 bg-card/50 backdrop-blur-sm">
          <h3 className="text-2xl font-bold text-foreground mb-4">Development Philosophy</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-3">
                <Zap className="w-5 h-5 text-primary mr-2" />
                <h4 className="font-semibold text-foreground">Automation First</h4>
              </div>
              <p className="text-muted-foreground text-sm">
                We prioritize automated processes to reduce manual overhead and ensure consistent, 
                reliable development workflows across all projects.
              </p>
            </div>
            <div>
              <div className="flex items-center mb-3">
                <Shield className="w-5 h-5 text-accent mr-2" />
                <h4 className="font-semibold text-foreground">Security & Privacy</h4>
              </div>
              <p className="text-muted-foreground text-sm">
                Private development environments deserve enterprise-grade security with 
                zero-compromise approaches to data protection and access control.
              </p>
            </div>
            <div>
              <div className="flex items-center mb-3">
                <Code className="w-5 h-5 text-primary mr-2" />
                <h4 className="font-semibold text-foreground">Intelligence & Insight</h4>
              </div>
              <p className="text-muted-foreground text-sm">
                AI-driven insights help identify opportunities for optimization, 
                quality improvement, and accelerated development cycles.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-4">Stay Updated</h3>
          <p className="text-muted-foreground mb-6">
            Track our progress through development episodes and stay current with releases.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/episodes" 
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:shadow-lg shadow-primary/30"
            >
              Recent Episodes
            </Link>
            <Link 
              href="/technology" 
              className="border border-border/50 bg-card/50 hover:bg-card/80 text-foreground px-6 py-3 rounded-lg font-medium transition-all duration-200"
            >
              Technology Stack
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}