import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import AppLayout from './Layout';
import { useToastStore } from '../stores/toastStore';

const renderWithRouter = (component: React.ReactElement, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={component}>
          <Route index element={<div data-testid="home-content">Home Content</div>} />
          <Route path="child" element={<div data-testid="child-content">Child Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('AppLayout', () => {
  beforeEach(() => {
    useToastStore.getState().clearToasts();
  });

  it('renders navigation', () => {
    renderWithRouter(<AppLayout />);

    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('renders toast container when toasts exist', () => {
    useToastStore.getState().addToast({
      type: 'error',
      title: 'Test Error',
    });

    renderWithRouter(<AppLayout />);

    expect(screen.getByRole('region', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    renderWithRouter(
      <AppLayout>
        <div data-testid="custom-content">Custom Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
  });

  it('renders outlet when no children provided', () => {
    renderWithRouter(<AppLayout />, ['/child']);

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('has main content area with id', () => {
    renderWithRouter(<AppLayout />);

    const main = document.getElementById('main-content');
    expect(main).toBeInTheDocument();
    // The <main> element is semantically a landmark role, no explicit role attribute needed
    expect(main?.tagName.toLowerCase()).toBe('main');
  });

  it('uses app-layout class for styling', () => {
    const { container } = renderWithRouter(<AppLayout />);

    const layout = container.querySelector('.app-layout');
    expect(layout).toBeInTheDocument();
    expect(layout).toHaveClass('app-layout');
  });
});
