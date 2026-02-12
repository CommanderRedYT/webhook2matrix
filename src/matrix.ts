import type { MatrixClient } from 'matrix-js-sdk';

import * as sdk from 'matrix-js-sdk';
import { MsgType } from 'matrix-js-sdk';
import { logger } from 'matrix-js-sdk/lib/logger';

import { getConfig } from './config';
import logging from './logging';

// @ts-ignore
logger.setLevel('error');

const log = logging.child({ label: 'matrix' });

let client: MatrixClient | undefined;

export const createClient = async (): Promise<void> => {
    if (client) {
        log.warn('Client was already created!');
        return;
    }

    const config = getConfig().get();

    const token =
        'accessToken' in config.matrix ? config.matrix.accessToken : undefined;

    client = sdk.createClient(
        token
            ? {
                  baseUrl: config.matrix.baseUrl,
                  userId: config.matrix.userId,
                  accessToken: token,
              }
            : { baseUrl: config.matrix.baseUrl },
    );

    if ('password' in config.matrix) {
        const data = await client.loginRequest({
            type: 'm.login.password',
            identifier: { type: 'm.id.user', user: config.matrix.userId },
            password: config.matrix.password,
        });

        client = sdk.createClient({
            baseUrl: config.matrix.baseUrl,
            userId: config.matrix.userId,
            accessToken: data.access_token,
            ...(data.refresh_token
                ? { refresh_token: data.refresh_token }
                : undefined),
        });
    }

    log.debug('Calling startClient()...');

    // await client.startClient();

    log.debug('Sending online message...');

    await client.sendMessage(config.matrix.roomId, {
        msgtype: MsgType.Text,
        body: 'webhook2matrix is online',
    });

    log.debug('Matrix client initialized!');
};

export const getMatrixClient = (): MatrixClient => {
    if (!client) {
        throw new Error('createClient() must be called before this');
    }

    return client;
};
