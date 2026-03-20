import type { Config } from "driver.js";

export const baseDriverConfig: Partial<Config> = {
  animate: true,
  overlayOpacity: 0.5,
  popoverClass: "driver-popover",
  allowClose: true,
  allowKeyboardControl: true,
  smoothScroll: true,
  stagePadding: 4,
  stageRadius: 8,
  disableActiveInteraction: false,
  showProgress: true,
  popoverOffset: 10,
};

export const driverStyles = `
  /* Overlay - matches shadcn/ui backdrop */
  .driver-overlay {
    background-color: hsl(var(--background) / 0.8) !important;
    backdrop-filter: blur(4px);
  }
  
  /* Popover container - matches shadcn/ui popover/card styling */
  .driver-popover {
    background-color: hsl(var(--card)) !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: var(--radius-lg) !important;
    box-shadow: 
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1),
      0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
    padding: 1rem !important;
    color: hsl(var(--card-foreground)) !important;
    font-family: var(--font-sans) !important;
    max-width: 320px !important;
  }
  
  /* Popover title - matches shadcn/ui typography */
  .driver-popover-title {
    font-size: 1rem !important;
    font-weight: 600 !important;
    color: hsl(var(--card-foreground)) !important;
    margin-bottom: 0.5rem !important;
  }
  
  /* Popover description */
  .driver-popover-description {
    font-size: 0.875rem !important;
    color: hsl(var(--muted-foreground)) !important;
    line-height: 1.5 !important;
    margin-bottom: 1rem !important;
  }
  
  /* Progress indicator */
  .driver-popover-progress {
    font-size: 0.75rem !important;
    color: hsl(var(--muted-foreground)) !important;
    font-weight: 500 !important;
  }
  
  /* Navigation buttons container */
  .driver-popover-navigation-btns {
    display: flex !important;
    gap: 0.5rem !important;
    margin-top: 1rem !important;
  }
  
  /* Primary button - matches shadcn/ui primary button */
  .driver-popover-next-btn {
    background-color: hsl(var(--primary)) !important;
    color: hsl(var(--primary-foreground)) !important;
    border: none !important;
    border-radius: var(--radius-md) !important;
    padding: 0.5rem 1rem !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    transition: opacity 0.2s !important;
  }
  
  .driver-popover-next-btn:hover {
    opacity: 0.9 !important;
  }
  
  .driver-popover-next-btn:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }
  
  /* Secondary button - matches shadcn/ui secondary button */
  .driver-popover-prev-btn,
  .driver-popover-close-btn {
    background-color: hsl(var(--secondary)) !important;
    color: hsl(var(--secondary-foreground)) !important;
    border: none !important;
    border-radius: var(--radius-md) !important;
    padding: 0.5rem 1rem !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    transition: opacity 0.2s !important;
  }
  
  .driver-popover-prev-btn:hover,
  .driver-popover-close-btn:hover {
    opacity: 0.9 !important;
  }
  
  .driver-popover-prev-btn:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }
  
  /* Arrow pointing to element */
  .driver-popover-arrow {
    border-color: hsl(var(--card)) !important;
  }
  
  /* Stage (highlighted element wrapper) */
  .driver-active-element {
    border-radius: var(--radius-md) !important;
    box-shadow: 
      0 0 0 4px hsl(var(--ring)),
      0 0 0 9999px hsl(var(--background) / 0.5) !important;
  }
  
  /* Close button (X) in corner */
  .driver-popover-close-btn {
    position: absolute !important;
    top: 0.5rem !important;
    right: 0.5rem !important;
    padding: 0.25rem !important;
    background: transparent !important;
    color: hsl(var(--muted-foreground)) !important;
    font-size: 1.25rem !important;
    line-height: 1 !important;
  }
  
  .driver-popover-close-btn:hover {
    color: hsl(var(--foreground)) !important;
  }
  
  /* Footer with buttons and progress */
  .driver-popover-footer {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    margin-top: 1rem !important;
  }
`;
