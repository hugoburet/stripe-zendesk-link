import {
  Badge, Box, Button, Divider, Link,
} from '@stripe/ui-extension-sdk/ui';
import { useState } from 'react';
import type { ZendeskOAuth } from '../hooks/useZendeskOAuth';

interface Props {
  oauth: ZendeskOAuth;
}

export default function AppDrawerView({ oauth }: Props) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  return (
    <Box css={{ stack: 'y', gapY: 'medium', padding: 'medium' }}>

      <Box css={{ stack: 'x', gapX: 'small', alignY: 'center' }}>
        <Badge type="positive">Connected</Badge>
        <Box css={{ font: 'caption', color: 'secondary' }}>{oauth.subdomain}.zendesk.com</Box>
      </Box>

      <Box css={{ font: 'body', color: 'secondary' }}>
        View and manage Zendesk support tickets for your Stripe customers.
      </Box>

      <Box css={{ stack: 'y', gapY: 'xsmall', padding: 'medium', background: 'container', borderRadius: 'medium' }}>
        <Box css={{ font: 'label', fontWeight: 'semibold' }}>Go to a customer</Box>
        <Box css={{ font: 'caption', color: 'secondary' }}>
          Open any customer from the Customers tab to see their Zendesk tickets, create new ones, and reply — all in context.
        </Box>
      </Box>

      <Divider />

      <Box css={{ alignX: 'center' }}>
        {!confirmDisconnect ? (
          <Link onPress={() => setConfirmDisconnect(true)}>Disconnect</Link>
        ) : (
          <Box css={{ stack: 'y', gapY: 'small', alignX: 'center' }}>
            <Box css={{ font: 'caption', color: 'secondary' }}>Disconnect your Zendesk account?</Box>
            <Box css={{ stack: 'x', gapX: 'small' }}>
              <Button type="destructive" onPress={oauth.disconnect}>Yes, disconnect</Button>
              <Button type="secondary" onPress={() => setConfirmDisconnect(false)}>Cancel</Button>
            </Box>
          </Box>
        )}
      </Box>

    </Box>
  );
}
