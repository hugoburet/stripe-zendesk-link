import { useState } from 'react';
import { 
  CreditCard, 
  Users, 
  BarChart3, 
  Settings, 
  Home,
  FileText,
  Zap,
  Link2,
  PanelRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppDrawer } from './AppDrawer';
import { mockStripeCustomers, mockZendeskCustomers, getTicketsForCustomer, getZendeskCustomerByEmail } from '@/data/mockData';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { icon: Home, label: 'Home', active: false },
  { icon: CreditCard, label: 'Payments', active: true },
  { icon: BarChart3, label: 'Balances', active: false },
  { icon: Users, label: 'Customers', active: false },
  { icon: FileText, label: 'Invoices', active: false },
  { icon: Zap, label: 'Subscriptions', active: false },
  { icon: Link2, label: 'Connect', active: false },
  { icon: Settings, label: 'Settings', active: false },
];

export function StripeDashboardMock() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Stripe Sidebar Mock */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="stripe-gradient h-8 w-8 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">S</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">Stripe</span>
          </div>
        </div>
        
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <button
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    item.active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-medium text-sidebar-foreground">AC</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">Acme Corp</p>
              <p className="text-xs text-sidebar-foreground/60">Test mode</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-border px-6 py-3 bg-card">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Payments</h1>
            <p className="text-sm text-muted-foreground">Manage your payment transactions</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={isDrawerOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="gap-2"
            >
              <div className="h-4 w-4 rounded bg-[#03363D] flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">Z</span>
              </div>
              Zendesk CRM
              <PanelRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl">
            {/* Mock Payment Table */}
            <div className="rounded-lg border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="font-medium text-foreground">Recent Payments</h2>
              </div>
              <div className="divide-y divide-border">
                {mockStripeCustomers.map((customer, i) => (
                  <div key={customer.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                        <span className="text-xs font-medium text-accent-foreground">
                          {customer.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        ${(Math.random() * 500 + 50).toFixed(2)}
                      </p>
                      <p className="text-xs text-success">Succeeded</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Zendesk App Drawer */}
      <AppDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        stripeCustomers={mockStripeCustomers}
        zendeskCustomers={mockZendeskCustomers}
        getTickets={getTicketsForCustomer}
        getZendeskCustomer={getZendeskCustomerByEmail}
      />
    </div>
  );
}
