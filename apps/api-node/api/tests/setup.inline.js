
const { expect, jest } = require('@jest/globals');
const dotenv = require('dotenv');

// Inline matcher
const toMatchApiContract = (response, expectedStatus = 200) => {
    if (response.status !== expectedStatus) {
        return {
            message: () => `Expected status code ${expectedStatus}, but got ${response.status}. Body: ${JSON.stringify(response.body, null, 2)}`,
            pass: false,
        };
    }

    const body = response.body;

    if (typeof body !== 'object' || body === null) {
        return {
            message: () => `Expected response body to be an object, but got ${typeof body}`,
            pass: false,
        };
    }

    if (typeof body.success !== 'boolean') {
        return {
            message: () => `Expected 'success' field to be a boolean, but got ${typeof body.success}`,
            pass: false,
        };
    }

    if (!body.meta || typeof body.meta !== 'object') {
        return {
            message: () => `Expected 'meta' field to be an object`,
            pass: false,
        };
    }

    if (!body.meta.requestId) {
        return {
            message: () => `Expected 'meta.requestId' to exist`,
            pass: false,
        };
    }

    if (body.success) {
        if (body.error) {
            return {
                message: () => `Expected 'error' to be undefined when success is true, but got ${JSON.stringify(body.error)}`,
                pass: false,
            };
        }
    } else {
        if (!body.error || typeof body.error !== 'object') {
            return {
                message: () => `Expected 'error' object to exist when success is false`,
                pass: false,
            };
        }

        if (!body.error.code || typeof body.error.code !== 'string') {
            return {
                message: () => `Expected 'error.code' to be a string`,
                pass: false,
            };
        }

        if (!body.error.message || typeof body.error.message !== 'string') {
            return {
                message: () => `Expected 'error.message' to be a string`,
                pass: false,
            };
        }
    }

    return {
        message: () => `Expected response to match API contract`,
        pass: true,
    };
};

expect.extend({
    toMatchApiContract
});

dotenv.config({ path: '.env.test' });
jest.setTimeout(30000);
