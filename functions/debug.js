/**
 * readRequestBody reads in the incoming request body
 * Use await readRequestBody(..) in an async function to get the string
 * @param {Request} request the incoming request to read from
 */
async function readRequestBody(request) {
    const contentType = request.headers.get("content-type");
    if (contentType.includes("application/json")) {
        try {
            let data = await request.json();
            return JSON.stringify(data);
        } catch(e) {
            return ""
        }
    } else if (contentType.includes("application/text")) {
        return request.text();
    } else if (contentType.includes("text/html")) {
        return request.text();
    } else if (contentType.includes("form")) {
        const formData = await request.formData();
        const body = {};
        for (const entry of formData.entries()) {
            body[entry[0]] = entry[1];
        }
        return JSON.stringify(body);
    } else {
        // Perhaps some other type of data was submitted in the form
        // like an image, or some other binary data.
        return "";
    }
}

export async function onRequest(context) {
    console.log(`url: ${context.request.url}`);
    console.log(`method: ${context.request.method}`);
    console.log(`headers: ${JSON.stringify(Object.fromEntries(context.request.headers.entries()))}`);
    let data = await readRequestBody(context.request.clone());
    console.log(`body: ${JSON.stringify(data)}`);
    return new Response("<p>See log</p>", { status: 200, headers: {
        "Content-Type": "text/html"
    } });
}