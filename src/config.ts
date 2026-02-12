import type { JSONSchemaType } from 'ajv';

import fs from 'node:fs';

import Ajv from 'ajv';
import ajvErrors from 'ajv-errors';

import logging from './logging';

const ajv = new Ajv({ allErrors: true });

ajvErrors(ajv);

interface MatrixConfigWithPassword {
    baseUrl: string;
    userId: string;
    roomId: string;
    password: string;
}

interface MatrixConfigWithToken {
    baseUrl: string;
    userId: string;
    roomId: string;
    accessToken: string;
}

export interface ApiKeyConfig {
    name: string;
    key: string;
}

export interface ConfigObject {
    matrix: MatrixConfigWithPassword | MatrixConfigWithToken;
    apiKeys: Array<ApiKeyConfig>;
    listenHost: string;
    listenPort: number;
}

const log = logging.child({ label: 'config' });

const schema: JSONSchemaType<ConfigObject> = {
    type: 'object',
    properties: {
        matrix: {
            type: 'object',
            properties: {
                baseUrl: {
                    type: 'string',
                },
                userId: {
                    type: 'string',
                },
                accessToken: {
                    type: 'string',
                },
                password: {
                    type: 'string',
                },
                roomId: {
                    type: 'string',
                },
            },
            required: ['baseUrl', 'userId', 'roomId'],
            additionalProperties: false,
            oneOf: [
                { required: ['baseUrl', 'userId', 'roomId', 'accessToken'] },
                { required: ['baseUrl', 'userId', 'roomId', 'password'] },
            ],
        },
        apiKeys: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                    },
                    key: {
                        type: 'string',
                    },
                },
                required: ['name', 'key'],
                additionalProperties: false,
            },
        },
        listenHost: {
            type: 'string',
        },
        listenPort: {
            type: 'integer',
            minimum: 1024,
            maximum: 65535,
        },
    },
    required: ['matrix', 'apiKeys', 'listenHost', 'listenPort'],
    additionalProperties: false,
};

const validateConfig = ajv.compile(schema);

const defaultConfig: ConfigObject = {
    matrix: {
        baseUrl: 'https://matrix.org',
        userId: '@example:matrix.org',
        roomId: '!<example>:matrix.org',
        password: '<password>',
    },
    apiKeys: [],
    listenHost: '0.0.0.0',
    listenPort: 9456,
};

class Config {
    private configPath: string | undefined;

    private config: ConfigObject | undefined;
    private loaded: boolean;

    constructor() {
        this.configPath = undefined;
        this.config = undefined;
        this.loaded = false;
    }

    public loadConfig(path: string): void {
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, JSON.stringify(defaultConfig, null, 2));
        }

        const content = fs.readFileSync(path, 'utf8');

        let parsed;

        try {
            parsed = JSON.parse(content);
        } catch {
            throw new Error(
                'Could not parse configuration file: Invalid format',
            );
        }

        if (!validateConfig(parsed)) {
            parsed = {
                ...defaultConfig,
                ...parsed,
            };

            log.debug('Corrected config', { config: parsed });

            if (!validateConfig(parsed)) {
                log.debug('Error parsing config', {
                    errors: validateConfig.errors,
                });
                throw new Error(
                    'Could not parse configuration file: Invalid schema',
                );
            } else {
                log.warn('Old configuration format detected, updating file...');
                fs.writeFileSync(path, JSON.stringify(parsed, null, 2));
            }
        }

        this.config = parsed;
        this.loaded = true;
        this.configPath = path;

        log.debug('Config loaded successfully', { config: this.config });
    }

    private writeConfig(): boolean {
        if (!this.loaded || !this.config || !this.configPath) {
            log.warn('Will not write config as it is not loaded yet');
            return false;
        }

        fs.writeFileSync(
            this.configPath,
            JSON.stringify(this.config, null, 2),
            'utf8',
        );

        return true;
    }

    public get(): Readonly<ConfigObject> {
        if (!this.loaded || !this.config) {
            throw new Error(
                'Unable to get(), config is not loaded. Call Config.loadConfig() first!',
            );
        }

        return this.config;
    }

    public set(config: ConfigObject | Readonly<ConfigObject>): boolean {
        this.config = config;

        return this.writeConfig();
    }
}

const config = new Config();

export const getConfig = (): Config => {
    if (!config) {
        throw new Error('loadConfig() must be called before this');
    }

    return config;
};
