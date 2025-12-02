import { useState } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { StripeDashboardMock } from '@/components/StripeDashboardMock';

const Index = () => {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return <StripeDashboardMock />;
  }

  return <LandingPage onLaunchDemo={() => setShowDemo(true)} />;
};

export default Index;
