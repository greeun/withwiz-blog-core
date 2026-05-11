import type { ComponentType, CSSProperties, ReactNode } from 'react';

export interface ButtonProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger';
  size?: 'default' | 'small';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  style?: CSSProperties;
  className?: string;
}

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  style?: CSSProperties;
  className?: string;
}

export interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  style?: CSSProperties;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  style?: CSSProperties;
}

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'published' | 'draft' | 'featured';
  style?: CSSProperties;
}

export interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
}

export interface BlogUIComponents {
  Button: ComponentType<ButtonProps>;
  Toggle: ComponentType<ToggleProps>;
  Input: ComponentType<InputProps>;
  Textarea: ComponentType<TextareaProps>;
  Select: ComponentType<SelectProps>;
  Badge: ComponentType<BadgeProps>;
  Card: ComponentType<CardProps>;
}
