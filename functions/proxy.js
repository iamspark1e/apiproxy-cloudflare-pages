function JsonResponse(data, responseInit) {
    return new Response(JSON.stringify(data), {
        ...responseInit,
        headers: {
            ...(responseInit?.headers || {}),
            "Content-Type": "application/json",
        }
    })
}

async function readRequestBodyAsObj(request) {
    const contentType = request.headers.get("content-type");
    if (contentType.includes("application/json")) {
        try {
            let data = await request.json();
            return data;
        } catch(e) {
            return {}
        }
    } else if (contentType.includes("application/text")) {
        // return request.text();
        // text content could not be treated as JSON
        return {};
    } else if (contentType.includes("text/html")) {
        // return request.text();
        // html content could not be treated as JSON
        return {};
    } else if (contentType.includes("form")) {
        const formData = await request.formData();
        const body = {};
        for (const entry of formData.entries()) {
            body[entry[0]] = entry[1];
        }
        return body;
    } else {
        // Perhaps some other type of data was submitted in the form
        // like an image, or some other binary data.
        return {};
    }
}

function readExternalBodyAsObj(request, externalPayload) {
    try {
        const contentType = request.headers.get("content-type");
        if (contentType.includes("application/json")) {
            // return externalPayload ? JSON.parse(externalPayload) : "";
            try {
                return JSON.parse(externalPayload);
            } catch(e) {
                return {}
            }
        } else if (contentType.includes("application/text")) {
            // return request.text();
            // text content could not be treated as JSON
            return {};
        } else if (contentType.includes("text/html")) {
            // return request.text();
            // html content could not be treated as JSON
            return {};
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
            const formData = new URLSearchParams(externalPayload);
            const body = {};
            for (const entry of formData.entries()) {
                body[entry[0]] = entry[1];
            }
            return body;
        } else {
            // Perhaps some other type of data was submitted in the form
            // like an image, or some other binary data.
            return {};
        }
    } catch (e) {
        console.log(e);
        return {}
    }
}

export async function onRequest(context) {
    try {
        let fullRequestUrl = new URL(context.request.url);
        let recordKey = fullRequestUrl.searchParams.get("endpoint");
        if (!recordKey) {
            return new Response("", {
                status: 404
            })
        }
        let secretFromHeader = context.request.headers.get("apiproxy-secret");
        if(!secretFromHeader || secretFromHeader !== (context.env.APIPROXY_SECRET || "apiproxy")) {
            return new Response("", {
                status: 404
            })
        }
        let record = await context.env.APIPROXY_RECORDS.get(recordKey)
        if (!record) {
            return new Response("", {
                status: 404
            })
        }
        record = JSON.parse(record);
        let transferHeader = context.request.headers;
        // remove sensitive headers
        if(transferHeader.has("apiproxy-secret")) {
            transferHeader.delete("apiproxy-secret")
        }
        let recordInit = {
            headers: transferHeader,
            method: record.rewrite_method || 'get',
        }
        // search all $xxx and replace it
        let tmpObj = {}
        tmpObj = Object.fromEntries(new URL(context.request.url).searchParams.entries());
        if (context.request.method.toLowerCase() === 'put' || context.request.method.toLowerCase() === 'post') {
            let requestBodyObj = await readRequestBodyAsObj(context.request);
            Object.assign(tmpObj, requestBodyObj);
        }
        /// prepare - keep keys start with $
        let replaceSourceObj = {}
        for (let i in tmpObj) {
            if (i.startsWith("$")) {
                replaceSourceObj[i] = tmpObj[i];
            }
        }
        /// search in querys
        let toUrl = new URL(record.to)
        let queryObj = Object.fromEntries(toUrl.searchParams.entries());
        for (let k in queryObj) {
            if (queryObj[k].startsWith("$") && replaceSourceObj[queryObj[k]]) {
                queryObj[k] = replaceSourceObj[queryObj[k]];
            }
        }
        toUrl.search = new URLSearchParams(queryObj).toString();
        // only POST & PUT method can carry body payload
        if (recordInit.method.toLowerCase() === 'put' || recordInit.method.toLowerCase() === 'post') {
            let tmpStrObj = record.additional_payload;
            let tmpObj = {};
            // different parse method for different header
            tmpObj = readExternalBodyAsObj(context.request, tmpStrObj);
            for (let ki in tmpObj) {
                if (tmpObj[ki] && typeof tmpObj[ki] === 'string' && tmpObj[ki].startsWith("$") && replaceSourceObj[tmpObj[ki]]) {
                    tmpObj[ki] = replaceSourceObj[tmpObj[ki]];
                }
            }
            if(context.request.headers.get("Content-Type").includes("application/json")) {
                recordInit.body = JSON.stringify(tmpObj);
            } else if(context.request.headers.get("Content-Type").includes("application/x-www-form-urlencoded")) {
                recordInit.body = new URLSearchParams(tmpObj).toString();
            }
            // other condition the body would not be append.
        }
        return fetch(toUrl, recordInit);
    } catch (e) {
        console.log(e);
        return JsonResponse({
            ok: 0,
            msg: e.message,
        })
    }
}