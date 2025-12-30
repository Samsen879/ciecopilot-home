
/**
 * Custom Jest matcher for API Contract Verification
 * 
 * Validates that an API response follows the standard envelope:
 * {
 *   success: boolean,
 *   error: { code, message, ... } | undefined,
 *   meta: { requestId, durationMs, ... }
 * }
 */
const toMatchApiContract = (response, expectedStatus = 200) => {
    // 1. Check Status Code
    if (response.status !== expectedStatus) {
        return {
            message: () => `Expected status code ${expectedStatus}, but got ${response.status}. Body: ${JSON.stringify(response.body, null, 2)}`,
            pass: false,
        };
    }

    const body = response.body;

    // 2. Check Envelope Structure
    if (typeof body !== 'object' || body === null) {
        return {
            message: () => `Expected response body to be an object, but got ${typeof body}`,
            pass: false,
        };
    }

    // 3. Check 'success' field
    if (typeof body.success !== 'boolean') {
        return {
            message: () => `Expected 'success' field to be a boolean, but got ${typeof body.success}`,
            pass: false,
        };
    }

    // 4. Check 'meta' field
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

    // 5. Check 'error' field logic
    if (body.success) {
        // If success is true, error should generally be undefined or null
        if (body.error) {
            return {
                message: () => `Expected 'error' to be undefined when success is true, but got ${JSON.stringify(body.error)}`,
                pass: false,
            };
        }
    } else {
        // If success is false, error MUST exist
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

export { toMatchApiContract };
