import type { ApiKeyConfig } from './config';

declare global {
    namespace Express {
        interface Request {
            apiKey: ApiKeyConfig | undefined;
        }
    }
}
