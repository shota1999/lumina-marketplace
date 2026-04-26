import type { Meta, StoryObj } from '@storybook/react';

import { Skeleton } from './skeleton';

/**
 * Avatar stories using Skeleton as a placeholder since the Avatar component
 * file does not exist yet. These demonstrate the expected avatar layouts.
 */
const meta = {
  title: 'Components/Avatar',
  component: Skeleton,
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div>
        <p className="text-sm font-medium">User Name</p>
        <p className="text-muted-foreground text-xs">user@example.com</p>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton className="h-6 w-6 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-16 w-16 rounded-full" />
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <div className="flex -space-x-3">
      <Skeleton className="border-background h-10 w-10 rounded-full border-2" />
      <Skeleton className="border-background h-10 w-10 rounded-full border-2" />
      <Skeleton className="border-background h-10 w-10 rounded-full border-2" />
      <Skeleton className="border-background h-10 w-10 rounded-full border-2" />
    </div>
  ),
};
