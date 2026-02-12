import winston from 'winston';

const IS_DEV = process.env.NODE_ENV !== 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || IS_DEV ? 'debug' : 'info';

const hformat = winston.format.printf(
    ({ level, label, message, timestamp, ...metadata }) => {
        let actualMessage = message;

        if (typeof message === 'bigint') {
            actualMessage = message.toString();
        }

        let msg = `${timestamp} [${level}]${
            label ? `[${label}]` : ''
        }: ${actualMessage} `;

        // improve above to special case error objects
        const meta = { ...metadata };

        for (const key of Object.keys(meta)) {
            // recursively check for error objects
            if (meta[key] instanceof Error) {
                meta[key] = {
                    message: meta[key].message,
                    stack: meta[key].stack,
                };
            }

            if (typeof meta[key] === 'bigint') {
                meta[key] = meta[key].toString();
            }

            if (typeof meta[key] === 'object') {
                meta[key] = JSON.parse(
                    JSON.stringify(meta[key], (k, v) =>
                        typeof v === 'bigint' ? v.toString() : v,
                    ),
                );
            }
        }

        if (Object.keys(meta).length > 0) {
            msg += JSON.stringify(meta);
        }

        return msg;
    },
);

const logging = winston.createLogger({
    level: LOG_LEVEL,
    format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        hformat,
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({
                    colors: {
                        error: 'red',
                        warn: 'yellow',
                        info: 'green',
                        http: 'magenta',
                        verbose: 'cyan',
                        debug: 'blue',
                    },
                }),
                winston.format.splat(),
                winston.format.timestamp(),
                hformat,
            ),
        }),
    ],
});

logging.info(
    `Logger configured with level: ${logging.level}. 'process.env.LOG_LEVEL=${process.env.LOG_LEVEL}' 'logLevel=${LOG_LEVEL}'`,
    {
        label: 'logging',
    },
);

export default logging;
