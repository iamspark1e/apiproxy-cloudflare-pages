function JsonResponse(data, responseInit) {
    return new Response(JSON.stringify(data), {
        ...responseInit,
        headers: {
            ...(responseInit?.headers || {}),
            "Content-Type": "application/json",
        }
    })
}

export async function onRequestGet(context) {
    try {
        let fullRequestUrl = new URL(context.request.url)
        const recordsKVList = await context.env.APIPROXY_RECORDS.list({
            prefix: fullRequestUrl.searchParams.get("endpoint_filter")
        })
        return JsonResponse({
            ok: 1,
            msg: "",
            data: recordsKVList.keys,
            cursor: recordsKVList.cursor
        })
    } catch (e) {
        return JsonResponse({
            ok: 0,
            msg: e.message,
            data: []
        })
    }
}

export async function onRequestPost(context) {
    try {
        let payload = await context.request.json();
        if(!payload.endpoint) {
            return JsonResponse({
                ok: 0,
                msg: "Missing key: endpoint"
            })
        }
        if(!payload.to) {
            return JsonResponse({
                ok: 0,
                msg: "Missing key: to"
            })
        }
        await context.env.APIPROXY_RECORDS.put(payload.endpoint, JSON.stringify(payload));
        return JsonResponse({
            ok: 1,
            msg: ""
        })
    } catch(e) {
        return JsonResponse({
            ok: 0,
            msg: e.message
        })
    }
}

export async function onRequestDelete(context) {
    try {
        let fullUrl = new URL(context.request.url);
        await context.env.APIPROXY_RECORDS.delete(fullUrl.searchParams.get("key"));
        return JsonResponse({
            ok: 1,
            msg: ""
        })
    } catch(e) {
        return JsonResponse({
            ok: 0,
            msg: e.message
        })
    }
}