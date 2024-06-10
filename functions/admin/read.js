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
        let fullUrl = new URL(context.request.url);
        let data = await context.env.APIPROXY_RECORDS.get(fullUrl.searchParams.get("key"));
        return JsonResponse({
            ok: 1,
            msg: "",
            data: JSON.parse(data)
        })
    } catch(e) {
        return JsonResponse({
            ok: 0,
            msg: e.message
        })
    }
}