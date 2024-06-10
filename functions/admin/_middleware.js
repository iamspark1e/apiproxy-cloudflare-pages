// basic auth
/**
 * Shows how to restrict access using the HTTP Basic schema.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication
 * @see https://tools.ietf.org/html/rfc7617
 *
 */

import { Buffer } from "node:buffer";

const encoder = new TextEncoder();

/**
 * Protect against timing attacks by safely comparing values using `timingSafeEqual`.
 * Refer to https://developers.cloudflare.com/workers/runtime-apis/web-crypto/#timingsafeequal for more details
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
    const aBytes = encoder.encode(a);
    const bBytes = encoder.encode(b);

    if (aBytes.byteLength !== bBytes.byteLength) {
        // Strings must be the same length in order to compare
        // with crypto.subtle.timingSafeEqual
        return false;
    }

    return crypto.subtle.timingSafeEqual(aBytes, bBytes);
}

// basic auth end
async function errorHandling(context) {
    try {
        return await context.next();
    } catch (err) {
        return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
}

function authentication(context) {
    const BASIC_USER = "admin";

    // You will need an admin password. This should be
    // attached to your Worker as an encrypted secret.
    // Refer to https://developers.cloudflare.com/workers/configuration/secrets/
    const BASIC_PASS = context.env.PASSWORD ?? "password";
    const authorization = context.request.headers.get("Authorization");
    if (!authorization) {
        return new Response("You need to login.", {
            status: 401,
            headers: {
                // Prompts the user for credentials.
                "WWW-Authenticate": 'Basic realm="APIPROXY Admin", charset="UTF-8"',
            },
        });
    }
    const [scheme, encoded] = authorization.split(" ");

    // The Authorization header must start with Basic, followed by a space.
    if (!encoded || scheme !== "Basic") {
        return new Response("Malformed authorization header.", {
            status: 400,
        });
    }

    const credentials = Buffer.from(encoded, "base64").toString();

    // The username & password are split by the first colon.
    //=> example: "username:password"
    const index = credentials.indexOf(":");
    const user = credentials.substring(0, index);
    const pass = credentials.substring(index + 1);

    if (
        !timingSafeEqual(BASIC_USER, user) ||
        !timingSafeEqual(BASIC_PASS, pass)
    ) {
        return new Response("You need to login.", {
            status: 401,
            headers: {
                // Prompts the user for credentials.
                "WWW-Authenticate": 'Basic realm="APIPROXY Admin", charset="UTF-8"',
            },
        });
    }

    return context.next();
}

export const onRequest = [errorHandling, authentication];