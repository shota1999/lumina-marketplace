import type { Meta, StoryObj } from '@storybook/react';

import { Input } from './input';
import { Textarea } from './textarea';

/**
 * Label stories. The label component file does not exist yet as a standalone
 * component, so these stories demonstrate label patterns using native elements
 * styled with the same Tailwind classes used by @radix-ui/react-label.
 */
const LabelDemo = ({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) => (
  <label
    htmlFor={htmlFor}
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className ?? ''}`}
  >
    {children}
  </label>
);

const meta = {
  title: 'Components/Label',
  component: LabelDemo,
  tags: ['autodocs'],
} satisfies Meta<typeof LabelDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <LabelDemo htmlFor="email">Email</LabelDemo>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
};

export const WithTextarea: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <LabelDemo htmlFor="message">Your message</LabelDemo>
      <Textarea id="message" placeholder="Type your message here." />
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <LabelDemo htmlFor="name">
        Name <span className="text-destructive">*</span>
      </LabelDemo>
      <Input id="name" placeholder="Enter your name" required />
    </div>
  ),
};
