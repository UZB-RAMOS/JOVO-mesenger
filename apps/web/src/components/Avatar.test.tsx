// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders accessible initials when no image exists', () => {
    render(<Avatar name="Alisa Karimova" />);
    expect(screen.getByLabelText('Alisa Karimova')).toHaveTextContent('AK');
  });

  it('renders a supplied profile image', () => {
    render(<Avatar name="Bobur" src="https://example.com/avatar.jpg" />);
    expect(screen.getByLabelText('Bobur').querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/avatar.jpg',
    );
  });
});
