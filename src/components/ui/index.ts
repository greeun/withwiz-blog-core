import 'client-only';
import type { BlogUIComponents } from '../../types/ui-components';
import { DefaultButton } from './DefaultButton';
import { DefaultToggle } from './DefaultToggle';
import { DefaultInput } from './DefaultInput';
import { DefaultTextarea } from './DefaultTextarea';
import { DefaultSelect } from './DefaultSelect';
import { DefaultBadge } from './DefaultBadge';
import { DefaultCard } from './DefaultCard';
import { DefaultLink } from './DefaultLink';

export const defaultComponents: BlogUIComponents = {
  Button: DefaultButton,
  Toggle: DefaultToggle,
  Input: DefaultInput,
  Textarea: DefaultTextarea,
  Select: DefaultSelect,
  Badge: DefaultBadge,
  Card: DefaultCard,
  Link: DefaultLink,
};

export { DefaultButton, DefaultToggle, DefaultInput, DefaultTextarea, DefaultSelect, DefaultBadge, DefaultCard, DefaultLink };
