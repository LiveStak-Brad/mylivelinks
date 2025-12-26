'use client';

import { useState } from 'react';
import {
  Bell,
  Check,
  ChevronRight,
  Heart,
  Home,
  Mail,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Star,
  Sun,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';

import {
  Button,
  IconButton,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Chip,
  Tooltip,
  ToastProvider,
  useToast,
  Skeleton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonButton,
} from '@/components/ui';

/* =============================================================================
   UI KIT SHOWCASE PAGE
   
   Single source of truth for all design system components.
   Every component is displayed with all states: default, hover, active, 
   disabled, loading, and error where applicable.
   
   All other UI agents MUST use these components.
============================================================================= */

export default function UIKitPage() {
  const [isDark, setIsDark] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>(['react', 'next']);

  const toggleDark = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <ToastProvider>
      <div className={`min-h-screen bg-background text-foreground ${isDark ? 'dark' : ''}`}>
        {/* Header */}
        <header className="sticky top-0 z-sticky bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">MyLiveLinks UI Kit</h1>
                <p className="text-xs text-muted-foreground">Design System v2.0</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip content={isDark ? 'Light mode' : 'Dark mode'}>
                <IconButton aria-label="Toggle theme" onClick={toggleDark} variant="ghost">
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
          {/* Color Tokens */}
          <Section title="Color Tokens" description="Core color palette using CSS variables">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <ColorSwatch name="Primary" className="bg-primary" />
              <ColorSwatch name="Secondary" className="bg-secondary" />
              <ColorSwatch name="Accent" className="bg-accent" />
              <ColorSwatch name="Muted" className="bg-muted" />
              <ColorSwatch name="Success" className="bg-success" />
              <ColorSwatch name="Warning" className="bg-warning" />
              <ColorSwatch name="Destructive" className="bg-destructive" />
              <ColorSwatch name="Info" className="bg-info" />
              <ColorSwatch name="Background" className="bg-background border border-border" />
              <ColorSwatch name="Card" className="bg-card border border-border" />
              <ColorSwatch name="Popover" className="bg-popover border border-border" />
              <ColorSwatch name="Border" className="bg-border" />
            </div>
          </Section>

          {/* Typography */}
          <Section title="Typography" description="Font family: Outfit (headings & body)">
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-5xl font-bold">Heading 1 - The quick brown fox</h1>
                <h2 className="text-4xl font-bold">Heading 2 - The quick brown fox</h2>
                <h3 className="text-3xl font-semibold">Heading 3 - The quick brown fox</h3>
                <h4 className="text-2xl font-semibold">Heading 4 - The quick brown fox</h4>
                <h5 className="text-xl font-medium">Heading 5 - The quick brown fox</h5>
                <h6 className="text-lg font-medium">Heading 6 - The quick brown fox</h6>
              </div>
              <div className="space-y-2">
                <p className="text-base">Body (base) - The quick brown fox jumps over the lazy dog.</p>
                <p className="text-sm text-muted-foreground">Body small - The quick brown fox jumps over the lazy dog.</p>
                <p className="text-xs text-muted-foreground">Caption - The quick brown fox jumps over the lazy dog.</p>
              </div>
              <div>
                <p className="gradient-text text-2xl font-bold">Gradient Text Effect</p>
              </div>
            </div>
          </Section>

          {/* Buttons */}
          <Section title="Button" description="Primary action buttons with multiple variants and sizes">
            <div className="space-y-8">
              {/* Variants */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Variants</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="gradient">Gradient</Button>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Sizes</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Extra Small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </div>
              </div>

              {/* With Icons */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">With Icons</h4>
                <div className="flex flex-wrap gap-3">
                  <Button leftIcon={<Plus className="w-4 h-4" />}>Add Item</Button>
                  <Button rightIcon={<ChevronRight className="w-4 h-4" />}>Continue</Button>
                  <Button leftIcon={<Mail className="w-4 h-4" />} rightIcon={<ChevronRight className="w-4 h-4" />}>
                    Send Message
                  </Button>
                </div>
              </div>

              {/* States */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">States</h4>
                <div className="flex flex-wrap gap-3">
                  <Button>Default</Button>
                  <Button className="hover:bg-primary-hover">Hover (demo)</Button>
                  <Button isLoading>Loading</Button>
                  <Button disabled>Disabled</Button>
                  <Button fullWidth className="max-w-xs">Full Width</Button>
                </div>
              </div>
            </div>
          </Section>

          {/* Icon Button */}
          <Section title="IconButton" description="Buttons for icon-only interactions">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Variants</h4>
                <div className="flex flex-wrap gap-3">
                  <Tooltip content="Primary">
                    <IconButton aria-label="Primary" variant="primary">
                      <Heart className="w-5 h-5" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Secondary">
                    <IconButton aria-label="Secondary" variant="secondary">
                      <Star className="w-5 h-5" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Ghost">
                    <IconButton aria-label="Ghost" variant="ghost">
                      <Settings className="w-5 h-5" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Outline">
                    <IconButton aria-label="Outline" variant="outline">
                      <Bell className="w-5 h-5" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Destructive">
                    <IconButton aria-label="Destructive" variant="destructive">
                      <Trash2 className="w-5 h-5" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Sizes</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <IconButton aria-label="XS" size="xs"><Menu className="w-full h-full" /></IconButton>
                  <IconButton aria-label="SM" size="sm"><Menu className="w-full h-full" /></IconButton>
                  <IconButton aria-label="MD" size="md"><Menu className="w-full h-full" /></IconButton>
                  <IconButton aria-label="LG" size="lg"><Menu className="w-full h-full" /></IconButton>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">States</h4>
                <div className="flex flex-wrap gap-3">
                  <IconButton aria-label="Default"><Plus className="w-5 h-5" /></IconButton>
                  <IconButton aria-label="Loading" isLoading><Plus className="w-5 h-5" /></IconButton>
                  <IconButton aria-label="Disabled" disabled><Plus className="w-5 h-5" /></IconButton>
                </div>
              </div>
            </div>
          </Section>

          {/* Input */}
          <Section title="Input" description="Text input fields with icons and validation">
            <div className="max-w-md space-y-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Default</h4>
                <Input placeholder="Enter your email..." />
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">With Icons</h4>
                <div className="space-y-3">
                  <Input placeholder="Search..." leftIcon={<Search className="w-4 h-4" />} />
                  <Input placeholder="Password" type="password" rightIcon={<User className="w-4 h-4" />} />
                  <Input 
                    placeholder="Email address" 
                    leftIcon={<Mail className="w-4 h-4" />}
                    rightIcon={<Check className="w-4 h-4 text-success" />}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Sizes</h4>
                <div className="space-y-3">
                  <Input placeholder="Small input" inputSize="sm" />
                  <Input placeholder="Medium input" inputSize="md" />
                  <Input placeholder="Large input" inputSize="lg" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">States</h4>
                <div className="space-y-3">
                  <Input placeholder="Default" />
                  <Input placeholder="Disabled" disabled />
                  <Input placeholder="With error" error errorMessage="This field is required" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Textarea</h4>
                <Textarea placeholder="Write your message here..." />
              </div>
            </div>
          </Section>

          {/* Card */}
          <Section title="Card" description="Container for grouped content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Default Card</CardTitle>
                  <CardDescription>This is a basic card component</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Cards contain content and actions about a single subject.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" className="ml-2">Save</Button>
                </CardFooter>
              </Card>

              <Card variant="ghost">
                <CardHeader>
                  <CardTitle>Ghost Card</CardTitle>
                  <CardDescription>Subtle background variant</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Use for secondary content or nested cards.
                  </p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>Interactive Card</CardTitle>
                  <CardDescription>Hover for effect</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This card has hover animations for interactive contexts.
                  </p>
                </CardContent>
              </Card>
            </div>
          </Section>

          {/* Modal */}
          <Section title="Modal" description="Dialog overlays for focused interactions">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
            </div>
            <Modal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Modal Title"
              description="This is a description of what this modal does."
              size="md"
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Modal content goes here. You can put forms, information, or any other content.
                </p>
                <Input placeholder="Enter something..." />
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button onClick={() => setModalOpen(false)}>Confirm</Button>
                </div>
              </div>
            </Modal>
          </Section>

          {/* Tabs */}
          <Section title="Tabs" description="Tabbed navigation for content sections">
            <Tabs defaultValue="overview" className="w-full max-w-2xl">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="disabled" disabled>Disabled</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Overview</CardTitle>
                    <CardDescription>View your account overview here.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This is the overview tab content. Each tab can contain different content.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="analytics">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics</CardTitle>
                    <CardDescription>View your analytics data.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Charts and graphs would go here in a real application.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Manage your preferences.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Settings form would go here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </Section>

          {/* Badge */}
          <Section title="Badge" description="Small labels for status and categories">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Variants</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Sizes</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge size="sm">Small</Badge>
                  <Badge size="md">Medium</Badge>
                  <Badge size="lg">Large</Badge>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">With Icon & Dot</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge icon={<Check className="w-3 h-3" />} variant="success">Verified</Badge>
                  <Badge icon={<Star className="w-3 h-3" />} variant="primary">Featured</Badge>
                  <Badge dot dotColor="success">Online</Badge>
                  <Badge dot dotColor="warning">Away</Badge>
                  <Badge dot dotColor="destructive">Offline</Badge>
                </div>
              </div>
            </div>
          </Section>

          {/* Chip */}
          <Section title="Chip" description="Compact elements for tags, filters, and selections">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Basic & Dismissible</h4>
                <div className="flex flex-wrap gap-2">
                  <Chip>Basic Chip</Chip>
                  <Chip onDismiss={() => {}}>Dismissible</Chip>
                  <Chip icon={<Star className="w-3 h-3" />}>With Icon</Chip>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Variants</h4>
                <div className="flex flex-wrap gap-2">
                  <Chip variant="default">Default</Chip>
                  <Chip variant="primary">Primary</Chip>
                  <Chip variant="secondary">Secondary</Chip>
                  <Chip variant="outline">Outline</Chip>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Selectable</h4>
                <div className="flex flex-wrap gap-2">
                  {['react', 'next', 'tailwind', 'typescript'].map((tag) => (
                    <Chip
                      key={tag}
                      variant="outline"
                      selected={selectedChips.includes(tag)}
                      onClick={() => {
                        setSelectedChips((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        );
                      }}
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Sizes</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip size="sm">Small</Chip>
                  <Chip size="md">Medium</Chip>
                  <Chip size="lg">Large</Chip>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">States</h4>
                <div className="flex flex-wrap gap-2">
                  <Chip>Default</Chip>
                  <Chip selected>Selected</Chip>
                  <Chip disabled>Disabled</Chip>
                </div>
              </div>
            </div>
          </Section>

          {/* Tooltip */}
          <Section title="Tooltip" description="Hover hints for additional information">
            <div className="flex flex-wrap gap-4">
              <Tooltip content="This is a top tooltip" position="top">
                <Button variant="outline">Top</Button>
              </Tooltip>
              <Tooltip content="This is a right tooltip" position="right">
                <Button variant="outline">Right</Button>
              </Tooltip>
              <Tooltip content="This is a bottom tooltip" position="bottom">
                <Button variant="outline">Bottom</Button>
              </Tooltip>
              <Tooltip content="This is a left tooltip" position="left">
                <Button variant="outline">Left</Button>
              </Tooltip>
            </div>
          </Section>

          {/* Toast */}
          <Section title="Toast" description="Transient notifications">
            <ToastDemo />
          </Section>

          {/* Skeleton */}
          <Section title="Skeleton" description="Loading placeholders">
            <div className="space-y-8">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Basic Shapes</h4>
                <div className="flex flex-wrap items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton variant="circle" className="h-10 w-10" />
                  <Skeleton className="h-20 w-40 rounded-lg" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Text Skeleton</h4>
                <Skeleton variant="text" lines={3} className="max-w-md" />
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Animation Variants</h4>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Pulse</p>
                    <Skeleton animation="pulse" className="h-8 w-24" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Shimmer</p>
                    <Skeleton animation="shimmer" className="h-8 w-24" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">None</p>
                    <Skeleton animation="none" className="h-8 w-24" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Preset Components</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Avatar</p>
                    <div className="flex gap-2">
                      <SkeletonAvatar size="sm" />
                      <SkeletonAvatar size="md" />
                      <SkeletonAvatar size="lg" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Button</p>
                    <div className="flex gap-2">
                      <SkeletonButton size="sm" />
                      <SkeletonButton size="md" />
                      <SkeletonButton size="lg" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Card Skeleton</h4>
                <div className="max-w-sm">
                  <SkeletonCard />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Table Rows</h4>
                <div className="border border-border rounded-xl p-4 space-y-2 max-w-lg">
                  <SkeletonTableRow columns={4} />
                  <SkeletonTableRow columns={4} />
                  <SkeletonTableRow columns={4} />
                </div>
              </div>
            </div>
          </Section>

          {/* Header & Chrome Components */}
          <Section title="Header & Chrome" description="Navigation, menus, and app chrome components">
            <div className="space-y-8">
              {/* Nav Links */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Navigation Links</h4>
                <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-xl">
                  <a href="#" className="nav-link nav-link-active">
                    Active
                    <span className="nav-link-indicator" />
                  </a>
                  <a href="#" className="nav-link nav-link-inactive">Inactive</a>
                  <span className="nav-link nav-link-disabled">Disabled</span>
                </div>
              </div>

              {/* Menu Items */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Dropdown Menu Items</h4>
                <div className="max-w-xs bg-card border border-border rounded-xl p-2 shadow-lg">
                  <button className="dropdown-menu-item dropdown-menu-item-default">
                    <User className="w-4 h-4 text-blue-500" />
                    <span className="flex-1 text-left">View Profile</span>
                  </button>
                  <button className="dropdown-menu-item dropdown-menu-item-default">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span className="flex-1 text-left">Settings</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-menu-item dropdown-menu-item-destructive">
                    <X className="w-4 h-4" />
                    <span className="flex-1 text-left">Logout</span>
                  </button>
                </div>
              </div>

              {/* Notification Badge */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Notification Badges</h4>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="relative">
                    <IconButton aria-label="Notifications" variant="ghost">
                      <Bell className="w-5 h-5" />
                    </IconButton>
                    <span className="notification-badge">3</span>
                  </div>
                  <div className="relative">
                    <IconButton aria-label="Messages" variant="ghost">
                      <Mail className="w-5 h-5" />
                    </IconButton>
                    <span className="notification-badge">12</span>
                  </div>
                  <div className="relative">
                    <IconButton aria-label="Max count" variant="ghost">
                      <Bell className="w-5 h-5" />
                    </IconButton>
                    <span className="notification-badge">99+</span>
                  </div>
                </div>
              </div>

              {/* Icon Sizes */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Standardized Icon Sizes</h4>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="text-center">
                    <Bell className="icon-xs text-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">xs (14px)</p>
                  </div>
                  <div className="text-center">
                    <Bell className="icon-sm text-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">sm (16px)</p>
                  </div>
                  <div className="text-center">
                    <Bell className="icon-md text-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">md (20px)</p>
                  </div>
                  <div className="text-center">
                    <Bell className="icon-lg text-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">lg (24px)</p>
                  </div>
                  <div className="text-center">
                    <Bell className="icon-xl text-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">xl (32px)</p>
                  </div>
                </div>
              </div>

              {/* Header Heights */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Header Height Constants</h4>
                <div className="p-4 bg-muted/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-16 bg-primary/20 border-2 border-primary rounded flex items-center justify-center text-xs font-mono">
                      h-16 (64px)
                    </div>
                    <span className="text-sm text-muted-foreground">Mobile header height</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-[72px] bg-primary/20 border-2 border-primary rounded flex items-center justify-center text-xs font-mono">
                      h-[72px]
                    </div>
                    <span className="text-sm text-muted-foreground">Desktop header height (lg+)</span>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Shadows */}
          <Section title="Shadows" description="Elevation and depth">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {['xs', 'sm', 'default', 'md', 'lg', 'xl', '2xl', 'primary', 'accent'].map((shadow) => (
                <div key={shadow} className="text-center space-y-2">
                  <div
                    className={`
                      h-16 w-full rounded-lg bg-card border border-border
                      ${shadow === 'default' ? 'shadow' : `shadow-${shadow}`}
                    `}
                  />
                  <p className="text-xs text-muted-foreground">{shadow}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Spacing */}
          <Section title="Spacing Scale" description="Consistent spacing using Tailwind">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((space) => (
                <div key={space} className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-8">{space}</span>
                  <div className={`h-4 bg-primary rounded p-${space}`} style={{ width: `${space * 8}px` }} />
                  <span className="text-xs text-muted-foreground">{space * 4}px</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Border Radius */}
          <Section title="Border Radius" description="Rounded corner scale">
            <div className="flex flex-wrap gap-6">
              {['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'].map((radius) => (
                <div key={radius} className="text-center space-y-2">
                  <div
                    className={`h-16 w-16 bg-primary rounded-${radius}`}
                  />
                  <p className="text-xs text-muted-foreground">{radius}</p>
                </div>
              ))}
            </div>
          </Section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-8 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-muted-foreground">
              MyLiveLinks Design System v2.0 — All UI agents must use these components
            </p>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}

/* =============================================================================
   Helper Components
============================================================================= */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-20" id={title.toLowerCase().replace(/\s/g, '-')}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ColorSwatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="space-y-2">
      <div className={`h-16 rounded-lg ${className}`} />
      <p className="text-sm font-medium">{name}</p>
    </div>
  );
}

function ToastDemo() {
  const { toast } = useToast();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        onClick={() => toast({ title: 'Default notification', description: 'This is a default toast message.' })}
      >
        Default
      </Button>
      <Button
        variant="outline"
        onClick={() => toast({ title: 'Success!', description: 'Your changes have been saved.', variant: 'success' })}
      >
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() => toast({ title: 'Error', description: 'Something went wrong.', variant: 'error' })}
      >
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() => toast({ title: 'Warning', description: 'Please review your input.', variant: 'warning' })}
      >
        Warning
      </Button>
      <Button
        variant="outline"
        onClick={() => toast({ title: 'Info', description: 'Here is some information.', variant: 'info' })}
      >
        Info
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast({
            title: 'With Action',
            description: 'This toast has an action button.',
            action: { label: 'Undo', onClick: () => alert('Undo clicked!') },
          })
        }
      >
        With Action
      </Button>
    </div>
  );
}

