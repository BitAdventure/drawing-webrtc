import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "UTC:yyyy-mm-dd HH:MM:ssZ",
      ignore: "pid,hostname",
    },
  },
});

// To completely replace console.log:
global.console.log = logger.info.bind(logger);
global.console.warn = logger.warn.bind(logger);
