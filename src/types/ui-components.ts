import type { AnchorHTMLAttributes, ComponentType, CSSProperties, ReactNode } from 'react';

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

/**
 * 링크 컴포넌트 props.
 *
 * 표준 <a> 속성(className, style, title, target, rel, data-*)을 모두 받는다.
 * 기본 구현은 평문 <a>이며, Next.js 등 라우터를 쓰는 호스트는
 * BlogThemeProvider로 자체 Link 어댑터를 주입한다. 이로써 패키지가
 * next/link에 하드 종속되지 않고 플랫폼 무관해진다.
 */
export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children?: ReactNode;
  [dataAttr: `data-${string}`]: unknown;
}

export interface BlogUIComponents {
  Button: ComponentType<ButtonProps>;
  Toggle: ComponentType<ToggleProps>;
  Input: ComponentType<InputProps>;
  Textarea: ComponentType<TextareaProps>;
  Select: ComponentType<SelectProps>;
  Badge: ComponentType<BadgeProps>;
  Card: ComponentType<CardProps>;
  Link: ComponentType<LinkProps>;
}
