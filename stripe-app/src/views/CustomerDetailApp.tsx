import { Box, ContextView, Spinner } from '@stripe/ui-extension-sdk/ui';
import { useState } from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useZendeskOAuth } from '../hooks/useZendeskOAuth';
import { ZENDESK_BRAND_COLOR, ZENDESK_BRAND_ICON } from '../types';
import type { Ticket, Credentials } from '../api/zendesk';
import GetStartedView from './GetStartedView';
import CustomerDetailView from './CustomerDetailView';
import TicketDetailView from './TicketDetailView';

const CustomerDetailApp = ({ environment }: ExtensionContextValue) => {
  const oauth = useZendeskOAuth();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const ctx = environment?.objectContext as Record<string, any> | undefined;
  const customerId = ctx?.object === 'customer' ? (ctx.id as string) : null;

  const creds: Credentials | null =
    oauth.subdomain && oauth.accessToken
      ? { subdomain: oauth.subdomain, accessToken: oauth.accessToken }
      : null;

  const title = selectedTicket ? selectedTicket.subject : 'Customer Tickets';

  return (
    <ContextView title={title} brandColor={ZENDESK_BRAND_COLOR} brandIcon={ZENDESK_BRAND_ICON}>
      {oauth.isLoading ? (
        <Box css={{ padding: 'large', alignX: 'center' }}>
          <Spinner size="large" />
        </Box>
      ) : !oauth.isConnected ? (
        <GetStartedView oauth={oauth} />
      ) : selectedTicket && creds ? (
        <TicketDetailView
          ticket={selectedTicket}
          creds={creds}
          subdomain={oauth.subdomain!}
          onBack={() => setSelectedTicket(null)}
        />
      ) : (
        <CustomerDetailView
          customerId={customerId!}
          oauth={oauth}
          onSelectTicket={setSelectedTicket}
        />
      )}
    </ContextView>
  );
};

export default CustomerDetailApp;
