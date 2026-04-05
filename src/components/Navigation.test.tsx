import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { Navigation } from './Navigation';

const renderWithRouter = (component: React.ReactElement, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  );
};

describe('Navigation', () => {
  it('renders all navigation items', () => {
    renderWithRouter(<Navigation />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Meditation')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders with brand text when not collapsed', () => {
    renderWithRouter(<Navigation isCollapsed={false} />);

    expect(screen.getByText('OpenMarcus')).toBeInTheDocument();
  });

  it('hides brand text when collapsed', () => {
    renderWithRouter(<Navigation isCollapsed />);

    expect(screen.queryByText('OpenMarcus')).not.toBeInTheDocument();
  });

  it('hides link labels when collapsed', () => {
    renderWithRouter(<Navigation isCollapsed />);

    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Meditation')).not.toBeInTheDocument();
  });

  it('highlights active link', () => {
    renderWithRouter(<Navigation />, ['/session']);

    const meditationLink = screen.getByRole('link', { name: /meditation/i });
    expect(meditationLink.closest('.navigation__link')).toHaveClass('navigation__link--active');
  });

  it('has accessible navigation landmark', () => {
    renderWithRouter(<Navigation />);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it('toggle button has correct accessibility labels', () => {
    const onToggle = vi.fn();
    renderWithRouter(<Navigation isCollapsed={false} onToggle={onToggle} />);

    const toggleButton = screen.getByRole('button', { name: /collapse navigation/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows expand label when collapsed', () => {
    const onToggle = vi.fn();
    renderWithRouter(<Navigation isCollapsed onToggle={onToggle} />);

    const toggleButton = screen.getByRole('button', { name: /expand navigation/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onToggle when collapse button is clicked', () => {
    const onToggle = vi.fn();
    renderWithRouter(<Navigation onToggle={onToggle} />);

    const toggleButton = screen.getByRole('button', { name: /collapse navigation/i });
    toggleButton.click();

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('Navigation styling', () => {
  it('applies collapsed class when isCollapsed is true', () => {
    renderWithRouter(<Navigation isCollapsed />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('navigation--collapsed');
  });

  it('does not apply collapsed class by default', () => {
    renderWithRouter(<Navigation />);

    const nav = screen.getByRole('navigation');
    expect(nav).not.toHaveClass('navigation--collapsed');
  });
});
