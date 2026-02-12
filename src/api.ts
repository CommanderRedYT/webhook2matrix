import Ajv from 'ajv';
import ajvErrors from 'ajv-errors';
import express from 'express';
import expressWinston from 'express-winston';
import { MsgType } from 'matrix-js-sdk';

import { getConfig } from './config';
import logging from './logging';
import { getMatrixClient } from './matrix';

const log = logging.child({ label: 'api' });

const app = express();

const ajv = new Ajv({ allErrors: true });

ajvErrors(ajv);

app.use(
    expressWinston.logger({
        winstonInstance: log,
        meta: false,
        // responseWhitelist: ['body'],
        level: 'http',
        msg: '{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
        expressFormat: false,
        colorize: true,
    }),
);

app.use(express.json());

const protectedRouter = express.Router();

const config = getConfig();

// authentik

interface AuthentikMessage {
    body: string;
    severity: 'notice' | 'warning' | 'alert';
    user_email: string;
    user_username: string;
}

const validateAuthentik = ajv.compile<AuthentikMessage>({
    type: 'object',
    properties: {
        body: {
            type: 'string',
        },
        severity: {
            enum: ['notice', 'warning', 'alert'],
        },
        user_email: {
            type: 'string',
        },
        user_username: {
            type: 'string',
        },
    },
    required: ['body'],
});

protectedRouter.post('/authentik', async (req, res) => {
    if (!validateAuthentik(req.body)) {
        res.status(400).send('Cannot process invalid data');
        return;
    }

    const { body, severity } = req.body;

    const matrix = getMatrixClient();

    await matrix.sendMessage(config.get().matrix.roomId, {
        msgtype: MsgType.Text,
        body: `[webhook2matrix/${req.apiKey!.name}] [${severity}]: ${body}`,
    });

    res.json({ ok: true });
});

app.use('/:token', (req, res, next) => {
    const { token } = req.params;

    if (!token) {
        res.status(401).send('No token provided');
        return;
    }

    const validKey = config.get().apiKeys.find(({ key }) => key === token);

    if (!validKey) {
        res.status(401).send('No token provided');
        return;
    }

    req.apiKey = validKey;

    next();
});

app.use('/:token', protectedRouter);

export default app;
