import { useEffect } from 'react';

const useMountEffect = (callback?: () => void, unmountCallback?: () => void) => {
  useEffect(() => {
    callback && callback();

    return unmountCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useMountEffect;