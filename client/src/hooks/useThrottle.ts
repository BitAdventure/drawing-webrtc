import { useEffect, useRef } from "react";

function useThrottle<T>(
  value: T,
  customHandler: () => void,
  delay: number
): void {
  const lastExecuted = useRef(Date.now());

  useEffect(() => {
    if (Date.now() - lastExecuted.current >= delay) {
      // If enough time has passed since the last execution, update the throttled text immediately
      lastExecuted.current = Date.now();
      customHandler();
    } else {
      // Otherwise, create a timer to update the throttled text after the delay
      const throttleTimer = setTimeout(() => {
        lastExecuted.current = Date.now();
        customHandler();
      }, delay);

      // Cleanup function: Clear the timer if the component unmounts or the input changes
      return () => clearTimeout(throttleTimer);
    }
    // eslint-disable-next-line
  }, [value, delay]);
}

export default useThrottle;
