interface ScanErrorAlertProps {
  message: string;
}

export function ScanErrorAlert({ message }: ScanErrorAlertProps) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {message}
    </p>
  );
}
