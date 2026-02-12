import process from 'node:process';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import app from './api';
import { getConfig } from './config';
import logging from './logging';
import { createClient } from './matrix';

const log = logging.child({ label: 'main' });

const main = async (): Promise<void> => {
    const args = await yargs(hideBin(process.argv))
        .option('config', {
            alias: 'c',
            type: 'string',
            required: true,
        })
        .parse();

    const config = getConfig();
    config.loadConfig(args.config);

    const { listenHost, listenPort } = config.get();

    await createClient();

    app.listen(listenPort, listenHost, err => {
        if (err) {
            log.error(err);
            throw err;
        } else {
            log.info(`Listening on http://${listenHost}:${listenPort}`);
        }
    });
};

// eslint-disable-next-line no-console
main().catch(console.error);
