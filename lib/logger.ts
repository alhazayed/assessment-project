import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    formatters: {
      level(label) {
        return { level: label }
      },
      bindings(bindings) {
        return {
          pid: bindings.pid,
          hostname: bindings.hostname,
        }
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isDevelopment
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      })
    : undefined
)

export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId })
}

export const createAuditLogger = (userId: string | null, action: string) => {
  return logger.child({
    audit: true,
    userId,
    action,
    timestamp: new Date().toISOString(),
  })
}
