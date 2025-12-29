import { render, screen } from '@testing-library/react';
import { StatsCard } from '../StatsCard';
import { describe, it, expect } from 'vitest';

describe('StatsCard', () => {
    it('renders label and value correctly', () => {
        render(<StatsCard label="Total Episodes" value={10} icon={<span>Icon</span>} />);

        expect(screen.getByText('Total Episodes')).toBeDefined();
        expect(screen.getByText('10')).toBeDefined();
        expect(screen.getByText('Icon')).toBeDefined();
    });

    it('renders with delay prop', () => {
        // This is mainly a smoke test to ensure no errors with props
        render(<StatsCard label="Test" value="100" icon={<span>Icon</span>} delay={0.5} />);
        expect(screen.getByText('Test')).toBeDefined();
    });
});
