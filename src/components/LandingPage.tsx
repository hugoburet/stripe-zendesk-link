import { useState } from 'react';
import { ArrowRight, Check, Layers, Link2, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectionCard } from './ConnectionCard';

interface LandingPageProps {
  onLaunchDemo: () => void;
}

const features = [
  {
    icon: Link2,
    title: 'Seamless Integration',
    description: 'Connect your Stripe and Zendesk accounts in seconds with secure OAuth.',
  },
  {
    icon: Layers,
    title: 'Unified Customer View',
    description: 'See all your Zendesk customer data directly in the Stripe dashboard.',
  },
  {
    icon: Zap,
    title: 'Real-time Sync',
    description: 'Customer profiles and tickets sync automatically in real-time.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption for all data.',
  },
];

export function LandingPage({ onLaunchDemo }: LandingPageProps) {
  const [stripeConnected, setStripeConnected] = useState(false);
  const [zendeskConnected, setZendeskConnected] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="stripe-gradient h-10 w-10 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-primary-foreground">S</span>
            </div>
            <span className="text-xl font-semibold text-foreground">Stripe + Zendesk</span>
          </div>
          
          <Button variant="outline" size="sm">
            Documentation
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground mb-6 animate-fade-in">
              <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
              Now available on Stripe Marketplace
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight animate-slide-up">
              Your Zendesk CRM,{' '}
              <span className="stripe-gradient bg-clip-text text-transparent">
                inside Stripe
              </span>
            </h1>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
              Bring your customer support data into the Stripe dashboard. View tickets, 
              customer profiles, and support history without switching tabs.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Button variant="stripe" size="xl" onClick={onLaunchDemo} className="w-full sm:w-auto">
                Launch Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                View on Marketplace
              </Button>
            </div>
          </div>
        </section>

        {/* Connection Section */}
        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl font-semibold text-center text-foreground mb-8">
              Connect Your Accounts
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <ConnectionCard
                title="Stripe"
                description="Connect your Stripe account to access customer payment data."
                icon={
                  <div className="stripe-gradient h-6 w-6 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">S</span>
                  </div>
                }
                isConnected={stripeConnected}
                onConnect={() => setStripeConnected(true)}
              />
              
              <ConnectionCard
                title="Zendesk"
                description="Connect Zendesk to sync your customer profiles and tickets."
                icon={
                  <div className="h-6 w-6 rounded bg-[#03363D] flex items-center justify-center">
                    <span className="text-xs font-bold text-white">Z</span>
                  </div>
                }
                isConnected={zendeskConnected}
                onConnect={() => setZendeskConnected(true)}
              />
            </div>
            
            {stripeConnected && zendeskConnected && (
              <div className="mt-6 p-4 rounded-lg bg-success/10 border border-success/20 text-center animate-fade-in">
                <div className="flex items-center justify-center gap-2 text-success">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Both accounts connected!</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Click "Launch Demo" to see the integration in action.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-center text-foreground mb-4">
              Everything you need
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              A complete solution for viewing your Zendesk support data right where you manage payments.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl border bg-card hover:card-shadow transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 Stripe + Zendesk Integration. Demo application.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
