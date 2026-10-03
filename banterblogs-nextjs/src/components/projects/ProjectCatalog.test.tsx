import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ProjectCatalog } from './ProjectCatalog';
import { ProjectManifestSchema } from '@/lib/projectManifest';

vi.mock('@/components/ui/IntentLink', () => ({
  IntentLink: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
const projects = [
  ProjectManifestSchema.parse({ slug: 'flight-routing', title: 'Flight Routing Lab', summary: 'Decisions under disruption.', categories: ['reinforcement-learning'], roles: ['research-engineer'], status: 'interactive', runtime: 'browser-simulation', sourceUrl: 'https://github.com/example/flight' }),
  ProjectManifestSchema.parse({ slug: 'spreadsheet-reasoning', title: 'Spreadsheet Reasoning', summary: 'Dependencies and adjudication.', categories: ['agents'], roles: ['applied-ai'], status: 'interactive', runtime: 'browser-evaluation', sourceUrl: 'https://github.com/example/sheet' }),
];
afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });

describe('project selection', () => {
  it('renders all entries and filters without losing the canonical links', () => {
    render(<ProjectCatalog projects={projects} />);
    expect(screen.getByText('2 of 2 projects')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'applied-ai' } });
    expect(screen.queryByRole('link', { name: 'Flight Routing Lab' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Spreadsheet Reasoning' }).getAttribute('href')).toBe('/work/projects/spreadsheet-reasoning');
    expect(new URLSearchParams(window.location.search).get('role')).toBe('applied-ai');
    fireEvent.click(screen.getByRole('button', { name: 'Reset project filters' }));
    expect(screen.getByText('2 of 2 projects')).toBeTruthy();
    expect(window.location.search).toBe('');
  });
  it('restores a shareable selection and handles no matches', () => {
    window.history.replaceState({}, '', '/work/projects?category=agents');
    render(<ProjectCatalog projects={projects} />);
    expect(screen.getByText('1 of 2 projects')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search projects'), { target: { value: 'nothing' } });
    expect(screen.getByText('No projects match this selection.')).toBeTruthy();
  });
});
