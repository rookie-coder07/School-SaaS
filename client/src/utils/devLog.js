export const devLog = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

export const devWarn = (...args) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};

export const devError = (...args) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

