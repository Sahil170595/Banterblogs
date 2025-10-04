import Link from 'next/link'
import { Calendar, Code, Database, Zap, Shield, Globe } from 'lucide-react'

const roadmapMilestones = [
  {
    quarter: 'Q1 2025',
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
    quarter: 'Q2 2025',
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
            description: 'Automated code structure optimization with AI-powered recommendations',
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Jarvis Development Roadmap</h1>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Strategic development goals and milestones for the upcoming quarters. 
              Focused on automation, intelligence, and platform development integration.
            </p>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">Current Development Focus</h2>
            <p className="text-blue-800">
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
                <div className="absolute left-8 top-16 bottom-[-48px] w-0.5 bg-gray-200" />
              )}
              
              {/* Quarter Header */}
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                milestone.status === 'current' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <Calendar className="w-4 h-4 mr-2" />
                {milestone.quarter}
              </div>

              {/* Phases */}
              <div className="mt-8 ml-4 grid gap-8 md:grid-cols-2">
                {milestone.phases.map((phase) => (
                  <div key={phase.title} className="relative">
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                      <div className="flex items-center mb-4">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          phase.status === 'active' ? 'bg-green-500' :
                          phase.status === 'planning' ? 'bg-yellow-500' :
                          'bg-gray-300'
                        }`} />
                        <h3 className="text-lg font-semibold text-gray-900">{phase.title}</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {phase.features.map((feature, featureIndex) => {
                          const IconComponent = feature.icon
                          return (
                            <div key={featureIndex} className="flex items-start">
                              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                <IconComponent className="w-4 h-4 text-gray-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center mb-1">
                                  <h4 className="font-medium text-gray-900">{feature.name}</h4>
                                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                    feature.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    feature.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {feature.priority}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">{feature.description}</p>
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
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Development Philosophy</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-3">
                <Zap className="w-5 h-5 text-blue-500 mr-2" />
                <h4 className="font-semibold text-gray-900">Automation First</h4>
              </div>
              <p className="text-gray-600 text-sm">
                We prioritize automated processes to reduce manual overhead and ensure consistent, 
                reliable development workflows across all projects.
              </p>
            </div>
            <div>
              <div className="flex items-center mb-3">
                <Shield className="w-5 h-5 text-green-500 mr-2" />
                <h4 className="font-semibold text-gray-900">Security & Privacy</h4>
              </div>
              <p className="text-gray-600 text-sm">
                Private development environments deserve enterprise-grade security with 
                zero-compromise approaches to data protection and access control.
              </p>
            </div>
            <div>
              <div className="flex items-center mb-3">
                <Code className="w-5 h-5 text-purple-500 mr-2" />
                <h4 className="font-semibold text-gray-900">Intelligence & Insight</h4>
              </div>
              <p className="text-gray-600 text-sm">
                AI-driven insights help identify opportunities for optimization, 
                quality improvement, and accelerated development cycles.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Stay Updated</h3>
          <p className="text-gray-600 mb-6">
            Track our progress through development episodes and stay current with releases.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/episodes" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Recent Episodes
            </Link>
            <Link 
              href="/technology" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Technology Stack
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
