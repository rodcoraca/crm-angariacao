import { useCallback, useRef, useState } from "react";

export function useDirtyForm() {
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    setIsDirty(true);
  }, []);
  const markClean = useCallback(() => {
    isDirtyRef.current = false;
    setIsDirty(false);
  }, []);
  const isDirtyNow = useCallback(() => isDirtyRef.current, []);

  return {
    isDirty,
    isDirtyNow,
    markDirty,
    markClean,
    reset: markClean
  };
}
