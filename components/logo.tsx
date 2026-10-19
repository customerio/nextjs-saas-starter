/** The Customer.io mark. Uses currentColor so it follows the text color. */
export function CustomerioMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 27 27" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M26.7922 6.81435L20.0935 0.115646H13.3948V6.81435L20.0935 13.5105L13.3948 20.2092V26.9079H20.0935L26.7922 20.2092V6.81435Z" />
      <path d="M6.6987 13.5105L13.3948 6.81437L10.0468 3.46373L6.6987 0.115669H0V6.81437L3.34806 10.1624L6.6987 13.5105Z" />
      <path d="M3.34806 16.8611L0 20.2092V26.9079H6.6987L10.0468 23.5573L13.3948 20.2092L6.6987 13.5105L3.34806 16.8611Z" />
    </svg>
  );
}
