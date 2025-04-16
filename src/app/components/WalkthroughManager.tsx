// components/WalkthroughManager.tsx
'use client';

import { useEffect, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS } from 'react-joyride';
import { useWallet } from '../utils/useWallet';
import { usePathname } from 'next/navigation';
import { useWalkthrough } from '../utils/WalkthroughContext';

export default function WalkthroughManager() {
  const { stepIndex, setStepIndex, runTour, setRunTour, setJoyrideHelpers } =
    useWalkthrough();
  const { isConnected } = useWallet();
  const joyrideRef = useRef<any>(null);
  const pathname = usePathname();
  const initialRenderRef = useRef(true);
  const isTestingModeRef = useRef(stepIndex > 0);

  // Define the steps for the walkthrough
  const steps: Step[] = [
    {
      // step 0
      target: 'body',
      content: (
        <div>
          <p className="text-2xl font-bold">
            Welcome to the Invisible SDK Demo App!
          </p>
          <p>
            <br />
            Let's go through the different features together.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
      disableOverlay: true,
    },
    {
      // step 1
      target: '#connect-wallet-button-header',
      content: (
        <div className="space-y-3">
          <p>First, connect your wallet to get started.</p>
          <p>Click here to connect your wallet and explore the demo!</p>
          <p>
            The wallet used is Argent Webwallet. No more seedphrases ! You'll
            simply need your email.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
    },
    {
      // step 2
      target: '#connect-wallet-button-header',
      content: <p>Great, your wallet is already connected!</p>,
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: false,
    },
    {
      // step 3
      target: '#create-event-link',
      content: (
        <p>
          Now, let's create your first event. Click here to open the Create
          Event page!
        </p>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
    },
    {
      // step 4
      target: '#create-event-form',
      content: (
        <div className="space-y-3">
          <p>
            This is the Create Event form. Let's start by adding the event
            details!
          </p>
          <p>
            Enter the name of your event and select the date and time for your
            event.
          </p>
        </div>
      ),
      placement: 'top',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
      disableOverlay: false,
    },
    {
      // step 5
      target: 'button[aria-label="Proceed to ticket categories"]',
      content: (
        <div className="space-y-2">
          <p>
            Click Next to create the event. The Invisible SDK will handle the
            transaction seamlessly{' '}
            <span className="font-bold">using session keys</span>.
          </p>
          <p className="text-indigo-600">No wallet popup needed!</p>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
    },
    {
      // step 6
      target: '#ticket-categories-heading',
      content: (
        <p>
          Now let's configure ticket categories for your event. Each category
          can have its own type, price, and supply.
        </p>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: false,
    },
    {
      // step 7
      target: '#category-1-form',
      content: (
        <p>
          Configure the first ticket category by selecting its type, setting the
          price in USD, and specifying the supply.
        </p>
      ),
      placement: 'top',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: false,
      disableOverlay: true,
    },
    {
      // step 8
      target: 'button[aria-label="Add another ticket category"]',
      content: (
        <p>
          Let's add a second ticket category to your event. Click here to add
          another category!
        </p>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
      disableOverlay: true,
    },
    {
      // step 9
      target: '#category-2-form',
      content: (
        <p>
          Configure the second ticket category by selecting its type, setting
          the price in USD, and specifying the supply.
        </p>
      ),
      placement: 'top',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: false,
      disableOverlay: true,
    },
    {
      // step 10
      target: '#create-event-submit-button',
      content: (
        <p>
          Click Create Event to finalize and publish your event! The Invisible
          SDK will handle this transaction as well.
        </p>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
      disableOverlay: true,
    },
    {
      // step 11
      target: 'button[aria-label="Return to homepage"]',
      content: (
        <p>
          Great job! Your event is now live. Click Back to Home to return to the
          homepage.
        </p>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
    },
    {
      // step 12
      target: '#events-grid',
      content: <p>Your event should appear shortly in the list of events.</p>,
      placement: 'top',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: false,
    },
    {
      // step 13
      target: '[data-event-id="1"]',
      content: (
        <p>
          Let's now buy tickets for an event. Click on "Get Tickets" to view the
          event details.
        </p>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
    },
    {
      // step 14
      target: '#event-page',
      content: (
        <p>
          This is the event page. You can see the event details and purchase
          tickets for this event here.
        </p>
      ),
      placement: 'center',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
    },
    {
      // step 15
      target: '#buy-ticket-component',
      content: (
        <div className="space-y-3">
          <p>Select the ticket category and buy your ticket here.</p>
          <p>Click "Buy Ticket" to complete the purchase.</p>
          <p className="font-bold text-red-600">
            YOU NEED STRK TO BUY TICKETS.
          </p>
          <p>
            Once again, session keys are used to handle the transaction
            seamlessly.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
    },
    {
      // step 16
      target: '#buy-ticket-success',
      content: (
        <div className="space-y-3">
          <p>Congrats! You have purchased your first ticket.</p>
          <p>Click "View my ticket" to navigate to the ticket page.</p>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
      disableOverlay: false,
    },
    {
      // step 17
      target: '#tickets-page',
      content: (
        <p>
          You can now view your ticket in the "My Tickets" section. You can
          chose to use it from here or list it for sale (not implemented).
        </p>
      ),
      placement: 'center',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
      disableOverlay: true,
    },
    {
      // step 18 - final step
      target: '#tickets-page',
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-center">
            🎉 Congratulations! You've completed the walkthrough! 🎉
          </h2>

          <p>
            You've just experienced what the Invisible SDK can do with session
            keys. Notice how you could perform multiple starknet actions without
            constantly re-signing transactions with your wallet?
          </p>

          <p>
            Session keys enable a smooth, web2-like experience while maintaining
            the security and ownership benefits of web3. This seamless UX is
            what makes decentralized applications truly accessible.
          </p>

          <p>
            This demo app showcases how developers can integrate invisible-sdk
            to create user-friendly web3 experiences. We hope you enjoyed the
            demonstration!
          </p>
        </div>
      ),
      placement: 'center',
      disableOverlayClose: true,
      disableBeacon: false,
      spotlightClicks: true,
      disableOverlay: true,
      showSkipButton: false,
    },
  ];

  // Start the tour when the component mounts, but only if not testing a specific step
  useEffect(() => {
    if (!initialRenderRef.current) return;

    // Check if we're in testing mode
    const isTestingStep = stepIndex > 0;
    if (isTestingStep) {
      console.log(`Testing mode detected. Starting at step ${stepIndex}.`);
      setRunTour(true);
    } else if (!isConnected && pathname === '/') {
      // Normal auto-start behavior
      console.log('Starting tour: !isConnected && pathname === "/"');
      setRunTour(true);
      setStepIndex(0);
    }

    initialRenderRef.current = false;
  }, [isConnected, pathname, setRunTour, setStepIndex, stepIndex]);

  // Monitor wallet connection and navigation events to resume the tour at the right step
  useEffect(() => {
    // Handle wallet connection - advance to step 2
    if (isConnected && stepIndex === 1) {
      console.log('Advancing to step 2: Wallet connected');
      setStepIndex(2);
      if (joyrideRef.current) joyrideRef.current.next();
    }

    // Resume tour based on current path and step
    const shouldResumeTour = (
      currentPath: string,
      currentStep: number
    ): boolean => {
      if (
        currentPath === '/create-event' &&
        currentStep >= 3 &&
        currentStep <= 11
      )
        return true;
      if (currentPath === '/' && currentStep >= 12 && currentStep <= 13)
        return true;
      if (
        currentPath.startsWith('/event/') &&
        (currentStep === 14 || currentStep === 15 || currentStep === 16)
      )
        return true;
      if (currentPath === '/my-tickets' && currentStep >= 17) return true;
      return false;
    };

    if (shouldResumeTour(pathname, stepIndex)) {
      console.log(`Resuming tour on ${pathname} at step ${stepIndex}`);

      // For certain steps, we need to check if the target element exists first
      const stepsRequiringElementCheck = [
        4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      ];

      if (stepsRequiringElementCheck.includes(stepIndex)) {
        // Get the target selector from the current step
        const currentStepTarget = steps[stepIndex]?.target;
        if (!currentStepTarget) return;

        // Check if target element exists before resuming
        const checkElementAndResume = () => {
          const targetElement = document.querySelector(
            currentStepTarget.toString()
          );
          if (targetElement) {
            console.log(`Target for step ${stepIndex} found, resuming tour`);
            setRunTour(true);
          } else {
            console.log(
              `Target for step ${stepIndex} not found yet, retrying...`
            );
            setTimeout(checkElementAndResume, 500);
          }
        };

        // Increase the initial delay to ensure the page is fully rendered
        setTimeout(checkElementAndResume, 800);
      } else {
        // For steps that don't need element checks, resume immediately
        setRunTour(true);
      }
    }
  }, [isConnected, pathname, stepIndex, setStepIndex, setRunTour, steps]);

  // Handle Joyride callbacks
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    console.log('Joyride callback:', { status, action, index, type });

    // Get testing mode status
    const isTestingMode = isTestingModeRef.current;

    // Handle step navigation (next/prev)
    if (type === 'step:after') {
      if (action === ACTIONS.NEXT) {
        console.log(`Advancing to step ${index + 1}`);
        setStepIndex(index + 1);

        // Handle special cases for navigation steps
        const navigationSteps = [3, 4, 10, 13];
        if (navigationSteps.includes(index) && !isTestingMode) {
          console.log('Pausing tour for navigation or form submission');
          setRunTour(false);
        }
      } else if (action === ACTIONS.PREV) {
        console.log(`Reverting to step ${index - 1}`);
        setStepIndex(index - 1);
      }
    }

    // Handle special interactions when tooltips appear
    if (type === 'tooltip') {
      // For steps that need element highlighting or button enabling/disabling
      const prepareInteractiveElements = () => {
        // Step 10 - Create Event button
        if (index === 10) {
          const submitButton = document.querySelector(
            '#create-event-submit-button'
          );
          if (submitButton) {
            console.log('Create Event button ready for interaction');
            submitButton.removeAttribute('disabled');
            (submitButton as HTMLElement).style.position = 'relative';
            (submitButton as HTMLElement).style.zIndex = '1001';
          }
        }

        // Step 13 - Get Tickets button
        if (index === 13) {
          const getTicketsButton = document.querySelector(
            '[data-event-id="1"] a[aria-label="Get tickets"]'
          );
          if (getTicketsButton) {
            console.log('Get Tickets button found, making it highlighted');
            getTicketsButton.classList.add('joyride-highlighted');
          }
        }
      };

      setTimeout(prepareInteractiveElements, 300);
    }

    // Handle step 14 to 15 transition
    if (stepIndex === 14 && type === 'step:after' && action === ACTIONS.NEXT) {
      console.log('Advancing from step 14 to step 15');
      setStepIndex(15);
      // The useEffect for stepIndex and pathname will handle resuming the tour
    }

    // Handle tour completion
    if (
      finishedStatuses.includes(status) ||
      (index === 15 && action === ACTIONS.NEXT && type === 'step:after')
    ) {
      console.log('Tour finished or skipped');
      setRunTour(false);
      if (!isTestingMode) {
        setStepIndex(0);
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={runTour}
      stepIndex={stepIndex}
      continuous
      showProgress={false}
      showSkipButton
      callback={handleJoyrideCallback}
      spotlightClicks
      disableOverlayClose
      getHelpers={(helpers) => {
        joyrideRef.current = helpers;
        setJoyrideHelpers(helpers);
      }}
      styles={{
        options: {
          primaryColor: '#4f46e5', // Indigo primary color
          textColor: '#1f2937', // Dark gray text
          zIndex: 1000, // Ensure overlay is on top
        },
        tooltip: {
          borderRadius: '0.75rem', // Rounded corners
          padding: '1rem', // Comfortable padding
        },
        buttonNext: {
          backgroundColor: '#4f46e5', // Match primary color
          borderRadius: '9999px', // Fully rounded
          padding: '0.5rem 1.5rem', // Balanced padding
        },
        buttonSkip: {
          color: '#ef4444', // Red for skip button
        },
        beacon: {
          backgroundColor: 'rgba(79, 70, 229, 0.8)', // More visible indigo
          width: '32px',
          height: '32px',
          borderRadius: '50%', // Circular beacon
          boxShadow: '0 0 0 8px rgba(79, 70, 229, 0.2)', // Soft outer glow
          animation: 'blink 1.2s infinite ease-in-out', // Custom blinking animation
        },
      }}
    />
  );
}
